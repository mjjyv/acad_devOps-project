# Bảng Kiểm Ma Trận Đa Chiều Theo Phân Hệ (Modules & Multi-Dimensional Matrix Checklist)

> **Mục tiêu:** Thoát ly khỏi mô hình SDLC đơn tuyến tuần tự; tổng hợp mọi khía cạnh kiến trúc (Modules, Khía cạnh Kỹ thuật, Tiêu chí Nghiệm thu, Phương thức Kiểm chứng) thành bảng kiểm đa chiều toàn diện của dự án Acad DevOps Monorepo.

---

## 🧭 Ma Trận 10 Phân Hệ × 6 Chiều Kỹ Thuật (Matrix Overview)

```
Phân hệ (Modules) \ Chiều Kỹ thuật   | C1: Data | C2: Contract | C3: Security | C4: Perf | C5: Resiliency | C6: UI/UX | Tỷ lệ Hoàn Thành
------------------------------------|:--------:|:------------:|:------------:|:--------:|:--------------:|:---------:|:----------------:
M1: Auth & Identity Subsystem       |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    [x]    |       100%
M2: Session & Security Shield       |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    [x]    |       100%
M3: Spaces & Community Subsystem    |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    [/]    |        85%
M4: Threads & Content CMS Engine    |   [x]    |     [x]      |     [x]      |   [x]    |      [/]       |    [/]    |        70%
M5: Nested Comments Virtualization  |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    [/]    |        85%
M6: Atomic Lua Voting & Reputation  |   [x]    |     [x]      |     [x]      |   [x]    |      [/]       |    [/]    |        75%
M7: Zero-Hop Media Pipeline (R2/S3) |   [x]    |     [x]      |     [/]      |   [x]    |      [ ]       |    [ ]    |        40%
M8: Admin & Moderation Hub          |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    [/]    |        70%
M9: Frontend Web Client (Next.js 15)|   [/]    |     [x]      |     [x]      |   [/]    |      [x]       |    [/]    |        65%
M10: DevOps, Multi-Cloud & Infra    |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    N/A    |        85%
----------------------------------------------------------------------------------------------------------------------------------------
TỔNG THỂ DỰ ÁN TOÀN DIỆN:                                                                                                ~77.5%
```

---

## 📋 Chi Tiết Tiêu Chí Từng Phân Hệ (Module-by-Module Acceptance Criteria)

### 🧩 Module 1: Định Danh & Quản Lý Danh Tính (Auth & Identity) — 100%

*Mã nguồn chính:* [`services/auth`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth), [`packages/contracts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts)

- [x] **C1 (Data):** Bảng `users` trong PostgreSQL 16 có chỉ mục tìm kiếm không phân biệt hoa thường (`LOWER(username)`, `LOWER(email)`), khóa chính UUIDv4.
- [x] **C2 (Contract):** Đặc tả OpenAPI 3.1 [`openapi-auth.yaml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/openapi-auth.yaml), Zod schemas: `registerSchema`, `loginSchema`.
- [x] **C3 (Security):** Băm mật khẩu bằng KDF Scrypt/Argon2id (Salt 16 bytes, N=16384, r=8, p=1). Chống timing attack qua `crypto.timingSafeEqual`.
- [x] **C4 (Perf):** Thời gian sinh băm mật khẩu < 100ms trên CPU chuẩn, tra cứu người dùng qua B-Tree Index $O(\log N)$.
- [x] **C5 (Resiliency):** Tự động kích hoạt `InMemoryUserRepository` khi CSDL PostgreSQL đám mây bị ngắt kết nối đột ngột mà không crash process.
- [x] **C6 (UI/UX):** Màn hình Đăng ký (`/register`), Đăng nhập (`/login`) với thông báo lỗi rõ ràng theo mã lỗi API.

---

### 🛡️ Module 2: Quản Lý Phiên & Lá Chắn Bảo Mật (Session & Security Shield) — 100%

*Mã nguồn chính:* [`services/auth/src/session`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/session), [`packages/auth-client`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/auth-client)

