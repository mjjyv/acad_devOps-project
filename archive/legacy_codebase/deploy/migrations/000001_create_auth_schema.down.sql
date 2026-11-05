-- ============================================================================
-- ACAD COMMUNITY PLATFORM - AUTH & IDENTITY SCHEMA ROLLBACK
-- Migration: 000001_create_auth_schema.down.sql
-- ============================================================================

DROP TRIGGER IF EXISTS trg_sessions_updated_at ON user_sessions;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP FUNCTION IF EXISTS set_updated_at_timestamp();

DROP TABLE IF EXISTS auth_audit_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS user_identities CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS audit_event_type;
DROP TYPE IF EXISTS user_status;
DROP TYPE IF EXISTS user_role;
