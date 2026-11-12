-- ==============================================================================
-- Rollback Migration: 000007_complete_domain_and_integrity.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS reconcile_platform_counters();
DROP TRIGGER IF EXISTS trg_sync_comment_vote_counts ON comment_votes;
DROP FUNCTION IF EXISTS trg_fn_sync_comment_vote_counts();

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

DROP INDEX IF EXISTS idx_chat_requests_sender_status;
DROP INDEX IF EXISTS idx_users_username_trgm;
DROP INDEX IF EXISTS idx_spaces_topic;
ALTER TABLE spaces DROP COLUMN IF EXISTS topic;
