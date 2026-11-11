-- ==============================================================================
-- Migration: 000003_create_voting_and_feed_schema.down.sql
-- Thao tác: Rollback Phân hệ 3 (Counters, Votes, Bookmarks, Functions, Triggers)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_maintain_comment_karma ON comment_votes;
DROP FUNCTION IF EXISTS trg_fn_maintain_comment_author_karma();

DROP TRIGGER IF EXISTS trg_maintain_thread_karma ON thread_votes;
DROP FUNCTION IF EXISTS trg_fn_maintain_thread_author_karma();

DROP TRIGGER IF EXISTS trg_sync_comment_counter ON comments;
DROP FUNCTION IF EXISTS trg_fn_sync_comment_counter_to_counters();

DROP TRIGGER IF EXISTS trg_init_thread_counters ON threads;
DROP FUNCTION IF EXISTS trg_fn_init_thread_counters();

DROP TABLE IF EXISTS user_saved_threads CASCADE;
DROP TABLE IF EXISTS comment_votes CASCADE;
DROP TABLE IF EXISTS thread_votes CASCADE;
DROP TABLE IF EXISTS thread_counters CASCADE;

DROP FUNCTION IF EXISTS calculate_wilson_score(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS calculate_hot_score(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ);
