import type { UserRole, UserStatus } from '@acad/contracts';
import pg from 'pg';
import type { UserSession } from '../session/types.js';
import {
  type CreateUserData,
  DuplicateUserError,
  type IUserRepository,
  type UserEntity,
} from './user-repository.js';

export { DuplicateUserError };

const { Pool } = pg;

export class DatabaseConnectionError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export interface PostgresConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

function buildConnectionString(config?: PostgresConfig): string {
  if (config?.connectionString) return config.connectionString;
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;

  const host = config?.host ?? process.env.DB_HOST ?? '127.0.0.1';
  const port = config?.port ?? Number.parseInt(process.env.DB_PORT ?? '5432', 10);
  const user = config?.user ?? process.env.DB_USER ?? 'postgres';
  const password = config?.password ?? process.env.DB_PASSWORD ?? 'postgres';
  const database = config?.database ?? process.env.DB_NAME ?? 'acad_dev';

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export class PostgresUserRepository implements IUserRepository {
  private pool: pg.Pool;

  constructor(config?: PostgresConfig | pg.Pool) {
    if (config && 'query' in config) {
      this.pool = config;
      return;
    }

    const connectionString = buildConnectionString(config);
    const isHostedTls =
      connectionString.includes('.supabase.co') ||
      connectionString.includes('pooler.supabase.com') ||
      connectionString.includes('.render.com');

    const sslConfig =
      config?.ssl !== undefined
        ? config.ssl
        : process.env.DATABASE_SSL === 'true' || isHostedTls
          ? { rejectUnauthorized: false }
          : false;

    this.pool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      console.error('[PostgresUserRepository] Lỗi Pool bất ngờ:', err);
    });
  }

  private mapRow(row: Record<string, unknown>): UserEntity {
    return {
      id: String(row.id),
      username: String(row.username),
      email: String(row.email),
      passwordHash: String(row.password_hash),
      role: row.role as UserRole,
      status: row.status as UserStatus,
      karmaScore: Number.parseInt(String(row.karma_score ?? '0'), 10),
      threadsCount: Number.parseInt(String(row.threads_count ?? '0'), 10),
      avatarUrl: (row.avatar_url as string | null) ?? null,
      bio: (row.bio as string | null) ?? null,
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: row.updated_at ? new Date(String(row.updated_at)).toISOString() : undefined,
    };
  }

  public async createUser(data: CreateUserData): Promise<UserEntity> {
    const query = `
      INSERT INTO users (username, email, password_hash, role, status, avatar_url, bio)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      data.username,
      data.email,
      data.passwordHash,
      data.role ?? 'USER',
      data.status ?? 'ACTIVE',
      data.avatarUrl ?? null,
      data.bio ?? null,
    ];

    try {
      const res = await this.pool.query(query, values);
      const row = res.rows[0] as Record<string, unknown> | undefined;
      if (!row) {
        throw new DatabaseConnectionError('Không thể tạo người dùng: phản hồi rỗng từ database');
      }
      return this.mapRow(row);
    } catch (err: unknown) {
      if (err instanceof DatabaseConnectionError) throw err;
      const pgErr = err as { code?: string; detail?: string };
      if (pgErr.code === '23505') {
        const detail = pgErr.detail ?? '';
        if (detail.includes('username')) {
          throw new DuplicateUserError('username', 'Tên đăng nhập đã tồn tại trong hệ thống');
        }
        if (detail.includes('email')) {
          throw new DuplicateUserError('email', 'Địa chỉ email đã tồn tại trong hệ thống');
        }
        throw new DuplicateUserError('username', 'Người dùng đã tồn tại');
      }
      throw new DatabaseConnectionError('Lỗi truy vấn cơ sở dữ liệu khi tạo người dùng', err);
    }
  }

  public async findById(id: string): Promise<UserEntity | null> {
    try {
      const res = await this.pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1;', [id]);
      const row = res.rows[0] as Record<string, unknown> | undefined;
      return row ? this.mapRow(row) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn tìm người dùng theo ID', err);
    }
  }

  public async findByUsername(username: string): Promise<UserEntity | null> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;',
        [username],
      );
      const row = res.rows[0] as Record<string, unknown> | undefined;
      return row ? this.mapRow(row) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn tìm người dùng theo username', err);
    }
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1;',
        [email],
      );
      const row = res.rows[0] as Record<string, unknown> | undefined;
      return row ? this.mapRow(row) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn tìm người dùng theo email', err);
    }
  }

  public async findByUsernameOrEmail(identifier: string): Promise<UserEntity | null> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) LIMIT 1;',
        [identifier],
      );
      const row = res.rows[0] as Record<string, unknown> | undefined;
      return row ? this.mapRow(row) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn tìm người dùng theo identifier', err);
    }
  }

  public async searchActiveUsers(
    query: string,
    excludeUserId?: string,
    limit = 10,
  ): Promise<UserEntity[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 25);
    const trimmed = query.trim();
    const params: unknown[] = [safeLimit];
    const conditions: string[] = ["status = 'ACTIVE'"];

    if (excludeUserId) {
      params.push(excludeUserId);
      conditions.push(`id <> $${params.length}`);
    }

    let orderClause = 'karma_score DESC, username ASC';
    if (trimmed.length > 0) {
      params.push(`%${trimmed}%`);
      const likeParam = `$${params.length}`;
      params.push(`${trimmed}%`);
      const prefixParam = `$${params.length}`;
      conditions.push(`username ILIKE ${likeParam}`);
      orderClause = `CASE WHEN username ILIKE ${prefixParam} THEN 0 ELSE 1 END, karma_score DESC, username ASC`;
    }

    const sql = `
      SELECT * FROM users
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderClause}
      LIMIT $1;
    `;
    try {
      const res = await this.pool.query(sql, params);
      return (res.rows as Array<Record<string, unknown>>).map((row) => this.mapRow(row));
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi tìm kiếm người dùng theo username', err);
    }
  }

  public async updateStatus(id: string, status: UserStatus): Promise<void> {
    try {
      await this.pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2;', [
        status,
        id,
      ]);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi cập nhật trạng thái người dùng', err);
    }
  }

  public async updateRole(id: string, role: UserRole): Promise<void> {
    try {
      await this.pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2;', [
        role,
        id,
      ]);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi cập nhật vai trò người dùng', err);
    }
  }

  public async upsertSession(session: UserSession): Promise<void> {
    const query = `
      INSERT INTO user_sessions (
        id, user_id, refresh_token_hash, previous_token_hash, grace_period_expires_at,
        device_fingerprint, ip_address, user_agent, is_revoked, expires_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::inet, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        refresh_token_hash = EXCLUDED.refresh_token_hash,
        previous_token_hash = EXCLUDED.previous_token_hash,
        grace_period_expires_at = EXCLUDED.grace_period_expires_at,
        is_revoked = EXCLUDED.is_revoked,
        updated_at = EXCLUDED.updated_at;
    `;
    try {
      await this.pool.query(query, [
        session.id,
        session.userId,
        session.currentTokenHash,
        session.previousTokenHash,
        session.gracePeriodExpiresAt,
        session.deviceFingerprint,
        session.ipAddress,
        session.userAgent,
        session.isRevoked,
        session.expiresAt,
        session.createdAt,
        session.updatedAt,
      ]);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi đồng bộ phiên đăng nhập xuống PostgreSQL', err);
    }
  }

  public async revokeSessionById(userId: string, sessionId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE user_sessions SET is_revoked = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2;',
        [sessionId, userId],
      );
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi thu hồi phiên đăng nhập trên PostgreSQL', err);
    }
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE user_sessions SET is_revoked = TRUE, updated_at = NOW() WHERE user_id = $1;',
        [userId],
      );
    } catch (err) {
      throw new DatabaseConnectionError(
        'Lỗi thu hồi toàn bộ phiên người dùng trên PostgreSQL',
        err,
      );
    }
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const res = await this.pool.query('SELECT 1;');
      return (res.rowCount ?? 0) > 0;
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
