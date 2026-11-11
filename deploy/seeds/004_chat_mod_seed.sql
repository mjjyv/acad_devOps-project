-- ==============================================================================
-- ACAD DEVOPS PLATFORM (SYNAPSE ENGINE) - SEED PHÂN HỆ 4 & 5 (CHAT & MODERATION)
-- File: deploy/seeds/004_chat_mod_seed.sql
-- Mục tiêu: Khởi tạo kênh Chat DIRECT/GROUP, Chat Threads, Chat Requests (PENDING/BLOCKED),
--           Hàng đợi Mod Queue reports và Nhật ký kiểm toán audit_logs bất biến
-- ==============================================================================

BEGIN;

-- 0. Dọn dữ liệu Chat & Reports mẫu cũ (IDEMPOTENT)
-- Chú ý: audit_logs là bảng bất biến (Trigger chặn UPDATE/DELETE), chỉ sử dụng ON CONFLICT DO NOTHING
DELETE FROM chat_requests WHERE id IN (
    'f4000000-0000-0000-0000-000000000001',
    'f4000000-0000-0000-0000-000000000002'
);
DELETE FROM chat_messages WHERE channel_id IN (
    'f2000000-0000-0000-0000-000000000001',
    'f2000000-0000-0000-0000-000000000002'
);
DELETE FROM chat_members WHERE channel_id IN (
    'f2000000-0000-0000-0000-000000000001',
    'f2000000-0000-0000-0000-000000000002'
);
DELETE FROM chat_channels WHERE id IN (
    'f2000000-0000-0000-0000-000000000001',
    'f2000000-0000-0000-0000-000000000002'
);
DELETE FROM reports WHERE id IN (
    'f5000000-0000-0000-0000-000000000001',
    'f5000000-0000-0000-0000-000000000002'
);

-- 1. SEED CHAT_CHANNELS (1 kênh DIRECT, 1 kênh GROUP)
INSERT INTO chat_channels (id, type, name, creator_id, created_at, updated_at)
VALUES
  (
    'f2000000-0000-0000-0000-000000000001',
    'DIRECT',
    NULL,
    'a0000000-0000-0000-0000-000000000001', -- admin_pro <-> devops_coder
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '1 hour'
  ),
  (
    'f2000000-0000-0000-0000-000000000002',
    'GROUP',
    'SRE & Homelab War Room',
    'a0000000-0000-0000-0000-000000000003', -- cloud_architect
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '30 minutes'
  );

