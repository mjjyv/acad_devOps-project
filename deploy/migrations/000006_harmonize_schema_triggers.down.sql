-- ==============================================================================
-- Migration: 000006_harmonize_schema_triggers.down.sql
-- Thao tác: Thu hồi triggers bổ sung của bản nâng cấp 000006
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_audit_logs_immutability ON audit_logs;
DROP FUNCTION IF EXISTS trg_fn_enforce_audit_logs_immutability();
DROP INDEX IF EXISTS uq_pending_report_per_user_target;

DROP TRIGGER IF EXISTS trg_touch_chat_channel ON chat_messages;
DROP FUNCTION IF EXISTS trg_fn_touch_chat_channel_on_message();
DROP TRIGGER IF EXISTS trg_chat_requests_updated_at ON chat_requests;
DROP TRIGGER IF EXISTS trg_chat_channels_updated_at ON chat_channels;
DROP FUNCTION IF EXISTS trg_fn_update_chat_timestamp();

DROP TRIGGER IF EXISTS trg_maintain_comment_karma ON comment_votes;
DROP FUNCTION IF EXISTS trg_fn_maintain_comment_author_karma();
DROP TRIGGER IF EXISTS trg_maintain_thread_karma ON thread_votes;
DROP FUNCTION IF EXISTS trg_fn_maintain_thread_author_karma();
DROP TRIGGER IF EXISTS trg_sync_comment_counter ON comments;
DROP FUNCTION IF EXISTS trg_fn_sync_comment_counter_to_counters();
DROP TRIGGER IF EXISTS trg_init_thread_counters ON threads;
DROP FUNCTION IF EXISTS trg_fn_init_thread_counters();
DROP FUNCTION IF EXISTS calculate_wilson_score(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS calculate_hot_score(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ);

DROP TRIGGER IF EXISTS trg_comments_counter_maintenance ON comments;
DROP FUNCTION IF EXISTS maintain_thread_comment_count();
DROP TRIGGER IF EXISTS trg_threads_counter_maintenance ON threads;
DROP FUNCTION IF EXISTS maintain_thread_counts();
DROP TRIGGER IF EXISTS trg_space_members_count ON space_memberships;
DROP FUNCTION IF EXISTS maintain_space_member_count();
DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS trg_threads_updated_at ON threads;
DROP TRIGGER IF EXISTS trg_spaces_updated_at ON spaces;
DROP FUNCTION IF EXISTS update_community_timestamp();

DROP TRIGGER IF EXISTS trg_user_sessions_updated_at ON user_sessions;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_timestamp_column();
