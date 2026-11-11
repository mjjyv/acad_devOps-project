-- ==============================================================================
-- Migration: 000005_create_moderation_and_admin_schema.up.sql
-- Phân hệ 5: Moderation Queue, Anti-Spam Reports & Immutable Audit Logs
-- Target: PostgreSQL 16+
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mod_report_status') THEN
        CREATE TYPE mod_report_status AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mod_report_target_type') THEN
        CREATE TYPE mod_report_target_type AS ENUM ('THREAD', 'COMMENT');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type mod_report_target_type NOT NULL,
    target_id UUID NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status mod_report_status NOT NULL DEFAULT 'PENDING',
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    resolution_note VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_report_reason_len CHECK (char_length(trim(reason)) >= 3),
    CONSTRAINT chk_report_resolution CHECK (
        (status = 'PENDING' AND resolved_at IS NULL) OR
        (status IN ('RESOLVED', 'DISMISSED') AND resolved_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_report_per_user_target
    ON reports (reporter_id, target_type, target_id)
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_reports_queue_pending
    ON reports (created_at DESC)
    WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports (reporter_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION trg_fn_enforce_audit_logs_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'BẢO MẬT: Bảng audit_logs là bảng ghi nhật ký bất biến (Append-Only). Cấm mọi thao tác UPDATE hoặc DELETE!';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutability ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutability
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_enforce_audit_logs_immutability();
