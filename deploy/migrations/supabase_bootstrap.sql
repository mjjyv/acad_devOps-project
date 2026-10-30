-- ============================================================================
-- ACAD DEVOPS PLATFORM - CONSOLIDATED SUPABASE BOOTSTRAP & SEED MIGRATION
-- File: deploy/migrations/supabase_bootstrap.sql
-- Mục đích: Khởi tạo toàn bộ Extension, Enum, Bảng, Chỉ mục, Trigger và Dữ liệu mẫu
--          sẵn sàng bàn giao (1-Click Run trên Supabase Studio SQL Editor)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PHẦN 1: KÍCH HOẠT POSTGRESQL EXTENSIONS NÂNG CAO
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------------------
-- PHẦN 2: ĐỊNH NGHĨA CÁC KIỂU ENUM LIỆT KÊ
-- ----------------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('GUEST', 'USER', 'SPACE_MOD', 'GLOBAL_MOD', 'ADMIN');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'SHADOWBANNED', 'DELETED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_event_type') THEN
        CREATE TYPE audit_event_type AS ENUM (
            'LOGIN_SUCCESS', 'LOGIN_FAILED', 'TOKEN_REFRESH_SUCCESS',
            'TOKEN_REUSE_DETECTED', 'LOGOUT', 'PASSWORD_CHANGED',
            'SESSION_REVOKED', 'ALL_SESSIONS_REVOKED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'space_role') THEN
        CREATE TYPE space_role AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_status') THEN
        CREATE TYPE media_status AS ENUM ('PENDING', 'ATTACHED', 'ORPHANED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
        CREATE TYPE report_status AS ENUM ('PENDING', 'REVIEWED', 'DISMISSED', 'ACTION_TAKEN');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_reason') THEN
        CREATE TYPE report_reason AS ENUM (
            'SPAM', 'HARASSMENT', 'HATE_SPEECH', 'COPYRIGHT', 'MISINFORMATION', 'OTHER'
        );
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- PHẦN 3: HÀM TRIGGER CẬP NHẬT UPDATED_AT
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- PHẦN 4: TẠO CÁC BẢNG DỮ LIỆU CỐT LÕI
-- ----------------------------------------------------------------------------

-- 4.1. Bảng Người dùng (users)
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

-- 4.2. Bảng Danh tính Liên kết (user_identities)
CREATE TABLE IF NOT EXISTS user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_provider_user UNIQUE (provider, provider_user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities (user_id);

-- 4.3. Bảng Quản lý Phiên & Token Rotation (user_sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    device_fingerprint VARCHAR(128) NOT NULL,
    current_token_hash VARCHAR(64) NOT NULL,
    previous_token_hash VARCHAR(64),
    grace_period_expires_at TIMESTAMPTZ,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions (user_id, is_revoked);
CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON user_sessions (family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_curr_hash ON user_sessions (current_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_prev_hash ON user_sessions (previous_token_hash);

-- 4.4. Bảng Nhật ký Kiểm toán (auth_audit_logs)
CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type audit_event_type NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON auth_audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_created ON auth_audit_logs (event_type, created_at DESC);

-- 4.5. Bảng Không gian Thảo luận (spaces)
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

-- 4.6. Bảng Thành viên Không gian (space_memberships)
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

-- 4.7. Bảng Bài viết Thảo luận (threads)
CREATE TABLE IF NOT EXISTS threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_ast JSONB NOT NULL,
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

-- 4.8. Bảng Bộ đếm Tách rời (thread_counters) với fillfactor = 70 (HOT updates)
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

-- Trigger tự động sinh thread_counters khi tạo bài viết
CREATE OR REPLACE FUNCTION initialize_thread_counters()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO thread_counters (thread_id, upvotes, downvotes, net_score, comment_count, view_count, hot_score, updated_at)
    VALUES (NEW.id, 0, 0, 0, 0, 0, 0, NOW())
    ON CONFLICT (thread_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_threads_init_counters ON threads;
CREATE TRIGGER trg_threads_init_counters
AFTER INSERT ON threads
FOR EACH ROW EXECUTE FUNCTION initialize_thread_counters();

-- 4.9. Bảng Cây Bình luận Đa tầng (comments) với LTREE & GiST Index
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
CREATE INDEX IF NOT EXISTS idx_comments_path_gist ON comments USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_comments_thread_path ON comments (thread_id, path ASC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments (author_id);

-- 4.10. Bảng Đánh giá Bình chọn (votes)
CREATE TABLE IF NOT EXISTS votes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type VARCHAR(10) NOT NULL, -- 'THREAD' | 'COMMENT'
    direction SMALLINT NOT NULL,       -- +1 hoặc -1
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, target_id)
);
CREATE INDEX IF NOT EXISTS idx_votes_target ON votes (target_id, direction);

-- 4.11. Bảng Quản lý Tài nguyên Đa phương tiện Zero-Hop (media_assets)
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

-- 4.12. Bảng Báo cáo Kiểm duyệt (moderation_reports)
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

-- ----------------------------------------------------------------------------
-- PHẦN 5: GẮN TRIGGERS TỰ ĐỘNG CẬP NHẬT UPDATED_AT
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_sessions_updated_at ON user_sessions;
CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_spaces_updated_at ON spaces;
CREATE TRIGGER trg_spaces_updated_at BEFORE UPDATE ON spaces FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_space_memberships_updated_at ON space_memberships;
CREATE TRIGGER trg_space_memberships_updated_at BEFORE UPDATE ON space_memberships FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_threads_updated_at ON threads;
CREATE TRIGGER trg_threads_updated_at BEFORE UPDATE ON threads FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON media_assets;
CREATE TRIGGER trg_media_assets_updated_at BEFORE UPDATE ON media_assets FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_moderation_reports_updated_at ON moderation_reports;
CREATE TRIGGER trg_moderation_reports_updated_at BEFORE UPDATE ON moderation_reports FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

-- ----------------------------------------------------------------------------
-- PHẦN 6: DỮ LIỆU KHỞI TẠO BÀN GIAO (SEED DATA FOR DEMO & EVALUATION)
-- Dữ liệu mẫu chuẩn kiến trúc, tài khoản quản trị và thảo luận ban đầu
-- ----------------------------------------------------------------------------

-- 6.1. Tài khoản Người dùng Mẫu (Mật khẩu chuẩn scrypt KDF tương thích 100% với PasswordHasher)
-- Admin: admin@acad.internal / Admin@Acad2026!
-- Moderator: moderator@acad.internal / Mod@Acad2026!
-- DevOps Engineer: devops_lead@acad.internal / Dev@Acad2026!
INSERT INTO users (id, username, email, password_hash, role, status, karma_score, bio)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin', 'admin@acad.internal', 
     '$scrypt$N=16384,r=8,p=1$e6b932ab54afbd2091c368642c0860ad$749081856537c034bc7b0e072a2013ce41648382d4f42bb6a83f5bd4d83a95cacebcff88805158f4a287de94fdb25373f78ed49c594fb1a13331117bda0f3d32', 
     'ADMIN', 'ACTIVE', 1000, 'System Administrator & DevOps Lead for Acad Monorepo Platform'),
     
    ('a0000000-0000-0000-0000-000000000002', 'moderator', 'moderator@acad.internal', 
     '$scrypt$N=16384,r=8,p=1$3e152100be384f058311c1b0fea806e6$8b379d094b9f87e1856cd94739bd65417aefd8110e698648aff77380fdbdf7d2b205769d69a48f33099907bbda4eef908b7df5e507091936193b2ddfcea57962', 
     'GLOBAL_MOD', 'ACTIVE', 500, 'Community Moderator & Content Reviewer'),
     
    ('a0000000-0000-0000-0000-000000000003', 'devops_lead', 'devops_lead@acad.internal', 
     '$scrypt$N=16384,r=8,p=1$da0a2d643614dbd6589c29f1bf53f72e$09cef2695ff7d7210f57b983102c8ea619f429573ca6fc15eb7fa4f39a7b69a1aa847d32f92eaf799ab43c816ab4ecbb3b1381c89dcfb50814c2a47adca0eadc', 
     'USER', 'ACTIVE', 250, 'Senior Site Reliability & Cloud Infrastructure Engineer')
ON CONFLICT (id) DO NOTHING;

-- 6.2. Không gian Thảo luận Mẫu (Spaces)
INSERT INTO spaces (id, slug, name, description, creator_id, is_private)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'devops-engineering', 'DevOps & Cloud Engineering', 
     'Không gian thảo luận chuyên sâu về CI/CD, Docker, Kubernetes, Linux và Hạ tầng Cloud.', 
     'a0000000-0000-0000-0000-000000000001', FALSE),
     
    ('b0000000-0000-0000-0000-000000000002', 'system-architecture', 'High-Throughput System Architecture', 
     'Kiến trúc hệ thống chịu tải cao, PostgreSQL ltree, Redis Lua, Caching và Microservices.', 
     'a0000000-0000-0000-0000-000000000001', FALSE),
     
    ('b0000000-0000-0000-0000-000000000003', 'fullstack-nextjs', 'Next.js 15 & Modern Web Development', 
     'Thảo luận về React Server Components (RSC), Partial Prerendering (PPR) và Virtualized UI.', 
     'a0000000-0000-0000-0000-000000000002', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 6.3. Thành viên Không gian (Space Memberships)
INSERT INTO space_memberships (user_id, space_id, role, karma_in_space)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ADMIN', 100),
    ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'MODERATOR', 50),
    ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'MEMBER', 30),
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'ADMIN', 150),
    ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'MEMBER', 80)
ON CONFLICT (user_id, space_id) DO NOTHING;

-- 6.4. Bài viết Thảo luận Mẫu (Threads)
INSERT INTO threads (id, space_id, author_id, slug, title, content_ast, is_pinned)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'chuyen-doi-database-render-sang-supabase-managed-postgresql',
     'Kế hoạch Chuyển Đổi Hạ Tầng Sang Supabase Managed PostgreSQL',
     '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hướng dẫn chi tiết quy trình thay thế CSDL Render cũ hết hạn sang Supabase Managed DB với kết nối Pooler IPv4 và hỗ trợ đầy đủ các Extension ltree, pgcrypto, pg_trgm."}]}]}'::jsonb,
     TRUE),
     
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003',
     'toi-uu-hoa-cay-binh-luan-da-tang-ltree-va-ao-hoa-dom',
     'Thuật Toán Trải Phẳng Tuyến Tính O(N) Cho Cây Bình Luận Đa Tầng ltree',
     '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Phân tích kiến trúc mã hóa Base36 4 ký tự trên PostgreSQL ltree kết hợp với thư viện ảo hóa @tanstack/react-virtual giúp hiển thị 10,000 bình luận mượt mà 60 FPS."}]}]}'::jsonb,
     FALSE)
