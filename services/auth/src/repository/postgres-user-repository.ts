import pg from 'pg';
import { UserRole, UserStatus } from '@acad/contracts';
import { IUserRepository, UserListFilter, UserListResult, UserRecord, UserStatsResult } from '../handlers/auth-controller.js';

const { Pool } = pg;

export type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'TOKEN_REFRESH_SUCCESS'
  | 'TOKEN_REUSE_DETECTED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGED'
  | 'SESSION_REVOKED'
  | 'ALL_SESSIONS_REVOKED';

export interface AuditLogEntry {
  userId?: string | null;
  eventType: AuditEventType;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export class PostgresUserRepository implements IUserRepository {
  private pool: pg.Pool;

  constructor(poolOrConfig: pg.Pool | pg.PoolConfig | string) {
    if (poolOrConfig instanceof Pool) {
      this.pool = poolOrConfig;
    } else if (typeof poolOrConfig === 'string') {
      this.pool = new Pool({ connectionString: poolOrConfig });
    } else {
      this.pool = new Pool(poolOrConfig);
    }
  }

  public getPool(): pg.Pool {
    return this.pool;
  }

  public async create(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord> {
    const query = `
      INSERT INTO users (
        username,
        email,
        password_hash,
        role,
        status,
        karma_score,
        avatar_url,
        bio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        username,
        email,
        password_hash,
        role,
        status,
        karma_score,
        avatar_url,
        bio,
        created_at,
        updated_at;
    `;

    const values = [
      user.username,
      user.email,
      user.passwordHash,
      user.role,
      user.status,
      user.karmaScore,
      user.avatarUrl ?? null,
      user.bio ?? null,
    ];

    const result = await this.pool.query(query, values);
    return this.mapRowToRecord(result.rows[0]);
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    const query = `
      SELECT
        id,
        username,
        email,
        password_hash,
        role,
        status,
        karma_score,
        avatar_url,
        bio,
        created_at,
        updated_at
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [email]);
    if (result.rows.length === 0) return null;
    return this.mapRowToRecord(result.rows[0]);
  }

  public async findByUsername(username: string): Promise<UserRecord | null> {
    const query = `
      SELECT
        id,
        username,
        email,
        password_hash,
        role,
        status,
        karma_score,
        avatar_url,
        bio,
        created_at,
        updated_at
      FROM users
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [username]);
    if (result.rows.length === 0) return null;
    return this.mapRowToRecord(result.rows[0]);
  }

  public async findById(id: string): Promise<UserRecord | null> {
    const query = `
      SELECT
        id,
        username,
        email,
        password_hash,
        role,
        status,
        karma_score,
        avatar_url,
        bio,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
      LIMIT 1;
    `;
    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRowToRecord(result.rows[0]);
  }

  public async updateKarma(id: string, delta: number): Promise<number> {
    const query = `
      UPDATE users
      SET karma_score = karma_score + $2, updated_at = NOW()
      WHERE id = $1
      RETURNING karma_score;
    `;
    const result = await this.pool.query(query, [id, delta]);
    if (result.rows.length === 0) {
      throw new Error(`Người dùng với ID ${id} không tồn tại`);
    }
    return result.rows[0].karma_score;
  }

  public async listUsers(filter: UserListFilter = {}): Promise<UserListResult> {
    const conditions: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (filter.role) {
      conditions.push(`role = $${idx++}`);
      values.push(filter.role);
    }

    if (filter.status) {
      conditions.push(`status = $${idx++}`);
      values.push(filter.status);
    }

    if (filter.search) {
      conditions.push(`(username ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${filter.search}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int AS total FROM users ${whereClause};`;
    const countRes = await this.pool.query(countQuery, values);
    const total = countRes.rows[0]?.total || 0;

    const limit = filter.limit || 20;
    const offset = filter.offset || 0;

    const query = `
      SELECT
        id, username, email, password_hash, role, status, karma_score,
        avatar_url, bio, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx++} OFFSET $${idx++};
    `;
    const rowsRes = await this.pool.query(query, [...values, limit, offset]);
    const users = rowsRes.rows.map((row: any) => this.mapRowToRecord(row));

    return { users, total };
  }

  public async updateRole(id: string, role: UserRole): Promise<UserRecord> {
    const query = `
      UPDATE users
      SET role = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, username, email, password_hash, role, status, karma_score, avatar_url, bio, created_at, updated_at;
    `;
    const result = await this.pool.query(query, [id, role]);
    if (result.rows.length === 0) {
      throw new Error(`Người dùng với ID ${id} không tồn tại`);
    }
    return this.mapRowToRecord(result.rows[0]);
  }

  public async updateStatus(id: string, status: UserStatus): Promise<UserRecord> {
    const query = `
      UPDATE users
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, username, email, password_hash, role, status, karma_score, avatar_url, bio, created_at, updated_at;
    `;
    const result = await this.pool.query(query, [id, status]);
    if (result.rows.length === 0) {
      throw new Error(`Người dùng với ID ${id} không tồn tại`);
    }
    return this.mapRowToRecord(result.rows[0]);
  }

  public async getStats(): Promise<UserStatsResult> {
    const query = `
      SELECT
        COUNT(*)::int AS total_users,
        COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_users,
        COUNT(*) FILTER (WHERE status = 'SUSPENDED')::int AS suspended_users,
        COUNT(*) FILTER (WHERE role = 'ADMIN')::int AS admin_users,
        COUNT(*) FILTER (WHERE role IN ('SPACE_MOD', 'GLOBAL_MOD'))::int AS mod_users
      FROM users;
    `;
    const result = await this.pool.query(query);
    const row = result.rows[0] || {};
    return {
      totalUsers: row.total_users || 0,
      activeUsers: row.active_users || 0,
      suspendedUsers: row.suspended_users || 0,
      adminUsers: row.admin_users || 0,
      moderatorUsers: row.mod_users || 0,
    };
  }

  public async logAuditEvent(entry: AuditLogEntry): Promise<void> {
    const query = `
      INSERT INTO auth_audit_logs (
        user_id,
        event_type,
        ip_address,
        user_agent,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5);
    `;
    const values = [
      entry.userId ?? null,
      entry.eventType,
      entry.ipAddress ?? null,
      entry.userAgent ?? null,
      JSON.stringify(entry.metadata ?? {}),
    ];
    await this.pool.query(query, values);
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  private mapRowToRecord(row: any): UserRecord {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as UserRole,
      status: row.status as UserStatus,
      karmaScore: parseInt(row.karma_score, 10),
      avatarUrl: row.avatar_url ?? null,
      bio: row.bio ?? null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
