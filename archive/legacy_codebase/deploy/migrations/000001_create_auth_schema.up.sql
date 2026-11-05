-- ============================================================================
-- ACAD COMMUNITY PLATFORM - AUTH & IDENTITY SCHEMA MIGRATION
-- Migration: 000001_create_auth_schema.up.sql
-- Engine: PostgreSQL 16+
-- ============================================================================

-- 1. BẬT EXTENSIONS CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TẠO CÁC KIỂU DỮ LIỆU LIỆT KÊ (ENUMS)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM (
            'GUEST',
            'USER',
            'SPACE_MOD',
            'GLOBAL_MOD',
            'ADMIN'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM (
            'ACTIVE',
            'SUSPENDED',
            'SHADOWBANNED',
            'DELETED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_event_type') THEN
        CREATE TYPE audit_event_type AS ENUM (
            'LOGIN_SUCCESS',
            'LOGIN_FAILED',
            'TOKEN_REFRESH_SUCCESS',
            'TOKEN_REUSE_DETECTED',
            'LOGOUT',
            'PASSWORD_CHANGED',
            'SESSION_REVOKED',
            'ALL_SESSIONS_REVOKED'
        );
    END IF;
END $$;

-- 3. BẢNG NGƯỜI DÙNG (USERS)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(32) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'USER',
    status user_status NOT NULL DEFAULT 'ACTIVE',
    karma_score INTEGER NOT NULL DEFAULT 0,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_users_username_lower UNIQUE (username),
    CONSTRAINT uq_users_email_lower UNIQUE (email)
);

-- Chỉ mục tìm kiếm không phân biệt hoa thường
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role_status ON users (role, status);

-- 4. BẢNG LIÊN KẾT DANH TÍNH OAUTH (USER_IDENTITIES)
CREATE TABLE IF NOT EXISTS user_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL, -- 'google', 'github', etc.
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_provider_user UNIQUE (provider, provider_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_identities_user_id ON user_identities (user_id);

-- 5. BẢNG QUẢN LÝ PHIÊN & XOAY VÒNG TOKEN (USER_SESSIONS)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL, -- Định danh nhóm phiên để thu hồi toàn bộ khi có sự cố
    device_fingerprint VARCHAR(128) NOT NULL,
    current_token_hash VARCHAR(64) NOT NULL, -- SHA-256 hash của Refresh Token hiện hành
    previous_token_hash VARCHAR(64), -- SHA-256 hash của token vừa xoay vòng (cho Grace Period)
    grace_period_expires_at TIMESTAMPTZ, -- Hạn chót của cửa sổ 30s an toàn
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Chỉ mục tra cứu phiên làm việc
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions (user_id, is_revoked);
CREATE INDEX IF NOT EXISTS idx_sessions_family_id ON user_sessions (family_id);
CREATE INDEX IF NOT EXISTS idx_sessions_curr_hash ON user_sessions (current_token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_prev_hash ON user_sessions (previous_token_hash);

-- 6. BẢNG NHẬT KÝ KIỂM TOÁN AN NINH (AUTH_AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS auth_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type audit_event_type NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user_created ON auth_audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_created ON auth_audit_logs (event_type, created_at DESC);

-- 7. TRIGGER TỰ ĐỘNG CẬP NHẬT UPDATED_AT
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_sessions_updated_at ON user_sessions;
CREATE TRIGGER trg_sessions_updated_at
BEFORE UPDATE ON user_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
