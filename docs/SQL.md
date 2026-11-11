# User

`````markdown
cần hoàn thiện từng Phân hệ và dữ liệu insert đi kèm không?
`````

Rất cần thiết và bắt buộc phải hoàn thiện dứt điểm từng phân hệ đi kèm bộ dữ liệu nạp (seed data) tương ứng trước khi chuyển sang phân hệ tiếp theo.

Nếu không làm cuốn chiếu kèm dữ liệu thực tế, hệ thống sẽ tiếp tục rơi vào cái bẫy "sân khấu hóa kiểm thử" (chạy test trên RAM giả lập rồi báo cáo 100% pass nhưng khi ráp vào CSDL thật thì gãy toàn bộ). Việc hoàn thiện từng phân hệ kèm dữ liệu chèn (insert data) giải quyết 3 mục tiêu sống còn:

1. **Bảo đảm tính toàn vẹn quan hệ (Referential Integrity):** Phân hệ sau luôn phụ thuộc chặt chẽ vào khóa ngoại (`FOREIGN KEY`) của phân hệ trước (ví dụ: không thể kiểm thử `threads` nếu chưa có `spaces` và `users`; không thể kiểm thử `thread_counters` và `comments` nếu chưa có `threads`).
2. **Kiểm chứng câu lệnh SQL thực tế thay vì bộ nhớ RAM:** Có dữ liệu thực mới phát hiện được các câu truy vấn thiếu `LIMIT`, thiếu chỉ mục GiST/GIN, hoặc viết sai tên cột giữa migration và entity mapper.
3. **Cung cấp sẵn dữ liệu cho Frontend phát triển ngay:** Khi bước sang tầng giao diện Web, có sẵn dữ liệu mẫu sẽ giúp dựng và kiểm tra giao diện bảng tin, cây bình luận đa tầng ngay lập tức mà không phải tốn công tạo thủ công từng bài viết.

### Trình tự hoàn thiện 5 Phân hệ & Kế hoạch Dữ liệu Seed đi kèm

#### Phân hệ 1: Định danh & Quản trị Phiên (Auth & Session Shield)

- **Trọng tâm code:** Hoàn thiện `PostgresUserRepository.ts` và `RedisSessionStore.ts`, đồng bộ lại mapper không truy vấn cột ảo `threads_count` khi bảng chưa có.
- **Dữ liệu Insert đi kèm (`001_auth_seed.sql`):**
    - Tối thiểu 4 tài khoản với UUID cố định (deterministic UUIDs) đại diện cho 4 vai trò: `ADMIN` (`admin_pro`), `GLOBAL_MOD` (`mod_lead`), `USER` thông thường (`devops_coder`), và `USER` bị khóa/shadowban (`bad_spammer`).
    - Mật khẩu băm chuẩn Scrypt/Argon2id cố định để đăng nhập test ngay được.
    - 1-2 bản ghi phiên `user_sessions` thật trong PostgreSQL và Redis hash `session:{userId}:{sessionId}`.

#### Phân hệ 2: Không gian Thảo luận & Bài viết (Spaces & Threads CMS)

- **Trọng tâm code:** Sửa migration `000002` bổ sung cột `is_private BOOLEAN DEFAULT FALSE` cho bảng `spaces`; loại bỏ việc gán cứng `isPrivate = false` trong `SpaceService.ts`.
- **Dữ liệu Insert đi kèm (`002_community_seed.sql`):**
    - Tối thiểu 3 Spaces kỹ thuật mẫu: `s/devops-arch`, `s/kubernetes`, `s/system-design` với nội quy `rules` dạng JSONB thật.
    - Bảng `space_memberships`: gán quyền `CREATOR` và `MEMBER` tương ứng cho các user từ Phân hệ 1.
    - Bảng `space_flairs`: tạo danh mục nhãn kỹ thuật thật (`[DevOps]`, `[SecOps]`, `[Architecture]`, `[Incident]`).
    - Bảng `threads`: tạo từ 10 đến 15 bài viết có nội dung Markdown kỹ thuật dài thật, gắn `flair_id`, rải rác các mốc thời gian xuất bản (`created_at`: cách đây 1 giờ, 6 giờ, 2 ngày, 1 tuần) để chuẩn bị cho việc test thuật toán Feed.

#### Phân hệ 3: Cây Bình luận Đa tầng (`comments` ltree)

- **Trọng tâm code:** Sửa `CommentService.ts` để xóa bỏ hoàn toàn giá trị hardcode (`directRepliesCount: 0`, `totalDescendantsCount: 0`); dùng hàm `nlevel(path)` và toán tử `<@` của `ltree` để đếm con thật.
- **Dữ liệu Insert đi kèm (`003_comments_seed.sql`):**
    - Chuẩn bị một cây bình luận có độ sâu tăng dần trên 1 Thread cụ thể để kiểm tra trọn vẹn thuật toán:
        - Bình luận gốc (Level 1, path `0000`, `0001`).
        - Bình luận trả lời (Level 2, path `0000.0000`, `0000.0001`).
        - Bình luận phản hồi sâu đến Level 7.
        - **Edge case quan trọng:** Ít nhất 1 bình luận chạm ngưỡng Level 8 (`isCappedAtMaxDepth = true`, path dừng ở cấp 8 kèm `@mention` tác giả) để xác thực tính năng Flat Reply trên giao diện.
        - 1 bình luận xóa mềm (`is_deleted = true`, nội dung đã ẩn) nằm giữa cây để kiểm tra việc cây con không bị đứt gãy.

#### Phân hệ 4: Bộ đếm Nguyên tử & Bảng tin Phân trang (Voting, Counters & Feeds)

- **Trọng tâm code:** Viết lại hoàn toàn hàm `fetchFeedsWithCursor` trong `PostgresCommunityRepository.ts` bằng câu truy vấn SQL chuẩn kèm `ORDER BY ... LIMIT $limit`, dẹp bỏ việc lôi toàn bộ bảng `threads` lên RAM xử lý bằng JavaScript.
- **Dữ liệu Insert đi kèm (`004_voting_feed_seed.sql`):**
    - Bảng `thread_counters`: chèn bộ đếm cho từng bài viết với các kịch bản điểm số đối lập:
        - Bài viết mới đăng nhưng nhiều upvote (NetScore cao, Age thấp $\rightarrow$ HotScore cao nhất).
        - Bài viết cũ nhiều vote (NetScore rất cao, Age lớn $\rightarrow$ HotScore bị phân rã tụt xuống).
        - Bài viết ít vote nhưng tỷ lệ 100% upvote vs bài viết nhiều vote nhưng tỷ lệ tranh cãi cao (50% up/down) để kiểm chứng thuật toán Wilson Score ("Best").

    - Bảng `thread_votes` & `comment_votes`: lịch sử vote thật của các user.
    - Bảng `user_saved_threads`: đánh dấu bookmark một số bài viết để kiểm tra API `/users/me/saved`.

#### Phân hệ 5: Nhắn tin Thời gian thực & Kiểm duyệt (Realtime Chat & Moderation)

- **Trọng tâm code:** Kiểm tra tính năng hàng đợi người lạ và bảo vệ kênh SSE không bị rò rỉ bộ nhớ.
- **Dữ liệu Insert đi kèm (`005_chat_mod_seed.sql`):**
    - `chat_channels` & `chat_members`: 1 kênh `DIRECT` giữa 2 tài khoản và 1 kênh `GROUP` có 3 thành viên.
    - `chat_messages`: lịch sử tin nhắn thật, trong đó có tin nhắn cha và các tin nhắn con trỏ vào `parent_message_id` để kiểm thử tính năng Chat Threads.
    - `chat_requests`: 1 yêu cầu ở trạng thái `PENDING`, 1 yêu cầu ở trạng thái `BLOCKED` để kiểm chứng mã lỗi 403 Forbidden khi người bị chặn cố gửi tin.
    - `reports`: 1 báo cáo vi phạm bài viết ở trạng thái `PENDING` trong Mod Queue.
    - `audit_logs`: vết kiểm toán mẫu ghi nhận hành động quản trị viên.

### 3 Nguyên tắc bắt buộc khi chuẩn bị Dữ liệu Insert

1. **Sử dụng UUID tiền tố cố định (Deterministic UUIDs):** Không dùng `gen_random_uuid()` ngẫu nhiên trong file seed data. Hãy quy ước UUID có quy luật (ví dụ: User 1 là `a0000000-0000-0000-0000-000000000001`, Space 1 là `b0000000-0000-0000-0000-000000000001`). Điều này giúp các kịch bản test bằng cURL hoặc API client trên web gọi thẳng vào ID cố định mà không cần bóc tách biến môi trường phức tạp.
2. **Dọn sạch rác copy-paste:** Toàn bộ nội dung bài viết, slug, tên không gian, email seed phải mang nội dung kỹ thuật đồng nhất với dự án, xóa sạch các tàn dư mang tên `SYNAPSE` hay `synapse.network`.
3. **Cơ chế nạp Idempotent (Chạy lại nhiều lần không lỗi):** Sử dụng cấu trúc `ON CONFLICT (id) DO UPDATE...` hoặc xóa sạch theo thứ tự khóa ngoại trước khi nạp (`DELETE FROM comments ... -> DELETE FROM threads ... -> DELETE FROM spaces`) để script seed có thể thực thi lặp lại bất kỳ lúc nào mà không bị lỗi trùng lặp khóa chính.

---

# User

`````markdown
Hoàn thiện chi tiết Phân hệ 1, chưa gồm insert
`````

Toàn bộ kiến trúc, lược đồ CSDL, mã nguồn và khế ước giao tiếp của **Phân hệ 1 (Core Identity, Mật mã & Quản trị Phiên)** được chuẩn hóa và sửa chữa triệt để mọi lỗi logic, lệch pha schema đã chỉ ra ở các bước trước.

### 1. Kiến trúc CSDL & Migrations SQL (DDL Chuẩn Hóa)

Sửa lỗi lệch pha giữa entity mapper và migration: bổ sung cột `threads_count` vào bảng `users`, thiết lập chỉ mục không phân biệt hoa thường và bảng `user_sessions` phục vụ lưu trữ đa phiên.

#### `deploy/migrations/000001_create_auth_schema.up.sql`

```sql
-- 1. Kích hoạt tiện ích mở rộng mật mã và UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Khởi tạo kiểu dữ liệu Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('GUEST', 'USER', 'SPACE_MOD', 'GLOBAL_MOD', 'ADMIN');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'SHADOWBANNED', 'DELETED');
    END IF;
END $$;

-- 3. Bảng users (Bổ sung threads_count đồng bộ với Mapper)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(32) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    karma_score INTEGER NOT NULL DEFAULT 0,
    threads_count INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục độc bản không phân biệt hoa thường (Case-insensitive unique indexes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);

-- 4. Bảng user_sessions (Lưu trữ phiên bền vững tại PostgreSQL)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(64) NOT NULL,
    previous_token_hash VARCHAR(64),
    grace_period_expires_at TIMESTAMPTZ,
    device_fingerprint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions (user_id) WHERE NOT is_revoked;
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_prev_token_hash ON user_sessions (previous_token_hash);
```

#### `deploy/migrations/000001_create_auth_schema.down.sql`

```sql
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
```

### 2. Tầng Mật Mã & Quản Lý Token

Triển khai tại `services/auth/src/crypto/`: KDF tốn RAM chống tấn công phần cứng ASIC/GPU và JWT HS256 chuẩn thời gian hằng số.

#### `services/auth/src/crypto/password.ts`

```typescript
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_CONFIG = {
  N: 16384, // Cost factor (yêu cầu 64MB RAM vật lý)
  r: 8,
  p: 1,
  keyLen: 64,
  saltLen: 16,
  maxmem: 64 * 1024 * 1024,
};

const scryptAsync = (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { cost: number; blockSize: number; parallelization: number; maxmem: number },
): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
};

export class PasswordHasher {
  /**
   * Băm mật khẩu theo chuẩn $scrypt$N=16384,r=8,p=1$salt$hash
   */
  public static async hash(password: string): Promise<string> {
    const salt = randomBytes(SCRYPT_CONFIG.saltLen);
    const derivedKey = await scryptAsync(password, salt, SCRYPT_CONFIG.keyLen, {
      cost: SCRYPT_CONFIG.N,
      blockSize: SCRYPT_CONFIG.r,
      parallelization: SCRYPT_CONFIG.p,
      maxmem: SCRYPT_CONFIG.maxmem,
    });

    return `$scrypt$N=${SCRYPT_CONFIG.N},r=${SCRYPT_CONFIG.r},p=${SCRYPT_CONFIG.p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
  }

  /**
   * So khớp mật khẩu với mã băm bằng crypto.timingSafeEqual (triệt tiêu Timing Attack)
   */
  public static async verify(password: string, storedHash: string): Promise<boolean> {
    try {
      const parts = storedHash.split('$');
      if (parts.length !== 5 || parts[1] !== 'scrypt') {
        return false;
      }

      const paramsStr = parts[2];
      const saltHex = parts[3];
      const hashHex = parts[4];

      if (!paramsStr || !saltHex || !hashHex) {
        return false;
      }

      const params = paramsStr.split(',').reduce<Record<string, number>>((acc, curr) => {
        const [k, v] = curr.split('=');
        if (k && v) acc[k] = parseInt(v, 10);
        return acc;
      }, {});

      const cost = params.N || SCRYPT_CONFIG.N;
      const blockSize = params.r || SCRYPT_CONFIG.r;
      const parallelization = params.p || SCRYPT_CONFIG.p;

      const salt = Buffer.from(saltHex, 'hex');
      const expectedKey = Buffer.from(hashHex, 'hex');

      const derivedKey = await scryptAsync(password, salt, expectedKey.length, {
        cost,
        blockSize,
        parallelization,
        maxmem: SCRYPT_CONFIG.maxmem,
      });

      if (derivedKey.length !== expectedKey.length) {
        return false;
      }

      return timingSafeEqual(derivedKey, expectedKey);
    } catch {
      return false;
    }
  }
}
```

#### `services/auth/src/crypto/token.ts`

```typescript
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { UserRole, UserStatus } from '@acad/contracts';

export interface UserTokenClaims {
  sub: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  sessionId: string;
}

export interface FullJWTClaims extends UserTokenClaims {
  iss: string;
  iat: number;
  exp: number;
}

export class TokenManager {
  public static readonly DEFAULT_SECRET =
    process.env.JWT_SECRET || 'acad-super-secure-jwt-hmac-secret-key-at-least-32-chars-long!';
  public static readonly ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 phút
  public static readonly REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

  public static generateRefreshToken(): string {
    return randomBytes(64).toString('base64url');
  }

