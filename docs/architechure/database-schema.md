# Đặc Tả Lược Đồ Cơ Sở Dữ Liệu & Bộ Nhớ Đệm (Database & Cache Schema)

**Hệ Quản Trị CSDL:** PostgreSQL 16+ (Supabase Managed PostgreSQL)  
**Bộ Nhớ Đệm & Quản Lý Phiên:** Redis 7+ (Upstash / In-Memory Fallback)  
**Tập Tin Di Chuyển:** `deploy/migrations/000001_create_auth_schema.up.sql`, `deploy/migrations/000002_create_community_schema.up.sql`  

---

## 1. TIỆN ÍCH MỞ RỘNG (POSTGRESQL EXTENSIONS)

Hệ thống yêu cầu kích hoạt 4 tiện ích mở rộng quan trọng trong CSDL PostgreSQL:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- Hỗ trợ sinh UUID ngẫu nhiên v4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Hàm mật mã, gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "ltree";      -- Quản lý cấu trúc cây bình luận đệ quy hiệu năng cao
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Tìm kiếm toàn văn bản mờ qua chỉ mục GIN Trigram
```

---

## 2. DANH MỤC KIỂU DỮ LIỆU TÙY BIẾN (ENUM TYPES)

```sql
-- Vai trò toàn cục của người dùng trong hệ thống
CREATE TYPE user_role AS ENUM (
    'GUEST',           -- Khách vãng lai (chỉ đọc)
    'USER',            -- Thành viên thông thường
    'SPACE_MOD',       -- Quản trị viên của một không gian cụ thể
    'GLOBAL_MOD',      -- Quản trị viên toàn sàn (xử lý Mod Queue)
    'ADMIN'            -- Quản trị viên cấp cao (toàn quyền)
);

-- Trạng thái vòng đời của tài khoản
CREATE TYPE user_status AS ENUM (
    'ACTIVE',          -- Đang hoạt động bình thường
    'SUSPENDED',       -- Bị khóa tài khoản tạm thời
    'SHADOWBANNED',    -- Cấm ngầm (vẫn thấy bài mình nhưng vô hình với người khác)
    'DELETED'          -- Đã xóa dữ liệu (anonymized)
);

-- Loại sự kiện nhật ký kiểm toán an ninh
CREATE TYPE audit_event_type AS ENUM (
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'TOKEN_REFRESH_SUCCESS',
    'TOKEN_REUSE_DETECTED',
    'LOGOUT',
    'PASSWORD_CHANGED',
    'SESSION_REVOKED',
    'ALL_SESSIONS_REVOKED'
);
```

---

## 3. KHUNG BẢNG QUAN HỆ CỐT LÕI (TABLE DEFINITIONS)

### 3.1. Bảng `users` (Hồ Sơ & Danh Tính Người Dùng)
Lưu trữ thông tin người dùng với chỉ mục tìm kiếm không phân biệt hoa thường và chỉ mục phân loại:
```sql
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(32) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Chuỗi băm Argon2id / bcrypt
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);
CREATE INDEX IF NOT EXISTS idx_users_karma ON users (karma_score DESC);
```

### 3.2. Bảng `user_sessions` (Phiên Làm Việc & Xoay Vòng Token)
Quản lý trạng thái phiên, nhóm phiên (`family_id`), và lưu vết băm token hiện hành lẫn token vừa xoay vòng để hỗ trợ Grace Period 30 giây:
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,                        -- Định danh gia đình phiên để thu hồi toàn bộ khi bị tấn công
    device_fingerprint VARCHAR(128) NOT NULL,       -- Nhận dạng thiết bị (Hash từ Browser/Hardware info)
    current_token_hash VARCHAR(64) NOT NULL,        -- SHA-256 hash của Refresh Token hiện hành
    previous_token_hash VARCHAR(64),                -- SHA-256 hash của token vừa bị thay thế (Grace Period)
    grace_period_expires_at TIMESTAMPTZ,            -- Thời hạn cửa sổ an toàn 30s
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL                 -- Hạn chót của phiên (mặc định 7 ngày)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions (user_id, is_revoked);
CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON user_sessions (family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_curr_hash ON user_sessions (current_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_prev_hash ON user_sessions (previous_token_hash);
```

