import pg from 'pg';
import { UserRole, UserStatus } from '@acad/contracts';
import {
  IUserRepository,
  InMemoryUserRepository,
  UserListFilter,
  UserListResult,
  UserRecord,
  UserStatsResult,
} from '../handlers/auth-controller.js';

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

/**
 * Chuẩn hóa cấu hình kết nối PostgreSQL, tự động kích hoạt SSL/TLS
 * cho môi trường Production và các nhà cung cấp Managed PostgreSQL (Neon, Render, Supabase, AWS, ...)
 */
export function sanitizePostgresConfig(poolOrConfig: pg.Pool | pg.PoolConfig | string): pg.PoolConfig {
  if (typeof poolOrConfig === 'string') {
    const connectionString = poolOrConfig.trim();

    // Kiểm tra xem có phải kết nối cục bộ hay không
    const isLocal =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('infra-db');

    const hasSslDisabled =
      connectionString.includes('sslmode=disable') ||
      connectionString.includes('ssl=false');

    // Các nền tảng đám mây bắt buộc giao thức SSL/TLS
    const isCloudHost =
      connectionString.includes('.render.com') ||
      connectionString.includes('.neon.tech') ||
      connectionString.includes('.supabase.co') ||
      connectionString.includes('.supabase.com') ||
      connectionString.includes('pooler.supabase.com') ||
      connectionString.includes('.supabase.in') ||
      connectionString.includes('.aivencloud.com') ||
      connectionString.includes('amazonaws.com') ||
      connectionString.includes('cockroachlabs.cloud') ||
      connectionString.includes('.upstash.io');

    const shouldEnableSsl =
      !isLocal &&
      !hasSslDisabled &&
      (isCloudHost || connectionString.includes('sslmode=') || process.env.NODE_ENV === 'production');

    if (shouldEnableSsl) {
      return {
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
      };
    }

    return { connectionString };
  }

  if (poolOrConfig && typeof poolOrConfig === 'object') {
    const config = { ...(poolOrConfig as pg.PoolConfig) };
    if (!config.ssl && process.env.NODE_ENV === 'production') {
      config.ssl = {
        rejectUnauthorized: false,
      };
    }
    return config;
  }

  return poolOrConfig as pg.PoolConfig;
}

export class PostgresUserRepository implements IUserRepository {
  private pool: pg.Pool;
  private rawConfig: pg.PoolConfig | string;
  private fallbackStore: InMemoryUserRepository = new InMemoryUserRepository();
  private isUsingFallback = false;
  private schemaChecked = false;

  constructor(poolOrConfig: pg.Pool | pg.PoolConfig | string) {
    if (poolOrConfig instanceof Pool) {
      this.pool = poolOrConfig;
      this.rawConfig = {};
    } else {
      this.rawConfig = poolOrConfig;
      const sanitized = sanitizePostgresConfig(poolOrConfig);
      this.pool = new Pool(sanitized);
    }

    this.pool.on('error', (err) => {
      console.warn(`[PostgresUserRepository Warning] Lỗi kết nối PostgreSQL Pool: ${err.message}`);
    });
  }

  public getPool(): pg.Pool {
    return this.pool;
  }

  public isFallbackActive(): boolean {
    return this.isUsingFallback;
  }

  public getHealthStatus(): { type: string; isFallback: boolean; target?: string } {
    let target = 'local_postgres';
    if (typeof this.rawConfig === 'string') {
      if (this.rawConfig.includes('supabase')) target = 'supabase';
      else if (this.rawConfig.includes('render')) target = 'render';
      else if (this.rawConfig.includes('neon')) target = 'neon';
    }
    return {
      type: this.isUsingFallback ? 'in_memory_fallback' : 'postgres',
      isFallback: this.isUsingFallback,
      target,
    };
  }

  /**
   * Tự động khởi tạo lược đồ dữ liệu cơ bản (CREATE TABLE IF NOT EXISTS)
   * nếu kết nối tới cơ sở dữ liệu trống mới tinh trên đám mây.
   */
  private async ensureSchema(force = false): Promise<void> {
    if (this.schemaChecked && !force) return;
    try {
      const ddl = `
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
            CREATE TYPE user_role AS ENUM ('GUEST', 'USER', 'SPACE_MOD', 'GLOBAL_MOD', 'ADMIN');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
            CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'SHADOWBANNED', 'DELETED');
          END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(32) NOT NULL,
          email VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role user_role NOT NULL DEFAULT 'USER',
          status user_status NOT NULL DEFAULT 'ACTIVE',
          karma_score INTEGER NOT NULL DEFAULT 0,
          avatar_url TEXT,
          bio TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT uq_users_username_lower UNIQUE (username),
          CONSTRAINT uq_users_email_lower UNIQUE (email)
        );
      `;
      await this.pool.query(ddl);
      this.schemaChecked = true;
    } catch (err: any) {
      console.warn(`[PostgresUserRepository] Notice on ensureSchema: ${err.message}`);
    }
  }