-- 2. SEED CHAT_MEMBERS
INSERT INTO chat_members (channel_id, user_id, joined_at)
VALUES
  ('f2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days'),
  ('f2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '2 days'),

  ('f2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '3 days'),
  ('f2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '3 days'),
  ('f2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', NOW() - INTERVAL '2 days');

-- 3. SEED CHAT_MESSAGES (Tin nhắn chính & Chat Threads qua parent_message_id)
INSERT INTO chat_messages (id, channel_id, sender_id, parent_message_id, content, attachments, is_deleted, created_at)
VALUES
  -- Direct channel messages
  (
    'f3000000-0000-0000-0000-000000000001',
    'f2000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    NULL,
    'Anh admin ơi, script Podman rootless postgres đã áp dụng fillfactor=70 chưa ạ?',
    '[]'::jsonb, FALSE, NOW() - INTERVAL '2 hours'
  ),
  (
    'f3000000-0000-0000-0000-000000000002',
    'f2000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    NULL,
    'Đã bật fillfactor=70 và Trigger tự đồng bộ trên PostgreSQL 16 rồi nhé em.',
    '[]'::jsonb, FALSE, NOW() - INTERVAL '1 hour'
  ),

  -- Group channel messages + Chat Thread replies
  (
    'f3000000-0000-0000-0000-000000000003',
    'f2000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    NULL,
    '[Alert Watch] Kiểm tra độ trễ Keyset Feed trên PostgreSQL 16 sau khi gắn composite index.',
    '[]'::jsonb, FALSE, NOW() - INTERVAL '1 hour 30 minutes'
  ),
  (
    'f3000000-0000-0000-0000-000000000004',
    'f2000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    'f3000000-0000-0000-0000-000000000003', -- Reply tạo Chat Thread
    'Em đã chạy EXPLAIN ANALYZE: Index Scan chỉ tốn 0.65ms, không bị Seq Scan nữa.',
    '[]'::jsonb, FALSE, NOW() - INTERVAL '45 minutes'
  ),
  (
    'f3000000-0000-0000-0000-000000000005',
    'f2000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'f3000000-0000-0000-0000-000000000003', -- Reply 2 trong Chat Thread
    'Tuyệt vời! Keep-alive SSE cũng đã thêm header X-Accel-Buffering: no.',
    '[]'::jsonb, FALSE, NOW() - INTERVAL '30 minutes'
  );

UPDATE chat_members SET last_read_message_id = 'f3000000-0000-0000-0000-000000000002'
WHERE channel_id = 'f2000000-0000-0000-0000-000000000001' AND user_id = 'a0000000-0000-0000-0000-000000000001';

-- 4. SEED CHAT_REQUESTS (PENDING & BLOCKED)
INSERT INTO chat_requests (id, sender_id, receiver_id, initial_message, status, created_at, updated_at)
VALUES
  (
    'f4000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000007', -- sre_expert -> admin_pro (PENDING)
    'a0000000-0000-0000-0000-000000000001',
    'Chào admin, mình muốn trao đổi thêm về giải pháp PITR PostgreSQL trên cụm Homelab.',
    'PENDING',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '3 hours'
  ),
  (
    'f4000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000005', -- stealth_spammer -> cloud_architect (BLOCKED)
    'a0000000-0000-0000-0000-000000000003',
    'Tin nhắn quảng cáo spam liên kết ngoài không hợp lệ.',
    'BLOCKED',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '23 hours'
  );

-- 5. SEED MODERATION REPORTS (Mod Queue)
INSERT INTO reports (id, reporter_id, target_type, target_id, reason, status, resolved_by, resolved_at, resolution_note, created_at)
VALUES
  (
    'f5000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'COMMENT',
    'e0000000-0000-0000-0000-000000000009',
    'Bình luận chứa liên kết rác lặp lại gây loãng chủ đề kỹ thuật.',
    'PENDING',
    NULL, NULL, NULL,
    NOW() - INTERVAL '5 hours'
  ),
  (
    'f5000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000007',
    'THREAD',
    'd0000000-0000-0000-0000-000000000003',
    'Kiểm tra nhầm nội dung spam (đã được Mod xác minh hợp lệ).',
    'DISMISSED',
    'a0000000-0000-0000-0000-000000000002',
    NOW() - INTERVAL '1 hour',
    'Bài viết kỹ thuật hợp lệ về PostgreSQL ltree, không vi phạm.',
    NOW() - INTERVAL '6 hours'
  );

-- 6. SEED AUDIT_LOGS (Bảng bất biến: ON CONFLICT DO NOTHING)
INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, metadata, ip_address, user_agent, created_at)
VALUES
  (
    'f6000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'USER_STATUS_CHANGED',
    'USER',
    'a0000000-0000-0000-0000-000000000006',
    '{"previousStatus": "ACTIVE", "newStatus": "SUSPENDED", "reason": "Vi phạm quy chuẩn bảo mật"}'::jsonb,
    '127.0.0.1',
    'Acad-Admin-Console/2.0',
    NOW() - INTERVAL '5 days'
  ),
  (
    'f6000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    'REPORT_DISMISSED',
    'REPORT',
    'f5000000-0000-0000-0000-000000000002',
    '{"targetType": "THREAD", "note": "Verified genuine engineering content"}'::jsonb,
    '127.0.0.1',
    'Acad-Mod-Queue/2.0',
    NOW() - INTERVAL '1 hour'
  )
ON CONFLICT (id) DO NOTHING;

COMMIT;
