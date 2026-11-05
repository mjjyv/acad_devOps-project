-- ==============================================================================
-- Migration: 000001_create_auth_schema.down.sql
-- Rollback: Phase B1 - Core Identity & Session Shield
-- ==============================================================================

DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
