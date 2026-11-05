-- ============================================================================
-- Migration: 000003_create_voting_and_feed_schema.down.sql
-- Description: Xóa sạch các bảng bình chọn, bộ đếm counters và lưu bài viết
-- ============================================================================

DROP TABLE IF EXISTS user_saved_threads CASCADE;
DROP TABLE IF EXISTS comment_votes CASCADE;
DROP TABLE IF EXISTS thread_votes CASCADE;
DROP TABLE IF EXISTS thread_counters CASCADE;
