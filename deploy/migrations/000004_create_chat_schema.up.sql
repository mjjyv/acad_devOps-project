-- ==============================================================================
-- Migration: 000004_create_chat_schema.up.sql
-- Phân hệ 4: Realtime Chat, Stranger Chat Requests & Chat Threads
-- Target: PostgreSQL 16+
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_channel_type') THEN
        CREATE TYPE chat_channel_type AS ENUM ('DIRECT', 'GROUP');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'chat_request_status') THEN
        CREATE TYPE chat_request_status AS ENUM ('PENDING', 'ACCEPTED', 'IGNORED', 'BLOCKED');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type chat_channel_type NOT NULL DEFAULT 'DIRECT',
    name VARCHAR(128) NULL,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_group_channel_name CHECK (
        (type = 'GROUP' AND name IS NOT NULL AND char_length(trim(name)) >= 2) OR
        (type = 'DIRECT')
    )
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_creator ON chat_channels (creator_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_updated_at ON chat_channels (updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_members (
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_message_id UUID NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_channel_user ON chat_members (channel_id, user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_message_id UUID NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_chat_message_content_not_empty CHECK (char_length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_cursor
    ON chat_messages (channel_id, created_at DESC, id DESC)
    WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent
    ON chat_messages (parent_message_id, created_at ASC)
    WHERE parent_message_id IS NOT NULL AND is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages (sender_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_chat_members_last_read_message'
    ) THEN
        ALTER TABLE chat_members
        ADD CONSTRAINT fk_chat_members_last_read_message
        FOREIGN KEY (last_read_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS chat_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NULL REFERENCES chat_channels(id) ON DELETE SET NULL,
    initial_message TEXT NOT NULL,
    status chat_request_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_chat_requests_pair UNIQUE (sender_id, receiver_id),
    CONSTRAINT chk_chat_requests_no_self_chat CHECK (sender_id <> receiver_id),
    CONSTRAINT chk_chat_requests_msg_len CHECK (char_length(trim(initial_message)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_requests_receiver_status ON chat_requests (receiver_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_requests_sender ON chat_requests (sender_id);

CREATE OR REPLACE FUNCTION trg_fn_update_chat_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_channels_updated_at ON chat_channels;
CREATE TRIGGER trg_chat_channels_updated_at
    BEFORE UPDATE ON chat_channels
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_update_chat_timestamp();

DROP TRIGGER IF EXISTS trg_chat_requests_updated_at ON chat_requests;
CREATE TRIGGER trg_chat_requests_updated_at
    BEFORE UPDATE ON chat_requests
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_update_chat_timestamp();

CREATE OR REPLACE FUNCTION trg_fn_touch_chat_channel_on_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_channels
    SET updated_at = NEW.created_at
    WHERE id = NEW.channel_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_chat_channel ON chat_messages;
CREATE TRIGGER trg_touch_chat_channel
    AFTER INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION trg_fn_touch_chat_channel_on_message();
