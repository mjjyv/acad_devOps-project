# Bảng Đối Chiếu Tiến Độ & Checklist 7 Giai Đoạn (Progress Checklist)

**Dự án:** Acad DevOps Project (Enterprise Community & Social Platform)  
**Phiên bản hiện tại:** 1.0.0 (Giai đoạn 4: Hoàn tất Subsystem Auth & Core Engines)  
**Ngày cập nhật:** 30/10/2026  
**Tổng số mục kiểm tra:** 120+ tiêu chí chi tiết  

> 💡 **Xem Ma trận Đa chiều:** Bên cạnh góc nhìn tuần tự 7 giai đoạn dưới đây, bạn có thể xem **[Bảng Kiểm Ma Trận Đa Chiều 10 Phân Hệ × 6 Chiều Kỹ Thuật](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/roadmap/modules-matrix-checklist.md)** và **[Kế Hoạch Triển Khai Đa Chiều Theo 4 Waves](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/roadmap/multi-dimensional-plan.md)**.

---

## TỔNG QUAN TIẾN ĐỘ THỰC HIỆN

| Giai Đoạn | Tên Giai Đoạn | Tỷ Lệ Hoàn Thành | Trạng Thái Nghiệm Thu |
| :---: | :--- | :---: | :---: |
| **Phase 1** | Khảo sát & Định vị sản phẩm (Discovery & PRD) | **100%** | ✅ Hoàn tất nghiệm thu |
| **Phase 2** | Thiết kế UI/UX & Kiến trúc hệ thống (Design & Arch) | **100%** | ✅ Hoàn tất nghiệm thu |
| **Phase 3** | Thiết lập nền tảng & DevOps Setup (CI/CD, Docker) | **100%** | ✅ Hoàn tất nghiệm thu |
| **Phase 4** | Phát triển tính năng cốt lõi (Core Dev & Integration) | **65%** | 🔄 Đang hoàn thiện các module cuối |
| **Phase 5** | Kiểm thử chất lượng & Tối ưu hiệu năng (QA & Perf) | **55%** | 🔄 Chạy liên tục qua CI Gates |
| **Phase 6** | Triển khai & Phát hành (Production Deployment) | **45%** | 🔄 Đã triển khai bản thử nghiệm Live |
| **Phase 7** | Vận hành, Giám sát & Mở rộng (Operations & Maintenance)| **25%** | ⏳ Chuẩn bị hạ tầng giám sát |
| **TỔNG THỂ**| **Tiến độ Toàn Dự Án** | **~70%** | 🚀 Sẵn sàng hoàn thiện MVP |

---

## CHI TIẾT CHECKLIST THEO TỪNG GIAI ĐOẠN

### GIAI ĐOẠN 1: KHẢO SÁT & ĐỊNH VỊ SẢN PHẨM (DISCOVERY & PRD) - 100%
- [x] **Xác định mục tiêu chiến lược & OKRs**
  - [x] Định vị sản phẩm lai giữa Reddit (thảo luận sâu) và X/Bluesky (tương tác thời gian thực).
  - [x] Xác định chỉ số North Star Metric: $WMD$ (Weekly Meaningful Discussions $\ge 5$ bình luận).
  - [x] Đặt mục tiêu giữ chân: $W_4\text{ Retention} \ge 25\%$, Tỷ lệ đóng góp $\ge 8\%$.
  - [x] Đặt tiêu chuẩn hiệu năng: FCP < 0.8s, LCP < 1.2s, INP < 100ms, CLS = 0.
- [x] **Xây dựng Chân dung người dùng (User Personas)**
  - [x] The Lurker (~80%): Đọc thầm lặng, đến từ Google Search, cần tốc độ tải cực nhanh.
  - [x] The Contributor (~15%): Soạn thảo bài chuyên sâu, thảo luận, tích lũy điểm Karma.
  - [x] The Curator / Moderator (~5%): Quản lý không gian con (Spaces), dọn rác, duyệt Mod Queue.
- [x] **Đặc tả 4 Luồng tương tác người dùng cốt lõi (Core User Flows)**
  - [x] Flow 1: Tiếp cận từ Google, Đọc & Chuyển đổi đăng ký (Guest to Onboarded User).
  - [x] Flow 2: Sáng tạo nội dung & Xuất bản qua Zero-Hop Upload (Creation Pipeline).
  - [x] Flow 3: Thảo luận sâu & Tương tác thời gian thực (Nested Discussion & Realtime Loop).
  - [x] Flow 4: Báo cáo vi phạm & Không gian kiểm duyệt (Report & Mod Queue).
