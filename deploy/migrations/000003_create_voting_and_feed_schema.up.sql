-- ============================================================================
-- Migration: 000003_create_voting_and_feed_schema.up.sql
-- Description: Bảng đếm counters tách biệt (HOT 70%), bảng votes, saved threads và chỉ mục bảng tin
-- ============================================================================

-- 1. Bảng thread_counters tối ưu hóa Heap-Only Tuples (HOT updates)
-- fillfactor = 70 để dành 30% dung lượng mỗi data page 8KB cho các bản ghi cập nhật tại chỗ,
-- ngăn ngừa phân mảnh bảng và bloat chỉ mục B-tree khi có hàng nghìn lượt upvote/downvote mỗi giây.
CREATE TABLE IF NOT EXISTS thread_counters (
    thread_id UUID PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE,
    upvotes INTEGER NOT NULL DEFAULT 0,
    downvotes INTEGER NOT NULL DEFAULT 0,
    net_score INTEGER NOT NULL DEFAULT 0,
    hot_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    wilson_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    comment_count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) WITH (fillfactor = 70);

-- Chỉ mục hỗ trợ sắp xếp bảng tin tốc độ cao (Feed Sorting Queries)
CREATE INDEX IF NOT EXISTS idx_thread_counters_hot ON thread_counters (hot_score DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_counters_top ON thread_counters (net_score DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_counters_wilson ON thread_counters (wilson_score DESC, updated_at DESC);

-- 2. Bảng thread_votes (Lưu vết lịch sử biểu quyết của người dùng trên bài viết)
CREATE TABLE IF NOT EXISTS thread_votes (
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_thread_votes_user ON thread_votes (user_id);

-- 3. Bảng comment_votes (Lưu vết biểu quyết trên bình luận)
CREATE TABLE IF NOT EXISTS comment_votes (
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction SMALLINT NOT NULL CHECK (direction IN (-1, 1)),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_votes_user ON comment_votes (user_id);

-- 4. Bảng user_saved_threads (Danh sách bài viết đã đánh dấu lưu trữ cá nhân)
CREATE TABLE IF NOT EXISTS user_saved_threads (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_threads_user ON user_saved_threads (user_id, created_at DESC);

-- 5. Khởi tạo bản ghi counters cho các bài viết hiện hữu (nếu có)
INSERT INTO thread_counters (thread_id, upvotes, downvotes, net_score, comment_count, updated_at)
SELECT id, upvotes_count, downvotes_count, (upvotes_count - downvotes_count), comment_count, created_at
FROM threads
ON CONFLICT (thread_id) DO NOTHING;
