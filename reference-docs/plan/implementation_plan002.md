# Kế hoạch Chi tiết Triển khai Giai đoạn 2: Thiết kế UI/UX & Kiến trúc Hệ thống (Design & Architecture)

## Tổng quan & Bối cảnh

Sau khi Giai đoạn 1 (**Khảo sát & Định vị sản phẩm - Discovery & Product Definition**) đã được hoàn thiện toàn diện (gồm bản PRD chuẩn, đặc tả bảo mật Auth, lược đồ dữ liệu danh tính, động cơ Token Rotation kép, ma trận phân quyền RBAC/ABAC và 19/19 test cases PASS 100%), dự án sẵn sàng bước sang **Giai đoạn 2**.

Mục tiêu của Giai đoạn 2 là chuyển hóa toàn bộ yêu cầu sản phẩm thành:
1. **Kiến trúc Dữ liệu Quan hệ Chuẩn xác (PostgreSQL 16 Schema):** Khởi tạo khung CSDL nguồn chân lý (Source of Truth) với các bảng `spaces`, `threads`, `thread_counters` (cô lập chống phình bảng MVCC), `comments` (phân cấp bằng PostgreSQL `ltree`), `votes`, `media_assets` và `moderation_reports`.
2. **Khế ước Giao tiếp Toàn diện (API & Realtime Contracts):** Mở rộng gói `@acad/contracts` và file `openapi.yaml` định nghĩa đầy đủ các endpoints cho Feed (phân trang con trỏ Cursor Base64), Chủ đề bài viết (Threads), Cây bình luận (Nested Comments), Upload ảnh Zero-Hop (Presigned URL) và Kênh phát sóng thời gian thực (Server-Sent Events - SSE).
3. **Động cơ Chịu tải Cao & Kịch bản Tương tác Nguyên tử:** Viết kịch bản Redis Lua Script (`execute_vote.lua`) xử lý bình chọn nguyên tử $\mathcal{O}(1)$, thuật toán sinh đường dẫn Base36 cho `ltree`, và Worker gom cụm cập nhật điểm số (Batch Flush) kèm công thức hạ nhiệt bài viết (Gravity Decay).
4. **Hệ thống Giao diện UI/UX & Máy trạng thái (Frontend Architecture):** Chuẩn hóa bộ Design Tokens (Light/Dark mode), bố cục màn hình 3 cột (Layout DAG), phân chia ranh giới Server Components (RSC) vs Client Components, và thuật toán trải phẳng cây bình luận phục vụ ảo hóa DOM (`@tanstack/react-virtual`).

---

## User Review Required

> [!IMPORTANT]
> **Quy trình triển khai 4 bước tuần tự theo khuyến nghị**:
> Để tránh việc sinh mã nguồn rời rạc, quá trình triển khai Giai đoạn 2 sẽ tuân thủ nghiêm ngặt lộ trình:
> **Lược đồ CSDL (PostgreSQL DDL) $\rightarrow$ Hợp đồng API (OpenAPI & Zod) $\rightarrow$ Logic Chịu tải Backend/Lua $\rightarrow$ Design Tokens & Frontend Statecharts**.

> [!NOTE]
> **Giải pháp kỹ thuật cho bài toán tải cao (Architectural Invariants)**:
> 1. **Bảng `thread_counters` tách rời:** Tách riêng bảng đếm số vote, view khỏi bảng `threads` chính để triệt tiêu hiện tượng phình bảng (Table Bloat do cơ chế MVCC của PostgreSQL).
> 2. **PostgreSQL `ltree` Base36:** Quản lý cây bình luận phân tầng bằng extension `ltree` theo định dạng Base36 (tối đa 8 cấp), kết hợp chỉ mục `GiST` để truy vấn toàn bộ cây chỉ trong một câu query duy nhất.
> 3. **Redis Lua Script:** Toàn bộ thao tác Vote không ghi trực tiếp vào Database, mà chạy qua script Lua nguyên tử trên Redis, sau đó Worker xả dồn (Batch Flush) mỗi 5 giây.

---

## Proposed Changes

