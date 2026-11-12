# Giai Đoạn 1 & 2: Nghiên Cứu Nền Tảng, Tác Nhân & Đặc Tả Yêu Cầu (PRD v2.2)

> **Mã tài liệu:** `SPEC-PRD-OVERVIEW`  
> **Dự án:** Acad DevOps Fullstack Monorepo (**SYNAPSE Engine - v2.1.0**)  
> **Khung chuẩn:** Giai đoạn 1 & Giai đoạn 2 trong [`SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/SYSTEM%20ANALYSIS%20%26%20DESIGN%20LIFECYCLE%20FRAMEWORK.md)

---

## PHẦN A — NGHIÊN CỨU NỀN TẢNG & MỤC TIÊU R&D (FRAMEWORK GIAI ĐOẠN 1)

### 1. Bối Cảnh Thực Tiễn, Rủi Ro & Tính Cấp Thiết

| Khía cạnh đánh giá | Hiện trạng (Status Quo) | Mục tiêu hệ thống (Target State) |
| :--- | :--- | :--- |
| **Cấu trúc thảo luận đa tầng** | Diễn đàn truyền thống (phpBB, vBulletin) phân trang tuyến tính hoặc đệ quy CTE sâu gây thắt cổ chai DB và tràn DOM khi hàng nghìn phản hồi lồng nhau. | Cây phân cấp Materialized Path `ltree` Base36 4 ký tự kết hợp chỉ mục GiST (truy vấn cây con < 2ms) và giới hạn Capped Depth 8 Flat Reply + render cuốn chiếu $\mathcal{O}(N)$. |
| **Toàn vẹn biểu quyết & Bộ đếm** | Cập nhật trực tiếp bảng bài viết gây Lock Contention; hoặc ngược lại bơm số đếm giả lập làm lệch hoàn toàn dữ liệu user/vote thật. | Bỏ phiếu nguyên tử $\mathcal{O}(1)$ qua Redis Lua (`execute_vote.lua`) + Worker xả dồn mỗi 5s vào `thread_counters` (`fillfactor = 70`), **0% dữ liệu giả lập** — mọi counter đối soát khớp 100% bảng gốc. |
| **Giao tiếp thời gian thực & Chống spam** | Nhắn tin trực tiếp từ người lạ gây spam hộp thư; thiếu cơ chế tìm kiếm người dùng để bắt đầu trò chuyện khi tài khoản mới hoàn toàn trống. | Giao thức SSE RFC 8895 kèm hàng đợi `chat_requests` (`PENDING` / `ACCEPTED` / `IGNORED` / `BLOCKED`), luồng **Create Chat (Search by username)** đầy đủ cho tài khoản mới và Chat Threads nhánh phụ. |
| **An toàn danh tính & Tự chủ hạ tầng** | Token lưu đơn lẻ dễ mất phiên khi đa tab gọi refresh song song hoặc phụ thuộc Cloud PaaS trả phí. | Token Rotation 15m/7d + `crypto.scrypt` + **30s Grace Period** + **Token Reuse Attack Detection**, vận hành Self-Hosted Debian 13 + Podman Rootless + Cloudflare Zero Trust Tunnel. |

### 2. Mục Tiêu Nghiên Cứu & Kỹ Thuật (Research Objectives - RO)

- **RO1 – Kiến trúc Thảo luận Phân tầng Hiệu năng cao:** Tối ưu lưu trữ và truy vấn cây thảo luận phân cấp sâu bằng PostgreSQL `ltree` Base36 + GiST index, đồng bộ bộ đếm bài viết/bình luận không lệch khi soft-delete.
- **RO2 – Cơ chế Đồng bộ Nguyên tử & Xếp hạng Đa chiều Thực tế:** Thiết kế luồng Redis Lua Voting FSM (`0 <-> +1 <-> -1`) kết hợp thuật toán Hacker News Gravity Decay ($G = 1.8$) và Wilson Score ($z = 1.96$) vận hành 100% trên phiếu bầu thật.
- **RO3 – Phòng thủ Đa lớp & Giao tiếp Thời gian thực Khép kín:** Xây dựng hệ thống xác thực xoay vòng token chống race condition (`Mutex Lock` + `30s Grace`), SSE + Presence/Typing Redis fallback, kiểm toán bất biến `audit_logs`, và quy trình nghiệm thu E2E bằng tài khoản trắng mới.

### 3. Phạm Vi Hệ Thống & Giả Định Triển Khai

- **Trong phạm vi (In-Scope):**
  - Định danh & phiên đa thiết bị (`users`, `user_sessions`), hồ sơ công khai `/u/[username]` & tìm kiếm user.
  - Quản trị cộng đồng (`spaces`, `topic`, `space_memberships`, `space_flairs`), bài viết `TEXT`/`LINK`/`MEDIA` (Presigned PUT URL), tìm kiếm `pg_trgm`.
  - Bình luận phân tầng `ltree`, vote nguyên tử, bảng tin `Home` (joined), `Popular` (global), `Explore` (chủ đề & không gian).
  - Chat 1-1 (`DIRECT`), Chat nhóm (`GROUP`), hàng đợi `chat_requests`, `Chat Threads`, SSE stream + `Presence`.
  - Báo cáo vi phạm (`reports`), Shadowban, khóa/mở tài khoản, nhật ký bất biến `audit_logs`.
- **Ngoài phạm vi (Out-of-Scope phiên bản hiện tại):** Video streaming transcoding, quảng cáo AdSense, thanh toán thương mại, ứng dụng mobile native iOS/Android.
- **Giả định hạ tầng:** Máy chủ Linux (Debian 13 / CI Ubuntu) cài Podman/Docker chạy PostgreSQL 16 + Redis 7, Node.js 22 LTS, `pnpm@10.15.0`.

---

## PHẦN B — KỸ NGHỆ YÊU CẦU HỆ THỐNG (FRAMEWORK GIAI ĐOẠN 2)

### 4. Ma Trận Tác Nhân & Tác Nhân Tự Động (Actors & Autonomous Agents)

#### 4.1. Chân dung Người dùng (User Personas)

| Mã Actor | Tên Actor & Vai trò | Bối cảnh vận hành | Mục tiêu cốt lõi | Điểm đau hiện hữu cần triệt tiêu | Phân cấp quyền hạn (`user_role`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ACT-01** | **Khách vãng lai (Guest)** | Truy cập web công khai chưa đăng nhập | Đọc bài viết/bình luận, xem Popular/Explore, tìm kiếm | Thấy community "đã tham gia" giả mạo hoặc bị văng lỗi không rõ ràng | `GUEST` (chỉ đọc Space công khai & Public Profile) |
| **ACT-02** | **Thành viên Mới / Tích cực (`USER`)** | Tài khoản đăng ký mới (0 space, 0 kênh chat) hoặc kỹ sư | Tham gia Space (`/explore`), đăng bài, vote, bình luận, **tìm username để Chat 1-1** | Bị mù ở trạng thái rỗng (Home/Chat trống không có CTA tìm người/cộng đồng), số liệu ảo | `USER` (Đọc/ghi nội dung ở Space được phép, Chat, Report) |
| **ACT-03** | **Điều phối viên Không gian (`SPACE_MOD`)** | Người sáng lập hoặc Mod của một `/s/[slug]` | Quản lý Space Rules, Flairs, ghim/khóa bài, kiểm duyệt không gian riêng | Cần phân tách quyền `CREATOR`/`MODERATOR` trong `space_memberships` | `SPACE_MOD` |
| **ACT-04** | **Kiểm duyệt viên Toàn cục (`GLOBAL_MOD`)** | Điều phối viên cộng đồng toàn sàn | Xử lý hàng đợi `reports`, Shadowban/Suspend user vi phạm | Thiếu log vết kiểm toán hoặc bị sửa xóa log | `GLOBAL_MOD` |
| **ACT-05** | **Quản trị viên Hệ thống (`ADMIN`)** | Vận hành hạ tầng & toàn bộ nền tảng | Toàn quyền Admin Console (`/admin`), quản lý role/user/space/thread & audit logs | Nguy cơ trùng lặp quyền hoặc thiếu công cụ đối soát counter DB | `ADMIN` |

#### 4.2. Đặc tả Tác nhân Hệ thống Tự động (System Autonomous Agents)

| Mã Agent | Tên Tác nhân | Môi trường thực thi | Đầu vào | Đầu ra & Ràng buộc |
| :--- | :--- | :--- | :--- | :--- |
| **AGT-01** | `VoteFlushWorker` | Background Worker (5s interval trong `apps/api`) | Tập Redis `dirty:votes` & `target:{id}:counters` | Bulk Upsert vào `thread_counters` PostgreSQL; cập nhật `hot_score`, `wilson_score` |
| **AGT-02** | `PostgreSQL Trigger Engine` | Nhân PostgreSQL 16 (11+ triggers ACID) | Sự kiện `INSERT`/`UPDATE`/`DELETE` trên `threads`, `comments`, `thread_votes`, `space_memberships`, `chat_messages`, `audit_logs` | Đồng bộ tức thì `member_count`, `thread_count`, `threads_count`, `karma_score`, `comment_count` (kể cả soft-delete) và chặn sửa/xóa `audit_logs` |
| **AGT-03** | `SseManager Heartbeat` | `services/chat` (15s keep-alive) | Kết nối mở từ Client `GET /api/v1/chat/events` | Giữ sống socket SSE, tự dọn socket khi đóng tránh rò rỉ bộ nhớ |
| **AGT-04** | `Presence & Typing TTL Evictor` | Redis 7 + In-Memory Fallback | Heartbeat 12s từ client (`EX 15`) & sự kiện gõ phím (`EX 5`) | Tự hết hạn trạng thái trực tuyến/đang nhập sau TTL |

---

### 5. Đặc Tả Yêu Cầu Chức Năng Theo Trụ Cột MECE (Functional Requirements)

- **FR-AUTH-01 (Định danh & Phiên đa thiết bị):** Đăng ký/đăng nhập `crypto.scrypt`, xoay vòng Refresh Token 15m/7d kèm 30s Grace Period, thu hồi toàn bộ phiên khi phát hiện Reuse Attack, xem & thu hồi từng thiết bị tại `/settings/sessions`.
  - *Nghiệm thu:* Login xong reload trang vẫn giữ phiên; dùng lại refresh token cũ sau >30s bị thu hồi toàn bộ phiên (`401`).
- **FR-AUTH-02 (Hồ sơ công khai & Tìm kiếm Username):** Truy vấn hồ sơ `/u/[username]` không lộ PII (`email`, `passwordHash`) và tìm kiếm gợi ý user đang `ACTIVE` (`GET /api/v1/auth/users/search?q=...`) phục vụ Chat.
- **FR-SPACE-01 (Không gian, Chủ đề & `/explore`):** Duyệt/tìm kiếm Space theo `topic` thật trên `/explore` & Sidebar `Topics`; Join/Leave cập nhật `spaces.member_count` chính xác qua DB trigger; Space `is_private = TRUE` trả `403` cho người ngoài.
- **FR-CONT-01 (Bài viết & Zero-Hop Upload):** Tạo bài `TEXT`/`LINK`/`MEDIA` gắn Flair của Space; cấp Presigned PUT URL và kiểm tra SSRF URL hợp lệ.
- **FR-LTREE-01 (Cây Bình luận `ltree` & Soft-Delete):** Sinh path Base36 4 ký tự, tự động gộp phẳng `@mention` ở độ sâu `depth = 8` (`MAX_TREE_DEPTH = 8`); soft-delete giữ nguyên cấu trúc nhánh nhưng cập nhật chính xác bộ đếm active.
- **FR-VOTE-01 (Biểu quyết Nguyên tử & Không dữ liệu ảo):** Bấm Upvote/Downvote chạy FSM (`0 <-> +1 <-> -1`) qua `execute_vote.lua` và ghi bền `thread_votes`/`comment_votes` kích hoạt Karma; **toàn bộ counter seed và runtime phải khớp 100% số vote thật**.
- **FR-FEED-01 (Tách biệt `Home`, `Popular`, `Explore` & Keyset Pagination):** `Home` (`?tab=following`) chỉ lấy bài từ Space đã tham gia (hiển thị CTA `/explore` nếu chưa tham gia space nào); `Popular` (`?tab=for_you&sort=hot|new|top|best`) hiển thị toàn sàn bằng Keyset Base64 cursor; `Recent Posts` dẫn thẳng tới `/threads/[id]`.
- **FR-CHAT-01 (Create Direct Chat theo Username, Requests & Group):** Cho phép người dùng (kể cả tài khoản trắng mới) tìm username để khởi tạo Chat 1-1 ngay trong widget/`/chat`; tách rõ **Incoming Requests** (`Accept`/`Ignore`/`Block`) và **Sent Requests**; cấm tạo Group chỉ có 1 mình; đồng bộ `last_read_message_id` và Chat Threads (`parent_message_id`) qua SSE.
- **FR-MOD-01 (Kiểm duyệt & Kiểm toán Bất biến):** Gửi báo cáo chống trùng 409 (`PENDING` unique index); Admin/GlobalMod xử lý Resolve/Dismiss, đổi role/status, Pin/Lock/Delete; mọi thao tác ghi `audit_logs` bất biến.

---

### 6. Đặc Tả Yêu Cầu Phi Chức Năng (Non-Functional Requirements - NFR)

- **NFR-SEC-01 (Bảo mật & Chống tấn công):** Header an ninh (`CSP`, `X-Frame-Options: DENY`, `nosniff`, `HSTS`), ẩn `x-powered-by`, Rate Limiter phân tầng Redis (`auth`, `interaction`, `general`), chặn XSS Markdown URL & SSRF.
- **NFR-PERF-01 (Hiệu năng & Chỉ mục):** Truy vấn `ltree` GiST & `thread_counters` HOT update (`fillfactor = 70`), tìm kiếm `pg_trgm` GIN trên `spaces.name`, `threads.title`, `users.username`.
- **NFR-REL-01 (Phục hồi & Độ tin cậy):** In-Memory fallback cho `RateLimiter` và `PresenceManager` khi Redis gián đoạn; Client `AcadClient` Mutex Lock chống 401 Thundering Herd.
- **NFR-INT-01 (Khế ước & Tính nhất quán dữ liệu):** Chuẩn hóa OpenAPI 3.1 + Zod (`@acad/contracts`), lỗi HTTP chuẩn RFC 7807 `ProblemDetails`, Keyset Cursor pagination và 100% nhất quán UI ↔ API ↔ DB.

---

### 7. Ma Trận Truy Xuất Yêu Cầu (Traceability Matrix)

| Mục tiêu (RO) | Yêu cầu Chức năng (FR) | Yêu cầu Phi chức năng (NFR) | Cơ chế Kiểm chứng Thực nghiệm |
| :--- | :--- | :--- | :--- |
| **RO1** (Kiến trúc Thảo luận & Phân trang) | `FR-SPACE-01`, `FR-CONT-01`, `FR-LTREE-01`, `FR-FEED-01` | `NFR-PERF-01`, `NFR-INT-01` | Integration test `platform.integration.test.ts` (Depth 8/9 Capped + Private Space 403) + Playwright E2E `Home`/`Popular`/`Explore` |
| **RO2** (Biểu quyết Nguyên tử & Không dữ liệu ảo) | `FR-VOTE-01`, `FR-FEED-01` | `NFR-PERF-01`, `NFR-INT-01` | `VoteFlushWorker` integration + **SQL Invariant Audit** (`thread_counters == COUNT(thread_votes)` & `<= COUNT(users)`) |
| **RO3** (An ninh & Realtime Chat Tài khoản Mới) | `FR-AUTH-01`, `FR-AUTH-02`, `FR-CHAT-01`, `FR-MOD-01` | `NFR-SEC-01`, `NFR-REL-01` | `verify-security-curl.sh` + Reuse Attack test + Playwright **2 Fresh Users (`fresh_a`, `fresh_b`)** Username Search $\rightarrow$ Chat Request $\rightarrow$ Accept $\rightarrow$ SSE |