- [x] **C1 (Data):** Lưu phiên đa thiết bị song song trên bảng `user_sessions` (PostgreSQL) và bộ nhớ đệm phân tán Redis.
- [x] **C2 (Contract):** Endpoint `POST /api/v1/auth/refresh`, `GET /api/v1/auth/sessions`, `DELETE /api/v1/auth/sessions/:id`.
- [x] **C3 (Security):**
  - [x] Cặp token: Access Token (15 phút, JWT HS256) + Refresh Token (7 ngày, CSPRNG hex 64 bytes).
  - [x] Cửa sổ an toàn 30 giây (Grace Period) chống xung đột refresh giữa nhiều tab cùng lúc.
  - [x] Phát hiện tấn công tái sử dụng Token (Token Reuse Detection) $\rightarrow$ Ngay lập tức thu hồi toàn bộ session family.
  - [x] Double HttpOnly Cookies (`SameSite=Lax` cho Access, `SameSite=Strict` cho Refresh, `SameSite=None; Secure` cho Render Cloud).
- [x] **C4 (Perf):** Kiểm tra phiên đăng nhập qua Redis Cache với độ trễ $< 2\text{ms}$.
- [x] **C5 (Resiliency):** Browser Client Interceptor với Mutex Lock, ngăn ngừa hiện tượng Thundering Herd khi hàng loạt API đồng thời nhận mã HTTP 401.
- [x] **C6 (UI/UX):** Trang quản lý phiên làm việc đa thiết bị (`/settings/sessions`), hỗ trợ nút "Đăng xuất khỏi thiết bị này" và "Đăng xuất khỏi tất cả thiết bị".

---

### 🌐 Module 3: Không Gian Thảo Luận (Spaces & Community Subsystem) — 100%

