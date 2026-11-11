-- ==============================================================================
-- Migration: 000002_create_community_schema.up.sql
-- Phân hệ 2: Spaces, Content Engine & Nested Comments (ltree)
-- Target: PostgreSQL 16+
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'space_role') THEN
        CREATE TYPE space_role AS ENUM ('MEMBER', 'MODERATOR', 'CREATOR');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'thread_type') THEN
        CREATE TYPE thread_type AS ENUM ('TEXT', 'LINK', 'MEDIA');
    END IF;
END $$;

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
    member_count INTEGER NOT NULL DEFAULT 0,
    thread_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_spaces_slug_format CHECK (slug ~ '^[a-z0-9_-]+$'),
    CONSTRAINT chk_spaces_name_len CHECK (char_length(name) >= 2)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_slug_lower ON spaces (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_spaces_name_trgm ON spaces USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_spaces_member_count ON spaces (member_count DESC);
CREATE INDEX IF NOT EXISTS idx_spaces_creator_id ON spaces (creator_id);

CREATE TABLE IF NOT EXISTS space_memberships (
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role space_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (space_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON space_memberships (user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_space_role ON space_memberships (space_id, role);

CREATE TABLE IF NOT EXISTS space_flairs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL,
    color_hex VARCHAR(7) NOT NULL DEFAULT '#E1D9BC',
    background_hex VARCHAR(7) NOT NULL DEFAULT '#30364F',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_space_flair_slug UNIQUE (space_id, slug),
    CONSTRAINT chk_flair_color_hex CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT chk_flair_bg_hex CHECK (background_hex ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE INDEX IF NOT EXISTS idx_flairs_space ON space_flairs (space_id);

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

CREATE INDEX IF NOT EXISTS idx_threads_space_created ON threads (space_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_author ON threads (author_id);
CREATE INDEX IF NOT EXISTS idx_threads_flair ON threads (flair_id) WHERE flair_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_threads_title_trgm ON threads USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_threads_slug ON threads (slug);
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads (created_at DESC);

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

CREATE INDEX IF NOT EXISTS idx_comments_path_gist ON comments USING gist (path);
CREATE INDEX IF NOT EXISTS idx_comments_thread_path ON comments (thread_id, path);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments (author_id);

-- Triggers tự động hóa timestamp và bộ đếm
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

CREATE OR REPLACE FUNCTION maintain_space_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE spaces SET member_count = member_count + 1 WHERE id = NEW.space_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE spaces SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.space_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_space_members_count ON space_memberships;
CREATE TRIGGER trg_space_members_count
    AFTER INSERT OR DELETE ON space_memberships
    FOR EACH ROW
    EXECUTE FUNCTION maintain_space_member_count();

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