Kế hoạch triển khai Giai đoạn 2 được chia thành 4 phân hệ chính:

```
[Phân hệ 1: Lược đồ CSDL PostgreSQL 16] ──> [Phân hệ 2: Hợp đồng API & SSE Contracts]
                     │                                         │
                     ▼                                         ▼
[Phân hệ 3: Redis Lua Script & Logic Tải Cao] ──> [Phân hệ 4: Design Tokens & UI Statecharts]
```

---

### Phân hệ 1: Lược đồ Cơ sở Dữ liệu Toàn diện (PostgreSQL 16 Schema)

Tạo file migration DDL mới kế thừa migration 000001 đã có:

#### [NEW] [deploy/migrations/000002_create_community_schema.up.sql](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/000002_create_community_schema.up.sql)
- Bật extensions: `ltree` (cây bình luận), `pg_trgm` (tìm kiếm mờ/trigram).
- Tạo ENUMs: `space_role`, `vote_direction`, `media_status`, `report_status`, `report_reason`.
- **Bảng `spaces`:**
  - `id UUID PRIMARY KEY`, `slug VARCHAR(50) UNIQUE`, `name VARCHAR(100)`, `description TEXT`, `rules JSONB`, `banner_url TEXT`, `avatar_url TEXT`, `creator_id UUID`, `is_private BOOLEAN`, timestamps.
- **Bảng `space_memberships`:**
  - `user_id UUID`, `space_id UUID`, `role space_role`, `karma_in_space INTEGER`, `is_muted BOOLEAN`, `muted_until TIMESTAMPTZ`, timestamps.
- **Bảng `threads`:**
  - `id UUID PRIMARY KEY`, `space_id UUID NOT NULL`, `author_id UUID NOT NULL`, `slug VARCHAR(255) UNIQUE`, `title VARCHAR(255)`, `content_ast JSONB NOT NULL`, `is_pinned BOOLEAN`, `is_locked BOOLEAN`, `is_deleted BOOLEAN`, timestamps.
- **Bảng `thread_counters` (Cô lập chống MVCC Bloat):**
  - `thread_id UUID PRIMARY KEY REFERENCES threads(id) ON DELETE CASCADE`, `upvotes INTEGER DEFAULT 0`, `downvotes INTEGER DEFAULT 0`, `net_score INTEGER DEFAULT 0`, `comment_count INTEGER DEFAULT 0`, `view_count INTEGER DEFAULT 0`, `hot_score DOUBLE PRECISION DEFAULT 0`, `updated_at TIMESTAMPTZ`. Bật `WITH (fillfactor = 70)` để tối ưu HOT updates.
- **Bảng `comments`:**
  - `id UUID PRIMARY KEY`, `thread_id UUID NOT NULL`, `parent_id UUID REFERENCES comments(id)`, `author_id UUID NOT NULL`, `content_ast JSONB NOT NULL`, `path LTREE NOT NULL`, `depth INTEGER NOT NULL`, `upvotes INTEGER DEFAULT 0`, `is_collapsed_default BOOLEAN`, timestamps.
- **Bảng `votes`:**
  - `user_id UUID`, `target_id UUID`, `target_type VARCHAR(10)` ('THREAD' | 'COMMENT'), `direction SMALLINT` (+1, -1), `created_at TIMESTAMPTZ`, Khóa chính `(user_id, target_id)`.
- **Bảng `media_assets` (Zero-Hop Direct Upload Tracking):**
  - `file_key VARCHAR(128) PRIMARY KEY`, `uploader_id UUID`, `mime_type VARCHAR(64)`, `file_size_bytes BIGINT`, `blurhash VARCHAR(64)`, `status media_status` ('PENDING', 'ATTACHED', 'ORPHANED'), timestamps.
- **Bảng `moderation_reports`:**
  - `id BIGSERIAL PRIMARY KEY`, `reporter_id UUID`, `target_id UUID`, `target_type VARCHAR(10)`, `reason report_reason`, `details TEXT`, `status report_status`, `moderator_id UUID`, `resolution_note TEXT`, timestamps.
