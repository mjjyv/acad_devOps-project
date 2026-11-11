-- ==============================================================================
-- Migration: 000006_harmonize_schema_triggers.up.sql
-- Mục tiêu: Nâng cấp CSDL hiện hữu (Idempotent) đồng bộ hoàn toàn với DDL 000001-000005
-- ==============================================================================

-- 1. PHÂN HỆ 1: USERS & USER_SESSIONS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_username_length') THEN
        ALTER TABLE users ADD CONSTRAINT chk_username_length CHECK (char_length(username) >= 3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_karma_not_null') THEN
        ALTER TABLE users ADD CONSTRAINT chk_karma_not_null CHECK (karma_score IS NOT NULL);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_karma_score ON users (karma_score DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions (expires_at);

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

-- 2. PHÂN HỆ 2: SPACES, SPACE_FLAIRS, THREADS, COMMENTS
DO $$
BEGIN
    -- Đổi spaces.avatar_url -> icon_url
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'spaces' AND column_name = 'avatar_url'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'spaces' AND column_name = 'icon_url'
    ) THEN
        ALTER TABLE spaces RENAME COLUMN avatar_url TO icon_url;
    END IF;

    -- Mặc định member_count = 0 để Trigger space_memberships tăng chuẩn 0 -> 1 khi creator tham gia
    ALTER TABLE spaces ALTER COLUMN member_count SET DEFAULT 0;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_spaces_slug_format') THEN
        ALTER TABLE spaces ADD CONSTRAINT chk_spaces_slug_format CHECK (slug ~ '^[a-z0-9_-]+$');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_spaces_name_len') THEN
        ALTER TABLE spaces ADD CONSTRAINT chk_spaces_name_len CHECK (char_length(name) >= 2);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_spaces_creator_id ON spaces (creator_id);
CREATE INDEX IF NOT EXISTS idx_memberships_space_role ON space_memberships (space_id, role);

-- Nâng cấp bảng space_flairs từ (name, color) -> (name, slug, color_hex, background_hex)
DO $$
BEGIN
    ALTER TABLE space_flairs ALTER COLUMN name TYPE VARCHAR(50);

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'space_flairs' AND column_name = 'slug'
    ) THEN
        ALTER TABLE space_flairs ADD COLUMN slug VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'space_flairs' AND column_name = 'color_hex'
    ) THEN
        ALTER TABLE space_flairs ADD COLUMN color_hex VARCHAR(7);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'space_flairs' AND column_name = 'background_hex'
    ) THEN
        ALTER TABLE space_flairs ADD COLUMN background_hex VARCHAR(7);
    END IF;
END $$;

-- Backfill dữ liệu flair cũ an toàn
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'space_flairs' AND column_name = 'color'
    ) THEN
        UPDATE space_flairs
        SET color_hex = COALESCE(NULLIF(color_hex, ''), CASE WHEN color ~ '^#[0-9A-Fa-f]{6}$' THEN color ELSE '#E1D9BC' END),
            background_hex = COALESCE(NULLIF(background_hex, ''), '#30364F'),
            slug = COALESCE(
                NULLIF(slug, ''),
                NULLIF(
                    TRIM(BOTH '-' FROM REGEXP_REPLACE(
                        LOWER(TRANSLATE(name,
                            'áàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ',
                            'aaaaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyy'
                        )),
                        '[^a-z0-9]+', '-', 'g'
                    )),
                    ''
                ),
                SUBSTRING(id::text FROM 1 FOR 8)
            )
        WHERE slug IS NULL OR color_hex IS NULL OR background_hex IS NULL;
    ELSE
        UPDATE space_flairs
        SET color_hex = COALESCE(NULLIF(color_hex, ''), '#E1D9BC'),
            background_hex = COALESCE(NULLIF(background_hex, ''), '#30364F'),
            slug = COALESCE(NULLIF(slug, ''), SUBSTRING(id::text FROM 1 FOR 8))
        WHERE slug IS NULL OR color_hex IS NULL OR background_hex IS NULL;
    END IF;
END $$;

ALTER TABLE space_flairs ALTER COLUMN slug SET NOT NULL;
ALTER TABLE space_flairs ALTER COLUMN color_hex SET NOT NULL;
ALTER TABLE space_flairs ALTER COLUMN color_hex SET DEFAULT '#E1D9BC';
ALTER TABLE space_flairs ALTER COLUMN background_hex SET NOT NULL;
ALTER TABLE space_flairs ALTER COLUMN background_hex SET DEFAULT '#30364F';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_space_flair_slug') THEN
        ALTER TABLE space_flairs ADD CONSTRAINT uq_space_flair_slug UNIQUE (space_id, slug);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_flair_color_hex') THEN
        ALTER TABLE space_flairs ADD CONSTRAINT chk_flair_color_hex CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_flair_bg_hex') THEN
        ALTER TABLE space_flairs ADD CONSTRAINT chk_flair_bg_hex CHECK (background_hex ~ '^#[0-9A-Fa-f]{6}$');
    END IF;
