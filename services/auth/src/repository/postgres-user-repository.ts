import type { UserRole, UserStatus } from '@acad/contracts';
import pg from 'pg';
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

export class PostgresUserRepository implements IUserRepository {
  private pool: pg.Pool;

  constructor(config?: PostgresConfig | pg.Pool) {
    if (config && 'query' in config) {
      this.pool = config;
      return;
    }

    const connectionString =
      config?.connectionString ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      'postgresql://acad:acad_dev_secret@localhost:5432/acad_monorepo';

    const isSupabaseOrRender =
      connectionString.includes('.supabase.co') ||
      connectionString.includes('pooler.supabase.com') ||
      connectionString.includes('.render.com');

    const sslConfig =
      config?.ssl !== undefined
        ? config.ssl
        : isSupabaseOrRender
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
      console.error('[PostgresUserRepository] Lỗi kết nối Pool bất ngờ:', err);
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
      karmaScore: parseInt(String(row.karma_score || '0'), 10),
      threadsCount: parseInt(String(row.threads_count || '0'), 10),
      avatarUrl: (row.avatar_url as string | null) || null,
      bio: (row.bio as string | null) || null,
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
      data.role || 'USER',
      data.status || 'ACTIVE',
      data.avatarUrl || null,
      data.bio || null,
    ];

    try {
      const res = await this.pool.query(query, values);
      const row = res.rows[0];
      if (!row) {
        throw new DatabaseConnectionError('Không thể tạo người dùng: phản hồi rỗng từ database');
      }
      return this.mapRow(row);
    } catch (err: unknown) {
      const pgErr = err as { code?: string; detail?: string };
      if (pgErr.code === '23505') {
        const detail = pgErr.detail || '';
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
      const row = res.rows[0];
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
      const row = res.rows[0];
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
      const row = res.rows[0];
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
      const row = res.rows[0];
      return row ? this.mapRow(row) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn tìm người dùng theo identifier', err);
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
