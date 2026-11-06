-- ==============================================================================
-- MIGRATION: 000004_create_chat_schema.down.sql
-- Mô tả: Khôi phục sạch phân hệ Chat và hàng đợi Chat Requests
-- ==============================================================================

DROP TABLE IF EXISTS chat_requests CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_members CASCADE;
DROP TABLE IF EXISTS chat_channels CASCADE;

DROP TYPE IF EXISTS chat_request_status CASCADE;
DROP TYPE IF EXISTS chat_channel_type CASCADE;