### 3.3. Bảng `threads` (Bài Viết Thảo Luận)
```sql
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_ast JSONB NOT NULL,                     -- Cây JSON Abstract Syntax Tree từ Tiptap Editor
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_threads_slug_lower UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_threads_space_created ON threads (space_id, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_threads_author ON threads (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_title_trgm ON threads USING GIN (title gin_trgm_ops);
```

### 3.4. Bảng `thread_counters` (Bộ Đếm Tách Rời - Tối Ưu Hóa Ghi Tải Cao)
Bảng counters được tách hoàn toàn khỏi bảng `threads` chính để chống khóa bản ghi và triệt tiêu phình bảng dữ liệu (MVCC Table Bloat) bằng cách thiết lập `fillfactor = 70`:
```sql
CREATE TABLE IF NOT EXISTS thread_counters (
    thread_id UUID PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    net_score INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    hot_score DOUBLE PRECISION NOT NULL DEFAULT 0,  -- Điểm tính theo thuật toán Gravity Decay
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) WITH (fillfactor = 70);                           -- Bật Heap-Only Tuples (HOT) của PostgreSQL

CREATE INDEX IF NOT EXISTS idx_thread_counters_hot ON thread_counters (hot_score DESC);
CREATE INDEX IF NOT EXISTS idx_thread_counters_net_score ON thread_counters (net_score DESC);
```

### 3.5. Bảng `comments` (Cây Bình Luận Đa Tầng Qua `ltree`)
Sử dụng extension `ltree` với nhãn mã hóa Base36 4 ký tự mỗi tầng (ví dụ: `0001.000a.0003`):
```sql
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_ast JSONB NOT NULL,
    path LTREE NOT NULL,                            -- Đường dẫn phân cấp ltree
    depth INTEGER NOT NULL DEFAULT 0,               -- Độ sâu của bình luận (0 đến 8)
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    net_score INTEGER NOT NULL DEFAULT 0,
    is_collapsed_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục GiST cho phép truy vấn cây con cực nhanh O(1)
CREATE INDEX IF NOT EXISTS idx_comments_path_gist ON comments USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_comments_thread_path ON comments (thread_id, path ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments (author_id);
```

### 3.6. Bảng `votes` (Ghi Nhận Tương Tác & Chống Gian Lận)
```sql
CREATE TABLE IF NOT EXISTS votes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,                        -- ID bài viết hoặc bình luận
    target_type VARCHAR(10) NOT NULL,               -- 'THREAD' hoặc 'COMMENT'
    direction SMALLINT NOT NULL,                    -- +1 (Upvote) hoặc -1 (Downvote)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_target ON votes (target_id, direction);
```

---

## 4. QUY CHUẨN PHÂN BỐ KHÔNG GIAN KHÓA REDIS (KEYSPACE SCHEMA)

| Cấu Trúc Khóa (Key Pattern) | Kiểu Dữ Liệu | Mục Đích Sử Dụng | Thời Gian Sống (TTL) |
| :--- | :--- | :--- | :--- |
| `session:{userId}:{fingerprint}` | Hash | Thông tin phiên làm việc, current & previous token hash | 7 ngày (604,800s) |
| `session_by_id:{sessionId}` | String | Con trỏ tra cứu ngược từ SessionId sang session key | 7 ngày |
| `token_idx:{tokenHash}` | String | Con trỏ tra cứu nhanh từ Token Hash sang session key | 7 ngày |
| `user_sessions:{userId}` | Set | Danh sách tất cả session ID của người dùng (phục vụ thu hồi từ xa) | 7 ngày |
| `family_sessions:{familyId}` | Set | Danh sách các session ID thuộc cùng một gia đình phiên | 7 ngày |
| `ratelimit:{action}:{ipOrUser}` | String / Counter | Sliding-window bucket đếm số lần gọi API | 60s - 900s |
| `thread:{id}:voters` | Hash (`userId` $\rightarrow$ `dir`) | Lưu trạng thái vote hiện tại của từng người dùng trên bài viết | Vô hạn (Dirty-synced) |
| `thread:{id}:counters` | Hash (`upvotes`, `net_score`) | Bộ đếm tạm thời xử lý qua Redis Lua trước khi xả dồn | Vô hạn (Dirty-synced) |
| `dirty_threads_registry` | Set (`targetId`) | Tập hợp các bài viết có biến động điểm cần worker ghi chậm vào DB | Xóa sau mỗi chu kỳ flush 5s |