- [x] **Hoàn thiện Ma trận Phân quyền Kép (RBAC + ABAC Matrix)**
  - [x] 5 Vai trò tĩnh (RBAC): Guest, Member (User), Space Moderator, Global Moderator, Super Admin.
  - [x] Điều kiện thuộc tính động (ABAC): Tuổi tài khoản < 7 ngày, Karma $\ge 500$ mở khóa Downvote, Khóa chỉnh sửa bài viết sau 24h.

---

### GIAI ĐOẠN 2: THIẾT KẾ UI/UX & KIẾN TRÚC HỆ THỐNG - 100%
- [x] **Quy chuẩn Design System & Máy trạng thái giao diện**
  - [x] Xây dựng gói Design Tokens riêng biệt ([`packages/ui-tokens`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/ui-tokens)): Breakpoints, Grid 4px, Typography, Bảng màu Dark/Light.
  - [x] Áp dụng chuẩn thiết kế Editorial Utilitarian Minimalism ([`reference-docs/SKILL_UI.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/reference-docs/SKILL_UI.md)).
  - [x] Thiết lập Statechart cho Thao tác Bầu chọn (VoteAction): Optimistic Update, Rollback khi lỗi, Khóa chống spam.
  - [x] Thiết lập Statechart cho Thu gọn nhánh bình luận (CommentNode Collapse).
- [x] **Kiến trúc Ranh giới Server - Client (RSC Boundaries)**
  - [x] Cây phân cấp định tuyến Next.js App Router: Trang chủ, `/docs`, `/settings/sessions`, `/admin/users`.
  - [x] Tách biệt Server Component (0KB JS) cho phần tĩnh và Client Component cho các nút tương tác.
- [x] **Thiết kế Lược đồ CSDL PostgreSQL 16 & Bộ nhớ đệm Redis**
  - [x] Kích hoạt 4 extensions bắt buộc: `uuid-ossp`, `pgcrypto`, `ltree`, `pg_trgm`.
  - [x] Bảng `thread_counters` tách rời với cấu hình `fillfactor = 70` kích hoạt Heap-Only Tuples (HOT).
  - [x] Bảng `comments` sử dụng kiểu dữ liệu `ltree` và chỉ mục GiST.
  - [x] Phân chia Keyspace Redis: Session Hash, Token Lookup, Sliding-window Rate Limit, Atomic Lua Set.
- [x] **Khế ước Giao tiếp Dữ liệu (API Contracts)**
  - [x] Bản đặc tả OpenAPI 3.1 hoàn chỉnh: [`packages/contracts/openapi.yaml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/openapi.yaml) và [`openapi-auth.yaml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/openapi-auth.yaml).
  - [x] Đồng bộ các Zod Schemas và TypeScript types trong gói [`@acad/contracts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts).

---

### GIAI ĐOẠN 3: THIẾT LẬP NỀN TẢNG & DEVOPS SETUP - 100%
- [x] **Khởi tạo kiến trúc Monorepo & Quy chuẩn Code**
  - [x] Cấu hình `pnpm workspace` (`pnpm-workspace.yaml`), quản lý `apps/*`, `services/*`, `packages/*`.
  - [x] Cấu hình Biome linter & formatter (`biome.json`), thay thế ESLint/Prettier với tốc độ siêu nhanh.
  - [x] Quy chuẩn Git Trunk-based và Semantic Commits (`feat:`, `fix:`, `chore:`, `refactor:`).
- [x] **Điều phối môi trường cục bộ qua Docker Compose**
  - [x] Tệp [`deploy/docker/docker-compose.dev.yml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/docker-compose.dev.yml) gồm 4 container: `infra-db` (Postgres 16), `infra-cache` (Redis 7), `core-api`, `web-client`.
  - [x] Tự động nạp script khởi tạo [`deploy/docker/init-db.sql`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/init-db.sql) khi container chạy lần đầu.
- [x] **Tối ưu hóa Dockerfile Multi-stage đóng gói sản xuất**
  - [x] Backend Dockerfile ([`deploy/docker/Dockerfile.api.prod`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/Dockerfile.api.prod)): Multi-stage Node 24 Alpine, kích thước < 100MB.
  - [x] Frontend Dockerfile ([`deploy/docker/Dockerfile.web.prod`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/Dockerfile.web.prod)): Tận dụng tính năng Next.js standalone.
- [x] **Xây dựng Pipeline CI/CD tự động (GitHub Actions)**
  - [x] Tệp [`.github/workflows/ci.yml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/.github/workflows/ci.yml) thiết lập 4 cổng kiểm định tự động:
    - [x] Cổng 1: Linting check qua Biome.
    - [x] Cổng 2: Typecheck qua `tsc --noEmit` và OpenAPI validation.
    - [x] Cổng 3: Chạy toàn bộ bộ test suites tự động qua Vitest.
    - [x] Cổng 4: Xác thực cú pháp Docker Compose.
- [x] **Hạ tầng triển khai Đám mây (Render Cloud Blueprint)**
  - [x] Tệp [`deploy/render/render.yaml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/render/render.yaml) khai báo IaC gồm Frontend Next.js và Backend Docker API.

---

### GIAI ĐOẠN 4: PHÁT TRIỂN TÍNH NĂNG CỐT LÕI - 65%
- [x] **4.1. Phân hệ Định danh, Quản lý Phiên & Token (Auth Subsystem) - 100%**
  - [x] Mã hóa mật khẩu an toàn cao bằng Argon2id/Scrypt/bcrypt ([`password.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/crypto/password.ts)).
  - [x] Giao thức Xoay vòng Token (Token Rotation): Access Token (15m JWT) + Refresh Token (7d CSPRNG).
  - [x] Cửa sổ an toàn Grace Period 30 giây chống xung đột mạng khi nhiều tab cùng refresh token.
  - [x] Cơ chế phát hiện tấn công tái sử dụng Token (Token Reuse Detection) $\rightarrow$ Tự động hủy toàn bộ session family.
  - [x] Cơ chế Double Cookie HttpOnly (`SameSite=Lax` cho Access, `SameSite=Strict` cho Refresh, `SameSite=None` cho Render).
  - [x] Client Interceptor với Mutex Lock ([`packages/auth-client`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/auth-client)), chống thundering herd khi gặp HTTP 401.
  - [x] Quản lý phiên đa thiết bị qua Redis ([`redis-session-store.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/session/redis-session-store.ts)).
  - [x] Tự động nhận diện SSL/TLS cho Cloud PostgreSQL (Neon, Render, Supabase) và cơ chế Fallback InMemory ([`postgres-user-repository.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/repository/postgres-user-repository.ts)).
  - [x] Trang Giao diện Đăng ký, Đăng nhập, Quản lý thiết bị (`/settings/sessions`), Bảng quản trị người dùng (`/admin/users`).
