-- ==============================================================================
-- Migration: 000002_create_community_schema.down.sql
-- Thao tác: Rollback toàn bộ bảng, enum và triggers Phân hệ 2
-- ==============================================================================

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

DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS threads CASCADE;
DROP TABLE IF EXISTS space_flairs CASCADE;
DROP TABLE IF EXISTS space_memberships CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;

DROP TYPE IF EXISTS thread_type CASCADE;
DROP TYPE IF EXISTS space_role CASCADE;
