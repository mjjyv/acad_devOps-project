import pg from 'pg';
import { UserRole, UserStatus } from '@acad/contracts';
import { IUserRepository, UserRecord } from '../handlers/auth-controller.js';

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