  /**
   * Bộ thực thi an toàn: Bắt lỗi kết nối SSL/TLS, tự động tái cấu hình SSL và thử lại;
   * nếu CSDL không khả dụng thì chuyển tiếp mượt mà sang InMemoryUserRepository.
   */
  private async executeWithFallback<T>(
    operationName: string,
    pgOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>,
  ): Promise<T> {
    if (this.isUsingFallback) {
      return fallbackOperation();
    }

    try {
      await this.ensureSchema();
      return await pgOperation();
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      console.warn(`[PostgresUserRepository Warning] Thao tác ${operationName} trên PostgreSQL gặp lỗi: ${err.message}`);

      // Xử lý tự động khi gặp lỗi SSL/TLS required: Tái khởi tạo Pool với SSL bắt buộc và thử lại
      if (
        (msg.includes('ssl/tls required') || msg.includes('ssl') || err?.code === '28000') &&
        typeof this.rawConfig === 'string'
      ) {
        try {
          console.warn(`[PostgresUserRepository] Tự động nâng cấp kết nối sang SSL/TLS (rejectUnauthorized: false)...`);
          await this.pool.end().catch(() => {});
          this.pool = new Pool({
            connectionString: this.rawConfig,
            ssl: { rejectUnauthorized: false },
          });
          this.pool.on('error', (e) => {
            console.warn(`[PostgresUserRepository Warning] Lỗi Pool: ${e.message}`);
          });
          await this.ensureSchema(true);
          return await pgOperation();
        } catch (retryErr: any) {
          console.warn(
            `[PostgresUserRepository Warning] Thử lại với SSL thất bại: ${retryErr.message}. Kích hoạt InMemory fallback.`,
          );
        }
      }

      // Nhận diện lỗi kết nối, mạng hoặc bảng chưa tồn tại
      const isConnectionError =
        msg.includes('ssl') ||
        msg.includes('connect') ||
        msg.includes('timeout') ||
        msg.includes('refused') ||
        msg.includes('authentication') ||
        msg.includes('does not exist') ||
        msg.includes('enotfound') ||
        err?.code === 'ECONNREFUSED' ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === 'ENOTFOUND' ||
        err?.code === '42P01' || // relation does not exist
        err?.code === '28000' ||
        err?.code === '28P01';

      if (isConnectionError) {
        this.isUsingFallback = true;
        console.warn(
          `[PostgresUserRepository Fallback] Chuyển hướng tự động sang InMemoryUserRepository để đảm bảo người dùng không bị gián đoạn.`,
        );
        return fallbackOperation();
      }

      throw err;
    }
  }

  public async create(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord> {
    return this.executeWithFallback(
      'create',
      async () => {
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
        const record = this.mapRowToRecord(result.rows[0]);
        // Đồng bộ dữ liệu sang fallbackStore để dự phòng
        this.fallbackStore.create(user).catch(() => {});
        return record;
      },
      () => this.fallbackStore.create(user),
    );
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    return this.executeWithFallback(
      'findByEmail',
      async () => {
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
      },
      () => this.fallbackStore.findByEmail(email),
    );
  }

  public async findByUsername(username: string): Promise<UserRecord | null> {
    return this.executeWithFallback(
      'findByUsername',
      async () => {
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
      },
      () => this.fallbackStore.findByUsername(username),
    );
  }

  public async findById(id: string): Promise<UserRecord | null> {
    return this.executeWithFallback(
      'findById',
      async () => {
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
      },
      () => this.fallbackStore.findById(id),
    );
  }

  public async updateKarma(id: string, delta: number): Promise<number> {
    return this.executeWithFallback(
      'updateKarma',
      async () => {
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
      },
      () => this.fallbackStore.updateKarma(id, delta),
    );
  }

  public async listUsers(filter: UserListFilter = {}): Promise<UserListResult> {
    return this.executeWithFallback(
      'listUsers',
      async () => {
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
      },
      () => this.fallbackStore.listUsers(filter),
    );
  }

  public async updateRole(id: string, role: UserRole): Promise<UserRecord> {
    return this.executeWithFallback(
      'updateRole',
      async () => {
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
      },
      () => this.fallbackStore.updateRole(id, role),
    );
  }

  public async updateStatus(id: string, status: UserStatus): Promise<UserRecord> {
    return this.executeWithFallback(
      'updateStatus',
      async () => {
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
      },
      () => this.fallbackStore.updateStatus(id, status),
    );
  }

  public async getStats(): Promise<UserStatsResult> {
    return this.executeWithFallback(
      'getStats',
      async () => {
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
      },
      () => this.fallbackStore.getStats(),
    );
  }

  public async logAuditEvent(entry: AuditLogEntry): Promise<void> {
    try {
      if (this.isUsingFallback) return;
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
    } catch {
      // Bỏ qua lỗi audit log để không làm gián đoạn luồng chính
    }
  }

  public async close(): Promise<void> {
    await this.pool.end().catch(() => {});
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