- [ ] **4.2. Phân hệ Biên tập & Xử lý Đa phương tiện Zero-Hop (CMS Pipeline) - 30%**
  - [x] Đặc tả luồng tải file trực tiếp qua Presigned URL.
  - [ ] Tích hợp trình soạn thảo Tiptap trên giao diện web.
  - [ ] API cấp phát Presigned URL kết nối Cloudflare R2 / AWS S3.
  - [ ] Worker quét dọn các file ảnh mồ côi (Orphaned Media Cleanup).
- [x] **4.3. Phân hệ Cây bình luận đa tầng & Ảo hóa (Nested Comments) - 80%**
  - [x] Thuật toán sinh mã đường dẫn `ltree` Base36 4 ký tự ([`ltree-path-generator.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/comments/ltree-path-generator.ts)).
  - [x] Cơ chế giới hạn độ sâu tối đa cấp 8 và tự động chuyển sang Flat Reply kèm @mention.
  - [x] Thuật toán trải phẳng mảng tuyến tính $\mathcal{O}(N)$ cho Client-side ([`packages/tree-virtualizer`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/tree-virtualizer)).
  - [x] Hỗ trợ logic thu gọn/mở rộng nhánh (Collapsing) tức thì.
  - [ ] Ghép nối Virtualizer vào component UI chi tiết bài viết trên `apps/web`.
- [x] **4.4. Động cơ Bầu chọn & Ghi chậm (Voting & Reputation) - 85%**
  - [x] Kịch bản Lua script nguyên tử $\mathcal{O}(1)$ trên Redis ([`execute_vote.lua`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/redis/execute_vote.lua)): xử lý vote mới, hủy vote, đảo chiều.
  - [x] Thuật toán xếp hạng Hot Trending theo thời gian thực (Gravity Decay Engine).
  - [x] Gắn cờ Dirty Set để chuẩn bị cho batch flush.
  - [ ] Worker chạy định kỳ 5 giây xả dữ liệu dồn (Bulk update) vào PostgreSQL `thread_counters`.
- [ ] **4.5. Động cơ Bảng tin & Hợp nhất Truy vấn (Feed Aggregator) - 30%**
  - [x] Thiết kế lược đồ phân trang con trỏ (Cursor-based pagination) Base64.
  - [ ] Thuật toán K-Way Merge kết hợp Timeline cá nhân và bài viết từ KOLs.
- [ ] **4.6. Hạ tầng Sự kiện Thời gian thực & Gom cụm Thông báo - 30%**
  - [x] Thiết kế hợp đồng truyền dẫn Server-Sent Events (SSE).
  - [ ] Endpoint `/api/v1/realtime/events` duy trì kết nối SSE và heartbeat ping 15s.
  - [ ] Thuật toán gom cụm thông báo cửa sổ trượt 5 phút (Sliding Window Aggregator).

---

### GIAI ĐOẠN 5: KIỂM THỬ CHẤT LƯỢNG & TỐI ƯU HIỆU NĂNG - 55%
- [x] **Kiểm thử tự động (Unit & Integration Tests)**
  - [x] Đạt 59 / 59 test suites thành công 100% qua Vitest trên cả 4 modules.
  - [x] Kiểm thử toàn diện các luồng Auth: Crypto, Token Rotation, Grace Period, Reuse Attack, RBAC/ABAC, Rate Limiter.
  - [x] Kiểm thử toàn diện ltree Base36, Lua voting, Gravity decay, Tree virtualizer.
- [x] **Bảo mật giao diện & API**
  - [x] Phân tầng bảo vệ Cookie HttpOnly, CSRF mitigation.
  - [x] Rate limiting sliding window trên Redis chống brute-force đăng nhập.
  - [x] Tự động nâng cấp kết nối SSL/TLS cho Cloud Database.
- [ ] **Kiểm thử tải & Tối ưu hiệu năng sâu**
  - [ ] Stress testing qua k6 (đo lường ngưỡng 5,000 RPS).
  - [ ] Tối ưu hóa truy vấn SQL EXPLAIN ANALYZE và kiểm soát MVCC bloat.
  - [ ] Đo lường thực tế các chỉ số Core Web Vitals (LCP, INP, CLS) trên môi trường di động.

---

### GIAI ĐOẠN 6: TRIỂN KHAI & PHÁT HÀNH (DEPLOYMENT & LAUNCH) - 45%
- [x] **Hạ tầng Production Đám mây (Render Cloud)**
  - [x] Triển khai thành công Web Client (`https://acad-web-client.onrender.com`).
  - [x] Triển khai thành công Core API (`https://acad-core-api.onrender.com`).
  - [x] Endpoint Healthcheck `/healthz` phản hồi thời gian thực.
  - [x] Khắc phục triệt để lỗi DNS `ERR_NAME_NOT_RESOLVED` và lỗi `SSL/TLS required`.
- [x] **Chiến lược Chuyển Đổi Cơ Sở Dữ Liệu (Supabase Migration)**
  - [x] Phát hiện CSDL Render cũ hết hạn (expired/suspended).
  - [x] Lập kế hoạch chuyển hẳn sang Supabase Managed PostgreSQL ([`docs/plan/supabase-migration-plan.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/plan/supabase-migration-plan.md)).
- [ ] **Chuẩn bị Phát hành Công Khai (Public Launch)**
  - [ ] Thiết lập Custom Domain (Tên miền riêng kèm HTTPS Cloudflare).
  - [ ] Tự động sinh `sitemap.xml` và `robots.txt` cho bot tìm kiếm Google.

---

### GIAI ĐOẠN 7: VẬN HÀNH, GIÁM SÁT & MỞ RỘNG (OPERATIONS) - 25%
- [x] **Cơ chế Duy trì Hoạt động Tránh Ngủ Đông (Keep-Alive)**
  - [x] Script định kỳ ping healthcheck probe ([`deploy/scripts/keep-alive.sh`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/scripts/keep-alive.sh)).
- [ ] **Giám sát & Cảnh báo Sự cố**
  - [ ] Tích hợp Sentry theo dõi lỗi ngoại lệ (Exceptions & Errors Tracking).
  - [ ] Thu thập metrics hệ thống qua Prometheus / Grafana.
  - [ ] Xây dựng kịch bản sao lưu CSDL tự động (Automated Daily Backups) trên Supabase.
