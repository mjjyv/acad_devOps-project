-- ==============================================================================
-- Migration: 000002_create_community_schema.up.sql
-- Module: Phase B2 - Spaces, Content Engine & Nested Comments (ltree)
-- Target: PostgreSQL 16+
-- ==============================================================================

-- 1. Tiện ích mở rộng cần thiết cho Materialized Path & Full-text Trigram Search
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Kiểu dữ liệu Enum phân hệ cộng đồng
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'space_role') THEN
        CREATE TYPE space_role AS ENUM ('MEMBER', 'MODERATOR', 'CREATOR');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'thread_type') THEN
        CREATE TYPE thread_type AS ENUM ('TEXT', 'LINK', 'MEDIA');
    END IF;
END $$;

-- 3. Bảng spaces (Không gian thảo luận chuyên đề /s/[slug])
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(64) NOT NULL,
    slug VARCHAR(64) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    member_count INTEGER NOT NULL DEFAULT 1,
    thread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_slug_lower ON spaces (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_spaces_name_trgm ON spaces USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_spaces_member_count ON spaces (member_count DESC);

-- 4. Bảng space_memberships (Thành viên tham gia không gian)
CREATE TABLE IF NOT EXISTS space_memberships (
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role space_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON space_memberships (user_id);

-- 5. Bảng space_flairs (Nhãn phân loại bài viết kỹ thuật)
CREATE TABLE IF NOT EXISTS space_flairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#FF4500',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_space_flair_name UNIQUE (space_id, name)
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_space_created ON threads (space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_author ON threads (author_id);
CREATE INDEX IF NOT EXISTS idx_threads_title_trgm ON threads USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_threads_slug ON threads (slug);

-- 7. Bảng comments (Cây bình luận lồng nhau phân cấp Materialized Path ltree)
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục GiST tăng tốc tìm kiếm toàn bộ cây con < 1.2ms
CREATE INDEX IF NOT EXISTS idx_comments_path_gist ON comments USING gist (path);
CREATE INDEX IF NOT EXISTS idx_comments_thread_path ON comments (thread_id, path);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id);
