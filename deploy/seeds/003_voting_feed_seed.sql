-- ==============================================================================
-- ACAD DEVOPS PLATFORM (SYNAPSE ENGINE) - SEED DỮ LIỆU PHÂN HỆ 3 (VOTING & FEEDS)
-- File: deploy/seeds/003_voting_feed_seed.sql
-- Mục tiêu:
--   1. Thiết lập vote lịch sử thật (thread_votes & comment_votes) -> Trigger Karma
--   2. Cân chỉnh thread_counters đối lập giữa Hot (Gravity Decay), Top (Net Score), Best (Wilson)
--   3. Khởi tạo bookmarks user_saved_threads
-- ==============================================================================

BEGIN;

-- 0. Dọn dữ liệu biểu quyết & bookmark cũ của tập seed (Triggers xóa karma cũ)
DELETE FROM user_saved_threads WHERE thread_id IN (
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000005',
    'd0000000-0000-0000-0000-000000000006',
    'd0000000-0000-0000-0000-000000000007',
    'd0000000-0000-0000-0000-000000000008'
);

DELETE FROM comment_votes WHERE comment_id IN (
    SELECT id FROM comments WHERE id::text LIKE 'e0000000-0000-0000-0000-%'
);

DELETE FROM thread_votes WHERE thread_id IN (
    'd0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000005',
    'd0000000-0000-0000-0000-000000000006',
    'd0000000-0000-0000-0000-000000000007',
    'd0000000-0000-0000-0000-000000000008'
);

-- Cố định lại karma cơ sở trước khi insert vote để Idempotent 100%
UPDATE users SET karma_score = 9999 WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE users SET karma_score = 3420 WHERE id = 'a0000000-0000-0000-0000-000000000002';
UPDATE users SET karma_score = 1850 WHERE id = 'a0000000-0000-0000-0000-000000000003';
UPDATE users SET karma_score = 420  WHERE id = 'a0000000-0000-0000-0000-000000000004';
UPDATE users SET karma_score = -50  WHERE id = 'a0000000-0000-0000-0000-000000000005';
UPDATE users SET karma_score = -200 WHERE id = 'a0000000-0000-0000-0000-000000000006';
UPDATE users SET karma_score = 640  WHERE id = 'a0000000-0000-0000-0000-000000000007';
UPDATE users SET karma_score = 780  WHERE id = 'a0000000-0000-0000-0000-000000000008';
UPDATE users SET karma_score = 310  WHERE id = 'a0000000-0000-0000-0000-000000000009';

-- 1. SEED THREAD_VOTES (Triggers tự động cộng karma tác giả)
INSERT INTO thread_votes (thread_id, user_id, direction, created_at, updated_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', -1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '20 hours', NOW() - INTERVAL '20 hours'),
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004', 1, NOW() - INTERVAL '16 hours', NOW() - INTERVAL '16 hours'),

  ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours'),
  ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 1, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours');

-- 2. SEED COMMENT_VOTES
INSERT INTO comment_votes (comment_id, user_id, direction, created_at, updated_at)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 1, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', -1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  ('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days');

-- 3. CÂN CHỈNH BỘ ĐẾM THREAD_COUNTERS ĐỂ PHÂN BIỆT HOT vs TOP vs BEST
INSERT INTO thread_counters (
    thread_id, upvotes, downvotes, net_score, hot_score, wilson_score, comment_count, created_at, updated_at
)
SELECT
    t.id,
    v.upvotes,
    v.downvotes,
    (v.upvotes - v.downvotes),
    calculate_hot_score(v.upvotes - v.downvotes, t.created_at),
    calculate_wilson_score(v.upvotes, v.downvotes),
    (SELECT COUNT(*)::int FROM comments c WHERE c.thread_id = t.id),
    t.created_at,
    NOW()
FROM threads t
JOIN (
    VALUES
      -- Thread 1: Cũ nhất (5 ngày), Top NetScore cao nhất (558) -> Top #1 nhưng Hot tụt xuống
      ('d0000000-0000-0000-0000-000000000001'::uuid, 562, 4),
      -- Thread 2: 4 ngày, tương tác tốt
      ('d0000000-0000-0000-0000-000000000002'::uuid, 428, 2),
      -- Thread 3: 3 ngày, 315 up / 25 down (tỷ lệ tranh cãi -> Wilson thấp hơn)
      ('d0000000-0000-0000-0000-000000000003'::uuid, 315, 25),
      -- Thread 4: 2.5 ngày, 100% đồng thuận (240 up / 0 down -> Wilson cực cao)
      ('d0000000-0000-0000-0000-000000000004'::uuid, 240, 0),
      -- Thread 5: 2 ngày, 145 up / 5 down
      ('d0000000-0000-0000-0000-000000000005'::uuid, 145, 5),
      -- Thread 6: 1 ngày, 289 up / 0 down -> Best hàng đầu
      ('d0000000-0000-0000-0000-000000000006'::uuid, 289, 0),
      -- Thread 7: Mới nhất (6 giờ), 195 up / 1 down -> Hot #1!
      ('d0000000-0000-0000-0000-000000000007'::uuid, 195, 1),
      -- Thread 8 (Private incident-vault): 12 giờ, 48 up / 0 down
      ('d0000000-0000-0000-0000-000000000008'::uuid, 48, 0)
) AS v(id, upvotes, downvotes) ON v.id = t.id
ON CONFLICT (thread_id) DO UPDATE SET
    upvotes = EXCLUDED.upvotes,
    downvotes = EXCLUDED.downvotes,
    net_score = EXCLUDED.net_score,
    hot_score = EXCLUDED.hot_score,
    wilson_score = EXCLUDED.wilson_score,
    comment_count = EXCLUDED.comment_count,
    created_at = EXCLUDED.created_at,
    updated_at = NOW();

-- Đồng bộ sang bảng threads để nhất quán hiển thị
UPDATE threads t
SET upvotes_count = tc.upvotes,
    downvotes_count = tc.downvotes,
    comment_count = tc.comment_count,
    updated_at = NOW()
FROM thread_counters tc
WHERE t.id = tc.thread_id;

-- 4. SEED USER_SAVED_THREADS (BOOKMARKS)
INSERT INTO user_saved_threads (user_id, thread_id, created_at)
VALUES
  ('a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', NOW() - INTERVAL '2 days'),
  ('a0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', NOW() - INTERVAL '1 day'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006', NOW() - INTERVAL '18 hours'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000007', NOW() - INTERVAL '3 hours'),
  ('a0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', NOW() - INTERVAL '12 hours')
ON CONFLICT (user_id, thread_id) DO NOTHING;

COMMIT;
