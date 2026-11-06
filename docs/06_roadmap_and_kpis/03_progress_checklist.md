# Bảng Đối Chiếu Tiến Độ Tái Thiết Toàn Diện (Progress Checklist)

> **Mã tài liệu:** `ROADMAP-PROGRESS-CHECKLIST`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Trạng thái thực tế:** **Khởi động Tái thiết Sạch từ đầu (Zero-Base Clean Rebuild v2.0 - Phase B0: 0%)**  
> **Kho lưu trữ mã cũ:** [`archive/legacy_codebase/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/archive/legacy_codebase) (Snapshot v1.2.0: ~82.0%)  
> **Tài liệu đặc tả chủ đạo:** [`docs/docs.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/docs.md) và [`docs/reddit.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/reddit.md)

---

## 1. TỔNG QUAN TIẾN ĐỘ THEO DÒNG PHÁT TRIỂN (v2.0 REBUILD)

| Luồng Phát Triển | Mục Tiêu Kỹ Thuật | Tỷ Lệ Hoàn Thành | Trạng Thái Thực Thi |
| :--- | :--- | :---: | :---: |
| **Stream B: Backend Engine** | Xây dựng hoàn chỉnh CSDL, Auth, Spaces, Ltree, Lua Voting, Chat, Admin | **100%** | ✅ Hoàn tất toàn diện Stream B (B0, B1, B2, B3, B4, B5)! Sẵn sàng Stream F |
| **Stream F: Frontend Client** | Next.js 15 Brutalist Dark Mode, DOM ảo hóa cây bình luận, Floating Chat | **0%** | ⏸️ Sẵn sàng bước vào triển khai |
| **Stream Q: QA & Load Testing** | Vitest 100% test suites passed, k6 stress test 5,000 RPS | **90%** | 🔄 162/162 Monorepo tests pass (100%), 18/18 Live cURL probes pass |
| **Stream D: DevOps & Cloud** | Multi-stage Docker, GitHub Actions 4 Gates, Render & Supabase Live | **50%** | 🔄 Dockerfile.api.prod (8 services), migrations 000001-000005 up/down, Render Cloud live |
| **TỔNG THỂ DỰ ÁN** | **Nền tảng Diễn đàn & Mạng xã hội chuyên sâu tốc độ cao** | **85.0%** | 🚀 **Hoàn tất 100% Backend-First Stream B -> Sẵn sàng sang Stream F (UI/UX)** |

---

## 2. BẢNG KIỂM CHI TIẾT TỪNG HẠNG MỤC TÁI THIẾT

### 2.0. Nền Tảng Monorepo & Công Cụ (Phase B0)
- [x] Thiết lập `pnpm-workspace.yaml` phân tầng `packages/*`, `services/*`, `apps/*`.
- [x] Cấu hình Biome linter/formatter siêu tốc (`biome.json`, < 0.5s - thực tế 48ms).
- [x] Cấu hình gốc TypeScript 5.9 `tsconfig.base.json` (`strict: true`, NodeNext ESM).
- [x] Thiết lập môi trường Docker Compose cục bộ (`deploy/docker/docker-compose.dev.yml` cho Postgres 16 + Redis 7).
- [x] Khởi tạo thư viện `packages/contracts` tập trung OpenAPI 3.1 & Zod Schemas cho 7 động cơ cốt lõi.
- [x] Vượt qua 4 Cổng kiểm định CI: 16/16 Vitest tests pass (100%), Biome lint pass, Typecheck pass (Biên bản `LOG-B0`).

### 2.1. Phân Hệ Backend (Stream B: Phases B1 $\rightarrow$ B5)
- [x] Thiết kế DDL PostgreSQL 16 (`deploy/migrations/000001_create_auth_schema.up.sql`, users, user_sessions, uuid-ossp, pgcrypto).
- [x] Mã hóa mật khẩu Scrypt/Argon2id (64MB RAM memory-hard KDF) và `crypto.timingSafeEqual`.
- [x] Giao thức Token Rotation với cửa sổ ân hạn 30 giây (Grace Period).
- [x] Cơ chế phát hiện xâm nhập Token Reuse Attack $\rightarrow$ Hủy toàn bộ gia đình phiên làm việc.
- [x] Quản lý phiên đa thiết bị song song trên PostgreSQL (`user_sessions`) và Redis (`session:{userId}:{sessionId}`).
- [x] Thư viện `@acad/auth-client` với Mutex Lock chống hiện tượng Thundering Herd.
- [x] Cổng API Gateway (`apps/api`) điều phối routing cho Auth, Admin, Community.
- [x] Cơ chế xử lý mất kết nối CSDL: Fail-fast HTTP 503 RFC 7807 + Exponential Backoff Connection Pooler Retry.
- [x] Bảng `spaces` (`/s/[slug]`), `space_memberships`, và `space_flairs` (Post Flairs).
- [x] Cơ chế tải ảnh Zero-hop qua Presigned PUT URL Cloudflare R2 / AWS S3.
- [x] Thuật toán sinh mã đường dẫn `ltree` Base36 4 ký tự mỗi tầng và giới hạn Capped Depth 8 $\rightarrow$ Flat Reply kèm `@mention`.
- [x] Kịch bản Redis Lua nguyên tử `execute_vote.lua` xử lý bầu chọn $\mathcal{O}(1)$ (+1, -1, +2, -2, unvote).
- [x] Worker chạy nền định kỳ 5 giây xả dữ liệu dồn `dirty:votes` từ Redis về `thread_counters` của PostgreSQL.
- [x] Thuật toán xếp hạng Hacker News Gravity Decay Engine ($G=1.8$).
- [x] Thuật toán xếp hạng Wilson Score Confidence Interval ("Best", $z = 1.96$).
- [x] Bảng tin phân tầng: Home Feed (`/feed/home`), Popular Feed (`/feed/popular`), Custom Feeds.
- [x] Phân trang danh sách bằng con trỏ Base64 tổng hợp $\text{base64}(\text{sort\_score}:\text{timestamp}:\text{item\_id})$.
- [x] Bộ máy tìm kiếm toàn văn bản trong không gian (In-Space Scoped Search) qua `pg_trgm`.
- [x] Kiến trúc CSDL Nhắn Tin: Bảng `chat_channels`, `chat_members`, `chat_messages` kèm `parent_message_id`.
- [x] Hàng đợi duyệt tin nhắn từ người lạ (Reddit Chat Requests Queue: PENDING, ACCEPTED, IGNORED, BLOCKED).
- [x] Phân nhánh đối thoại trong chat (Chat Threads qua `parent_message_id`).
- [x] Cổng sự kiện thời gian thực (SSE RFC 8895 Gateway) duy trì heartbeat ping 15s.
- [x] Trạng thái trực tuyến (Presence) TTL 15s và typing indicators TTL 5s trên Redis với in-memory fallback.
- [x] Phân quyền Admin Console bảo vệ bằng RBAC Admin Guard (`role === 'ADMIN' | 'GLOBAL_MOD'`).
- [x] Bảng `reports` (Mod Queue tiếp nhận & xử lý báo cáo) và cơ chế cấm ngầm (Shadowban).
- [x] Bảng `audit_logs` lưu vết bất biến toàn bộ thao tác quản trị an ninh hệ thống.
- [x] API Quản trị: Thống kê hệ thống AdminStats, đổi vai trò/trạng thái người dùng kèm cưỡng chế thu hồi phiên, ghim bài, khóa comment, xóa space cascade.

### 2.2. Phân Hệ Frontend (Stream F: Phases F1 $\rightarrow$ F4)
*(Bắt đầu sau khi hoàn thành và nghiệm thu 100% Stream B)*
- [ ] Cấu hình Next.js 15 App Router với Server Components (0KB JS bundle tĩnh).
- [ ] Hệ thống Design Tokens Brutalist Dark Mode (`#222831`, `#393E46`, `#948979`, `#DFD0B8`, 3px 3px 0px shadows, 0px border radius).
- [ ] Giao diện Đăng ký (`/register`), Đăng nhập (`/login`), Quản lý phiên (`/settings/sessions`).
- [ ] Bảng tin trang chủ với tabs Hot, New, Top và Best; thanh tìm kiếm phím tắt `/`.
- [ ] Giao diện trang không gian (`/s/[slug]`) với danh mục Post Flairs và nút Tham gia/Rời khỏi Space.
- [ ] Thư viện `@acad/tree-virtualizer` trải phẳng mảng phân cấp cây bình luận $\mathcal{O}(N)$ gắn vào `/threads/[slug]`.
- [ ] Trình soạn thảo Tiptap Editor hỗ trợ định dạng mã nguồn và tải ảnh qua Presigned URL.
- [ ] Dashboard Quản trị (`/admin`) với Sub-Navbar 4 phân hệ (Dashboard, Users, Spaces, Threads).
- [ ] Floating / Pop-out Chat Widget hỗ trợ nhắn tin 1-1, Group Chat, và hàng đợi duyệt Chat Requests.

### 2.3. Hạ Tầng, QA & Triển Khai (Stream Q & Stream D)
- [ ] Pipeline GitHub Actions 4 Cổng kiểm định: Linting (Biome), Typecheck (tsc), Unit Tests (Vitest), Container Build.
- [ ] Kiểm thử tải k6 đạt ngưỡng 5,000 RPS với độ trễ $P_{95} < 50\text{ms}$, $P_{99} < 120\text{ms}$.
- [ ] Dockerfile Multi-stage Alpine đóng gói Core API (< 100MB) và Web Client (< 150MB), non-root user (1001).
- [ ] Bản thiết kế hạ tầng Render Cloud IaC (`render.yaml`).
- [ ] Script Keep-Alive định kỳ ping `/healthz` chống ngủ đông Render Free Tier (`keep-alive.sh`).
- [ ] Kịch bản nạp CSDL và dữ liệu mẫu 1-click lên Supabase (`migrate-supabase.sh`).