ON CONFLICT (id) DO NOTHING;

-- 6.5. Cập nhật Bộ đếm Bài viết Mẫu (Thread Counters)
INSERT INTO thread_counters (thread_id, upvotes, downvotes, net_score, comment_count, view_count, hot_score)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 25, 1, 24, 3, 150, 18.5),
    ('c0000000-0000-0000-0000-000000000002', 42, 0, 42, 2, 280, 35.2)
ON CONFLICT (thread_id) DO UPDATE SET
    upvotes = EXCLUDED.upvotes,
    downvotes = EXCLUDED.downvotes,
    net_score = EXCLUDED.net_score,
    comment_count = EXCLUDED.comment_count,
    view_count = EXCLUDED.view_count,
    hot_score = EXCLUDED.hot_score;

-- 6.6. Bình luận Phân cấp Đa tầng Mẫu (Nested Comments với Base36 ltree path)
-- Cấu trúc phân nhánh cây bình luận:
-- 0001 (Level 1)
--   └── 0001.0001 (Level 2 - Con của 0001)
--         └── 0001.0001.0001 (Level 3 - Cháu của 0001)
-- 0002 (Level 1)
INSERT INTO comments (id, thread_id, parent_id, author_id, content_ast, path, depth, upvotes, downvotes, net_score)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', NULL,
     'a0000000-0000-0000-0000-000000000003',
     '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Tuyệt vời! Việc sử dụng Pooler cổng 6543 giúp tránh hoàn toàn lỗi kết nối IPv6 trên container Render."}]}]}'::jsonb,
     '0001'::ltree, 0, 12, 0, 12),

    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000001',
     '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Chính xác, kèm theo cờ sslmode=require và logic tự động rejectUnauthorized: false trong mã nguồn."}]}]}'::jsonb,
     '0001.0001'::ltree, 1, 8, 0, 8),

    ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
     'a0000000-0000-0000-0000-000000000002',
     '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Đã kiểm thử kết nối thử nghiệm thành công, dữ liệu mẫu hiển thị chuẩn xác."}]}]}'::jsonb,
     '0001.0001.0001'::ltree, 2, 5, 0, 5)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- PHẦN 7: BÁO CÁO TỔNG HỢP KIỂM ĐỊNH (VERIFICATION QUERY)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    users_cnt INT;
    spaces_cnt INT;
    threads_cnt INT;
    comments_cnt INT;
BEGIN
    SELECT COUNT(*) INTO users_cnt FROM users;
    SELECT COUNT(*) INTO spaces_cnt FROM spaces;
    SELECT COUNT(*) INTO threads_cnt FROM threads;
    SELECT COUNT(*) INTO comments_cnt FROM comments;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'SUPABASE DATABASE BOOTSTRAP THÀNH CÔNG!';
    RAISE NOTICE 'Tổng số Users:    %', users_cnt;
    RAISE NOTICE 'Tổng số Spaces:   %', spaces_cnt;
    RAISE NOTICE 'Tổng số Threads:  %', threads_cnt;
    RAISE NOTICE 'Tổng số Comments: %', comments_cnt;
    RAISE NOTICE '=======================================================';
END $$;
