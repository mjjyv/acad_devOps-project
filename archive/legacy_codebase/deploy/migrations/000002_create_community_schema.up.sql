-- ============================================================================
-- ACAD COMMUNITY PLATFORM - COMMUNITY, CMS & INTERACTION SCHEMA MIGRATION
-- Migration: 000002_create_community_schema.up.sql
-- Engine: PostgreSQL 16+
-- ============================================================================

-- 1. BẬT EXTENSIONS CẦN THIẾT CHO CÂY BÌNH LUẬN & TÌM KIẾM
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. TẠO CÁC KIỂU DỮ LIỆU LIỆT KÊ (ENUMS)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'space_role') THEN
        CREATE TYPE space_role AS ENUM (
            'MEMBER',
            'MODERATOR',
            'ADMIN'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_status') THEN
        CREATE TYPE media_status AS ENUM (
            'PENDING',
            'ATTACHED',
            'ORPHANED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM (
            'PENDING',
            'REVIEWED',
            'DISMISSED',
            'ACTION_TAKEN'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_reason') THEN
        CREATE TYPE report_reason AS ENUM (
            'SPAM',
            'HARASSMENT',
            'HATE_SPEECH',
            'COPYRIGHT',
            'MISINFORMATION',
            'OTHER'
        );
    END IF;
END $$;

-- 3. BẢNG KHÔNG GIAN THẢO LUẬN (SPACES)
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rules JSONB DEFAULT '[]'::jsonb,
    banner_url TEXT,
    avatar_url TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_spaces_slug_lower UNIQUE (slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_spaces_slug_lower ON spaces (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_spaces_creator ON spaces (creator_id);

-- 4. BẢNG THÀNH VIÊN KHÔNG GIAN (SPACE_MEMBERSHIPS)
CREATE TABLE IF NOT EXISTS space_memberships (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    role space_role NOT NULL DEFAULT 'MEMBER',
    karma_in_space INTEGER NOT NULL DEFAULT 0,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    muted_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, space_id)
);

CREATE INDEX IF NOT EXISTS idx_space_members_role ON space_memberships (space_id, role);

-- 5. BẢNG BÀI VIẾT THẢO LUẬN (THREADS)
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_ast JSONB NOT NULL, -- Tiptap JSON Abstract Syntax Tree
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_threads_slug_lower UNIQUE (slug)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_threads_slug_lower ON threads (LOWER(slug));
CREATE INDEX IF NOT EXISTS idx_threads_space_created ON threads (space_id, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_threads_author ON threads (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_title_trgm ON threads USING GIN (title gin_trgm_ops);

-- 6. BẢNG BỘ ĐẾM BÀI VIẾT TÁCH RỜI (THREAD_COUNTERS)
-- Cô lập hoàn toàn các chỉ số biến động cao ra khỏi bảng threads chính
-- Bật fillfactor = 70 để kích hoạt Heap-Only Tuples (HOT), triệt tiêu phình bảng (MVCC bloat)
CREATE TABLE IF NOT EXISTS thread_counters (
    thread_id UUID PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    net_score INTEGER NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    hot_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) WITH (fillfactor = 70);

CREATE INDEX IF NOT EXISTS idx_thread_counters_hot ON thread_counters (hot_score DESC);
CREATE INDEX IF NOT EXISTS idx_thread_counters_net_score ON thread_counters (net_score DESC);

-- Trigger tự động tạo bản ghi trong thread_counters khi một thread mới được tạo
CREATE OR REPLACE FUNCTION initialize_thread_counters()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO thread_counters (thread_id, upvotes, downvotes, net_score, comment_count, view_count, hot_score, updated_at)
    VALUES (NEW.id, 0, 0, 0, 0, 0, 0, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_threads_init_counters ON threads;
CREATE TRIGGER trg_threads_init_counters
AFTER INSERT ON threads
FOR EACH ROW EXECUTE FUNCTION initialize_thread_counters();

-- 7. BẢNG CÂY BÌNH LUẬN ĐA TẦNG (COMMENTS)
-- Sử dụng extension ltree với nhãn Base36 để lưu trữ và truy vấn cây đệ quy hiệu năng O(1)
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_ast JSONB NOT NULL,
    path LTREE NOT NULL,
    depth INTEGER NOT NULL DEFAULT 0,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    net_score INTEGER NOT NULL DEFAULT 0,
    is_collapsed_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục GiST cho phép truy vấn lấy toàn bộ cây hoặc nhánh con cực nhanh
CREATE INDEX IF NOT EXISTS idx_comments_path_gist ON comments USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_comments_thread_path ON comments (thread_id, path ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments (author_id);

-- 8. BẢNG GHI NHẬN TƯƠNG TÁC BẦU CHỌN (VOTES)
CREATE TABLE IF NOT EXISTS votes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type VARCHAR(10) NOT NULL, -- 'THREAD' | 'COMMENT'
    direction SMALLINT NOT NULL, -- +1 (Upvote) hoặc -1 (Downvote)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (user_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_target ON votes (target_id, direction);

-- 9. BẢNG QUẢN LÝ TỆP ĐA PHƯƠNG TIỆN ZERO-HOP (MEDIA_ASSETS)
CREATE TABLE IF NOT EXISTS media_assets (
    file_key VARCHAR(128) PRIMARY KEY,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mime_type VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    blurhash VARCHAR(64),
    status media_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_pending_reconciliation ON media_assets (status, created_at)
WHERE status = 'PENDING';

-- 10. BẢNG KIỂM DUYỆT BÁO CÁO VI PHẠM (MODERATION_REPORTS)
CREATE TABLE IF NOT EXISTS moderation_reports (
    id BIGSERIAL PRIMARY KEY,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type VARCHAR(10) NOT NULL,
    reason report_reason NOT NULL,
    details TEXT,
    status report_status NOT NULL DEFAULT 'PENDING',
    moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_queue ON moderation_reports (status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_reports_target ON moderation_reports (target_id);

-- 11. GẮN TRIGGER UPDATED_AT CHO CÁC BẢNG MỚI
DROP TRIGGER IF EXISTS trg_spaces_updated_at ON spaces;
CREATE TRIGGER trg_spaces_updated_at
BEFORE UPDATE ON spaces
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_space_memberships_updated_at ON space_memberships;
CREATE TRIGGER trg_space_memberships_updated_at
BEFORE UPDATE ON space_memberships
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_threads_updated_at ON threads;
CREATE TRIGGER trg_threads_updated_at
BEFORE UPDATE ON threads
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON media_assets;
CREATE TRIGGER trg_media_assets_updated_at
BEFORE UPDATE ON media_assets
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_moderation_reports_updated_at ON moderation_reports;
CREATE TRIGGER trg_moderation_reports_updated_at
BEFORE UPDATE ON moderation_reports
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
