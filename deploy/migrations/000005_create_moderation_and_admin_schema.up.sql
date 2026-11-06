-- ==============================================================================
-- Migration: 000005_create_moderation_and_admin_schema.up.sql
-- Module: Phase B5 - Moderation, Mod Queue & Admin Hub
-- Target: PostgreSQL 16+
-- ==============================================================================

-- 1. Tiện ích mở rộng
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Kiểu dữ liệu Enum phân hệ kiểm duyệt
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mod_report_status') THEN
        CREATE TYPE mod_report_status AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mod_report_target_type') THEN
        CREATE TYPE mod_report_target_type AS ENUM ('THREAD', 'COMMENT');
    END IF;
END $$;

-- 3. Bảng reports (Hàng đợi kiểm duyệt nội dung Mod Queue)
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục cho hàng đợi Mod Queue và truy vấn báo cáo theo mục tiêu
CREATE INDEX IF NOT EXISTS idx_reports_target ON reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports (reporter_id);

-- 4. Bảng audit_logs (Nhật ký kiểm toán an ninh hệ thống bất biến)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(32) NOT NULL,
    target_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chỉ mục cho nhật ký kiểm toán phục vụ tra cứu bảo mật
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs (target_type, target_id);
