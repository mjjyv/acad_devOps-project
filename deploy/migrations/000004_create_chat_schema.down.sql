-- ==============================================================================
-- Migration: 000004_create_chat_schema.down.sql
-- Thao tác: Rollback Phân hệ 4 (Chat, Triggers, Enums)
-- ==============================================================================

DROP TRIGGER IF EXISTS trg_touch_chat_channel ON chat_messages;
DROP FUNCTION IF EXISTS trg_fn_touch_chat_channel_on_message();

DROP TRIGGER IF EXISTS trg_chat_requests_updated_at ON chat_requests;
DROP TRIGGER IF EXISTS trg_chat_channels_updated_at ON chat_channels;
DROP FUNCTION IF EXISTS trg_fn_update_chat_timestamp();

ALTER TABLE IF EXISTS chat_members
DROP CONSTRAINT IF EXISTS fk_chat_members_last_read_message;

DROP TABLE IF EXISTS chat_requests CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_members CASCADE;
DROP TABLE IF EXISTS chat_channels CASCADE;

DROP TYPE IF EXISTS chat_request_status CASCADE;
DROP TYPE IF EXISTS chat_channel_type CASCADE;
