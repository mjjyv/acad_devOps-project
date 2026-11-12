-- ==============================================================================
-- Migration: 000007_complete_domain_and_integrity.up.sql
-- Mục tiêu: Hoàn thiện CSDL theo Thiết kế Module (SAD Framework) & Zero Fake Data:
--   1. spaces.topic + idx_spaces_topic (Explore & Topics lọc thật)
--   2. idx_users_username_trgm (Tìm kiếm username mờ cho Create Direct Chat)
--   3. idx_chat_requests_sender_status (Hiển thị Sent Requests & hủy lời mời)
--   4. Sửa trigger comment_count đồng bộ chính xác khi soft-delete (is_deleted)
--   5. Trigger đồng bộ comments.upvotes_count / downvotes_count từ comment_votes
--   6. Hàm reconcile_platform_counters() đối soát 100% counter từ bảng gốc
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Phân loại chủ đề cho Spaces (/explore & Sidebar Topics)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'spaces' AND column_name = 'topic'
    ) THEN
        ALTER TABLE spaces ADD COLUMN topic VARCHAR(64) NOT NULL DEFAULT 'DevOps & SRE';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spaces_topic ON spaces (topic, member_count DESC);

-- 2. Chỉ mục GIN Trigram tìm kiếm người dùng theo username cho Chat & Mention
CREATE INDEX IF NOT EXISTS idx_users_username_trgm
    ON users USING gin (username gin_trgm_ops);

-- 3. Chỉ mục tối ưu danh sách lời mời Chat đã gửi (Sent Requests)
CREATE INDEX IF NOT EXISTS idx_chat_requests_sender_status
    ON chat_requests (sender_id, status, created_at DESC);

-- 4. Đồng bộ comment_count chuẩn xác khi INSERT / DELETE / Soft-Delete (UPDATE OF is_deleted)
CREATE OR REPLACE FUNCTION maintain_thread_comment_count()
RETURNS TRIGGER AS $$
DECLARE
    v_delta INTEGER := 0;
    v_thread_id UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_thread_id := NEW.thread_id;
        v_delta := CASE WHEN NOT NEW.is_deleted THEN 1 ELSE 0 END;
    ELSIF (TG_OP = 'DELETE') THEN
        v_thread_id := OLD.thread_id;
        v_delta := CASE WHEN NOT OLD.is_deleted THEN -1 ELSE 0 END;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_thread_id := NEW.thread_id;
        IF (OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE) THEN
            v_delta := -1;
        ELSIF (OLD.is_deleted = TRUE AND NEW.is_deleted = FALSE) THEN
            v_delta := 1;
        END IF;
    END IF;

    IF v_delta <> 0 THEN
        UPDATE threads
        SET comment_count = GREATEST(0, comment_count + v_delta),
            updated_at = NOW()
        WHERE id = v_thread_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comments_counter_maintenance ON comments;
CREATE TRIGGER trg_comments_counter_maintenance
    AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON comments
    FOR EACH ROW
    EXECUTE FUNCTION maintain_thread_comment_count();

CREATE OR REPLACE FUNCTION trg_fn_sync_comment_counter_to_counters()
RETURNS TRIGGER AS $$
DECLARE
    v_delta INTEGER := 0;
    v_thread_id UUID;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_thread_id := NEW.thread_id;
        v_delta := CASE WHEN NOT NEW.is_deleted THEN 1 ELSE 0 END;
    ELSIF (TG_OP = 'DELETE') THEN
        v_thread_id := OLD.thread_id;
        v_delta := CASE WHEN NOT OLD.is_deleted THEN -1 ELSE 0 END;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_thread_id := NEW.thread_id;
        IF (OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE) THEN
            v_delta := -1;
        ELSIF (OLD.is_deleted = TRUE AND NEW.is_deleted = FALSE) THEN
            v_delta := 1;
        END IF;
    END IF;

    IF v_delta <> 0 THEN
        UPDATE thread_counters
        SET comment_count = GREATEST(0, comment_count + v_delta),
            updated_at = NOW()
        WHERE thread_id = v_thread_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_comment_counter ON comments;
CREATE TRIGGER trg_sync_comment_counter
    AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON comments
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_sync_comment_counter_to_counters();

