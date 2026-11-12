-- ==============================================================================
-- Migration: 000008_media_support.up.sql
-- Mục tiêu: Hỗ trợ đính kèm hình ảnh thật cho bài viết (MEDIA) và tin nhắn thuần ảnh trong Chat
-- Target: PostgreSQL 16+
-- ==============================================================================

-- 1. Cột media_urls JSONB trên bảng threads cho danh sách ảnh bài viết MEDIA
ALTER TABLE threads
    ADD COLUMN IF NOT EXISTS media_urls JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Cho phép tin nhắn Chat chỉ gửi đính kèm ảnh/file mà không bắt buộc nhập văn bản
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chk_chat_message_content_not_empty;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chk_chat_message_content_or_attachment;
ALTER TABLE chat_messages
    ADD CONSTRAINT chk_chat_message_content_or_attachment CHECK (
        char_length(trim(content)) > 0 OR jsonb_array_length(attachments) > 0
    );
