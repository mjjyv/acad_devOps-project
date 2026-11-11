-- ==============================================================================
-- Migration: 000005_create_moderation_and_admin_schema.down.sql
-- Thao tác: Rollback Phân hệ 5 (Audit Logs Immutability Trigger, Tables, Enums)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_audit_logs_immutability ON audit_logs;
DROP FUNCTION IF EXISTS trg_fn_enforce_audit_logs_immutability();

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS reports CASCADE;

DROP TYPE IF EXISTS mod_report_target_type CASCADE;
DROP TYPE IF EXISTS mod_report_status CASCADE;