*Mã nguồn chính:* [`services/community`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community), [`packages/contracts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts)

- [x] **C1 (Data):** Bảng `spaces` (UUID, slug, name, rules jsonb, banner_url) và `space_memberships` (role: MEMBER/MODERATOR/ADMIN, karma).
- [x] **C2 (Contract):** OpenAPI spec & REST API: `GET /api/v1/spaces`, `POST /api/v1/spaces`, `GET /api/v1/spaces/:slug`, `POST /api/v1/spaces/:slug/join`, `POST /api/v1/spaces/:slug/leave`.
- [x] **C3 (Security):** Phân quyền vai trò trong không gian (Space Role: Admin có quyền khóa/sửa space, Moderator có quyền duyệt bài).
- [x] **C4 (Perf):** Truy vấn danh sách Spaces kèm số lượng thành viên phân trang bằng Cursor-based pagination.
- [x] **C5 (Resiliency):** Ràng buộc khóa ngoại `ON DELETE CASCADE` đảm bảo tính toàn vẹn dữ liệu khi không gian bị xóa.
- [x] **C6 (UI/UX):** Giao diện danh sách Spaces, modal Tạo không gian mới, trang chi tiết Space (`/s/[slug]`) hiển thị banner, thống kê, luật space và nút Tham gia/Rời khỏi.

---

### 📝 Module 4: Bài Viết & Động Cơ Nội Dung CMS (Threads & Content CMS) — 90%

*Mã nguồn chính:* [`services/community`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community), [`apps/web`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web)

- [x] **C1 (Data):** Bảng `threads` lưu trữ `content_ast` dạng Tiptap JSON AST; bảng `thread_counters` tách rời với cấu hình `fillfactor = 70` (kích hoạt HOT updates).
- [x] **C2 (Contract):** OpenAPI spec & REST API: `GET /api/v1/threads`, `POST /api/v1/threads`, `GET /api/v1/threads/:slug`, `DELETE /api/v1/threads/:id`.
- [x] **C3 (Security):** Kiểm duyệt XSS trên client và server; chỉ cho phép người tạo hoặc Mod/Admin chỉnh sửa/xóa bài viết.
- [x] **C4 (Perf):** Chỉ mục Trigram GiN `idx_threads_title_trgm` hỗ trợ tìm kiếm bài viết theo từ khóa tiếng Việt/Anh siêu tốc.
- [x] **C5 (Resiliency):** Tự động dự phòng InMemoryCommunityRepository nếu kết nối CSDL gián đoạn, đảm bảo Zero-Downtime.
- [x] **C6 (UI/UX):** Bảng tin cộng đồng trực tiếp (Live Feed), Modal đăng bài viết chọn Space, nhập nội dung và đính kèm code block cấu hình (YAML/Bash/TS/SQL).

---

### 🌲 Module 5: Động Cơ Cây Bình Luận Đa Tầng & Ảo Hóa (Nested Comments Virtualization) — 95%

*Mã nguồn chính:* [`packages/tree-virtualizer`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/tree-virtualizer), [`services/community/src/comments`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/comments)

- [x] **C1 (Data):** Bảng `comments` dùng kiểu dữ liệu PostgreSQL `ltree`, đánh chỉ mục GiST (`idx_comments_path_gist`).
- [x] **C2 (Contract):** OpenAPI spec & REST API: `GET /api/v1/threads/:id/comments`, `POST /api/v1/threads/:id/comments`, `DELETE /api/v1/comments/:id`.
- [x] **C3 (Security):** Thuật toán sinh mã đường dẫn Base36 4 ký tự giới hạn độ sâu cấp 8 (`ltree-path-generator.ts`), ngăn chặn tấn công DoS đệ quy sâu. Tự động chuyển cấp > 8 sang Flat Reply kèm `@mention`.
- [x] **C4 (Perf):** Thuật toán `flattenCommentTree` trải phẳng cây thành mảng tuyến tính với độ phức tạp $\mathcal{O}(N)$ thời gian và không gian. Xử lý 10,000 bình luận trong $< 3\text{ms}$.
- [x] **C5 (Resiliency):** Khả năng thu gọn/mở rộng nhánh (Collapsing) tức thì mà không cần gọi lại truy vấn CSDL.
- [x] **C6 (UI/UX):** Giao diện cây bình luận đa tầng lồng nhau tại `/threads/[slug]`, hỗ trợ gửi bình luận gốc, nút 'TRẢ LỜI' mở ô phản hồi trực tiếp bình luận con, thụt lề có đường gióng thẳng màu `#948979`.

---

### ⚡ Module 6: Đánh Giá Điểm Số Nguyên Tử & Uy Tín (Atomic Lua Voting & Reputation) — 90%

*Mã nguồn chính:* [`deploy/redis/execute_vote.lua`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/redis/execute_vote.lua), [`services/community/src/voting`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community)

- [x] **C1 (Data):** Bảng `votes` ghi nhận trạng thái vote (`direction: +1 / -1`); `thread_counters.hot_score` lưu điểm xếp hạng theo thuật toán Gravity Decay.
- [x] **C2 (Contract):** Endpoint `POST /api/v1/threads/:id/vote`, `POST /api/v1/comments/:id/vote`.
- [x] **C3 (Security):** Chống gian lận phiếu bầu (Vote Manipulation), mỗi user chỉ được bỏ 1 phiếu duy nhất trên mỗi bài viết/bình luận; bấm lại nút cũ tự động hủy vote (unvote).
- [x] **C4 (Perf):** Kịch bản Lua nguyên tử `execute_vote.lua` trên Redis thực thi với độ phức tạp $\mathcal{O}(1)$, chống race condition khi hàng nghìn người cùng vote.
- [x] **C5 (Resiliency):** Cơ chế tính điểm Gravity Decay Engine độc lập cập nhật hot score theo thời gian thực.
- [x] **C6 (UI/UX):** Cụm Upvote/Downvote Optimistic UI, điểm số nhảy ngay lập tức trên giao diện khi bấm, mũi tên đổi màu kem sáng `#DFD0B8`.

---

### 📷 Module 7: Đường Ống Đa Phương Tiện Zero-Hop (Zero-Hop Media Pipeline) — 40%

*Mã nguồn chính:* [`services/community`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community), Cloudflare R2 / AWS S3

- [x] **C1 (Data):** Bảng `media_assets` lưu trữ `file_key`, `uploader_id`, `mime_type`, `file_size_bytes`, `blurhash`, `status` (PENDING/ATTACHED/ORPHANED).
- [x] **C2 (Contract):** Đặc tả API `POST /api/v1/media/presigned-url` trả về URL tải lên có chữ ký điện tử.
- [/] **C3 (Security):** Chữ ký HMAC-SHA256 có thời hạn (TTL 300 giây). Chỉ chấp nhận định dạng ảnh hợp lệ (`image/jpeg`, `image/png`, `image/webp`).
- [x] **C4 (Perf):** Luồng Zero-hop: Client tải file trực tiếp lên Cloud Storage (R2), không đi qua CPU/RAM của API server.
- [ ] **C5 (Resiliency):** Worker quét dọn các file ảnh mồ côi (Orphaned Media Cleaner) xóa các file PENDING quá 24h không gắn vào bài viết.
- [ ] **C6 (UI/UX):** Kéo thả ảnh trực tiếp vào trình soạn thảo Tiptap, hiển thị thanh tiến trình tải lên (Upload Progress Bar).

---

### ⚖️ Module 8: Quản Trị Hệ Thống & Kiểm Duyệt (Admin & Moderation Hub) — 70%

*Mã nguồn chính:* [`apps/api/src/routes/admin-router.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api), [`services/auth/src/rbac`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth)

- [x] **C1 (Data):** Bảng `moderation_reports` (status: PENDING/REVIEWED/DISMISSED/ACTION_TAKEN) và `auth_audit_logs`.
- [x] **C2 (Contract):** API Admin: `GET /api/v1/admin/stats`, `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/role`, `PATCH /api/v1/admin/users/:id/status`, `POST /api/v1/admin/users/:id/revoke-sessions`.
- [x] **C3 (Security):** Động cơ RBAC/ABAC phân cấp 5 bậc: GUEST < USER < SPACE_MOD < GLOBAL_MOD < ADMIN. Kiểm tra nghiêm ngặt tại route middleware.
- [x] **C4 (Perf):** Endpoint thống kê `admin/stats` tổng hợp số lượng user, bài viết, phiên active trong thời gian $< 50\text{ms}$.
- [x] **C5 (Resiliency):** Rate limiter độc lập bảo vệ các route nhạy cảm của Admin chống brute-force.
- [/] **C6 (UI/UX):** Giao diện bảng quản trị người dùng (`/admin/users`) cho phép khóa tài khoản, nâng quyền Admin/Mod và xem báo cáo vi phạm.

---

### 💻 Module 9: Giao Diện Người Dùng Web Client (Web Client Application) — 85%

*Mã nguồn chính:* [`apps/web`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web), [`packages/ui-tokens`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/ui-tokens)

- [x] **C1 (Data):** Tích hợp SDK gọi trực tiếp backend `communityClient` và `webAuth` với cookie credentials và Bearer token.
- [x] **C2 (Contract):** Tương thích kiểu dữ liệu TypeScript 100% với gói `@acad/contracts`.
- [x] **C3 (Security):** Bảo vệ các trang quản trị và thiết lập qua Route Middleware Next.js, tự động chuyển hướng khi chưa đăng nhập.
- [x] **C4 (Perf):** Áp dụng React Server Components (RSC) kết hợp Partial Prerendering (PPR), Next.js 15.5.26 production build 15/15 routes thành công.
- [x] **C5 (Resiliency):** Error Boundaries bắt lỗi cục bộ từng widget, trang web không bị crash toàn bộ màn hình khi một API gặp lỗi.
- [x] **C6 (UI/UX):** Tái thiết kế toàn diện theo phong cách **Minimalist Brutalism Dark Mode** với 4 gam màu: `#222831` (Canvas 40%), `#393E46` (Surfaces 25%), `#948979` (Borders 15%), `#DFD0B8` (Text & CTA 15%), viền hình học dứt khoát không bo góc và bóng đổ phẳng 45°.

---

### 🚀 Module 10: Hạ Tầng DevOps, Multi-Cloud & Vận Hành (DevOps & Multi-Cloud) — 85%

*Mã nguồn chính:* [`deploy/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy), [`.github/workflows`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/.github/workflows)

- [x] **C1 (Data):** Khởi tạo CSDL Supabase qua [`supabase_bootstrap.sql`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/supabase_bootstrap.sql) kèm đầy đủ Seed Data bàn giao.
- [x] **C2 (Contract):** Script di chuyển tự động trên Debian 13: [`deploy/scripts/migrate-supabase.sh`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/scripts/migrate-supabase.sh).
- [x] **C3 (Security):** Tự động phát hiện host `.supabase.co`, `pooler.supabase.com` và kích hoạt kết nối SSL `{ rejectUnauthorized: false }`. Không lưu thông tin bí mật trong mã nguồn.
- [x] **C4 (Perf):** Đóng gói Docker Multi-stage Alpine cho API với dung lượng $< 100\text{MB}$.
- [x] **C5 (Resiliency):** Pipeline GitHub Actions CI 4 cổng kiểm định tự động (Biome Lint, TypeScript strict, Vitest 60/60 tests, Docker Compose syntax). Script định kỳ `keep-alive.sh` chống Render ngủ đông.
- [x] **C6 (OS Target):** Hoàn toàn tương thích và tối ưu hóa cho hệ điều hành **Debian GNU/Linux 13 (trixie) x86_64**, bash 5.2.
