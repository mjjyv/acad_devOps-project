-- ============================================================================
-- ACAD COMMUNITY PLATFORM - COMMUNITY SCHEMA ROLLBACK
-- Migration: 000002_create_community_schema.down.sql
-- ============================================================================

DROP TRIGGER IF EXISTS trg_moderation_reports_updated_at ON moderation_reports;
DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON media_assets;
DROP TRIGGER IF EXISTS trg_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS trg_threads_updated_at ON threads;
DROP TRIGGER IF EXISTS trg_threads_init_counters ON threads;
DROP FUNCTION IF EXISTS initialize_thread_counters();
DROP TRIGGER IF EXISTS trg_space_memberships_updated_at ON space_memberships;
DROP TRIGGER IF EXISTS trg_spaces_updated_at ON spaces;

DROP TABLE IF EXISTS moderation_reports CASCADE;
DROP TABLE IF EXISTS media_assets CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS thread_counters CASCADE;
DROP TABLE IF EXISTS threads CASCADE;
DROP TABLE IF EXISTS space_memberships CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;

DROP TYPE IF EXISTS report_reason;
DROP TYPE IF EXISTS report_status;
DROP TYPE IF EXISTS media_status;
DROP TYPE IF EXISTS space_role;
