# Thiết Kế Lược Đồ Cơ Sở Dữ Liệu PostgreSQL 16 (Database Schema)

> **Mã tài liệu:** `DATA-POSTGRES-SCHEMA`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Hệ quản trị:** PostgreSQL 16+ (Supabase Managed PostgreSQL)  
> **Các Tiện Ích Mở Rộng Kích Hoạt:** `uuid-ossp`, `pgcrypto`, `ltree`, `pg_trgm`

---

## 1. TIỆN ÍCH MỞ RỘNG & KIỂU DỮ LIỆU TÙY BIẾN (EXTENSIONS & ENUMS)

```sql
-- Kích hoạt 4 extensions nền tảng
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- Sinh UUID v4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- Mật mã & băm
CREATE EXTENSION IF NOT EXISTS "ltree";      -- Quản lý cây bình luận phân cấp
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- Tìm kiếm toàn văn bản mờ

-- Vai trò toàn cục của người dùng trong hệ thống
CREATE TYPE user_role AS ENUM ('GUEST', 'USER', 'SPACE_MOD', 'GLOBAL_MOD', 'ADMIN');

-- Trạng thái vòng đời của tài khoản
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'SHADOWBANNED', 'DELETED');

-- Trạng thái yêu cầu tin nhắn lạ (Reddit Chat Requests)
CREATE TYPE chat_request_status AS ENUM ('PENDING', 'ACCEPTED', 'IGNORED', 'BLOCKED');

-- Loại kênh trò chuyện
CREATE TYPE chat_channel_type AS ENUM ('DIRECT', 'GROUP');
```

---

## 2. BẢNG DỮ LIỆU ĐỊNH DANH & BẢO MẬT (AUTH & SESSIONS)

### 2.1. Bảng `users` (Danh Tính Người Dùng)
```sql
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);
```

### 2.2. Bảng `user_sessions` (Quản Lý Phiên Đa Thiết Bị)
```sql
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

---

## 3. BẢNG DỮ LIỆU CỘNG ĐỒNG, BÀI VIẾT & BÌNH LUẬN (COMMUNITY & LTREE)

### 3.1. Bảng `spaces` (Không Gian Tương Đương Subreddit) & `space_flairs`
```sql
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    banner_url TEXT,
    icon_url TEXT,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    creator_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hệ thống Nhãn Phân Loại Bài Viết (Post Flairs)
CREATE TABLE IF NOT EXISTS space_flairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#DFD0B8',
    background_hex VARCHAR(7) NOT NULL DEFAULT '#393E46',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_space_flair_slug UNIQUE (space_id, slug)
);

CREATE TABLE IF NOT EXISTS space_memberships (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, space_id)
);
```

### 3.2. Bảng `threads` (Bài Viết Thảo Luận) & `thread_counters` (Tối Ưu HOT)
```sql
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flair_id UUID REFERENCES space_flairs(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    slug VARCHAR(350) NOT NULL UNIQUE,
    content_text TEXT,
    content_ast JSONB,
    link_url TEXT,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tối ưu hóa cập nhật không ghi lại index B-Tree (Heap-Only Tuples)
CREATE TABLE IF NOT EXISTS thread_counters (
    thread_id UUID PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    net_score INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) WITH (fillfactor = 70);

CREATE INDEX IF NOT EXISTS idx_threads_space_created ON threads (space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_title_trgm ON threads USING GIN (title gin_trgm_ops);
```

### 3.3. Bảng `comments` (Cây Bình Luận Phân Cấp Materialized Path `ltree`)
```sql
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    path LTREE NOT NULL,
    content_ast JSONB NOT NULL,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    net_score INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục GiST cho phép truy vấn toàn bộ cây con trong O(1)
CREATE INDEX IF NOT EXISTS idx_comments_path_gist ON comments USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_comments_thread_path ON comments (thread_id, path);
```

---

## 4. BẢNG DỮ LIỆU NHẮN TIN TỨC THỜI (REDDIT CHATS)

```sql
-- Kênh hội thoại 1-1 hoặc Nhóm
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type chat_channel_type NOT NULL DEFAULT 'DIRECT',
    name VARCHAR(128),
    creator_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Thành viên tham gia kênh
CREATE TABLE IF NOT EXISTS chat_members (
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

-- Tin nhắn trong kênh
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE, -- Chat Threads
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hàng đợi yêu cầu tin nhắn lạ chống spam (Chat Requests)
CREATE TABLE IF NOT EXISTS chat_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    initial_message TEXT NOT NULL,
    status chat_request_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_chat_request_pair UNIQUE (sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_requests_receiver ON chat_requests (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_time ON chat_messages (channel_id, created_at DESC);
```

---

## 5. BẢNG DỮ LIỆU KIỂM DUYỆT & NHẬT KÝ KIỂM TOÁN (MODERATION & AUDIT LOGS)

```sql
-- Trạng thái phản ánh vi phạm
CREATE TYPE report_status AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- Loại đối tượng bị phản ánh
CREATE TYPE report_target_type AS ENUM ('THREAD', 'COMMENT');

-- Bảng tiếp nhận phản ánh vi phạm nội dung (Reports / Mod Queue)
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type report_target_type NOT NULL,
    target_id UUID NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status report_status NOT NULL DEFAULT 'PENDING',
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status_time ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports (target_type, target_id);

-- Bảng nhật ký kiểm toán quản trị an ninh hệ thống (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action, created_at DESC);
```