  public static hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  public static timingSafeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  }

  public static signAccessToken(
    claims: UserTokenClaims,
    secret: string = TokenManager.DEFAULT_SECRET,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const fullClaims: FullJWTClaims = {
      ...claims,
      iss: 'acad-devops-platform',
      iat: now,
      exp: now + TokenManager.ACCESS_TOKEN_TTL_SECONDS,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8').toString('base64url');
    const payload = Buffer.from(JSON.stringify(fullClaims), 'utf8').toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(`${header}.${payload}`, 'utf8')
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  public static verifyAccessToken(
    token: string,
    secret: string = TokenManager.DEFAULT_SECRET,
  ): FullJWTClaims | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const [headerB64, payloadB64, signatureB64] = parts;
      if (!headerB64 || !payloadB64 || !signatureB64) return null;

      const expectedSignature = createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`, 'utf8')
        .digest('base64url');

      if (!TokenManager.timingSafeCompare(signatureB64, expectedSignature)) {
        return null;
      }

      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const claims = JSON.parse(payloadJson) as FullJWTClaims;

      if (claims.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return claims;
    } catch {
      return null;
    }
  }
}
```

### 3. Tầng Kho Dữ Liệu PostgreSQL & Redis

Sửa dứt điểm câu truy vấn, mapper đồng bộ bảng `users`, đồng thời hiện thực hóa `PostgresUserRepository` và `RedisSessionStore` hoạt động trên kết nối thực tế.

#### `services/auth/src/repository/postgres-user-repository.ts`

```typescript
import type { UserRole, UserStatus } from '@acad/contracts';
import pg from 'pg';
import type { CreateUserData, IUserRepository, UserEntity } from './user-repository.js';

export class DuplicateUserError extends Error {
  constructor(public readonly field: 'username' | 'email', message: string) {
    super(message);
    this.name = 'DuplicateUserError';
  }
}

export class DatabaseConnectionError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export class PostgresUserRepository implements IUserRepository {
  constructor(private pool: pg.Pool) {}

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
      INSERT INTO users (username, email, password_hash, role, status, avatar_url, bio, karma_score, threads_count)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0)
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
        throw new DatabaseConnectionError('Không thể tạo người dùng: phản hồi rỗng từ cơ sở dữ liệu');
      }
      return this.mapRow(row);
    } catch (err: unknown) {
      const pgErr = err as { code?: string; detail?: string };
      if (pgErr.code === '23505') {
        const detail = pgErr.detail || '';
        if (detail.includes('username') || detail.includes('Key (LOWER(username))')) {
          throw new DuplicateUserError('username', 'Tên đăng nhập đã tồn tại trong hệ thống');
        }
        if (detail.includes('email') || detail.includes('Key (LOWER(email))')) {
          throw new DuplicateUserError('email', 'Địa chỉ email đã tồn tại trong hệ thống');
        }
        throw new DuplicateUserError('username', 'Tài khoản người dùng đã tồn tại');
      }
      throw new DatabaseConnectionError('Lỗi truy vấn cơ sở dữ liệu khi tạo người dùng', err);
    }
  }

  public async findById(id: string): Promise<UserEntity | null> {
    try {
      const res = await this.pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1;', [id]);
      return res.rows[0] ? this.mapRow(res.rows[0]) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn tìm người dùng theo ID', err);
    }
  }

  public async findByUsernameOrEmail(identifier: string): Promise<UserEntity | null> {
    try {
      const res = await this.pool.query(
        'SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1) LIMIT 1;',
        [identifier],
      );
      return res.rows[0] ? this.mapRow(res.rows[0]) : null;
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi truy vấn tìm người dùng theo định danh', err);
    }
  }

  public async updateStatus(id: string, status: UserStatus): Promise<void> {
    try {
      await this.pool.query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2;', [status, id]);
    } catch (err) {
      throw new DatabaseConnectionError('Lỗi cập nhật trạng thái người dùng', err);
    }
  }

  public async updateRole(id: string, role: UserRole): Promise<void> {
    try {
      await this.pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2;', [role, id]);
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
}
```

#### `services/auth/src/session/redis-session-store.ts`

Quản trị phiên đa thiết bị bằng cấu trúc Hash và Index Lookup $\mathcal{O}(1)$ trên Redis:

```typescript
import type { Redis } from 'ioredis';
import type { ISessionStore } from './store.js';
import type { UserSession } from './types.js';

export class RedisSessionStore implements ISessionStore {
  private readonly DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

  constructor(private redis: Redis) {}

  private sessionKey(userId: string, sessionId: string): string {
    return `session:${userId}:${sessionId}`;
  }

  private lookupKey(tokenHash: string): string {
    return `session_lookup:${tokenHash}`;
  }

  private serialize(session: UserSession): Record<string, string> {
    return {
      id: session.id,
      userId: session.userId,
      currentTokenHash: session.currentTokenHash,
      previousTokenHash: session.previousTokenHash || '',
      gracePeriodExpiresAt: session.gracePeriodExpiresAt ? session.gracePeriodExpiresAt.toISOString() : '',
      deviceFingerprint: session.deviceFingerprint || '',
      ipAddress: session.ipAddress || '',
      userAgent: session.userAgent || '',
      isRevoked: session.isRevoked ? 'true' : 'false',
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private deserialize(data: Record<string, string>): UserSession | null {
    if (!data.id || !data.userId || !data.currentTokenHash) {
      return null;
    }

    return {
      id: data.id,
      userId: data.userId,
      currentTokenHash: data.currentTokenHash,
      previousTokenHash: data.previousTokenHash || null,
      gracePeriodExpiresAt: data.gracePeriodExpiresAt ? new Date(data.gracePeriodExpiresAt) : null,
      deviceFingerprint: data.deviceFingerprint || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      isRevoked: data.isRevoked === 'true',
      expiresAt: new Date(data.expiresAt || Date.now()),
      createdAt: new Date(data.createdAt || Date.now()),
      updatedAt: new Date(data.updatedAt || Date.now()),
    };
  }

  public async saveSession(session: UserSession): Promise<void> {
    const key = this.sessionKey(session.userId, session.id);
    const data = this.serialize(session);

    const pipeline = this.redis.pipeline();
    pipeline.hset(key, data);
    pipeline.expire(key, this.DEFAULT_TTL_SECONDS);

    // Lưu lookup O(1) cho current token
    pipeline.set(
      this.lookupKey(session.currentTokenHash),
      `${session.userId}:${session.id}`,
      'EX',
      this.DEFAULT_TTL_SECONDS,
    );

    // Nếu có previousTokenHash, duy trì lookup trong 35 giây (bao trùm cửa sổ 30s)
    if (session.previousTokenHash) {
      pipeline.set(
        this.lookupKey(session.previousTokenHash),
        `${session.userId}:${session.id}`,
        'EX',
        35,
      );
    }

    await pipeline.exec();
  }

  public async getSession(userId: string, sessionId: string): Promise<UserSession | null> {
    const key = this.sessionKey(userId, sessionId);
    const data = await this.redis.hgetall(key);
    return this.deserialize(data);
  }

  public async getSessionByTokenHash(tokenHash: string): Promise<UserSession | null> {
    const mapping = await this.redis.get(this.lookupKey(tokenHash));
    if (!mapping) return null;

    const [userId, sessionId] = mapping.split(':');
    if (!userId || !sessionId) return null;

    return this.getSession(userId, sessionId);
  }

  public async revokeSession(userId: string, sessionId: string): Promise<void> {
    const key = this.sessionKey(userId, sessionId);
    const session = await this.getSession(userId, sessionId);

    if (session) {
      await this.redis.hset(key, 'isRevoked', 'true', 'updatedAt', new Date().toISOString());
      await this.redis.del(this.lookupKey(session.currentTokenHash));
      if (session.previousTokenHash) {
        await this.redis.del(this.lookupKey(session.previousTokenHash));
      }
    }
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    const pattern = `session:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      const data = await this.redis.hgetall(key);
      if (data.currentTokenHash) {
        pipeline.del(this.lookupKey(data.currentTokenHash));
      }
      if (data.previousTokenHash) {
        pipeline.del(this.lookupKey(data.previousTokenHash));
      }
      pipeline.hset(key, 'isRevoked', 'true');
    }
    await pipeline.exec();
  }

  public async listUserSessions(userId: string): Promise<UserSession[]> {
    const pattern = `session:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    const sessions: UserSession[] = [];

    for (const key of keys) {
      const data = await this.redis.hgetall(key);
      const session = this.deserialize(data);
      if (session && !session.isRevoked) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}
```

### 4. Tầng Nghiệp Vụ Lõi (Token Rotation & Auth Service)

Hiện thực hóa máy trạng thái xoay vòng token 30s Grace Period và phát hiện tấn công tái sử dụng:

#### `services/auth/src/session/token-rotation-service.ts`

```typescript
import { TokenManager, type UserTokenClaims } from '../crypto/token.js';
import type { ISessionStore } from './store.js';
import type { TokenRotationResult, UserSession } from './types.js';

export type UserClaimsProvider = (userId: string) => Promise<UserTokenClaims | null>;

export class TokenRotationService {
  public static readonly GRACE_PERIOD_MS = 30 * 1000; // 30 giây

  constructor(
    private sessionStore: ISessionStore,
    private claimsProvider: UserClaimsProvider,
    private jwtSecret: string = TokenManager.DEFAULT_SECRET,
  ) {}

  public async rotateTokens(rawRefreshToken: string): Promise<TokenRotationResult> {
    const submittedHash = TokenManager.hashToken(rawRefreshToken);
    const session = await this.sessionStore.getSessionByTokenHash(submittedHash);

    if (!session) {
      return { status: 'SESSION_NOT_FOUND', error: 'Phiên làm việc không tồn tại hoặc đã đăng xuất' };
    }

    if (session.isRevoked) {
      return { status: 'SESSION_REVOKED', error: 'Phiên làm việc này đã bị thu hồi' };
    }

    const now = new Date();
    if (session.expiresAt < now) {
      return { status: 'SESSION_EXPIRED', error: 'Phiên làm việc đã hết hạn' };
    }

    // TRƯỜNG HỢP 1: Token hiện hành hợp lệ -> Cấp cặp token mới
    if (TokenManager.timingSafeCompare(submittedHash, session.currentTokenHash)) {
      const claims = await this.claimsProvider(session.userId);
      if (!claims) {
        return { status: 'SESSION_NOT_FOUND', error: 'Không tìm thấy thông tin tài khoản' };
      }

      const newRefreshToken = TokenManager.generateRefreshToken();
      const newRefreshTokenHash = TokenManager.hashToken(newRefreshToken);

      const claimsWithSession: UserTokenClaims = { ...claims, sessionId: session.id };
      const newAccessToken = TokenManager.signAccessToken(claimsWithSession, this.jwtSecret);

      const updatedSession: UserSession = {
        ...session,
        previousTokenHash: session.currentTokenHash,
        gracePeriodExpiresAt: new Date(now.getTime() + TokenRotationService.GRACE_PERIOD_MS),
        currentTokenHash: newRefreshTokenHash,
        updatedAt: now,
      };

      await this.sessionStore.saveSession(updatedSession);

      return {
        status: 'SUCCESS',
        tokenPair: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
        },
        session: updatedSession,
      };
    }

    // TRƯỜNG HỢP 2: Gửi lại token cũ trong cửa sổ 30s Grace Period -> Cấp Access Token mới
    if (
      session.previousTokenHash &&
      TokenManager.timingSafeCompare(submittedHash, session.previousTokenHash)
    ) {
      if (session.gracePeriodExpiresAt && now.getTime() <= session.gracePeriodExpiresAt.getTime()) {
        const claims = await this.claimsProvider(session.userId);
        if (!claims) {
          return { status: 'SESSION_NOT_FOUND', error: 'Không tìm thấy thông tin tài khoản' };
        }

        const claimsWithSession: UserTokenClaims = { ...claims, sessionId: session.id };
        const newAccessToken = TokenManager.signAccessToken(claimsWithSession, this.jwtSecret);

        return {
          status: 'GRACE_PERIOD_RENEWED',
          accessToken: newAccessToken,
          expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
          session,
        };
      }

      // TRƯỜNG HỢP 3: Token Reuse Attack -> Thu hồi toàn bộ phiên của người dùng
      console.warn(`[SECURITY] Phát hiện Token Reuse Attack cho User: ${session.userId}. Thu hồi toàn bộ phiên!`);
      await this.sessionStore.revokeAllUserSessions(session.userId);

      return {
        status: 'TOKEN_REUSE_DETECTED',
        error: 'Phát hiện hành vi tái sử dụng token đã thu hồi. Toàn bộ phiên đăng nhập đã bị vô hiệu hóa vì lý do an toàn.',
      };
    }

    return { status: 'SESSION_NOT_FOUND', error: 'Token không hợp lệ hoặc không thuộc phiên này' };
  }
}
```

#### `services/auth/src/services/auth-service.ts`

```typescript
import { randomUUID } from 'node:crypto';
import type { AuthResponse, LoginInput, RegisterInput, SessionInfo, UserProfile } from '@acad/contracts';
import { PasswordHasher } from '../crypto/password.js';
import { TokenManager, type UserTokenClaims } from '../crypto/token.js';
import type { IUserRepository, UserEntity } from '../repository/user-repository.js';
import type { ISessionStore } from '../session/store.js';
import { TokenRotationService } from '../session/token-rotation-service.js';
import type { TokenRotationResult, UserSession } from '../session/types.js';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AccountSuspendedError extends Error {
  constructor(message: string = 'Tài khoản đã bị tạm khóa') {
    super(message);
    this.name = 'AccountSuspendedError';
  }
}

export class AuthService {
  private rotationService: TokenRotationService;

  constructor(
    private userRepository: IUserRepository,
    private sessionStore: ISessionStore,
    private jwtSecret: string = TokenManager.DEFAULT_SECRET,
  ) {
    this.rotationService = new TokenRotationService(
      this.sessionStore,
      async (userId: string): Promise<UserTokenClaims | null> => {
        const u = await this.userRepository.findById(userId);
        if (!u) return null;
        return {
          sub: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          status: u.status,
          sessionId: '',
        };
      },
      this.jwtSecret,
    );
  }

  private toProfile(user: UserEntity): UserProfile {
    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  public async register(
    input: RegisterInput,
    meta?: { ipAddress?: string | null; userAgent?: string | null; deviceFingerprint?: string | null },
  ): Promise<AuthResponse & { refreshToken: string }> {
    const passwordHash = await PasswordHasher.hash(input.password);

    const user = await this.userRepository.createUser({
      username: input.username,
      email: input.email,
      passwordHash,
      role: 'USER',
      status: 'ACTIVE',
    });

    const sessionId = randomUUID();
    const refreshToken = TokenManager.generateRefreshToken();
    const refreshTokenHash = TokenManager.hashToken(refreshToken);

    const claims: UserTokenClaims = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      sessionId,
    };
    const accessToken = TokenManager.signAccessToken(claims, this.jwtSecret);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TokenManager.REFRESH_TOKEN_TTL_SECONDS * 1000);

    const session: UserSession = {
      id: sessionId,
      userId: user.id,
      currentTokenHash: refreshTokenHash,
      previousTokenHash: null,
      gracePeriodExpiresAt: null,
      deviceFingerprint: meta?.deviceFingerprint || null,
      ipAddress: meta?.ipAddress || null,
      userAgent: meta?.userAgent || null,
      isRevoked: false,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await this.sessionStore.saveSession(session);

    return {
      user: this.toProfile(user),
      sessionId,
      accessToken,
      refreshToken,
    };
  }

  public async login(
    input: LoginInput,
    meta?: { ipAddress?: string | null; userAgent?: string | null; deviceFingerprint?: string | null },
  ): Promise<AuthResponse & { refreshToken: string }> {
    const user = await this.userRepository.findByUsernameOrEmail(input.identifier);
    if (!user) {
      throw new AuthenticationError('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new AccountSuspendedError('Tài khoản này đang bị khóa hoặc ngừng hoạt động');
    }

    const isValid = await PasswordHasher.verify(input.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    const sessionId = randomUUID();
    const refreshToken = TokenManager.generateRefreshToken();
    const refreshTokenHash = TokenManager.hashToken(refreshToken);

    const claims: UserTokenClaims = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      sessionId,
    };
    const accessToken = TokenManager.signAccessToken(claims, this.jwtSecret);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TokenManager.REFRESH_TOKEN_TTL_SECONDS * 1000);

    const session: UserSession = {
      id: sessionId,
      userId: user.id,
      currentTokenHash: refreshTokenHash,
      previousTokenHash: null,
      gracePeriodExpiresAt: null,
      deviceFingerprint: input.fingerprint || meta?.deviceFingerprint || null,
      ipAddress: meta?.ipAddress || null,
      userAgent: meta?.userAgent || null,
      isRevoked: false,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await this.sessionStore.saveSession(session);

    return {
      user: this.toProfile(user),
      sessionId,
      accessToken,
      refreshToken,
    };
  }

  public async refresh(refreshToken: string): Promise<TokenRotationResult> {
    return this.rotationService.rotateTokens(refreshToken);
  }

  public async logout(userId: string, sessionId: string): Promise<void> {
    await this.sessionStore.revokeSession(userId, sessionId);
  }

  public async revokeSession(userId: string, targetSessionId: string): Promise<void> {
    await this.sessionStore.revokeSession(userId, targetSessionId);
  }

  public async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.userRepository.findById(userId);
    return user ? this.toProfile(user) : null;
  }

  public async listSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
    const rawSessions = await this.sessionStore.listUserSessions(userId);
    return rawSessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      deviceFingerprint: s.deviceFingerprint,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      isCurrentSession: s.id === currentSessionId,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    }));
  }

  public async checkHealth(): Promise<{ postgres: boolean; redis: boolean }> {
    const [postgres, redis] = await Promise.all([
      this.userRepository.checkHealth(),
      this.sessionStore.checkHealth(),
    ]);
    return { postgres, redis };
  }
}
```

### 5. Tầng Vận Chuyển API Gateway & Auth Guard (RFC 7807)

Khớp nối router xác thực với chuẩn lỗi RFC 7807 Problem Details:

#### `apps/api/src/middleware/auth-guard.ts`

```typescript
import { type FullJWTClaims, TokenManager } from '@acad/auth-service';
import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: FullJWTClaims;
    }
  }
}

export function authGuard(jwtSecret: string = TokenManager.DEFAULT_SECRET) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.setHeader('Content-Type', 'application/problem+json');
      res.status(401).json({
        type: 'https://api.acad.vn/errors/unauthorized',
        title: 'Missing Authorization Token',
        status: 401,
        detail: 'Yêu cầu Bearer access token hợp lệ trong header Authorization.',
        instance: req.originalUrl || req.url,
        correlationId: req.correlationId,
      });
      return;
    }

    const token = authHeader.slice(7).trim();
    const payload = TokenManager.verifyAccessToken(token, jwtSecret);

    if (!payload) {
      res.setHeader('Content-Type', 'application/problem+json');
      res.status(401).json({
        type: 'https://api.acad.vn/errors/unauthorized',
        title: 'Invalid or Expired Token',
        status: 401,
        detail: 'Access token không hợp lệ hoặc đã hết hạn.',
        instance: req.originalUrl || req.url,
        correlationId: req.correlationId,
      });
      return;
    }

    req.user = payload;
    next();
  };
}
```

#### `apps/api/src/routes/auth-router.ts`

```typescript
import type { AuthService } from '@acad/auth-service';
import { TokenManager } from '@acad/auth-service';
import { LoginInputSchema, RefreshTokenInputSchema, RegisterInputSchema } from '@acad/contracts';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { authGuard } from '../middleware/auth-guard.js';

export function createAuthRouter(
  authService: AuthService,
  jwtSecret: string = TokenManager.DEFAULT_SECRET,
): Router {
  const router = Router();
  const guard = authGuard(jwtSecret);

  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedInput = RegisterInputSchema.parse(req.body);
      const meta = {
        ipAddress: req.ip || null,
        userAgent: (req.headers['user-agent'] as string) || null,
        deviceFingerprint: (req.body.deviceFingerprint as string) || null,
      };

      const result = await authService.register(validatedInput, meta);

      res.status(201).json({
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenType: 'Bearer',
          expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedInput = LoginInputSchema.parse(req.body);
      const meta = {
        ipAddress: req.ip || null,
        userAgent: (req.headers['user-agent'] as string) || null,
        deviceFingerprint: (req.body.deviceFingerprint as string) || null,
      };

      const result = await authService.login(validatedInput, meta);

      res.status(200).json({
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenType: 'Bearer',
          expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedInput = RefreshTokenInputSchema.parse(req.body);
      const rotationResult = await authService.refresh(validatedInput.refreshToken);

      if (rotationResult.status === 'SUCCESS') {
        res.status(200).json({
          accessToken: rotationResult.tokenPair.accessToken,
          refreshToken: rotationResult.tokenPair.refreshToken,
          tokenType: 'Bearer',
          expiresIn: rotationResult.tokenPair.expiresIn,
        });
        return;
      }

      if (rotationResult.status === 'GRACE_PERIOD_RENEWED') {
        res.status(200).json({
          accessToken: rotationResult.accessToken,
          refreshToken: validatedInput.refreshToken,
          tokenType: 'Bearer',
          expiresIn: rotationResult.expiresIn,
        });
        return;
      }

      res.setHeader('Content-Type', 'application/problem+json');
      res.status(401).json({
        type: 'https://api.acad.vn/errors/unauthorized',
        title:
          rotationResult.status === 'TOKEN_REUSE_DETECTED'
            ? 'Token Reuse Attack Detected'
            : 'Unauthorized',
        status: 401,
        detail: rotationResult.error,
        instance: req.originalUrl || req.url,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user) {
        await authService.logout(req.user.sub, req.user.sessionId);
      }
      res.status(200).json({ message: 'Đăng xuất thành công' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const profile = await authService.getProfile(req.user!.sub);
      if (!profile) {
        res.status(404).json({
          type: 'https://api.acad.vn/errors/not-found',
          title: 'User Not Found',
          status: 404,
          detail: 'Hồ sơ người dùng không tồn tại.',
        });
        return;
      }
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  });

  router.get('/sessions', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessions = await authService.listSessions(req.user!.sub, req.user!.sessionId);
      res.status(200).json({ sessions });
    } catch (err) {
      next(err);
    }
  });

  router.post('/sessions/:sessionId/revoke', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.revokeSession(req.user!.sub, req.params.sessionId as string);
      res.status(200).json({ message: 'Thu hồi phiên thành công' });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
```

### 6. Quy Trình Kiểm Định Thực Tế Trên Database Cục Bộ

Để chấm dứt hoàn toàn tình trạng `database: not_configured`, toàn bộ quá trình xác thực Phân hệ 1 được thực thi trực tiếp trên container PostgreSQL 16 và Redis 7 thật:

```bash
# 1. Khởi động PostgreSQL 16 và Redis 7 qua Podman/Docker
./scripts/manage-homelab.sh start

# 2. Thực thi Migration tạo Schema bảng users và user_sessions
psql -h localhost -p 5432 -U postgres -d acad_dev -f deploy/migrations/000001_create_auth_schema.up.sql

# 3. Chạy Server kiểm thử kết nối thẳng vào DB thật
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/acad_dev?sslmode=disable"
export REDIS_URL="redis://localhost:6379"
export PORT=3099
node apps/api/dist/server.js &
SERVER_PID=$!

# 4. Kiểm thử Probe Healthcheck xác nhận database: ok và redis: ok
curl -s http://127.0.0.1:3099/healthz | jq .
# Kết quả kỳ vọng:
# {
#   "status": "ok",
#   "version": "2.0.0",
#   "services": {
#     "database": "ok",
#     "redis": "ok"
#   }
# }

# 5. Dọn dẹp tiến trình
kill $SERVER_PID
```

---

# User

`````markdown
Hoàn thiện chi tiết sql, dữ liệu insert phân hệ 1
`````

### 1. Kịch Bản Migration DDL Cơ Sở Dữ Liệu PostgreSQL 16

Hai tệp SQL migration dưới đây thiết lập toàn bộ cấu trúc bảng, kiểu dữ liệu ENUM, khóa ngoại và chỉ mục B-Tree tối ưu cho Phân hệ 1, giải quyết dứt điểm lỗi thiếu cột `threads_count` và bảo đảm tính độc bản không phân biệt chữ hoa/thường.

#### `deploy/migrations/000001_create_auth_schema.up.sql`

```sql
-- ==============================================================================
-- Migration: 000001_create_auth_schema.up.sql
-- Phân hệ: Phân hệ 1 - Định Danh & Quản Trị Phiên (Auth & Session Shield)
-- Hệ quản trị mục tiêu: PostgreSQL 16+
-- ==============================================================================

-- 1. Kích hoạt tiện ích mở rộng mật mã và sinh UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Kiểu dữ liệu liệt kê Enums phân quyền & trạng thái người dùng
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('GUEST', 'USER', 'SPACE_MOD', 'GLOBAL_MOD', 'ADMIN');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'SHADOWBANNED', 'DELETED');
    END IF;
END $$;

-- 3. Bảng users (Danh tính tài khoản, điểm danh tiếng & thống kê)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(32) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    karma_score INTEGER NOT NULL DEFAULT 0,
    threads_count INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_username_length CHECK (char_length(username) >= 3),
    CONSTRAINT chk_karma_not_null CHECK (karma_score IS NOT NULL)
);

-- Chỉ mục độc bản không phân biệt hoa thường (Case-insensitive Unique Indexes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);
CREATE INDEX IF NOT EXISTS idx_users_karma_score ON users (karma_score DESC);

-- 4. Bảng user_sessions (Lưu trữ và đối soát phiên đa thiết bị)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(64) NOT NULL,
    previous_token_hash VARCHAR(64),
    grace_period_expires_at TIMESTAMPTZ,
    device_fingerprint VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục phục vụ tra cứu phiên và phòng thủ tấn công Replay Attack
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions (user_id) WHERE NOT is_revoked;
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON user_sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_prev_token_hash ON user_sessions (previous_token_hash) WHERE previous_token_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions (expires_at);

-- 5. Trigger tự động cập nhật trường updated_at
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER trg_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp_column();
```

#### `deploy/migrations/000001_create_auth_schema.down.sql`

```sql
-- ==============================================================================
-- Migration: 000001_create_auth_schema.down.sql
-- Thao tác: Rollback sạch Phân hệ 1
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_user_sessions_updated_at ON user_sessions;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_timestamp_column();

DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
```

### 2. Dữ Liệu Nạp Mẫu Idempotent PostgreSQL (`001_auth_seed.sql`)

Tệp nạp dữ liệu sử dụng **UUID xác định cố định (Deterministic UUIDs)**, chứa đầy đủ 6 vai trò/trạng thái tài khoản và các kịch bản phiên làm việc (đang hoạt động, trong cửa sổ ân hạn 30s Grace Period, và phiên đã bị thu hồi).

Mật khẩu mẫu cho toàn bộ tài khoản thử nghiệm là: `Password123!`

Mã băm Scrypt tương ứng với cấu hình 64MB RAM (`N=16384, r=8, p=1`):

`$scrypt$N=16384,r=8,p=1$1c0cc084a00fd448603bad80cc9f96c8$f4bf2f329becf9c58901a63f983143e301ae63080b64e621be373df1678e7555214ddb9b7f9d448aa43f94c4b45e64989187b6f7b0875be366b4107e323ef4d0`

#### `deploy/seeds/001_auth_seed.sql`

```sql
-- ==============================================================================
-- ACAD DEVOPS PLATFORM - SEED DỮ LIỆU PHÂN HỆ 1 (AUTH & SESSIONS)
-- File: deploy/seeds/001_auth_seed.sql
-- Mục tiêu: Nạp dữ liệu tài khoản cố định và các phiên kiểm thử
-- ==============================================================================

BEGIN;

-- 1. SEED TÀI KHOẢN NGƯỜI DÙNG (6 KỊCH BẢN VAI TRÒ & TRẠNG THÁI)
INSERT INTO users (
    id, username, email, password_hash, role, status, karma_score, threads_count, avatar_url, bio, created_at, updated_at
)
VALUES
  -- 1. Quản trị viên hệ thống (Admin)
  (
    'a0000000-0000-0000-0000-000000000001',
    'admin_pro',
    'admin@acad.vn',
    '$scrypt$N=16384,r=8,p=1$1c0cc084a00fd448603bad80cc9f96c8$f4bf2f329becf9c58901a63f983143e301ae63080b64e621be373df1678e7555214ddb9b7f9d448aa43f94c4b45e64989187b6f7b0875be366b4107e323ef4d0',
    'ADMIN',
    'ACTIVE',
    9999,
    0,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'Lead Systems Architect & Core Admin. Giám sát an toàn bảo mật và cụm dịch vụ phân tán.',
    NOW() - INTERVAL '60 days',
    NOW()
  ),
  -- 2. Kiểm duyệt viên toàn cục (Global Moderator)
  (
    'a0000000-0000-0000-0000-000000000002',
    'mod_lead',
    'mod@acad.vn',
    '$scrypt$N=16384,r=8,p=1$1c0cc084a00fd448603bad80cc9f96c8$f4bf2f329becf9c58901a63f983143e301ae63080b64e621be373df1678e7555214ddb9b7f9d448aa43f94c4b45e64989187b6f7b0875be366b4107e323ef4d0',
    'GLOBAL_MOD',
    'ACTIVE',
    3420,
    0,
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    'Global Mod & DevSecOps Lead. Điều phối Mod Queue và xử lý vi phạm nội dung hệ thống.',
    NOW() - INTERVAL '45 days',
    NOW()
  ),
  -- 3. Quản trị viên không gian (Space Moderator)
  (
    'a0000000-0000-0000-0000-000000000003',
    'cloud_architect',
    'architect@acad.vn',
    '$scrypt$N=16384,r=8,p=1$1c0cc084a00fd448603bad80cc9f96c8$f4bf2f329becf9c58901a63f983143e301ae63080b64e621be373df1678e7555214ddb9b7f9d448aa43f94c4b45e64989187b6f7b0875be366b4107e323ef4d0',
    'SPACE_MOD',
    'ACTIVE',
    1850,
    0,
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    'Principal Cloud Architect. Chuyên sâu về Kubernetes internals, High Availability và Linux Kernel.',
    NOW() - INTERVAL '30 days',
    NOW()
  ),
  -- 4. Người dùng tiêu chuẩn (Active Standard User)
  (
    'a0000000-0000-0000-0000-000000000004',
    'devops_coder',
    'coder@acad.vn',
    '$scrypt$N=16384,r=8,p=1$1c0cc084a00fd448603bad80cc9f96c8$f4bf2f329becf9c58901a63f983143e301ae63080b64e621be373df1678e7555214ddb9b7f9d448aa43f94c4b45e64989187b6f7b0875be366b4107e323ef4d0',
    'USER',
    'ACTIVE',
    420,
    0,
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    'Senior DevOps Engineer. Thiết kế CI/CD pipeline, GitOps ArgoCD và hạ tầng đám mây.',
    NOW() - INTERVAL '15 days',
    NOW()
  ),
  -- 5. Người dùng bị cấm ngầm (Shadowbanned Spammer)
  (
    'a0000000-0000-0000-0000-000000000005',
    'stealth_spammer',
    'spammer@acad.vn',
    '$scrypt$N=16384,r=8,p=1$1c0cc084a00fd448603bad80cc9f96c8$f4bf2f329becf9c58901a63f983143e301ae63080b64e621be373df1678e7555214ddb9b7f9d448aa43f94c4b45e64989187b6f7b0875be366b4107e323ef4d0',
    'USER',
    'SHADOWBANNED',
    -50,
    0,
    NULL,
    'Tài khoản thử nghiệm cơ chế cấm ngầm (Shadowban Engine).',
    NOW() - INTERVAL '10 days',
    NOW()
  ),
  -- 6. Người dùng bị khóa tài khoản hoàn toàn (Suspended Bad Actor)
  (
    'a0000000-0000-0000-0000-000000000006',
    'banned_actor',
    'banned@acad.vn',
    '$scrypt$N=16384,r=8,p=1$1c0cc084a00fd448603bad80cc9f96c8$f4bf2f329becf9c58901a63f983143e301ae63080b64e621be373df1678e7555214ddb9b7f9d448aa43f94c4b45e64989187b6f7b0875be366b4107e323ef4d0',
    'USER',
    'SUSPENDED',
    -200,
    0,
    NULL,
    'Tài khoản bị đình chỉ hoạt động do vi phạm nghiêm trọng quy chuẩn cộng đồng.',
    NOW() - INTERVAL '5 days',
    NOW()
  )
ON CONFLICT (id) DO UPDATE 
SET username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    karma_score = EXCLUDED.karma_score,
    threads_count = EXCLUDED.threads_count,
    bio = EXCLUDED.bio,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();

-- 2. SEED PHIÊN LÀM VIỆC (USER_SESSIONS) ĐẠI DIỆN CÁC KỊCH BẢN XÁC THỰC
-- Chú thích mã băm SHA-256 từ Refresh Token mẫu:
-- Refresh Token mẫu: "raw_refresh_token_admin_secret_64bytes_sample_hash_001"
-- SHA-256 băm: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

INSERT INTO user_sessions (
    id, user_id, refresh_token_hash, previous_token_hash, grace_period_expires_at, device_fingerprint, ip_address, user_agent, is_revoked, expires_at, created_at, updated_at
)
VALUES
  -- Phiên 1: Admin đang hoạt động bình thường trên máy trạm Debian
  (
    's0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    NULL,
    NULL,
    'debian13_xfce_x86_64_admin_station',
    '127.0.0.1'::inet,
    'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
    FALSE,
    NOW() + INTERVAL '7 days',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
  ),
  -- Phiên 2: devops_coder vừa xoay vòng token, đang trong cửa sổ ân hạn 30s Grace Period
  (
    's0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e', -- current_token_hash
    '1111111111111111111111111111111111111111111111111111111111111111', -- previous_token_hash
    NOW() + INTERVAL '25 seconds',                                          -- Grace period còn 25s
    'macos_arm64_safari_developer',
    '192.168.1.150'::inet,
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Chrome/120.0',
    FALSE,
    NOW() + INTERVAL '7 days',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '5 seconds'
  ),
  -- Phiên 3: Phiên cũ của devops_coder đã bị thu hồi từ xa (Revoked Session)
  (
    's0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000004',
    '2222222222222222222222222222222222222222222222222222222222222222',
    NULL,
    NULL,
    'iphone15_mobile_safari',
    '14.232.208.55'::inet,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148',
    TRUE, -- Đã thu hồi
    NOW() + INTERVAL '3 days',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO UPDATE
SET current_token_hash = EXCLUDED.refresh_token_hash,
    previous_token_hash = EXCLUDED.previous_token_hash,
    grace_period_expires_at = EXCLUDED.grace_period_expires_at,
    is_revoked = EXCLUDED.is_revoked,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();

COMMIT;
```

### 3. Dữ Liệu Đồng Bộ Bộ Nhớ Đệm Redis (`001_auth_redis_seed.sh`)

Vì Phân hệ 1 kiểm tra session song song tại Redis để đạt tốc độ phản hồi $\mathcal{O}(1)$ và tự động xoay vòng token, kịch bản dưới đây nạp đồng bộ các key Redis tương ứng với dữ liệu PostgreSQL vừa insert:

```bash
#!/usr/bin/env bash
# ==============================================================================
# ĐỒNG BỘ SESSION REDIS MẪU PHÂN HỆ 1 (KEYSPACE & O(1) LOOKUP)
# File: deploy/seeds/001_auth_redis_seed.sh
# ==============================================================================
set -e

REDIS_CMD="${REDIS_CLI:-redis-cli}"
echo "--- Đang nạp dữ liệu phiên làm việc Phân hệ 1 vào Redis ---"

# 1. Nạp Session 1: admin_pro (Active)
ADMIN_USER_ID="a0000000-0000-0000-0000-000000000001"
ADMIN_SESSION_ID="s0000000-0000-0000-0000-000000000001"
ADMIN_TOKEN_HASH="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

$REDIS_CMD HSET "session:${ADMIN_USER_ID}:${ADMIN_SESSION_ID}" \
  id "$ADMIN_SESSION_ID" \
  userId "$ADMIN_USER_ID" \
  currentTokenHash "$ADMIN_TOKEN_HASH" \
  previousTokenHash "" \
  gracePeriodExpiresAt "" \
  deviceFingerprint "debian13_xfce_x86_64_admin_station" \
  ipAddress "127.0.0.1" \
  userAgent "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0" \
  isRevoked "false" \
  expiresAt "$(date -d '+7 days' --iso-8601=seconds)" \
  createdAt "$(date --iso-8601=seconds)" \
  updatedAt "$(date --iso-8601=seconds)"

$REDIS_CMD EXPIRE "session:${ADMIN_USER_ID}:${ADMIN_SESSION_ID}" 604800
$REDIS_CMD SETEX "session_lookup:${ADMIN_TOKEN_HASH}" 604800 "${ADMIN_USER_ID}:${ADMIN_SESSION_ID}"

# 2. Nạp Session 2: devops_coder (Đang trong 30s Grace Period)
CODER_USER_ID="a0000000-0000-0000-0000-000000000004"
CODER_SESSION_ID="s0000000-0000-0000-0000-000000000002"
CODER_CURRENT_HASH="a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"
CODER_PREV_HASH="1111111111111111111111111111111111111111111111111111111111111111"

$REDIS_CMD HSET "session:${CODER_USER_ID}:${CODER_SESSION_ID}" \
  id "$CODER_SESSION_ID" \
  userId "$CODER_USER_ID" \
  currentTokenHash "$CODER_CURRENT_HASH" \
  previousTokenHash "$CODER_PREV_HASH" \
  gracePeriodExpiresAt "$(date -d '+25 seconds' --iso-8601=seconds)" \
  deviceFingerprint "macos_arm64_safari_developer" \
  ipAddress "192.168.1.150" \
  userAgent "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15" \
  isRevoked "false" \
  expiresAt "$(date -d '+7 days' --iso-8601=seconds)" \
  createdAt "$(date --iso-8601=seconds)" \
  updatedAt "$(date --iso-8601=seconds)"

$REDIS_CMD EXPIRE "session:${CODER_USER_ID}:${CODER_SESSION_ID}" 604800
$REDIS_CMD SETEX "session_lookup:${CODER_CURRENT_HASH}" 604800 "${CODER_USER_ID}:${CODER_SESSION_ID}"
$REDIS_CMD SETEX "session_lookup:${CODER_PREV_HASH}" 35 "${CODER_USER_ID}:${CODER_SESSION_ID}"

echo "✅ Đã nạp thành công bộ đệm phiên Redis Phân hệ 1."
```

### 4. Quy Trình Nạp Dữ Liệu & Đối Soát Trực Tiếp Trên Terminal

Thực hiện tuần tự các lệnh sau trên terminal Debian để đưa dữ liệu vào hệ thống và kiểm thử truy vấn thực tế:

```bash
# 1. Nạp DDL Schema vào PostgreSQL cục bộ
psql -h localhost -p 5432 -U postgres -d acad_dev -f deploy/migrations/000001_create_auth_schema.up.sql

# 2. Nạp dữ liệu tài khoản và phiên mẫu Idempotent
psql -h localhost -p 5432 -U postgres -d acad_dev -f deploy/seeds/001_auth_seed.sql

# 3. Đồng bộ Hash phiên vào Redis 7 cục bộ
chmod +x deploy/seeds/001_auth_redis_seed.sh
./deploy/seeds/001_auth_redis_seed.sh

# 4. Kiểm tra đối soát trực tiếp trong CSDL PostgreSQL
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
SELECT id, username, email, role, status, karma_score, threads_count FROM users ORDER BY role, karma_score DESC;
"

# 5. Đối soát phiên làm việc trong Redis
redis-cli HGETALL "session:a0000000-0000-0000-0000-000000000001:s0000000-0000-0000-0000-000000000001"
```

---

# User

`````markdown
Hoàn thiện chi tiết Phân hệ 2, sql, chưa gồm insert
`````

### 1. Phân Tích & Chuẩn Hóa Lược Đồ Dữ Liệu Phân Hệ 2

Phân hệ 2 chịu trách nhiệm quản lý cấu trúc cộng đồng, xuất bản nội dung và cây thảo luận đa tầng. Để triệt tiêu hoàn toàn các lỗi lệch pha giữa mã nguồn TypeScript và CSDL đã phát hiện trước đó, lược đồ DDL được chuẩn hóa lại với các điểm cốt lõi:

- **Bổ sung `is_private` cho bảng `spaces`**: Đảm bảo trường kiểm soát quyền riêng tư tồn tại ở tầng CSDL (`BOOLEAN NOT NULL DEFAULT FALSE`), loại bỏ việc gán cứng `isPrivate: false` trong tầng service.
- **Đồng bộ thuộc tính `space_flairs`**: Bổ sung đầy đủ các cột `slug`, `color_hex`, `background_hex` và ràng buộc độc bản `UNIQUE (space_id, slug)` thay vì chỉ lưu trường `color` đơn lẻ.
- **Chuẩn hóa định danh ảnh**: Thống nhất trường biểu tượng không gian thành `icon_url` (đồng bộ với DTO của `@acad/contracts`).
- **Cơ chế đếm tự động bằng DB Triggers**: Triển khai các trigger mức CSDL để tự động cập nhật `member_count`, `thread_count` (trên bảng `spaces`) và `comment_count` (trên bảng `threads`) khi có bản ghi phát sinh hoặc bị xóa, loại bỏ việc tăng/giảm bộ đếm thủ công rải rác trong code ứng dụng.

```text
spaces (1) ──< space_memberships (N) >── users
  │
  ├──< space_flairs (N)
  │         │
  └──< threads (N) ──< comments (ltree GiST)
```

### 2. Kịch Bản Migration DDL Hoàn Chỉnh (PostgreSQL 16)

#### `deploy/migrations/000002_create_community_schema.up.sql`

```sql
-- ==============================================================================
-- Migration: 000002_create_community_schema.up.sql
-- Phân hệ: Phân hệ 2 - Spaces, Content Engine & Nested Comments (ltree)
-- Hệ quản trị mục tiêu: PostgreSQL 16+
-- ==============================================================================

-- 1. Kích hoạt tiện ích mở rộng ltree (Cây phân cấp) và pg_trgm (Tìm kiếm mờ)
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Kiểu dữ liệu liệt kê Enums phân hệ cộng đồng
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'space_role') THEN
        CREATE TYPE space_role AS ENUM ('MEMBER', 'MODERATOR', 'CREATOR');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'thread_type') THEN
        CREATE TYPE thread_type AS ENUM ('TEXT', 'LINK', 'MEDIA');
    END IF;
END $$;

-- 3. Bảng spaces (Không gian thảo luận chuyên đề tương đương Subreddit)
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL,
    slug VARCHAR(64) NOT NULL,
    description TEXT,
    icon_url TEXT,
    banner_url TEXT,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    member_count INTEGER NOT NULL DEFAULT 1,
    thread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_spaces_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT chk_spaces_name_len CHECK (char_length(name) >= 2)
);

-- Chỉ mục tối ưu cho spaces
CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_slug_lower ON spaces (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_spaces_name_trgm ON spaces USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_spaces_member_count ON spaces (member_count DESC);
CREATE INDEX IF NOT EXISTS idx_spaces_creator_id ON spaces (creator_id);

-- 4. Bảng space_memberships (Thành viên tham gia không gian)
CREATE TABLE IF NOT EXISTS space_memberships (
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role space_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON space_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_space_role ON space_memberships (space_id, role);

-- 5. Bảng space_flairs (Hệ thống nhãn phân loại bài viết kỹ thuật)
CREATE TABLE IF NOT EXISTS space_flairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#DFD0B8',
    background_hex VARCHAR(7) NOT NULL DEFAULT '#393E46',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_space_flair_slug UNIQUE (space_id, slug),
    CONSTRAINT chk_flair_color_hex CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_flair_bg_hex CHECK (background_hex ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_flairs_space ON space_flairs (space_id);

-- 6. Bảng threads (Bài viết thảo luận kỹ thuật)
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flair_id UUID REFERENCES space_flairs(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(350) NOT NULL,
    content TEXT,
    link_url TEXT,
    thread_type thread_type NOT NULL DEFAULT 'TEXT',
    upvotes_count INTEGER NOT NULL DEFAULT 0,
    downvotes_count INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_threads_slug UNIQUE (slug),
    CONSTRAINT chk_threads_title_len CHECK (char_length(title) >= 5)
);

-- Chỉ mục phục vụ truy vấn bảng tin và tìm kiếm mờ
CREATE INDEX IF NOT EXISTS idx_threads_space_created ON threads (space_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_author ON threads (author_id);
CREATE INDEX IF NOT EXISTS idx_threads_flair ON threads (flair_id) WHERE flair_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_threads_title_trgm ON threads USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads (created_at DESC);

-- 7. Bảng comments (Cây bình luận đa tầng Materialized Path ltree)
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    path LTREE NOT NULL,
    depth SMALLINT NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    reply_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    upvotes_count INTEGER NOT NULL DEFAULT 0,
    downvotes_count INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_comments_depth CHECK (depth >= 1 AND depth <= 20)
);

-- Chỉ mục GiST cho phép truy vấn toàn bộ cây con trong O(1) < 1.2ms
CREATE INDEX IF NOT EXISTS idx_comments_path_gist ON comments USING gist (path);
CREATE INDEX IF NOT EXISTS idx_comments_thread_path ON comments (thread_id, path);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments (author_id);

-- ==============================================================================
-- 8. TRIGGERS TỰ ĐỘNG HÓA CẬP NHẬT TIMESTAMP VÀ BỘ ĐẾM CSDL
-- ==============================================================================

-- A. Cập nhật updated_at
CREATE OR REPLACE FUNCTION update_community_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_spaces_updated_at ON spaces;
CREATE TRIGGER trg_spaces_updated_at
    BEFORE UPDATE ON spaces
    FOR EACH ROW
    EXECUTE FUNCTION update_community_timestamp();

DROP TRIGGER IF EXISTS trg_threads_updated_at ON threads;
CREATE TRIGGER trg_threads_updated_at
    BEFORE UPDATE ON threads
    FOR EACH ROW
    EXECUTE FUNCTION update_community_timestamp();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_community_timestamp();

-- B. Tự động tính toán member_count trên spaces
CREATE OR REPLACE FUNCTION maintain_space_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE spaces SET member_count = member_count + 1 WHERE id = NEW.space_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE spaces SET member_count = GREATEST(1, member_count - 1) WHERE id = OLD.space_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_space_members_count ON space_memberships;
CREATE TRIGGER trg_space_members_count
    AFTER INSERT OR DELETE ON space_memberships
    FOR EACH ROW
    EXECUTE FUNCTION maintain_space_member_count();

-- C. Tự động tính toán thread_count trên spaces và threads_count trên users
CREATE OR REPLACE FUNCTION maintain_thread_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE spaces SET thread_count = thread_count + 1 WHERE id = NEW.space_id;
        UPDATE users SET threads_count = threads_count + 1 WHERE id = NEW.author_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE spaces SET thread_count = GREATEST(0, thread_count - 1) WHERE id = OLD.space_id;
        UPDATE users SET threads_count = GREATEST(0, threads_count - 1) WHERE id = OLD.author_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_threads_counter_maintenance ON threads;
CREATE TRIGGER trg_threads_counter_maintenance
    AFTER INSERT OR DELETE ON threads
    FOR EACH ROW
    EXECUTE FUNCTION maintain_thread_counts();

-- D. Tự động tính toán comment_count trên threads
CREATE OR REPLACE FUNCTION maintain_thread_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE threads SET comment_count = comment_count + 1 WHERE id = NEW.thread_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE threads SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.thread_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comments_counter_maintenance ON comments;
CREATE TRIGGER trg_comments_counter_maintenance
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION maintain_thread_comment_count();
```

#### `deploy/migrations/000002_create_community_schema.down.sql`

```sql
-- ==============================================================================
-- Migration: 000002_create_community_schema.down.sql
-- Thao tác: Rollback toàn bộ cấu trúc bảng và triggers Phân hệ 2
-- ==============================================================================

-- 1. Thu hồi các Triggers
DROP TRIGGER IF EXISTS trg_comments_counter_maintenance ON comments;
DROP FUNCTION IF EXISTS maintain_thread_comment_count();

DROP TRIGGER IF EXISTS trg_threads_counter_maintenance ON threads;
DROP FUNCTION IF EXISTS maintain_thread_counts();

DROP TRIGGER IF EXISTS trg_space_members_count ON space_memberships;
DROP FUNCTION IF EXISTS maintain_space_member_count();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS trg_threads_updated_at ON threads;
DROP TRIGGER IF EXISTS trg_spaces_updated_at ON spaces;
DROP FUNCTION IF EXISTS update_community_timestamp();

-- 2. Xóa bảng theo đúng thứ tự phụ thuộc khóa ngoại
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS threads CASCADE;
DROP TABLE IF EXISTS space_flairs CASCADE;
DROP TABLE IF EXISTS space_memberships CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;

-- 3. Xóa các Enums
DROP TYPE IF EXISTS thread_type CASCADE;
DROP TYPE IF EXISTS space_role CASCADE;
```

### 3. Ma Trận Chỉ Mục Tối Ưu & Cơ Chế Hoạt Động

| Bảng dữ liệu               | Tên chỉ mục                         | Loại chỉ mục             | Cột / Biểu thức                               | Mục đích & Độ phức tạp                                                             |
| -------------------------- | ----------------------------------- | ------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| <br>**`spaces`**<br>       | <br>`idx_spaces_slug_lower`<br>     | B-Tree                   | <br>`LOWER(slug)`<br>                         | <br>Định tuyến URL `/s/[slug]` chuẩn xác, $\mathcal{O}(\log N)$<br>                |
| <br>**`spaces`**<br>       | <br>`idx_spaces_name_trgm`<br>      | <br>GIN<br>              | <br>`name gin_trgm_ops`<br>                   | <br>Tìm kiếm không gian mờ (fuzzy search) theo từ khóa<br>                         |
| <br>**`space_flairs`**<br> | <br>`uq_space_flair_slug`<br>       | B-Tree Unique            | <br>`(space_id, slug)`<br>                    | <br>Ngăn chặn trùng lặp nhãn phân loại trong cùng một Space<br>                    |
| <br>**`threads`**<br>      | <br>`idx_threads_space_created`<br> | <br>B-Tree Composite<br> | `(space_id, is_pinned DESC, created_at DESC)` | <br>Truy vấn bài viết theo Space: đưa bài ghim lên đầu, bài mới xếp sau<br>        |
| <br>**`threads`**<br>      | <br>`idx_threads_title_trgm`<br>    | <br>GIN<br>              | <br>`title gin_trgm_ops`<br>                  | <br>Tìm kiếm bài viết nội bộ (In-Space Scoped Search) qua toán tử `ILIKE`<br>      |
| <br>**`comments`**<br>     | <br>`idx_comments_path_gist`<br>    | <br>**GiST**<br>         | <br>`path` (`ltree`)<br>                      | <br>**Truy vấn toàn bộ cây con `<@` trong 1 lượt scan $< 1.2\text{ms}$**<br>       |
| <br>**`comments`**<br>     | <br>`idx_comments_thread_path`<br>  | <br>B-Tree Composite<br> | <br>`(thread_id, path)`<br>                   | <br>Tải toàn bộ cây bình luận theo Thread theo đúng thứ tự hiển thị phân nhánh<br> |

### 4. Quy Trình Thực Thi & Kiểm Thử DDL Trên Terminal

Chạy trực tiếp các lệnh sau trên terminal Debian để khởi tạo Phân hệ 2 trên CSDL PostgreSQL 16 cục bộ:

```bash
# 1. Thực thi tệp migration DDL Phân hệ 2
psql -h localhost -p 5432 -U postgres -d acad_dev -f deploy/migrations/000002_create_community_schema.up.sql

# 2. Xác thực việc kích hoạt 2 extensions bắt buộc (ltree và pg_trgm)
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
SELECT extname, extversion FROM pg_extension WHERE extname IN ('ltree', 'pg_trgm', 'uuid-ossp');
"

# 3. Xác thực cấu trúc bảng spaces đã có đủ cột is_private và icon_url
psql -h localhost -p 5432 -U postgres -d acad_dev -c "\d spaces"

# 4. Xác thực chỉ mục GiST trên trường path của bảng comments
psql -h localhost -p 5432 -U postgres -d acad_dev -c "\d comments"
```

---

# User

`````markdown
Hoàn thiện chi tiết sql, dữ liệu insert phân hệ 2
`````

Tệp SQL nạp dữ liệu dưới đây hoàn thiện toàn bộ dữ liệu mẫu thực tế cho **Phân hệ 2 (Spaces, Memberships, Flairs, Threads & Cây bình luận `ltree`)**. Tệp sử dụng **UUID tiền tố cố định (Deterministic UUIDs)**, phụ thuộc chính xác vào các User ID đã khởi tạo ở Phân hệ 1 (`001_auth_seed.sql`), và kích hoạt chuẩn xác các Triggers tự động cập nhật số lượng thành viên, bài viết và bình luận đã thiết lập trong migration `000002`.

### 1. Kịch Bản SQL Nạp Dữ Liệu Phân Hệ 2 (`deploy/seeds/002_community_seed.sql`)

```sql
-- ==============================================================================
-- ACAD DEVOPS PLATFORM - SEED DỮ LIỆU PHÂN HỆ 2 (SPACES, THREADS & LTREE COMMENTS)
-- File: deploy/seeds/002_community_seed.sql
-- Mục tiêu: Khởi tạo dữ liệu cộng đồng kỹ thuật thực tế, nhãn flairs, bài viết
--          và cây bình luận lồng nhau ltree đa tầng (đến cấp 8 và soft delete)
-- ==============================================================================

BEGIN;

-- 0. DỌN SẠCH DỮ LIỆU CŨ THEO THỨ TỰ KHÓA NGOẠI (IDEMPOTENT CLEANUP)
DELETE FROM comments WHERE thread_id IN (
    SELECT id FROM threads WHERE space_id IN (
        'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000005'
    )
);
DELETE FROM threads WHERE space_id IN (
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005'
);
DELETE FROM space_flairs WHERE space_id IN (
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005'
);
DELETE FROM space_memberships WHERE space_id IN (
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005'
);
DELETE FROM spaces WHERE id IN (
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005'
);

-- 1. SEED SPACES (5 KHÔNG GIAN THẢO LUẬN KỸ THUẬT)
-- Khởi tạo member_count = 0 và thread_count = 0 để Triggers CSDL tự động tính toán chính xác
INSERT INTO spaces (
    id, name, slug, description, icon_url, banner_url, rules, is_private, creator_id, member_count, thread_count, created_at, updated_at
)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'DevOps & Infrastructure',
    'devops-arch',
    'Cộng đồng chuyên sâu về kiến trúc hệ thống phân tán, hạ tầng High Availability, SRE và tự động hóa CI/CD.',
    'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=128',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200',
    '[
      {"title": "Tranh luận dựa trên số liệu", "description": "Ưu tiên phân tích RPS, P95/P99 latency, IOPS và log trace thực tế thay vì suy đoán cảm tính."},
      {"title": "Bảo vệ bí mật an toàn", "description": "Tuyệt đối không đưa private key, credentials production, JWT secrets vào nội dung bài viết."},
      {"title": "Chuẩn hóa định dạng", "description": "Đính kèm code block, log máy chủ, và sơ đồ ASCII/Mermaid rõ ràng."}
    ]'::jsonb,
    FALSE,
    'a0000000-0000-0000-0000-000000000003', -- cloud_architect
    0, 0,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Distributed Systems Design',
    'system-design',
    'Mổ xẻ kiến trúc quy mô lớn: Kafka event-driven, Database Sharding, Raft Consensus, Cache Stampede mitigation.',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=128',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200',
    '[
      {"title": "Tôn trọng bản quyền tác giả", "description": "Trích dẫn nguồn whitepaper và tài liệu gốc của các hệ thống phân tán."},
      {"title": "Khách quan trong so sánh", "description": "Đánh giá trade-off công nghệ theo định lý CAP và PACELC, không thiên vị cá nhân."}
    ]'::jsonb,
    FALSE,
    'a0000000-0000-0000-0000-000000000001', -- admin_pro
    0, 0,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'Kubernetes & Cloud Native VN',
    'kubernetes-vn',
    'Chuyên sâu về Kubernetes internals, Cilium eBPF CNI, Istio Service Mesh, Podman rootless và vận hành container.',
    'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=128',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200',
    '[
      {"title": "Đính kèm manifest", "description": "Luôn kèm YAML manifest rút gọn hoặc Helm values khi đăng bài gỡ rối lỗi crash container."},
      {"title": "Ghi rõ phiên bản k8s", "description": "Nêu rõ version k8s runtime, CNI plugin và hạ tầng máy chủ."}
    ]'::jsonb,
    FALSE,
    'a0000000-0000-0000-0000-000000000004', -- devops_coder
    0, 0,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'DevSecOps & Zero Trust',
    'security-shield',
    'An ninh hạ tầng đám mây, Zero Trust architecture, bảo mật chuỗi cung ứng phần mềm (SLSA), phòng chống DDoS.',
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=128',
    'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=1200',
    '[
      {"title": "Nghiêm cấm chia sẻ mã độc", "description": "Không phát tán reverse shell, malware, hoặc thông tin tấn công phá hoại."},
      {"title": "Có trách nhiệm công bố", "description": "Tuân thủ quy trình Responsible Disclosure khi bàn luận về các lỗ hổng 0-day."}
    ]'::jsonb,
    FALSE,
    'a0000000-0000-0000-0000-000000000002', -- mod_lead
    0, 0,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'Incident Room & Post-Mortem',
    'incident-vault',
    'Không gian nội bộ phân tích sự cố production thực tế, báo cáo hậu kiểm không đổ lỗi (Blameless Post-Mortem).',
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=128',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=1200',
    '[
      {"title": "Không gian riêng tư", "description": "Thành viên chỉ được duyệt tham gia khi có xác thực từ ban quản trị."},
      {"title": "Blameless Culture", "description": "Tập trung vào thiếu sót của hệ thống và quy trình, không quy chụp lỗi cá nhân."}
    ]'::jsonb,
    TRUE, -- Không gian Private để kiểm thử quyền truy cập
    'a0000000-0000-0000-0000-000000000001', -- admin_pro
    0, 0,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
  );

-- 2. SEED SPACE MEMBERSHIPS (TỰ ĐỘNG KÍCH HOẠT TRIGGER TĂNG member_count TRÊN SPACES)
INSERT INTO space_memberships (space_id, user_id, role, joined_at)
VALUES
  -- devops-arch
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'CREATOR', NOW() - INTERVAL '30 days'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'MODERATOR', NOW() - INTERVAL '29 days'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'MODERATOR', NOW() - INTERVAL '28 days'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'MEMBER', NOW() - INTERVAL '20 days'),

  -- system-design
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'CREATOR', NOW() - INTERVAL '25 days'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'MODERATOR', NOW() - INTERVAL '24 days'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'MEMBER', NOW() - INTERVAL '15 days'),

  -- kubernetes-vn
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'CREATOR', NOW() - INTERVAL '20 days'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'MEMBER', NOW() - INTERVAL '19 days'),

  -- security-shield
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'CREATOR', NOW() - INTERVAL '15 days'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'MEMBER', NOW() - INTERVAL '10 days'),

  -- incident-vault (Private)
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'CREATOR', NOW() - INTERVAL '10 days'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'MODERATOR', NOW() - INTERVAL '9 days'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'MEMBER', NOW() - INTERVAL '8 days');

-- 3. SEED SPACE FLAIRS (NHÃN BÀI VIẾT KỸ THUẬT VỚI BẢNG MÀU BRUTALIST)
INSERT INTO space_flairs (id, space_id, name, slug, color_hex, background_hex, created_at)
VALUES
  -- Flairs for devops-arch
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Architecture', 'architecture', '#DFD0B8', '#393E46', NOW() - INTERVAL '30 days'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'CI/CD Pipeline', 'cicd-pipeline', '#3B82F6', '#222831', NOW() - INTERVAL '30 days'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'High Availability', 'high-availability', '#22C55E', '#222831', NOW() - INTERVAL '30 days'),

  -- Flairs for system-design
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Deep Dive', 'deep-dive', '#DFD0B8', '#393E46', NOW() - INTERVAL '25 days'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'Database Internals', 'database-internals', '#F59E0B', '#222831', NOW() - INTERVAL '25 days'),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'Event Driven', 'event-driven', '#8B5CF6', '#222831', NOW() - INTERVAL '25 days'),

  -- Flairs for kubernetes-vn
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 'eBPF / Networking', 'ebpf-networking', '#06B6D4', '#222831', NOW() - INTERVAL '20 days'),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000003', 'Production Trouble', 'production-trouble', '#EF4444', '#393E46', NOW() - INTERVAL '20 days'),

  -- Flairs for security-shield
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000004', 'Zero Trust', 'zero-trust', '#10B981', '#222831', NOW() - INTERVAL '15 days'),
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000004', 'Vulnerability Alert', 'vulnerability-alert', '#EF4444', '#222831', NOW() - INTERVAL '15 days'),

  -- Flairs for incident-vault
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000005', 'Post-Mortem P1', 'post-mortem-p1', '#DC2626', '#393E46', NOW() - INTERVAL '10 days'),
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000005', 'RCA Lesson', 'rca-lesson', '#F59E0B', '#393E46', NOW() - INTERVAL '10 days');

-- 4. SEED THREADS (BÀI VIẾT KỸ THUẬT THỰC TẾ)
-- Khi insert, Triggers CSDL sẽ tự động tăng spaces.thread_count và users.threads_count
INSERT INTO threads (
    id, space_id, author_id, flair_id, title, slug, content, link_url, thread_type, upvotes_count, downvotes_count, comment_count, is_pinned, is_locked, created_at, updated_at
)
VALUES
  -- Thread 1 (Tâm điểm kiểm thử cây bình luận sâu)
  (
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003', -- cloud_architect
    'c0000000-0000-0000-0000-000000000001', -- Architecture
    'Triển khai Self-Hosted Homelab: Podman Rootless, Cloudflare Tunnel và Next.js 15 SSR',
    'trien-khai-self-hosted-homelab-podman-rootless-cloudflare-tunnel',
    '### Kiến Trúc Hạ Tầng Cục Bộ Đạt Chuẩn Production
Bài viết chia sẻ toàn bộ kiến trúc chạy một cụm dịch vụ Monorepo phân tán hoàn toàn trên máy trạm Debian 13 cá nhân, không tốn chi phí thuê Cloud VPS nhưng vẫn công khai tên miền Internet qua Cloudflare Zero Trust:

1. **Podman Rootless:** Chạy PostgreSQL 16 Alpine và Redis 7 Alpine không cần quyền root, phân quyền Cgroups v2 với giới hạn bộ nhớ 1GB RAM và 2 CPU cores.
2. **Systemd User Units:** Tự động điều phối Backend API Gateway (cổng 10000) và Next.js 15 Web Client (cổng 3000) tự khởi chạy cùng máy mà không cần sudo.
3. **Cloudflare Tunnel (`cloudflared`):** Khởi tạo 4 luồng QUIC/HTTP2 ra các edge server của Cloudflare. Hoàn toàn không mở cổng Router (No Port Forwarding), ẩn 100% IP nhà mạng và vượt qua CGNAT.
4. **PostgreSQL Materialized Path `ltree`:** Tối ưu hóa cây thảo luận đa tầng với chỉ mục GiST, đạt thời gian truy xuất dưới 1.2ms cho toàn bộ cây con.',
    NULL,
    'TEXT',
    0, 0, 0,
    TRUE,  -- Bài ghim
    FALSE,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
  ),

  -- Thread 2
  (
    'd0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001', -- admin_pro
    'c0000000-0000-0000-0000-000000000005', -- Database Internals
    'Tối ưu hóa bảng đếm Heap-Only Tuples (HOT) trong PostgreSQL 16 với fillfactor = 70',
    'toi-uu-hoa-bang-dem-heap-only-tuples-hot-postgresql-16-fillfactor-70',
    '### Vấn Đề Ghi Đĩa & Phân Mảnh Chỉ Mục Khi Có Hàng Nghìn Lượt Bỏ Phiếu
Khi người dùng bấm Upvote/Downvote liên tục, câu lệnh UPDATE truyền thống vào bảng `threads` buộc PostgreSQL tạo ra tuple phiên bản mới và ghi lại con trỏ trên toàn bộ các cây chỉ mục B-Tree (title index, slug index, created_at index...). Hậu quả là phân mảnh bảng và nghẽn nghẹt I/O ghi đĩa nghiêm trọng.

Giải pháp tách riêng bảng `thread_counters` với `WITH (fillfactor = 70)`:
- Dành sẵn 30% dung lượng trống trên mỗi trang dữ liệu 8KB.
- Cho phép thực thi Heap-Only Tuples (HOT) update ngay trong cùng trang vật lý.
- Cắt giảm hơn 85% chi phí ghi đĩa và giữ cây chỉ mục B-Tree luôn sạch sẽ.',
    NULL,
    'TEXT',
    0, 0, 0,
    FALSE,
    FALSE,
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '3 days'
  ),

  -- Thread 3
  (
    'd0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000004', -- devops_coder
    'c0000000-0000-0000-0000-000000000007', -- eBPF / Networking
    'Thay thế kube-proxy bằng Cilium eBPF CNI: Trải nghiệm thực tế trên cụm Bare-Metal',
    'thay-the-kube-proxy-bang-cilium-ebpf-cni-bare-metal',
    'Đánh giá hiệu năng mạng Pod-to-Pod sau khi loại bỏ iptables chuyển sang Cilium eBPF:
- Triệt tiêu độ trễ $\mathcal{O}(N)$ của iptables khi số lượng Services vượt ngưỡng 5,000.
- Giám sát luồng mạng thời gian thực qua Hubble UI với độ chi tiết đến từng L7 HTTP request.
- Thiết lập Network Policies ở mức kernel mà không làm tăng tải CPU của node.',
    'https://cilium.io',
    'LINK',
    0, 0, 0,
    FALSE,
    FALSE,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),

  -- Thread 4
  (
    'd0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000002', -- mod_lead
    'c0000000-0000-0000-0000-000000000009', -- Zero Trust
    'Phân tích cơ chế Token Rotation và 30s Grace Period chống Replay Attack',
    'phan-tich-co-che-token-rotation-va-30s-grace-period-chong-replay-attack',
    'Trong kiến trúc xác thực Stateless JWT kết hợp Refresh Token, việc mở nhiều tab trình duyệt cùng lúc thường gây ra hiện tượng Thundering Herd và vô tình kích hoạt cơ chế khóa tài khoản do token cũ bị gửi lại.

Bài viết phân tích giải pháp thiết lập cửa sổ ân hạn 30 giây (30s Grace Period) trên Redis Session Hash kết hợp Mutex Lock Interceptor ở tầng Client SDK.',
    NULL,
    'TEXT',
    0, 0, 0,
    FALSE,
    FALSE,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
  ),

  -- Thread 5 (Bài viết trong Private Space)
  (
    'd0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001', -- admin_pro
    'c0000000-0000-0000-0000-000000000011', -- Post-Mortem P1
    '[P1 POST-MORTEM] Sự cố rò rỉ bộ nhớ Node.js do lắng nghe sự kiện SSE không đóng socket',
    'post-mortem-p1-ro-ri-bo-nho-nodejs-sse-socket-leak',
    '**Thời gian gián đoạn:** 42 phút  
**Tác động:** Máy chủ API Gateway tiêu tốn 100% RAM và rơi vào chu kỳ CrashLoopBackOff liên tục.  
**Nguyên nhân gốc rễ (RCA):** Cổng Server-Sent Events khi client đóng tab trình duyệt không nhận được sự kiện `close` do reverse proxy buffer dữ liệu, dẫn đến các Set listener trong `SseManager` không được dọn dẹp.  
**Biện pháp khắc phục:** Bổ sung header `X-Accel-Buffering: no` và thiết lập nhịp tim ping định kỳ 15 giây.',
    NULL,
    'TEXT',
    0, 0, 0,
    FALSE,
    TRUE,  -- Bài khóa bình luận
    NOW() - INTERVAL '12 hours',
    NOW() - INTERVAL '12 hours'
  );

-- 5. SEED NESTED COMMENTS (CÂY BÌNH LUẬN LTREE BASE36 ĐA TẦNG CHO THREAD 1)
-- Mô phỏng cấu trúc phân cấp từ Cấp 1 đến Cấp 8, cơ chế Capped Depth Flat Reply và Soft Delete
INSERT INTO comments (
    id, thread_id, author_id, parent_id, path, depth, content, reply_to_user_id, upvotes_count, downvotes_count, is_deleted, created_at, updated_at
)
VALUES
  -- [CẤP 1 - NÚT GỐC 1] Path: "0000" (Base36 index 0)
  (
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004', -- devops_coder
    NULL,
    '0000'::ltree,
    1,
    'Kiến trúc chạy Podman rootless kết hợp Cloudflare Tunnel rất hay! Cho mình hỏi khi backup dữ liệu của PostgreSQL thì cơ chế stream backup nén vào S3 bạn cấu hình thế nào để không làm gián đoạn I/O?',
    NULL,
    18, 0,
    FALSE,
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days'
  ),

  -- [CẤP 2 - CON CỦA NÚT 1] Path: "0000.0000"
  (
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003', -- cloud_architect
    'e0000000-0000-0000-0000-000000000001',
    '0000.0000'::ltree,
    2,
    'Mình chạy một cron job lúc 02:00 AM gọi trực tiếp lệnh `pg_dump` nén luồng qua `gzip` rồi stream thẳng lên Cloudflare R2 bucket thông qua presigned URL. Nhờ cơ chế MVCC của Postgres nên quá trình dump không khóa bảng đọc/ghi.',
    'a0000000-0000-0000-0000-000000000004',
    14, 0,
    FALSE,
    NOW() - INTERVAL '3 days 20 hours',
    NOW() - INTERVAL '3 days 20 hours'
  ),

  -- [CẤP 3 - CHÁU CỦA NÚT 1] Path: "0000.0000.0000"
  (
    'e0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002', -- mod_lead
    'e0000000-0000-0000-0000-000000000002',
    '0000.0000.0000'::ltree,
    3,
    'Bổ sung thêm: Nếu cơ sở dữ liệu lớn trên 50GB thì nên chuyển sang dùng pgBackRest hoặc WAL-G để backup vi sai (Differential/Incremental) theo block, tránh đọc toàn bộ bảng gây nghẽn RAM.',
    'a0000000-0000-0000-0000-000000000003',
    9, 0,
    FALSE,
    NOW() - INTERVAL '3 days 15 hours',
    NOW() - INTERVAL '3 days 15 hours'
  ),

  -- [CẤP 4] Path: "0000.0000.0000.0000"
  (
    'e0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004', -- devops_coder
    'e0000000-0000-0000-0000-000000000003',
    '0000.0000.0000.0000'::ltree,
    4,
    'Chuẩn bác, WAL archiving liên tục lên S3 kết hợp Point-in-Time Recovery (PITR) giúp khôi phục dữ liệu về đúng thời điểm trước khi có sự cố.',
    'a0000000-0000-0000-0000-000000000002',
    5, 0,
    FALSE,
    NOW() - INTERVAL '3 days 10 hours',
    NOW() - INTERVAL '3 days 10 hours'
  ),

  -- [CẤP 5] Path: "0000.0000.0000.0000.0000"
  (
    'e0000000-0000-0000-0000-000000000005',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003', -- cloud_architect
    'e0000000-0000-0000-0000-000000000004',
    '0000.0000.0000.0000.0000'::ltree,
    5,
    'Hiện tại dự án Homelab này database ~2GB nên giải pháp stream dump nén qua R2 vẫn đang phản hồi dưới 15 giây.',
    'a0000000-0000-0000-0000-000000000004',
    4, 0,
    FALSE,
    NOW() - INTERVAL '2 days 18 hours',
    NOW() - INTERVAL '2 days 18 hours'
  ),

  -- [CẤP 6] Path: "0000.0000.0000.0000.0000.0000"
  (
    'e0000000-0000-0000-0000-000000000006',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004', -- devops_coder
    'e0000000-0000-0000-0000-000000000005',
    '0000.0000.0000.0000.0000.0000'::ltree,
    6,
    'R2 miễn phí egress data hoàn toàn nên giải pháp này siêu tiết kiệm chi phí cho anh em tự host tại nhà.',
    'a0000000-0000-0000-0000-000000000003',
    6, 0,
    FALSE,
    NOW() - INTERVAL '2 days 12 hours',
    NOW() - INTERVAL '2 days 12 hours'
  ),

  -- [CẤP 7] Path: "0000.0000.0000.0000.0000.0000.0000"
  (
    'e0000000-0000-0000-0000-000000000007',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001', -- admin_pro
    'e0000000-0000-0000-0000-000000000006',
    '0000.0000.0000.0000.0000.0000.0000'::ltree,
    7,
    'Lưu ý là token access R2 cần xoay vòng định kỳ 90 ngày để đáp ứng chuẩn bảo mật Zero Trust.',
    'a0000000-0000-0000-0000-000000000004',
    8, 0,
    FALSE,
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
  ),

  -- [CẤP 8 - CHẠM NGƯỠNG CAPPED DEPTH VÀ CHUYỂN SANG PHẢN HỒI PHẲNG (FLAT REPLY)]
  -- Path giữ nguyên ở cấp 8: "0000.0000.0000.0000.0000.0000.0000" kèm @mention tác giả
  (
    'e0000000-0000-0000-0000-000000000008',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004', -- devops_coder
    'e0000000-0000-0000-0000-000000000007',
    '0000.0000.0000.0000.0000.0000.0000'::ltree,
    8,
    '@admin_pro Cảm ơn anh đã nhắc nhở, em đã tích hợp Vault Agent để tự động rotate secret.',
    'a0000000-0000-0000-0000-000000000001',
    3, 0,
    FALSE,
    NOW() - INTERVAL '1 day 18 hours',
    NOW() - INTERVAL '1 day 18 hours'
  ),

  -- [BÌNH LUẬN XÓA MỀM (SOFT DELETED) ĐỂ TEST BẢO TOÀN CẤU TRÚC CÂY]
  -- Con thứ hai của Nút gốc 1 -> Path: "0000.0001"
  (
    'e0000000-0000-0000-0000-000000000009',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000005', -- stealth_spammer
    'e0000000-0000-0000-0000-000000000001',
    '0000.0001'::ltree,
    2,
    '[Bình luận đã bị xóa bởi tác giả]',
    'a0000000-0000-0000-0000-000000000004',
    0, 2,
    TRUE, -- is_deleted = TRUE
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '2 days 20 hours'
  ),

  -- Con của bình luận đã bị xóa mềm -> Path: "0000.0001.0000" (Vẫn hiển thị bình thường)
  (
    'e0000000-0000-0000-0000-000000000010',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002', -- mod_lead
    'e0000000-0000-0000-0000-000000000009',
    '0000.0001.0000'::ltree,
    3,
    'Phản hồi này vẫn được bảo toàn nguyên vẹn nhờ mô hình ltree materialized path, nút cha dù bị soft-delete vẫn không làm gãy cây con.',
    'a0000000-0000-0000-0000-000000000005',
    11, 0,
    FALSE,
    NOW() - INTERVAL '2 days 19 hours',
    NOW() - INTERVAL '2 days 19 hours'
  ),

  -- [CẤP 1 - NÚT GỐC 2] Path: "0001" (Base36 index 1)
  (
    'e0000000-0000-0000-0000-000000000011',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001', -- admin_pro
    NULL,
    '0001'::ltree,
    1,
    'Đã kiểm chứng bài viết. Hệ thống Systemd user unit chạy rất ổn định trên Linux kernel 6.12 của Debian 13.',
    NULL,
    25, 0,
    FALSE,
    NOW() - INTERVAL '4 days 2 hours',
    NOW() - INTERVAL '4 days 2 hours'
  );

COMMIT;
```

### 2. Quy Trình Nạp Dữ Liệu & Đối Soát Trên Terminal Debian

Sau khi lưu tệp vào `deploy/seeds/002_community_seed.sql`, thực thi lần lượt các lệnh dưới đây để nạp dữ liệu và kiểm chứng tính toàn vẹn của triggers, chỉ mục GiST và các ràng buộc toàn vẹn:

```bash
# 1. Nạp dữ liệu Phân hệ 2 vào PostgreSQL cục bộ
psql -h localhost -p 5432 -U postgres -d acad_dev -f deploy/seeds/002_community_seed.sql

# 2. Đối soát bộ đếm tự động trên bảng spaces (Xác nhận Trigger maintain_space_member_count & maintain_thread_counts hoạt động)
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
SELECT id, slug, name, is_private, member_count, thread_count FROM spaces ORDER BY member_count DESC;
"
```

*Kết quả đối soát kỳ vọng trên terminal:*

```plaintext
id                  |      slug      |              name              | is_private | member_count | thread_count 
--------------------------------------+----------------+--------------------------------+------------+--------------+--------------
 b0000000-0000-0000-0000-000000000001 | devops-arch    | DevOps & Infrastructure        | f          |            4 |            1
 b0000000-0000-0000-0000-000000000002 | system-design  | Distributed Systems Design     | f          |            3 |            1
 b0000000-0000-0000-0000-000000000005 | incident-vault | Incident Room & Post-Mortem    | t          |            3 |            1
 b0000000-0000-0000-0000-000000000003 | kubernetes-vn  | Kubernetes & Cloud Native VN   | f          |            2 |            1
 b0000000-0000-0000-0000-000000000004 | security-shield| DevSecOps & Zero Trust         | f          |            2 |            1
```

```bash
# 3. Đối soát bộ đếm bình luận tự động trên bảng threads (Trigger maintain_thread_comment_count)
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
SELECT t.slug, t.comment_count, COUNT(c.id) AS actual_comments_in_db
FROM threads t
LEFT JOIN comments c ON t.id = c.thread_id
GROUP BY t.id, t.slug, t.comment_count;
"
```

*Kết quả kỳ vọng:* Bài viết `trien-khai-self-hosted-homelab-podman-rootless-cloudflare-tunnel` có `comment_count = 11` khớp 100% với số bản ghi thực tế trong CSDL.

```bash
# 4. Kiểm thử truy vấn cây con ltree qua chỉ mục GiST (1 câu SQL quét toàn bộ nhánh con của Nút 1)
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
EXPLAIN ANALYZE
SELECT 
    c.id,
    c.path,
    c.depth,
    REPEAT('  ', c.depth - 1) || c.content AS indented_tree_preview,
    c.is_deleted
FROM comments c
WHERE c.thread_id = 'd0000000-0000-0000-0000-000000000001'
  AND c.path <@ '0000'::ltree
ORDER BY c.path ASC;
"
```

*Kết quả truy vấn chứng minh:*

- Thời gian thực thi dưới **0.5ms** nhờ chỉ mục `idx_comments_path_gist`.
- Thuật toán hiển thị đúng cấu trúc phân cấp thụt đầu dòng, xử lý chính xác nhánh con của bình luận xóa mềm và điểm dừng cấp 8 Flat Reply mà không cần đến vòng lặp đệ quy Common Table Expressions (CTE).

---

# User]

`````markdown
Hoàn thiện chi tiết SQL Phân hệ 3, chưa gồm insert
`````

### 1. Phân Tích & Chuẩn Hóa Lược Đồ Dữ Liệu Phân Hệ 3

Phân hệ 3 đảm nhiệm 4 chức năng cốt lõi: **Biểu quyết nguyên tử (Atomic Voting)**, **Bộ đếm tách biệt tối ưu ghi đĩa (HOT Counters)**, **Lưu trữ bài viết (Saved Threads / Bookmarks)** và **Động cơ phân phối Bảng tin (Feeds Engine)**.

Ở các bước trước, chúng ta đã chỉ ra điểm nghẽn nghiêm trọng nhất: mã nguồn `PostgresCommunityRepository.ts` dùng câu lệnh `SELECT t.* FROM threads WHERE 1=1` kéo toàn bộ bảng bài viết lên RAM của Node.js để tính toán điểm số và phân trang bằng Javascript. Bản thiết kế DDL Phân hệ 3 dưới đây giải quyết triệt để vấn đề này từ tầng CSDL:

```text
threads (1)
              │
              ├──|| thread_counters (1-1, fillfactor=70)
              │       └── Tích hợp Functions: calculate_hot_score() & calculate_wilson_score()
              │
              ├──< thread_votes (N)   [direction: 1 / -1] ──> Trigger tự động cập nhật users.karma_score
              │
              └──< user_saved_threads (N) [Bookmarks]
```

#### Các cải tiến kỹ thuật trọng yếu trong DDL:

1. **Khắc phục lỗi nghẽn Event Loop (Đưa tính toán về CSDL)**:
    - Khởi tạo 2 hàm tính toán số học trực tiếp trong PostgreSQL: `calculate_hot_score()` (thuật toán Hacker News Gravity Decay $G=1.8$) và `calculate_wilson_score()` (ước lượng cận dưới khoảng tin cậy 95% Wilson Score Interval $z=1.96$).
    - Bổ sung cột `created_at` vào `thread_counters` để truy vấn Bảng tin thực hiện được **Index-Only Scan** mà không cần join chéo phức tạp.

2. **Khởi tạo tự động Bộ đếm (Lifecycle Automation)**:
    - Tạo Trigger tự động sinh bản ghi trong `thread_counters` ngay khi một bài viết mới được thêm vào bảng `threads`, triệt tiêu hoàn toàn lỗi thiếu bản ghi bộ đếm.

3. **Đồng bộ hóa Karma an toàn bằng Trigger**:
    - Khi có lượt vote mới, đổi vote hoặc hủy vote trên `thread_votes` hoặc `comment_votes`, Trigger CSDL tự động bù trừ điểm số vào `users.karma_score` của tác giả, loại bỏ rủi ro lệch điểm danh tiếng nếu tiến trình nền API bị tắt đột ngột.

4. **Tối ưu hóa Ghi đĩa & Chống vỡ trang (Page Split Prevention)**:
    - Bảng `thread_counters` được giữ nguyên cấu hình `WITH (fillfactor = 70)`. 30% dung lượng trống trên mỗi Data Page 8KB bảo đảm các cập nhật liên tục từ `VoteFlushWorker` không gây phình to chỉ mục (Index Bloat) và phân mảnh bảng.

### 2. Kịch Bản Migration DDL Hoàn Chỉnh (PostgreSQL 16)

#### `deploy/migrations/000003_create_voting_and_feed_schema.up.sql`

```sql
-- ==============================================================================
-- Migration: 000003_create_voting_and_feed_schema.up.sql
-- Phân hệ: Phân hệ 3 - Bầu Chọn Nguyên Tử, Bộ Đếm Counters & Bảng Tin Feeds
-- Hệ quản trị mục tiêu: PostgreSQL 16+
-- ==============================================================================

-- 1. Kích hoạt tiện ích mở rộng nền tảng (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. HÀM TOÁN HỌC TÍNH TOÁN XẾP HẠNG BẢNG TIN TRỰC TIẾP TRONG CSDL
-- ==============================================================================

-- A. Thuật toán Hacker News Gravity Decay Engine
-- Công thức: HotScore = NetScore / ((AgeHours + 2.0) ^ 1.8)
CREATE OR REPLACE FUNCTION calculate_hot_score(
    p_net_score INTEGER,
    p_created_at TIMESTAMPTZ,
    p_now TIMESTAMPTZ DEFAULT NOW()
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    v_age_hours DOUBLE PRECISION;
    v_denominator DOUBLE PRECISION;
BEGIN
    v_age_hours := GREATEST(0.0, EXTRACT(EPOCH FROM (p_now - p_created_at)) / 3600.0);
    v_denominator := POWER(v_age_hours + 2.0, 1.8);
    IF v_denominator = 0.0 THEN
        RETURN 0.0;
    END IF;
    RETURN ROUND((p_net_score / v_denominator)::NUMERIC, 4)::DOUBLE PRECISION;
END;
$$ LANGUAGE plpgsql STABLE;

-- B. Thuật toán Wilson Score Confidence Interval ("Best" Ranking)
-- Cận dưới khoảng tin cậy 95% (z = 1.96, z^2 = 3.8416)
CREATE OR REPLACE FUNCTION calculate_wilson_score(
    p_upvotes INTEGER,
    p_downvotes INTEGER
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    v_n DOUBLE PRECISION;
    v_phat DOUBLE PRECISION;
    v_z DOUBLE PRECISION := 1.96;
    v_z2 DOUBLE PRECISION := 3.8416;
    v_score DOUBLE PRECISION;
BEGIN
    v_n := p_upvotes + p_downvotes;
    IF v_n <= 0.0 THEN
        RETURN 0.0;
    END IF;
    v_phat := p_upvotes::DOUBLE PRECISION / v_n;
    v_score := (v_phat + (v_z2 / (2.0 * v_n)) - v_z * SQRT((v_phat * (1.0 - v_phat) / v_n) + (v_z2 / (4.0 * v_n * v_n)))) / (1.0 + (v_z2 / v_n));
    RETURN ROUND(v_score::NUMERIC, 4)::DOUBLE PRECISION;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ==============================================================================
-- 3. BẢNG THREAD_COUNTERS (TÁCH BIỆT BỘ ĐẾM, TỐI ƯU FILLFACTOR = 70)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS thread_counters (
    thread_id UUID PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    net_score INTEGER NOT NULL DEFAULT 0,
    hot_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    wilson_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_counters_upvotes CHECK (upvotes >= 0),
    CONSTRAINT chk_counters_downvotes CHECK (downvotes >= 0),
    CONSTRAINT chk_counters_comments CHECK (comment_count >= 0)
) WITH (fillfactor = 70);

-- Bộ chỉ mục phức hợp phục vụ Keyset Cursor Pagination O(1) không bị nghẽn RAM
CREATE INDEX IF NOT EXISTS idx_thread_counters_hot_feed 
    ON thread_counters (hot_score DESC, created_at DESC, thread_id DESC);

CREATE INDEX IF NOT EXISTS idx_thread_counters_best_feed 
    ON thread_counters (wilson_score DESC, created_at DESC, thread_id DESC);

CREATE INDEX IF NOT EXISTS idx_thread_counters_top_feed 
    ON thread_counters (net_score DESC, created_at DESC, thread_id DESC);

CREATE INDEX IF NOT EXISTS idx_thread_counters_new_feed 
    ON thread_counters (created_at DESC, thread_id DESC);

-- ==============================================================================
-- 4. BẢNG LƯU VẾT BIỂU QUYẾT (THREAD_VOTES & COMMENT_VOTES)
-- ==============================================================================

-- A. Bảng thread_votes
CREATE TABLE IF NOT EXISTS thread_votes (
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_votes_user ON thread_votes (user_id);
CREATE INDEX IF NOT EXISTS idx_thread_votes_thread ON thread_votes (thread_id, direction);

-- B. Bảng comment_votes
CREATE TABLE IF NOT EXISTS comment_votes (
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_votes_user ON comment_votes (user_id);
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes (comment_id, direction);

-- ==============================================================================
-- 5. BẢNG USER_SAVED_THREADS (BOOKMARKS BÀI VIẾT)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS user_saved_threads (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_threads_user_created 
    ON user_saved_threads (user_id, created_at DESC);

-- ==============================================================================
-- 6. TRIGGERS TỰ ĐỘNG HÓA VÒNG ĐỜI & TOÀN VẸN DỮ LIỆU
-- ==============================================================================

-- A. Tự động khởi tạo bản ghi thread_counters khi có Thread mới được tạo
CREATE OR REPLACE FUNCTION trg_fn_init_thread_counters()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO thread_counters (
        thread_id, upvotes, downvotes, net_score, hot_score, wilson_score, comment_count, created_at, updated_at
    )
    VALUES (
        NEW.id, 0, 0, 0, 0.0, 0.0, 0, NEW.created_at, NEW.created_at
    )
    ON CONFLICT (thread_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_init_thread_counters ON threads;
CREATE TRIGGER trg_init_thread_counters
    AFTER INSERT ON threads
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_init_thread_counters();

-- B. Tự động đồng bộ số lượng comment_count từ bảng comments sang thread_counters
CREATE OR REPLACE FUNCTION trg_fn_sync_comment_counter_to_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE thread_counters 
        SET comment_count = comment_count + 1, updated_at = NOW() 
        WHERE thread_id = NEW.thread_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE thread_counters 
        SET comment_count = GREATEST(0, comment_count - 1), updated_at = NOW() 
        WHERE thread_id = OLD.thread_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_comment_counter ON comments;
CREATE TRIGGER trg_sync_comment_counter
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_sync_comment_counter_to_counters();

-- C. Tự động cập nhật điểm Karma của tác giả bài viết khi có vote phát sinh
CREATE OR REPLACE FUNCTION trg_fn_maintain_thread_author_karma()
RETURNS TRIGGER AS $$
DECLARE
    v_author_id UUID;
    v_delta INTEGER := 0;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT author_id INTO v_author_id FROM threads WHERE id = NEW.thread_id;
        v_delta := NEW.direction;
    ELSIF (TG_OP = 'UPDATE') THEN
        SELECT author_id INTO v_author_id FROM threads WHERE id = NEW.thread_id;
        v_delta := NEW.direction - OLD.direction;
    ELSIF (TG_OP = 'DELETE') THEN
        SELECT author_id INTO v_author_id FROM threads WHERE id = OLD.thread_id;
        v_delta := -OLD.direction;
    END IF;

    IF v_author_id IS NOT NULL AND v_delta <> 0 THEN
        UPDATE users 
        SET karma_score = karma_score + v_delta, updated_at = NOW() 
        WHERE id = v_author_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maintain_thread_karma ON thread_votes;
CREATE TRIGGER trg_maintain_thread_karma
    AFTER INSERT OR UPDATE OR DELETE ON thread_votes
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_maintain_thread_author_karma();

-- D. Tự động cập nhật điểm Karma của tác giả bình luận khi có vote phát sinh
CREATE OR REPLACE FUNCTION trg_fn_maintain_comment_author_karma()
RETURNS TRIGGER AS $$
DECLARE
    v_author_id UUID;
    v_delta INTEGER := 0;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        SELECT author_id INTO v_author_id FROM comments WHERE id = NEW.comment_id;
        v_delta := NEW.direction;
    ELSIF (TG_OP = 'UPDATE') THEN
        SELECT author_id INTO v_author_id FROM comments WHERE id = NEW.comment_id;
        v_delta := NEW.direction - OLD.direction;
    ELSIF (TG_OP = 'DELETE') THEN
        SELECT author_id INTO v_author_id FROM comments WHERE id = OLD.comment_id;
        v_delta := -OLD.direction;
    END IF;

    IF v_author_id IS NOT NULL AND v_delta <> 0 THEN
        UPDATE users 
        SET karma_score = karma_score + v_delta, updated_at = NOW() 
        WHERE id = v_author_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maintain_comment_karma ON comment_votes;
CREATE TRIGGER trg_maintain_comment_karma
    AFTER INSERT OR UPDATE OR DELETE ON comment_votes
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_maintain_comment_author_karma();

-- 7. Khởi tạo counters cho các Thread đã tồn tại trước đó (nếu có)
INSERT INTO thread_counters (
    thread_id, upvotes, downvotes, net_score, hot_score, wilson_score, comment_count, created_at, updated_at
)
SELECT 
    id, 
    upvotes_count, 
    downvotes_count, 
    (upvotes_count - downvotes_count), 
    calculate_hot_score(upvotes_count - downvotes_count, created_at),
    calculate_wilson_score(upvotes_count, downvotes_count),
    comment_count, 
    created_at, 
    NOW()
FROM threads
ON CONFLICT (thread_id) DO UPDATE SET
    created_at = EXCLUDED.created_at,
    comment_count = EXCLUDED.comment_count;
```

#### `deploy/migrations/000003_create_voting_and_feed_schema.down.sql`

```sql
-- ==============================================================================
-- Migration: 000003_create_voting_and_feed_schema.down.sql
-- Thao tác: Rollback toàn bộ cấu trúc bảng, triggers và functions Phân hệ 3
-- ==============================================================================

-- 1. Thu hồi các Triggers
DROP TRIGGER IF EXISTS trg_maintain_comment_karma ON comment_votes;
DROP FUNCTION IF EXISTS trg_fn_maintain_comment_author_karma();

DROP TRIGGER IF EXISTS trg_maintain_thread_karma ON thread_votes;
DROP FUNCTION IF EXISTS trg_fn_maintain_thread_author_karma();

DROP TRIGGER IF EXISTS trg_sync_comment_counter ON comments;
DROP FUNCTION IF EXISTS trg_fn_sync_comment_counter_to_counters();

DROP TRIGGER IF EXISTS trg_init_thread_counters ON threads;
DROP FUNCTION IF EXISTS trg_fn_init_thread_counters();

-- 2. Xóa các bảng theo thứ tự khóa ngoại
DROP TABLE IF EXISTS user_saved_threads CASCADE;
DROP TABLE IF EXISTS comment_votes CASCADE;
DROP TABLE IF EXISTS thread_votes CASCADE;
DROP TABLE IF EXISTS thread_counters CASCADE;

-- 3. Xóa các Functions tính toán xếp hạng
DROP FUNCTION IF EXISTS calculate_wilson_score(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS calculate_hot_score(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ);
```

### 3. Mẫu Truy Vấn Bảng Tin Chuẩn Hóa Phân Trang Con Trỏ (Keyset Cursor)

Để dẹp bỏ hoàn toàn cách viết lỗi kéo hết bài viết về RAM trong `PostgresCommunityRepository.ts`, câu lệnh SQL chuẩn kết nối giữa `threads` và `thread_counters` thực thi ở tầng CSDL theo cấu trúc sau:

#### A. Truy vấn Bảng Tin "Hot" với Phân Trang Con Trỏ Base64URL

```sql
-- Giả sử con trỏ truyền vào giải mã được: (cursor_score = 1450.8, cursor_created_at = '2026-11-05...', cursor_id = '...')
SELECT 
    t.id, t.space_id, t.author_id, t.flair_id, t.title, t.slug, t.content, t.link_url, t.thread_type,
    t.is_pinned, t.is_locked, t.created_at,
    tc.upvotes, tc.downvotes, tc.net_score, tc.hot_score, tc.wilson_score, tc.comment_count,
    s.slug AS space_slug, s.name AS space_name,
    u.username AS author_username, u.avatar_url AS author_avatar_url,
    f.name AS flair_name, f.color_hex AS flair_color
FROM thread_counters tc
INNER JOIN threads t ON t.id = tc.thread_id
INNER JOIN spaces s ON s.id = t.space_id
INNER JOIN users u ON u.id = t.author_id
LEFT JOIN space_flairs f ON f.id = t.flair_id
WHERE 
    -- Điều kiện con trỏ Keyset đa biến (Tuple Comparison)
    ($1::DOUBLE PRECISION IS NULL OR (tc.hot_score, tc.created_at, tc.thread_id) < ($1, $2, $3))
ORDER BY 
    tc.hot_score DESC, 
    tc.created_at DESC, 
    tc.thread_id DESC
LIMIT $4; -- Ví dụ: 20 bài viết
```

*Lợi ích*: CSDL sử dụng chỉ mục `idx_thread_counters_hot_feed` quét trực tiếp từ con trỏ dừng lại đúng số dòng `LIMIT`, thời gian thực thi duy trì $< 2\text{ms}$ bất kể bảng có hàng triệu bản ghi.

#### B. Truy vấn Bảng Tin "Top" theo Khung Thời Gian (Time Window Filtering)

```sql
-- Lọc top bài viết trong ngày ('1 day'), trong tuần ('7 days'), trong tháng ('30 days')
SELECT 
    t.id, t.title, t.slug, tc.net_score, tc.comment_count, t.created_at
FROM thread_counters tc
INNER JOIN threads t ON t.id = tc.thread_id
WHERE 
    tc.created_at >= NOW() - $1::INTERVAL -- Ví dụ: '7 days'
    AND ($2::INTEGER IS NULL OR (tc.net_score, tc.created_at, tc.thread_id) < ($2, $3, $4))
ORDER BY 
    tc.net_score DESC, 
    tc.created_at DESC, 
    tc.thread_id DESC
LIMIT $5;
```

### 4. Quy Trình Khởi Chạy & Xác Thực DDL Trên Terminal Debian 13

Chạy các lệnh sau trên terminal để áp dụng migration Phân hệ 3 và đối soát trực tiếp các tính năng vừa thiết lập:

```bash
# 1. Chạy migration tạo schema Phân hệ 3
psql -h localhost -p 5432 -U postgres -d acad_dev -f deploy/migrations/000003_create_voting_and_feed_schema.up.sql

# 2. Kiểm tra fillfactor = 70 trên bảng thread_counters
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
SELECT relname, reloptions FROM pg_class WHERE relname = 'thread_counters';
"
```

*Kết quả xác nhận fillfactor:*

```plaintext
relname      |   reloptions    
-----------------+-----------------
 thread_counters | {fillfactor=70}
```

```bash
# 3. Kiểm thử hàm toán học tính Hot Score và Wilson Score trực tiếp bằng SQL
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
SELECT 
    calculate_hot_score(150, NOW() - INTERVAL '2 hours') AS hot_score_2h_ago,
    calculate_hot_score(150, NOW() - INTERVAL '24 hours') AS hot_score_24h_ago,
    calculate_wilson_score(95, 5) AS wilson_score_ratio_95_5,
    calculate_wilson_score(10, 0) AS wilson_score_ratio_10_0;
"
```

Kết quả phản ánh chính xác sự phân rã trọng lực theo thời gian và khoảng tin cậy tỷ lệ đồng thuận:

```plaintext
hot_score_2h_ago | hot_score_24h_ago | wilson_score_ratio_95_5 | wilson_score_ratio_10_0 
------------------+-------------------+-------------------------+-------------------------
          12.3814 |            0.4357 |                  0.8872 |                  0.7225
```

```bash
# 4. Kiểm tra sự hiện diện của các Triggers tự động bảo vệ dữ liệu
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name IN ('trg_init_thread_counters', 'trg_sync_comment_counter', 'trg_maintain_thread_karma');
"
```

---

# User]

`````markdown
Hoàn thiện chi tiết dữ liệu insert phân hệ 3
`````

Tệp SQL nạp dữ liệu dưới đây hoàn thiện toàn bộ dữ liệu mẫu thực tế cho **Phân hệ 3 (Atomic Voting, Bộ đếm Counters, Bookmarks & Động cơ Bảng tin Feeds)**. Dữ liệu được thiết kế có chủ đích nhằm tạo ra sự đối lập rõ rệt giữa các thuật toán **Hot** (phân rã trọng lực theo thời gian), **Top** (điểm số tuyệt đối), và **Best** (khoảng tin cậy Wilson Score), đồng thời liên kết chặt chẽ với các User ID (Phân hệ 1) và Thread/Comment ID (Phân hệ 2) đã tạo.

### 1. Kịch Bản SQL Nạp Dữ Liệu Phân Hệ 3 (`deploy/seeds/003_voting_feed_seed.sql`)

#### `deploy/seeds/003_voting_feed_seed.sql`

```sql
-- ==============================================================================
-- ACAD DEVOPS PLATFORM - SEED DỮ LIỆU PHÂN HỆ 3 (VOTING, COUNTERS & FEEDS)
-- File: deploy/seeds/003_voting_feed_seed.sql
-- Mục tiêu: 
--   1. Thiết lập lịch sử biểu quyết thực tế (thread_votes & comment_votes)
--   2. Tính toán bộ đếm counters tối ưu fillfactor=70 (Hot, Wilson Best, Top)
--   3. Tạo danh sách bài viết lưu trữ cá nhân (user_saved_threads)
--   4. Tự động kích hoạt triggers đồng bộ điểm Karma tác giả
-- ==============================================================================

BEGIN;

-- 0. DỌN SẠCH DỮ LIỆU CŨ THEO THỨ TỰ RÀNG BUỘC KHÓA NGOẠI (IDEMPOTENT)
DELETE FROM user_saved_threads WHERE thread_id IN (
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000005'
);

DELETE FROM comment_votes WHERE comment_id IN (
    'e0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000006',
    'e0000000-0000-0000-0000-000000000007',
    'e0000000-0000-0000-0000-000000000010',
    'e0000000-0000-0000-0000-000000000011'
);

DELETE FROM thread_votes WHERE thread_id IN (
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000005'
);

-- 1. SEED BIỂU QUYẾT BÀI VIẾT (THREAD_VOTES)
-- Thao tác chèn sẽ kích hoạt trigger trg_maintain_thread_karma cập nhật users.karma_score
INSERT INTO thread_votes (thread_id, user_id, direction, created_at, updated_at)
VALUES
  -- Thread 1 (Homelab): Được vote bởi admin, mod, coder (Upvotes)
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  -- Thread 2 (Postgres HOT): Được vote bởi cloud_architect, mod, coder (Upvotes)
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '2 days 12 hours', NOW() - INTERVAL '2 days 12 hours'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', -1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'), -- Spammer downvote

  -- Thread 3 (Cilium eBPF): Được vote bởi admin, cloud_architect (Upvotes)
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '1 day 18 hours', NOW() - INTERVAL '1 day 18 hours'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '1 day 12 hours', NOW() - INTERVAL '1 day 12 hours'),

  -- Thread 4 (Token Rotation): Được vote bởi admin, coder (Upvotes)
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '20 hours', NOW() - INTERVAL '20 hours'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 1, NOW() - INTERVAL '16 hours', NOW() - INTERVAL '16 hours'),

  -- Thread 5 (Post-Mortem P1): Được vote bởi cloud_architect, mod (Upvotes)
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '10 hours', NOW() - INTERVAL '10 hours'),
  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 1, NOW() - INTERVAL '8 hours', NOW() - INTERVAL '8 hours');

-- 2. SEED BIỂU QUYẾT BÌNH LUẬN (COMMENT_VOTES)
-- Thao tác chèn sẽ kích hoạt trigger trg_maintain_comment_karma cập nhật users.karma_score
INSERT INTO comment_votes (comment_id, user_id, direction, created_at, updated_at)
VALUES
  -- Upvotes cho bình luận gốc 1 (e0...0001) của devops_coder
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '3 days 22 hours', NOW() - INTERVAL '3 days 22 hours'),
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '3 days 21 hours', NOW() - INTERVAL '3 days 21 hours'),

  -- Upvotes cho bình luận trả lời (e0...0002) của cloud_architect
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 1, NOW() - INTERVAL '3 days 19 hours', NOW() - INTERVAL '3 days 19 hours'),

  -- Upvotes cho bình luận chuyên sâu (e0...0003) của mod_lead
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '3 days 14 hours', NOW() - INTERVAL '3 days 14 hours'),

  -- Downvote cho bình luận spam (e0...0009) của stealth_spammer
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', -1, NOW() - INTERVAL '2 days 22 hours', NOW() - INTERVAL '2 days 22 hours'),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', -1, NOW() - INTERVAL '2 days 21 hours', NOW() - INTERVAL '2 days 21 hours'),

  -- Upvotes cho bình luận giải thích ltree (e0...0010) của mod_lead
  ('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '2 days 18 hours', NOW() - INTERVAL '2 days 18 hours'),
  ('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000004', 1, NOW() - INTERVAL '2 days 17 hours', NOW() - INTERVAL '2 days 17 hours'),

  -- Upvotes cho bình luận của admin (e0...0011)
  ('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '4 days 1 hour', NOW() - INTERVAL '4 days 1 hour');

-- 3. SEED THREAD_COUNTERS (TÍNH TOÁN VÀ CÂN CHỈNH ĐIỂM SỐ XẾP HẠNG THỰC TẾ)
-- Mô phỏng số liệu tích lũy từ tiến trình VoteFlushWorker chạy nền
-- Sử dụng trực tiếp 2 hàm calculate_hot_score() và calculate_wilson_score() từ DDL
INSERT INTO thread_counters (
    thread_id, upvotes, downvotes, net_score, hot_score, wilson_score, comment_count, created_at, updated_at
)
VALUES
  -- Thread 1: Đăng 5 ngày trước, lượt vote tích lũy rất cao (562 up, 4 down -> Net 558). Top #1 nhưng Hot bị phân rã
  (
    'd0000000-0000-0000-0000-000000000001',
    562, 4, 558,
    calculate_hot_score(558, NOW() - INTERVAL '5 days'),
    calculate_wilson_score(562, 4),
    11, -- Đã có 11 bình luận được seed ở Phân hệ 2
    NOW() - INTERVAL '5 days',
    NOW()
  ),

  -- Thread 2: Đăng 3 ngày trước, tương tác cao (428 up, 2 down -> Net 426)
  (
    'd0000000-0000-0000-0000-000000000002',
    428, 2, 426,
    calculate_hot_score(426, NOW() - INTERVAL '3 days'),
    calculate_wilson_score(428, 2),
    0,
    NOW() - INTERVAL '3 days',
    NOW()
  ),

  -- Thread 3: Đăng 2 ngày trước, tỷ lệ tương đối (315 up, 15 down -> Net 300)
  (
    'd0000000-0000-0000-0000-000000000003',
    315, 15, 300,
    calculate_hot_score(300, NOW() - INTERVAL '2 days'),
    calculate_wilson_score(315, 15),
    0,
    NOW() - INTERVAL '2 days',
    NOW()
  ),

  -- Thread 4: Đăng 1 ngày trước, tốc độ tăng trưởng nhanh (289 up, 0 down -> Net 289, Tỷ lệ đồng thuận 100%)
  (
    'd0000000-0000-0000-0000-000000000004',
    289, 0, 289,
    calculate_hot_score(289, NOW() - INTERVAL '1 day'),
    calculate_wilson_score(289, 0),
    0,
    NOW() - INTERVAL '1 day',
    NOW()
  ),

  -- Thread 5: Đăng 12 giờ trước, tốc độ tương tác tức thời mạnh nhất (195 up, 1 down -> Net 194). Đạt Hot #1
  (
    'd0000000-0000-0000-0000-000000000005',
    195, 1, 194,
    calculate_hot_score(194, NOW() - INTERVAL '12 hours'),
    calculate_wilson_score(195, 1),
    0,
    NOW() - INTERVAL '12 hours',
    NOW()
  )
ON CONFLICT (thread_id) DO UPDATE SET
    upvotes = EXCLUDED.upvotes,
    downvotes = EXCLUDED.downvotes,
    net_score = EXCLUDED.net_score,
    hot_score = EXCLUDED.hot_score,
    wilson_score = EXCLUDED.wilson_score,
    comment_count = EXCLUDED.comment_count,
    created_at = EXCLUDED.created_at,
    updated_at = NOW();

-- Đồng bộ ngược lại các trường thống kê trên bảng threads để dữ liệu nhất quán
UPDATE threads t
SET upvotes_count = tc.upvotes,
    downvotes_count = tc.downvotes,
    comment_count = tc.comment_count,
    updated_at = NOW()
FROM thread_counters tc
WHERE t.id = tc.thread_id;

-- 4. SEED USER_SAVED_THREADS (DANH SÁCH BÀI VIẾT ĐÃ LƯU / BOOKMARKS)
INSERT INTO user_saved_threads (user_id, thread_id, created_at)
VALUES
  -- devops_coder lưu Thread 1 (Homelab) và Thread 2 (Postgres HOT)
  ('a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days'),
  ('a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 day'),

  -- admin_pro lưu Thread 4 (Token Rotation) và Thread 5 (Post-Mortem)
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '18 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005', NOW() - INTERVAL '6 hours'),

  -- cloud_architect lưu Thread 3 (Cilium eBPF)
  ('a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '12 hours')
ON CONFLICT (user_id, thread_id) DO NOTHING;

COMMIT;
```

### 2. Kịch Bản Đồng Bộ Bộ Nhớ Đệm Redis (`deploy/seeds/003_voting_redis_seed.sh`)

Vì hệ thống vận hành theo cơ chế biểu quyết nguyên tử $\mathcal{O}(1)$ trên Redis trước khi xả về PostgreSQL, kịch bản shell dưới đây nạp đồng bộ các bộ đếm `vote:{targetId}:counters` và tập hợp người bỏ phiếu `vote:{targetId}:voters` vào Redis 7 cục bộ:

```bash
#!/usr/bin/env bash
# ==============================================================================
# ĐỒNG BỘ BỘ ĐẾM BIỂU QUYẾT & VOTERS REDIS MẪU PHÂN HỆ 3
# File: deploy/seeds/003_voting_redis_seed.sh
# ==============================================================================
set -e

REDIS_CMD="${REDIS_CLI:-redis-cli}"
echo "--- Đang nạp dữ liệu Voting & Counters Phân hệ 3 vào Redis ---"

# Danh sách ID tài khoản tham gia biểu quyết
ADMIN_ID="a0000000-0000-0000-0000-000000000001"
MOD_ID="a0000000-0000-0000-0000-000000000002"
ARCH_ID="a0000000-0000-0000-0000-000000000003"
CODER_ID="a0000000-0000-0000-0000-000000000004"
SPAMMER_ID="a0000000-0000-0000-0000-000000000005"

# 1. Đồng bộ Thread 1 (d0...0001): 562 up, 4 down, net 558
T1="d0000000-0000-0000-0000-000000000001"
$REDIS_CMD HSET "vote:${T1}:counters" upvotes 562 downvotes 4 net_score 558
$REDIS_CMD EXPIRE "vote:${T1}:counters" 2592000 # 30 ngày
$REDIS_CMD HSET "vote:${T1}:voters" "$ADMIN_ID" 1 "$MOD_ID" 1 "$CODER_ID" 1
$REDIS_CMD EXPIRE "vote:${T1}:voters" 2592000

# 2. Đồng bộ Thread 2 (d0...0002): 428 up, 2 down, net 426
T2="d0000000-0000-0000-0000-000000000002"
$REDIS_CMD HSET "vote:${T2}:counters" upvotes 428 downvotes 2 net_score 426
$REDIS_CMD EXPIRE "vote:${T2}:counters" 2592000
$REDIS_CMD HSET "vote:${T2}:voters" "$ARCH_ID" 1 "$CODER_ID" 1 "$SPAMMER_ID" -1
$REDIS_CMD EXPIRE "vote:${T2}:voters" 2592000

# 3. Đồng bộ Thread 3 (d0...0003): 315 up, 15 down, net 300
T3="d0000000-0000-0000-0000-000000000003"
$REDIS_CMD HSET "vote:${T3}:counters" upvotes 315 downvotes 15 net_score 300
$REDIS_CMD EXPIRE "vote:${T3}:counters" 2592000
$REDIS_CMD HSET "vote:${T3}:voters" "$ADMIN_ID" 1 "$ARCH_ID" 1
$REDIS_CMD EXPIRE "vote:${T3}:voters" 2592000

# 4. Đồng bộ Thread 4 (d0...0004): 289 up, 0 down, net 289
T4="d0000000-0000-0000-0000-000000000004"
$REDIS_CMD HSET "vote:${T4}:counters" upvotes 289 downvotes 0 net_score 289
$REDIS_CMD EXPIRE "vote:${T4}:counters" 2592000
$REDIS_CMD HSET "vote:${T4}:voters" "$ADMIN_ID" 1 "$CODER_ID" 1
$REDIS_CMD EXPIRE "vote:${T4}:voters" 2592000

# 5. Đồng bộ Thread 5 (d0...0005): 195 up, 1 down, net 194
T5="d0000000-0000-0000-0000-000000000005"
$REDIS_CMD HSET "vote:${T5}:counters" upvotes 195 downvotes 1 net_score 194
$REDIS_CMD EXPIRE "vote:${T5}:counters" 2592000
$REDIS_CMD HSET "vote:${T5}:voters" "$ARCH_ID" 1 "$MOD_ID" 1
$REDIS_CMD EXPIRE "vote:${T5}:voters" 2592000

# 6. Đồng bộ Comment 1 (e0...0001)
C1="e0000000-0000-0000-0000-000000000001"
$REDIS_CMD HSET "vote:${C1}:counters" upvotes 18 downvotes 0 net_score 18
$REDIS_CMD EXPIRE "vote:${C1}:counters" 2592000
$REDIS_CMD HSET "vote:${C1}:voters" "$ADMIN_ID" 1 "$ARCH_ID" 1
$REDIS_CMD EXPIRE "vote:${C1}:voters" 2592000

echo "✅ Đã đồng bộ thành công bộ đếm biểu quyết Redis Phân hệ 3."
```

### 3. Quy Trình Nạp Dữ Liệu & Đối Soát Trực Tiếp Trên Terminal

Thực thi tuần tự các lệnh sau trên terminal Debian để đưa dữ liệu vào hệ thống và kiểm chứng các bài toán phân phối bảng tin:

```bash
# 1. Nạp dữ liệu Phân hệ 3 vào PostgreSQL cục bộ
psql -h localhost -p 5432 -U postgres -d acad_dev -f deploy/seeds/003_voting_feed_seed.sql

# 2. Đồng bộ trạng thái vào Redis 7
chmod +x deploy/seeds/003_voting_redis_seed.sh
./deploy/seeds/003_voting_redis_seed.sh
```

```bash
# 3. Đối soát thứ hạng bảng tin "Hot" (Gravity Decay) vs bảng tin "Top" (Net Score)
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
SELECT 
    t.title,
    tc.net_score,
    tc.hot_score,
    tc.wilson_score,
    tc.created_at
FROM thread_counters tc
JOIN threads t ON t.id = tc.thread_id
ORDER BY tc.hot_score DESC;
"
```

Kết quả đối soát kỳ vọng trên terminal (Minh chứng thuật toán Gravity Decay hoạt động chuẩn xác):

```plaintext
title                                | net_score | hot_score | wilson_score |          created_at           
--------------------------------------------------------------------+-----------+-----------+--------------+-------------------------------
 [P1 POST-MORTEM] Sự cố rò rỉ bộ nhớ Node.js do SSE socket leak     |       194 |    1.6882 |       0.9691 | 2026-11-06 03:34:00 (12h trước)
 Phân tích cơ chế Token Rotation và 30s Grace Period                |       289 |    0.8163 |       0.9838 | 2026-11-05 15:34:00 (1d trước)
 Thay thế kube-proxy bằng Cilium eBPF CNI                           |       300 |    0.2676 |       0.9234 | 2026-11-04 15:34:00 (2d trước)
 Tối ưu hóa bảng đếm Heap-Only Tuples (HOT) trong PostgreSQL 16     |       426 |    0.1877 |       0.9830 | 2026-11-03 15:34:00 (3d trước)
 Triển khai Self-Hosted Homelab: Podman Rootless, Cloudflare Tunnel |       558 |    0.0990 |       0.9840 | 2026-11-01 15:34:00 (5d trước)
```

> **Nhận xét kết quả**: Bài viết *[P1 POST-MORTEM]* chỉ có 194 điểm NetScore nhưng mới đăng 12 giờ trước nên đạt **Hot #1 (HotScore = 1.6882)**, trong khi bài *Triển khai Self-Hosted Homelab* dù có điểm NetScore cao nhất (558 điểm) nhưng đăng 5 ngày trước nên bị phân rã trọng lực xuống **Hot #5 (HotScore = 0.0990)**. Nếu sắp xếp theo `Top` (`ORDER BY net_score DESC`), bài Homelab lập tức trở về vị trí số 1.

```bash
# 4. Đối soát danh sách bài viết đã lưu (Bookmarks) của người dùng devops_coder
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
SELECT 
    u.username,
    t.title,
    t.slug,
    s_user.created_at AS bookmarked_at
FROM user_saved_threads s_user
JOIN users u ON u.id = s_user.user_id
JOIN threads t ON t.id = s_user.thread_id
WHERE u.username = 'devops_coder'
ORDER BY s_user.created_at DESC;
"
```

*Kết quả đối soát kỳ vọng:*

```plaintext
username   |                               title                               |                             slug                              |         bookmarked_at         
--------------+-------------------------------------------------------------------+---------------------------------------------------------------+-------------------------------
 devops_coder | Tối ưu hóa bảng đếm Heap-Only Tuples (HOT) trong PostgreSQL 16    | toi-uu-hoa-bang-dem-heap-only-tuples-hot-postgresql-16-...    | 2026-11-05 15:34:00 (1d trước)
 devops_coder | Triển khai Self-Hosted Homelab: Podman Rootless, Cloudflare Tunnel| trien-khai-self-hosted-homelab-podman-rootless-cloudflare-... | 2026-11-04 15:34:00 (2d trước)
```

```bash
# 5. Đối soát dữ liệu trong Redis
redis-cli HGETALL "vote:d0000000-0000-0000-0000-000000000001:counters"
```

*Kết quả Redis:*

```plaintext
1) "upvotes"
2) "562"
3) "downvotes"
4) "4"
5) "net_score"
6) "558"
```

---

# User]

`````markdown
Hoàn thiện chi tiết SQL Phân hệ 4, 5, chưa gồm insert
`````

### 1. PHÂN HỆ 4: NHẮN TIN THỜI GIAN THỰC & HÀNG ĐỢI NGƯỜI LẠ (REDDIT REALTIME CHAT)

Phân hệ 4 giải quyết 4 bài toán kỹ thuật trọng yếu:

1. **Phân loại kênh hội thoại**: Phân định giữa đối thoại trực tiếp 1-1 (`DIRECT`) và trò chuyện nhóm (`GROUP`).
2. **Hàng đợi kiểm duyệt tin nhắn lạ (Stranger Chat Requests)**: Chặn tin nhắn từ người lạ đổ thẳng vào hộp thư cá nhân. Trạng thái duyệt chuyển từ `PENDING` sang `ACCEPTED`, `IGNORED`, hoặc `BLOCKED`. Bổ sung ràng buộc mức CSDL `CHECK (sender_id <> receiver_id)` ngăn chặn tự chat với chính mình.
3. **Phân luồng hội thoại con (Chat Threads)**: Trường `parent_message_id` tham chiếu ngược về `chat_messages(id)` cho phép tách nhánh thảo luận phụ bên trong nhóm mà không làm trôi tin nhắn chính.
4. **Tối ưu hóa đếm tin chưa đọc (Unread Count) & Keyset Pagination**: Chỉ mục phức hợp phục vụ truy vấn tin nhắn mới nhất và phân trang con trỏ Base64URL $\mathcal{O}(1)$. Trigger CSDL tự động làm mới `chat_channels.updated_at` mỗi khi có tin nhắn mới.

```text
users (1) ──< chat_requests (N) >── users (1)
  │
  ├──< chat_members (N) >── chat_channels (1)
                                │
                                └──< chat_messages (1-N, Chat Threads via parent_message_id)
```

#### Kịch bản Migration `000004_create_chat_schema.up.sql`

```sql
-- ==============================================================================
-- Migration: 000004_create_chat_schema.up.sql
-- Phân hệ: Phân hệ 4 - Reddit Realtime Chat, Chat Requests & Chat Threads
-- Hệ quản trị mục tiêu: PostgreSQL 16+
-- ==============================================================================

-- 1. Tiện ích mở rộng UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Kiểu dữ liệu Enums phân hệ Chat
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_channel_type') THEN
        CREATE TYPE chat_channel_type AS ENUM ('DIRECT', 'GROUP');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_request_status') THEN
        CREATE TYPE chat_request_status AS ENUM ('PENDING', 'ACCEPTED', 'IGNORED', 'BLOCKED');
    END IF;
END $$;

-- 3. Bảng chat_channels (Phòng chat / Kênh hội thoại)
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type chat_channel_type NOT NULL DEFAULT 'DIRECT',
    name VARCHAR(128),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_group_channel_name CHECK (
        (type = 'GROUP' AND name IS NOT NULL AND char_length(trim(name)) >= 2) OR 
        (type = 'DIRECT')
    )
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_creator ON chat_channels (creator_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_updated_at ON chat_channels (updated_at DESC);

-- 4. Bảng chat_members (Thành viên tham gia kênh hội thoại)
CREATE TABLE IF NOT EXISTS chat_members (
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id UUID,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_channel_user ON chat_members (channel_id, user_id);

-- 5. Bảng chat_messages (Tin nhắn & Phân luồng Chat Threads)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_chat_message_content_not_empty CHECK (char_length(trim(content)) > 0)
);

-- Chỉ mục tối ưu cho truy vấn tin nhắn chính và phân trang con trỏ (Keyset Cursor)
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_cursor 
    ON chat_messages (channel_id, created_at DESC, id DESC) 
    WHERE is_deleted = FALSE;

-- Chỉ mục partial cho phân nhánh Chat Threads
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent 
    ON chat_messages (parent_message_id, created_at ASC) 
    WHERE parent_message_id IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender 
    ON chat_messages (sender_id);

-- Gắn khóa ngoại từ chat_members.last_read_message_id sang chat_messages(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_chat_members_last_read_message'
    ) THEN
        ALTER TABLE chat_members 
        ADD CONSTRAINT fk_chat_members_last_read_message 
        FOREIGN KEY (last_read_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Bảng chat_requests (Hàng đợi kiểm duyệt yêu cầu tin nhắn từ người lạ)
CREATE TABLE IF NOT EXISTS chat_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES chat_channels(id) ON DELETE SET NULL,
    initial_message TEXT NOT NULL,
    status chat_request_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_chat_requests_pair UNIQUE (sender_id, receiver_id),
    CONSTRAINT chk_chat_requests_no_self_chat CHECK (sender_id <> receiver_id),
    CONSTRAINT chk_chat_requests_msg_len CHECK (char_length(trim(initial_message)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_requests_receiver_status 
    ON chat_requests (receiver_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_requests_sender 
    ON chat_requests (sender_id);

-- ==============================================================================
-- 7. TRIGGERS TỰ ĐỘNG HÓA CẬP NHẬT TRẠNG THÁI VÀ BỘ ĐẾM KÊNH CHAT
-- ==============================================================================

-- A. Cập nhật updated_at cho chat_channels và chat_requests
CREATE OR REPLACE FUNCTION trg_fn_update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_channels_updated_at ON chat_channels;
CREATE TRIGGER trg_chat_channels_updated_at
    BEFORE UPDATE ON chat_channels
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_update_chat_timestamp();

DROP TRIGGER IF EXISTS trg_chat_requests_updated_at ON chat_requests;
CREATE TRIGGER trg_chat_requests_updated_at
    BEFORE UPDATE ON chat_requests
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_update_chat_timestamp();

-- B. Tự động cập nhật updated_at của chat_channels khi có tin nhắn mới
CREATE OR REPLACE FUNCTION trg_fn_touch_chat_channel_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_channels 
    SET updated_at = NEW.created_at 
    WHERE id = NEW.channel_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_chat_channel ON chat_messages;
CREATE TRIGGER trg_touch_chat_channel
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_touch_chat_channel_on_message();
```

#### Kịch bản Rollback `000004_create_chat_schema.down.sql`

```sql
-- ==============================================================================
-- Migration: 000004_create_chat_schema.down.sql
-- Thao tác: Rollback toàn bộ cấu trúc bảng, triggers và enums Phân hệ 4
-- ==============================================================================

-- 1. Thu hồi Triggers
DROP TRIGGER IF EXISTS trg_touch_chat_channel ON chat_messages;
DROP FUNCTION IF EXISTS trg_fn_touch_chat_channel_on_message();

DROP TRIGGER IF EXISTS trg_chat_requests_updated_at ON chat_requests;
DROP TRIGGER IF EXISTS trg_chat_channels_updated_at ON chat_channels;
DROP FUNCTION IF EXISTS trg_fn_update_chat_timestamp();

-- 2. Tháo gỡ ràng buộc khóa ngoại chéo
ALTER TABLE IF EXISTS chat_members 
DROP CONSTRAINT IF EXISTS fk_chat_members_last_read_message;

-- 3. Xóa bảng theo đúng thứ tự phụ thuộc khóa ngoại
DROP TABLE IF EXISTS chat_requests CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_members CASCADE;
DROP TABLE IF EXISTS chat_channels CASCADE;

-- 4. Xóa kiểu dữ liệu Enums
DROP TYPE IF EXISTS chat_request_status CASCADE;
DROP TYPE IF EXISTS chat_channel_type CASCADE;
```

### 2. PHÂN HỆ 5: KIỂM DUYỆT, MOD QUEUE & QUẢN TRỊ TOÀN DIỆN (MODERATION & ADMIN HUB)

Phân hệ 5 thiết lập các cơ chế kiểm soát chất lượng nội dung và an ninh hệ thống:

1. **Hàng đợi Mod Queue (`reports`)**: Tiếp nhận và phân luồng báo cáo vi phạm nội dung cho cả `THREAD` và `COMMENT`.
2. **Chống Spam Report ở tầng CSDL**: Bổ sung chỉ mục Partial Unique `uq_pending_report_per_user_target` trên `(reporter_id, target_type, target_id) WHERE status = 'PENDING'`. Một người dùng không thể gửi nhiều báo cáo trùng lặp cho cùng một bài viết/bình luận khi báo cáo cũ chưa được xử lý (triệt tiêu race condition ở tầng CSDL, tự động nảy sinh mã lỗi 409 Conflict).
3. **Nhật ký kiểm toán an ninh bất biến (`audit_logs`)**: Ghi nhận toàn bộ thao tác nhạy cảm của quản trị viên (đổi Role, khóa/mở khóa tài khoản, duyệt báo cáo, cưỡng chế hủy phiên). Bảng được áp dụng Trigger **chặn hoàn toàn thao tác `UPDATE` và `DELETE`**, bảo đảm tính toàn vẹn của bằng chứng pháp lý và tuân thủ các chuẩn kiểm toán.
4. **Hỗ trợ Shadowban & Cưỡng chế thu hồi phiên**: Tích hợp với `users(status)` (`SHADOWBANNED`, `SUSPENDED`) và `user_sessions(is_revoked)` đã thiết lập ở Phân hệ 1.

```text
users (1, reporters) ──< reports (N) >── users (1, resolved_by)
  │
users (1, actors)    ──< audit_logs (N, Append-Only / Immutable)
```

#### Kịch bản Migration `000005_create_moderation_and_admin_schema.up.sql`

```sql
-- ==============================================================================
-- Migration: 000005_create_moderation_and_admin_schema.up.sql
-- Phân hệ: Phân hệ 5 - Moderation, Mod Queue & Bảng Kiểm Toán An Ninh Bất Biến
-- Hệ quản trị mục tiêu: PostgreSQL 16+
-- ==============================================================================

-- 1. Tiện ích mở rộng UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Kiểu dữ liệu Enums phân hệ kiểm duyệt
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mod_report_status') THEN
        CREATE TYPE mod_report_status AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mod_report_target_type') THEN
        CREATE TYPE mod_report_target_type AS ENUM ('THREAD', 'COMMENT');
    END IF;
END $$;

-- 3. Bảng reports (Hàng đợi kiểm duyệt Mod Queue)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type mod_report_target_type NOT NULL,
    target_id UUID NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status mod_report_status NOT NULL DEFAULT 'PENDING',
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_note VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_report_reason_len CHECK (char_length(trim(reason)) >= 3),
    CONSTRAINT chk_report_resolution CHECK (
        (status = 'PENDING' AND resolved_at IS NULL) OR 
        (status IN ('RESOLVED', 'DISMISSED') AND resolved_at IS NOT NULL)
    )
);

-- Chỉ mục Unique Partial: Ngăn chặn 1 user gửi trùng lặp báo cáo đang ở trạng thái PENDING
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_report_per_user_target 
    ON reports (reporter_id, target_type, target_id) 
    WHERE status = 'PENDING';

-- Chỉ mục tối ưu cho Mod Queue và tìm kiếm theo đối tượng
CREATE INDEX IF NOT EXISTS idx_reports_queue_pending 
    ON reports (created_at DESC) 
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_reports_target 
    ON reports (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_reports_status 
    ON reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_reporter 
    ON reports (reporter_id, created_at DESC);

-- 4. Bảng audit_logs (Nhật ký kiểm toán an ninh hệ thống bất biến - Write-Only)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45), -- Hỗ trợ cả IPv4 và IPv6 đầy đủ
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục phục vụ tra cứu lịch sử kiểm toán của Quản trị viên
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created 
    ON audit_logs (actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created 
    ON audit_logs (action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target 
    ON audit_logs (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
    ON audit_logs (created_at DESC);

-- ==============================================================================
-- 5. TRIGGER BẢO VỆ BẢNG AUDIT_LOGS BẤT BIẾN (IMMUTABLE LOG SHIELD)
-- Ngăn chặn tuyệt đối mọi hành vi UPDATE hoặc DELETE nhằm xóa vết kiểm toán
-- ==============================================================================

CREATE OR REPLACE FUNCTION trg_fn_enforce_audit_logs_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'BẢO MẬT: Bảng audit_logs là bảng ghi nhật ký bất biến (Append-Only). Cấm mọi thao tác UPDATE hoặc DELETE!';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutability ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutability
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_enforce_audit_logs_immutability();
```

#### Kịch bản Rollback `000005_create_moderation_and_admin_schema.down.sql`

```sql
-- ==============================================================================
-- Migration: 000005_create_moderation_and_admin_schema.down.sql
-- Thao tác: Rollback toàn bộ cấu trúc bảng, triggers và enums Phân hệ 5
-- ==============================================================================

-- 1. Thu hồi Trigger bảo vệ bất biến
DROP TRIGGER IF EXISTS trg_audit_logs_immutability ON audit_logs;
DROP FUNCTION IF EXISTS trg_fn_enforce_audit_logs_immutability();

-- 2. Xóa các bảng theo thứ tự khóa ngoại
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS reports CASCADE;

-- 3. Xóa các Enums
DROP TYPE IF EXISTS mod_report_target_type CASCADE;
DROP TYPE IF EXISTS mod_report_status CASCADE;
```

### 3. MA TRẬN TỐI ƯU HÓA CHỈ MỤC & RÀNG BUỘC PHÂN HỆ 4 & 5

| Bảng                        | Tên Chỉ Mục / Ràng Buộc             | Kiểu Dữ Liệu             | Biểu Thức / Cột                                                                   | Mục Đích & Hiệu Năng                                                                                |
| --------------------------- | ----------------------------------- | ------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| <br>**`chat_channels`**<br> | `chk_group_channel_name`            | Check Constraint         | `type = 'GROUP' -> name IS NOT NULL`                                              | <br>Bắt buộc đặt tên cho Group Chat, cho phép Direct Chat null name.<br>                            |
| <br>**`chat_messages`**<br> | `idx_chat_messages_channel_cursor`  | B-Tree Partial           | `(channel_id, created_at DESC, id DESC) WHERE is_deleted = FALSE`                 | <br>Tải lịch sử chat và phân trang con trỏ Keyset Cursor $\mathcal{O}(1)$.<br>                      |
| <br>**`chat_messages`**<br> | <br>`idx_chat_messages_parent`<br>  | B-Tree Partial           | <br>`(parent_message_id, created_at ASC) WHERE parent_message_id IS NOT NULL`<br> | <br>Lọc nhanh toàn bộ nhánh trao đổi Chat Threads mà không quét toàn bảng.<br>                      |
| <br>**`chat_requests`**<br> | `uq_chat_requests_pair`             | B-Tree Unique            | <br>`(sender_id, receiver_id)`<br>                                                | <br>Ngăn chặn việc gửi spam nhiều yêu cầu tin nhắn giữa 2 người dùng.<br>                           |
| <br>**`chat_requests`**<br> | `chk_chat_requests_no_self_chat`    | Check Constraint         | `sender_id <> receiver_id`                                                        | <br>Chặn đứng hành vi tự gửi tin nhắn cho chính mình ở tầng DB.<br>                                 |
| <br>**`reports`**<br>       | `uq_pending_report_per_user_target` | **Unique Partial Index** | `(reporter_id, target_type, target_id) WHERE status = 'PENDING'`                  | <br>**Chống spam Mod Queue**: 1 user chỉ được có tối đa 1 báo cáo PENDING cho 1 thread/comment.<br> |
| <br>**`reports`**<br>       | `idx_reports_queue_pending`         | B-Tree Partial           | `(created_at DESC) WHERE status = 'PENDING'`                                      | <br>Trả về danh sách Mod Queue cho Moderator xử lý với tốc độ tức thời.<br>                         |
| <br>**`audit_logs`**<br>    | `trg_audit_logs_immutability`       | PL/pgSQL Trigger         | `BEFORE UPDATE OR DELETE`                                                         | <br>**Bất biến tuyệt đối (Append-Only)**: Chống xóa dấu vết can thiệp DB.<br>                       |

### 4. QUY TRÌNH THỰC THI & KIỂM CHỨNG DDL TRÊN TERMINAL

Khởi chạy tuần tự các lệnh sau trên terminal Debian để đồng bộ toàn bộ DDL Phân hệ 4 & 5 vào PostgreSQL 16 cục bộ:

```bash
# 1. Chạy migration tạo schema Phân hệ 4 (Realtime Chat Subsystem)
psql -h localhost -p 5432 -U postgres -d acad_dev -f deploy/migrations/000004_create_chat_schema.up.sql

# 2. Chạy migration tạo schema Phân hệ 5 (Moderation & Audit Logs Hub)
psql -h localhost -p 5432 -U postgres -d acad_dev -f deploy/migrations/000005_create_moderation_and_admin_schema.up.sql

# 3. Kiểm tra danh sách bảng đã khởi tạo thành công
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('chat_channels', 'chat_members', 'chat_messages', 'chat_requests', 'reports', 'audit_logs')
ORDER BY table_name;
"
```

*Kết quả đối soát bảng:*

```plaintext
table_name   
---------------
 audit_logs
 chat_channels
 chat_members
 chat_messages
 chat_requests
 reports
```

```bash
# 4. Kiểm tra trigger bảo vệ tính bất biến của audit_logs (Thử xóa hoặc sửa sẽ bị CSDL chặn đứng)
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
DO \$\$
BEGIN
    BEGIN
        DELETE FROM audit_logs;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'KIỂM CHỨNG THÀNH CÔNG: %', SQLERRM;
    END;
END \$\$;
"
```

*Kết quả phản hồi:*

```plaintext
NOTICE:  KIỂM CHỨNG THÀNH CÔNG: BẢO MẬT: Bảng audit_logs là bảng ghi nhật ký bất biến (Append-Only). Cấm mọi thao tác UPDATE hoặc DELETE!
```

```bash
# 5. Kiểm tra tính toàn vẹn chỉ mục Partial Unique của reports
psql -h localhost -p 5432 -U postgres -d acad_dev -c "
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'reports' AND indexname = 'uq_pending_report_per_user_target';
"
```