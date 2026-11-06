-- ==============================================================================
-- Migration: 000005_create_moderation_and_admin_schema.down.sql
-- Module: Phase B5 - Moderation, Mod Queue & Admin Hub
-- Target: PostgreSQL 16+
-- ==============================================================================

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS reports CASCADE;

DROP TYPE IF EXISTS mod_report_target_type CASCADE;
DROP TYPE IF EXISTS mod_report_status CASCADE;