- **Chỉ mục tối ưu:**
  - GiST index: `CREATE INDEX idx_comments_path_gist ON comments USING GIST (path);`
  - B-tree indices trên `threads(space_id, created_at DESC)`, `thread_counters(hot_score DESC)`, `votes(target_id)`.

#### [NEW] [deploy/migrations/000002_create_community_schema.down.sql](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/000002_create_community_schema.down.sql)
- Script rollback toàn bộ các bảng cộng đồng mới.

---

### Phân hệ 2: Mở rộng Hợp đồng Dữ liệu Dùng chung (@acad/contracts)

Định nghĩa chính xác toàn bộ schemas và types làm Source of Truth chung:

#### [NEW] [packages/contracts/src/spaces.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/src/spaces.ts)
- Zod schemas & types: `SpaceSchema`, `CreateSpaceInputSchema`, `SpaceMembershipSchema`.

#### [NEW] [packages/contracts/src/threads.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/src/threads.ts)
- Zod schemas & types:
  - `TiptapNodeSchema` & `ContentASTSchema` (Kiểm định cấu trúc AST bài viết, chặn mã độc HTML/SVG).
  - `CreateThreadInputSchema`, `ThreadDetailSchema`, `ThreadSummarySchema`.
  - `FeedCursorSchema`: Giải mã và mã hóa con trỏ phân trang Base64 `(score:timestamp:id)`.

#### [NEW] [packages/contracts/src/comments.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/src/comments.ts)
- Zod schemas & types:
  - `CreateCommentInputSchema`.
  - `FlatCommentItemSchema` (Cấu trúc phẳng cho Virtualizer: `id`, `path`, `depth`, `hasChildren`, `childCount`, `isCollapsed`, `payload`).

#### [NEW] [packages/contracts/src/realtime.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/src/realtime.ts)
- Zod schemas & types cho Server-Sent Events (SSE):
  - `ThreadStatsEventSchema` (`thread_id`, `upvotes`, `net_score`, `comment_count`).
  - `NewCommentNodeEventSchema` (`thread_id`, `comment_id`, `parent_id`, `path`, `depth`, `author_preview`).
  - `UserNotificationEventSchema` (`notification_id`, `type`, `target_url`, `message_text`).

#### [MODIFY] [packages/contracts/openapi.yaml](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/openapi.yaml)
- Hợp nhất và mở rộng đặc tả OpenAPI 3.1 cho toàn bộ nền tảng:
  - `GET /api/v1/feed` (Cursor pagination, Hot/New filters)
  - `POST /api/v1/spaces`, `GET /api/v1/spaces/{slug}`
  - `POST /api/v1/threads`, `GET /api/v1/threads/{slug}`
  - `POST /api/v1/threads/{id}/votes` (Upvote/Downvote/Unvote)
  - `GET /api/v1/threads/{id}/comments` (Flattened tree list)
  - `POST /api/v1/threads/{id}/comments` (Reply nested)
  - `POST /api/v1/media/presign` (Xin Presigned URL Zero-Hop upload)
  - `GET /api/v1/realtime/events` (Kênh truyền SSE với header `text/event-stream`)

---

### Phân hệ 3: Động cơ Chịu tải Cao & Kịch bản Tương tác (Backend & Redis Lua)

#### [NEW] [deploy/redis/execute_vote.lua](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/redis/execute_vote.lua)
- Kịch bản Lua chạy nguyên tử trên Redis với độ phức tạp $\mathcal{O}(1)$:
  - Xử lý 3 nhánh hành vi: Bầu chọn mới, Đảo chiều (-1 sang +1 hoặc ngược lại) và Hủy vote (Unvote).
  - Tự động cập nhật các bộ đếm `upvotes`, `downvotes`, `net_score` trên Redis Hash `thread:{id}:counters`.
  - Lưu trạng thái vote của user trên Redis Hash `thread:{id}:voters`.
  - Đẩy `target_id` vào Redis Set `dirty_threads_registry` để Worker gom cụm.

