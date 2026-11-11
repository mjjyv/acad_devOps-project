-- ==============================================================================
-- Migration: 000001_create_auth_schema.down.sql
-- Thao tác: Rollback Phân hệ 1 (Auth & Sessions)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_user_sessions_updated_at ON user_sessions;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP FUNCTION IF EXISTS update_timestamp_column();

DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