END $$;

-- Dọn cột color cũ nếu tồn tại sau khi đã copy sang color_hex
ALTER TABLE space_flairs DROP COLUMN IF EXISTS color;
ALTER TABLE space_flairs DROP CONSTRAINT IF EXISTS uq_space_flair_name;

-- Bổ sung constraint & index cho threads và comments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_threads_slug') THEN
        ALTER TABLE threads ADD CONSTRAINT uq_threads_slug UNIQUE (slug);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_threads_title_len') THEN
        ALTER TABLE threads ADD CONSTRAINT chk_threads_title_len CHECK (char_length(title) >= 5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_comments_depth') THEN
        ALTER TABLE comments ADD CONSTRAINT chk_comments_depth CHECK (depth >= 1 AND depth <= 20);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_threads_flair ON threads (flair_id) WHERE flair_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments (author_id);

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

-- 3. PHÂN HỆ 3: RANKING FUNCTIONS, THREAD_COUNTERS.CREATED_AT & KARMA TRIGGERS
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'thread_counters' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE thread_counters ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

UPDATE thread_counters tc
SET created_at = t.created_at,
    hot_score = calculate_hot_score(tc.net_score, t.created_at),
    wilson_score = calculate_wilson_score(tc.upvotes, tc.downvotes)
FROM threads t
WHERE tc.thread_id = t.id;

CREATE INDEX IF NOT EXISTS idx_thread_counters_hot_feed
    ON thread_counters (hot_score DESC, created_at DESC, thread_id DESC);
CREATE INDEX IF NOT EXISTS idx_thread_counters_best_feed
    ON thread_counters (wilson_score DESC, created_at DESC, thread_id DESC);
CREATE INDEX IF NOT EXISTS idx_thread_counters_top_feed
    ON thread_counters (net_score DESC, created_at DESC, thread_id DESC);
CREATE INDEX IF NOT EXISTS idx_thread_counters_new_feed
    ON thread_counters (created_at DESC, thread_id DESC);
CREATE INDEX IF NOT EXISTS idx_thread_votes_thread ON thread_votes (thread_id, direction);
CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes (comment_id, direction);

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

-- 4. PHÂN HỆ 4: CHAT CONSTRAINTS, INDEXES & TRIGGERS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_group_channel_name') THEN
        ALTER TABLE chat_channels ADD CONSTRAINT chk_group_channel_name CHECK (
            (type = 'GROUP' AND name IS NOT NULL AND char_length(trim(name)) >= 2) OR
            (type = 'DIRECT')
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_chat_message_content_not_empty') THEN
        ALTER TABLE chat_messages ADD CONSTRAINT chk_chat_message_content_not_empty CHECK (char_length(trim(content)) > 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_chat_requests_no_self_chat') THEN
        ALTER TABLE chat_requests ADD CONSTRAINT chk_chat_requests_no_self_chat CHECK (sender_id <> receiver_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_chat_requests_msg_len') THEN
        ALTER TABLE chat_requests ADD CONSTRAINT chk_chat_requests_msg_len CHECK (char_length(trim(initial_message)) > 0);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_chat_members_last_read_message'
    ) THEN
        ALTER TABLE chat_members
        ADD CONSTRAINT fk_chat_members_last_read_message
        FOREIGN KEY (last_read_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_channels_creator ON chat_channels (creator_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_updated_at ON chat_channels (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_members_channel_user ON chat_members (channel_id, user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_cursor
    ON chat_messages (channel_id, created_at DESC, id DESC)
    WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_sender ON chat_requests (sender_id);

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

-- 5. PHÂN HỆ 5: ANTI-SPAM REPORT & IMMUTABLE AUDIT LOGS TRIGGER
-- Dọn bản ghi PENDING trùng lặp nếu tồn tại từ trước trước khi gắn Partial Unique Index
DELETE FROM reports a
USING reports b
WHERE a.ctid < b.ctid
  AND a.status = 'PENDING'
  AND b.status = 'PENDING'
  AND a.reporter_id = b.reporter_id
  AND a.target_type = b.target_type
  AND a.target_id = b.target_id;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_report_reason_len') THEN
        ALTER TABLE reports ADD CONSTRAINT chk_report_reason_len CHECK (char_length(trim(reason)) >= 3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_report_resolution') THEN
        ALTER TABLE reports ADD CONSTRAINT chk_report_resolution CHECK (
            (status = 'PENDING' AND resolved_at IS NULL) OR
            (status IN ('RESOLVED', 'DISMISSED') AND resolved_at IS NOT NULL)
        );
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_report_per_user_target
    ON reports (reporter_id, target_type, target_id)
    WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_reports_queue_pending
    ON reports (created_at DESC)
    WHERE status = 'PENDING';

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