#### [NEW] [services/community/src/voting/lua-vote-engine.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/voting/lua-vote-engine.ts)
- Bộ bao đóng (Wrapper) thực thi script Lua với thuật toán xử lý lỗi và fallback an toàn.

#### [NEW] [services/community/src/comments/ltree-path-generator.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/comments/ltree-path-generator.ts)
- Thuật toán sinh chuỗi đường dẫn Base36 phân tầng `0001.000a.0003` theo chuẩn PostgreSQL `ltree`:
  - Giới hạn độ sâu tối đa 8 cấp.
  - Khi vượt quá cấp 8, tự động chuyển đổi thành Flat Reply gắn tag mention tác giả cha.

#### [NEW] [services/community/src/voting/gravity-decay.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/voting/gravity-decay.ts)
- Hiện thực hóa thuật toán tính điểm Hot Trending (Gravity Decay):
  $$HotScore = \frac{NetScore}{(AgeHours + 2)^{1.8}}$$

---

### Phân hệ 4: Hệ thống Giao diện UI/UX & Máy trạng thái (Frontend Architecture)

#### [NEW] [docs/stage-2/UI_UX_DESIGN_SPECIFICATION.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-2/UI_UX_DESIGN_SPECIFICATION.md)
- Tài liệu đặc tả hệ thống giao diện:
  - Bảng mã Design Tokens: Typography scale, Grid 4px/8px, Light/Dark color palette semantics.
  - Screen Layout Blueprint: Bố cục 3 cột (Top Navbar, Left Navigation Rail 240px, Center Content Stage 768px, Right Contextual 320px).
  - Ranh giới Server Components (RSC Boundaries): Phân định rõ thành phần tĩnh render phía server (SEO) vs thành phần tương tác phía client.
  - Sơ đồ máy trạng thái giao diện: Optimistic UI Voting & Deep-link Comment Navigation.

#### [NEW] [packages/ui-tokens/src/tokens.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/ui-tokens/src/tokens.ts)
- Cấu hình Design Tokens dùng chung xuất ra Tailwind CSS preset / CSS Variables.

#### [NEW] [packages/tree-virtualizer/src/flatten-tree.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/tree-virtualizer/src/flatten-tree.ts)
- Hiện thực hóa thuật toán phía Client chuyển đổi cây bình luận đệ quy thành mảng một chiều phẳng $\mathcal{O}(N)$ phục vụ render bằng `@tanstack/react-virtual`, hỗ trợ thu gọn nhánh cha tức thì.

---

## Verification Plan

### Automated Tests
1. **Kiểm tra kiểu dữ liệu toàn Monorepo:**
   ```bash
   pnpm run typecheck
   ```
2. **Kiểm tra thuật toán sinh đường dẫn Base36 `ltree`:**
   ```bash
   pnpm --filter @acad/community run test
   ```
   - Xác nhận sinh đúng định dạng `0001.0001`, thứ tự tăng dần, và xử lý đúng ngưỡng cắt ở độ sâu cấp 8.
3. **Kiểm tra Động cơ Bầu chọn Redis Lua Script (Atomic Voting Engine):**
   - Kiểm tra vote mới (+1 upvote, +1 net_score).
   - Kiểm tra đảo chiều vote (từ -1 sang +1 -> net_score tăng +2).
   - Kiểm tra hủy vote (unvote).
   - Kiểm tra thêm đúng thread ID vào `dirty_threads_registry`.
4. **Kiểm tra Thuật toán Trải phẳng Cây Bình luận (Tree-to-Array Flattening):**
   - Xác nhận chuyển đổi đúng mảng 1 chiều kèm `depth`.
   - Xác nhận khi bấm thu gọn (Collapse) tại nút cha, toàn bộ nút con bị ẩn chính xác với thời gian $\mathcal{O}(N)$.

### Manual Verification
1. **Đối soát Lược đồ CSDL PostgreSQL 16:**
   - Kiểm tra tính toàn vẹn khóa ngoại giữa `threads` và `thread_counters`.
   - Kiểm tra ràng buộc duy nhất và chỉ mục GiST trên trường `comments(path)`.
