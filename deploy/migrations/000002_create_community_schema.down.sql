-- ==============================================================================
-- Migration: 000002_create_community_schema.down.sql
-- Module: Phase B2 Rollback
-- ==============================================================================

DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS threads CASCADE;
DROP TABLE IF EXISTS space_flairs CASCADE;
DROP TABLE IF EXISTS space_memberships CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;

DROP TYPE IF EXISTS thread_type;
DROP TYPE IF EXISTS space_role;
