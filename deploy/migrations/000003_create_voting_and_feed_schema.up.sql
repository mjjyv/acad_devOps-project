-- ==============================================================================
-- Migration: 000003_create_voting_and_feed_schema.up.sql
-- Phân hệ 3: Voting Nguyên Tử, Counters (HOT 70%), Ranking Functions & Feeds
-- Target: PostgreSQL 16+
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Hàm toán học xếp hạng bảng tin trực tiếp trong PostgreSQL
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
    v_n := GREATEST(0, p_upvotes) + GREATEST(0, p_downvotes);
    IF v_n <= 0.0 THEN
        RETURN 0.0;
    END IF;
    v_phat := GREATEST(0, p_upvotes)::DOUBLE PRECISION / v_n;
    v_score := (v_phat + (v_z2 / (2.0 * v_n)) - v_z * SQRT((v_phat * (1.0 - v_phat) / v_n) + (v_z2 / (4.0 * v_n * v_n)))) / (1.0 + (v_z2 / v_n));
    RETURN ROUND(v_score::NUMERIC, 4)::DOUBLE PRECISION;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Bảng thread_counters (HOT Updates fillfactor=70)
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

CREATE INDEX IF NOT EXISTS idx_thread_counters_hot_feed
    ON thread_counters (hot_score DESC, created_at DESC, thread_id DESC);
CREATE INDEX IF NOT EXISTS idx_thread_counters_best_feed
    ON thread_counters (wilson_score DESC, created_at DESC, thread_id DESC);
CREATE INDEX IF NOT EXISTS idx_thread_counters_top_feed
    ON thread_counters (net_score DESC, created_at DESC, thread_id DESC);
CREATE INDEX IF NOT EXISTS idx_thread_counters_new_feed
    ON thread_counters (created_at DESC, thread_id DESC);

-- 3. Bảng thread_votes & comment_votes
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

-- 4. Bảng user_saved_threads (Bookmarks)
CREATE TABLE IF NOT EXISTS user_saved_threads (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_threads_user_created ON user_saved_threads (user_id, created_at DESC);

-- 5. Triggers tự động hóa vòng đời & Karma
CREATE OR REPLACE FUNCTION trg_fn_init_thread_counters()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO thread_counters (
        thread_id, upvotes, downvotes, net_score, hot_score, wilson_score, comment_count, created_at, updated_at
    )
    VALUES (
        NEW.id, NEW.upvotes_count, NEW.downvotes_count, (NEW.upvotes_count - NEW.downvotes_count),
        calculate_hot_score(NEW.upvotes_count - NEW.downvotes_count, NEW.created_at),
        calculate_wilson_score(NEW.upvotes_count, NEW.downvotes_count),
        NEW.comment_count, NEW.created_at, NEW.created_at
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

-- 6. Đồng bộ khởi tạo counters cho bài viết đã tồn tại
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
