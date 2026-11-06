-- ==============================================================================
-- MIGRATION: 000004_create_chat_schema.up.sql
-- Mô tả: Phân hệ Nhắn tin tức thời (Reddit Realtime Chat), Hàng đợi Chat Requests,
--        Chat Threads và Thành viên phòng chat.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Định nghĩa các kiểu dữ liệu ENUM
DO $$ BEGIN
    CREATE TYPE chat_channel_type AS ENUM ('DIRECT', 'GROUP');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE chat_request_status AS ENUM ('PENDING', 'ACCEPTED', 'IGNORED', 'BLOCKED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Bảng Phòng Chat / Kênh Chat (chat_channels)
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type chat_channel_type NOT NULL DEFAULT 'DIRECT',
    name VARCHAR(128) NULL,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Bảng Thành Viên Phòng Chat (chat_members)
CREATE TABLE IF NOT EXISTS chat_members (
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id UUID NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);

-- 4. Bảng Tin Nhắn (chat_messages) kèm hỗ trợ Chat Threads (parent_message_id)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_message_id UUID NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created ON chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent ON chat_messages(parent_message_id) WHERE parent_message_id IS NOT NULL;

-- 5. Bảng Hàng Đợi Duyệt Yêu Cầu Tin Nhắn Lạ (chat_requests)
CREATE TABLE IF NOT EXISTS chat_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NULL REFERENCES chat_channels(id) ON DELETE SET NULL,
    initial_message TEXT NOT NULL,
    status chat_request_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_chat_requests_sender_receiver UNIQUE (sender_id, receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_requests_receiver_status ON chat_requests(receiver_id, status);
