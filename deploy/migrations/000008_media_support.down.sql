-- ==============================================================================
-- Migration Rollback: 000008_media_support.down.sql
-- ==============================================================================

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chk_chat_message_content_or_attachment;
UPDATE chat_messages SET content = '[attachment]' WHERE char_length(trim(content)) = 0;
ALTER TABLE chat_messages
    ADD CONSTRAINT chk_chat_message_content_not_empty CHECK (char_length(trim(content)) > 0);

ALTER TABLE threads DROP COLUMN IF EXISTS media_urls;