-- 5. Trigger đồng bộ bộ đếm vote của từng bình luận từ bảng comment_votes
CREATE OR REPLACE FUNCTION trg_fn_sync_comment_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_comment_id UUID;
    v_up_delta INTEGER := 0;
    v_down_delta INTEGER := 0;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_comment_id := NEW.comment_id;
        IF NEW.direction = 1 THEN v_up_delta := 1; ELSE v_down_delta := 1; END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        v_comment_id := OLD.comment_id;
        IF OLD.direction = 1 THEN v_up_delta := -1; ELSE v_down_delta := -1; END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        v_comment_id := NEW.comment_id;
        IF OLD.direction <> NEW.direction THEN
            IF NEW.direction = 1 THEN
                v_up_delta := 1;
                v_down_delta := -1;
            ELSE
                v_up_delta := -1;
                v_down_delta := 1;
            END IF;
        END IF;
    END IF;

    IF v_up_delta <> 0 OR v_down_delta <> 0 THEN
        UPDATE comments
        SET upvotes_count = GREATEST(0, upvotes_count + v_up_delta),
            downvotes_count = GREATEST(0, downvotes_count + v_down_delta),
            updated_at = NOW()
        WHERE id = v_comment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_comment_vote_counts ON comment_votes;
CREATE TRIGGER trg_sync_comment_vote_counts
    AFTER INSERT OR UPDATE OR DELETE ON comment_votes
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_sync_comment_vote_counts();

-- 6. Hàm đối soát toàn bộ bộ đếm từ bảng dữ liệu thật (0% Dữ liệu Giả Lập)
CREATE OR REPLACE FUNCTION reconcile_platform_counters()
RETURNS VOID AS $$
BEGIN
    -- 6.1. Spaces: member_count & thread_count
    UPDATE spaces s
    SET member_count = (
            SELECT COUNT(*)::int FROM space_memberships sm WHERE sm.space_id = s.id
        ),
        thread_count = (
            SELECT COUNT(*)::int FROM threads t WHERE t.space_id = s.id
        ),
        updated_at = NOW();

    -- 6.2. Comments: upvotes_count & downvotes_count từ comment_votes
    UPDATE comments c
    SET upvotes_count = (
            SELECT COUNT(*)::int FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.direction = 1
        ),
        downvotes_count = (
            SELECT COUNT(*)::int FROM comment_votes cv WHERE cv.comment_id = c.id AND cv.direction = -1
        );

    -- 6.3. Threads: upvotes_count, downvotes_count, comment_count (chỉ đếm bình luận active)
    UPDATE threads t
    SET upvotes_count = (
            SELECT COUNT(*)::int FROM thread_votes tv WHERE tv.thread_id = t.id AND tv.direction = 1
        ),
        downvotes_count = (
            SELECT COUNT(*)::int FROM thread_votes tv WHERE tv.thread_id = t.id AND tv.direction = -1
        ),
        comment_count = (
            SELECT COUNT(*)::int FROM comments c WHERE c.thread_id = t.id AND c.is_deleted = FALSE
        );

    -- 6.4. Thread Counters (fillfactor=70): tính 100% từ threads đã đối soát ở 6.3
    INSERT INTO thread_counters (
        thread_id, upvotes, downvotes, net_score, hot_score, wilson_score, comment_count, created_at, updated_at
    )
    SELECT
        t.id,
        t.upvotes_count,
        t.downvotes_count,
        (t.upvotes_count - t.downvotes_count),
        calculate_hot_score(t.upvotes_count - t.downvotes_count, t.created_at),
        calculate_wilson_score(t.upvotes_count, t.downvotes_count),
        t.comment_count,
        t.created_at,
        NOW()
    FROM threads t
    ON CONFLICT (thread_id) DO UPDATE SET
        upvotes = EXCLUDED.upvotes,
        downvotes = EXCLUDED.downvotes,
        net_score = EXCLUDED.net_score,
        hot_score = EXCLUDED.hot_score,
        wilson_score = EXCLUDED.wilson_score,
        comment_count = EXCLUDED.comment_count,
        created_at = EXCLUDED.created_at,
        updated_at = NOW();

    -- 6.5. Users: threads_count & karma_score thực tế từ phiếu bầu trên bài viết & bình luận
    UPDATE users u
    SET threads_count = (
            SELECT COUNT(*)::int FROM threads t WHERE t.author_id = u.id
        ),
        karma_score = COALESCE((
            SELECT SUM(tv.direction)::int
            FROM thread_votes tv
            JOIN threads t ON t.id = tv.thread_id
            WHERE t.author_id = u.id
        ), 0) + COALESCE((
            SELECT SUM(cv.direction)::int
            FROM comment_votes cv
            JOIN comments c ON c.id = cv.comment_id
            WHERE c.author_id = u.id
        ), 0),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Đồng bộ ngay dữ liệu hiện hữu khi chạy migration
SELECT reconcile_platform_counters();
