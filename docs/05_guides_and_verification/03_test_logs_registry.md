# Tổng Hợp Biên Bản Nghiệm Thu, Thực Nghiệm & Quản Trị Rủi Ro (Phase 6 Verification Registry)

> **Mã tài liệu:** `GUIDE-TEST-LOGS`  
> **Dự án:** Acad DevOps Fullstack Monorepo (**SYNAPSE Engine**)  
> **Khung chuẩn:** Giai đoạn 6 trong [`SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/SYSTEM%20ANALYSIS%20%26%20DESIGN%20LIFECYCLE%20FRAMEWORK.md)  
> **Skill nghiệm thu bắt buộc:** [`.agents/skills/real-user-e2e-verification/SKILL.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/.agents/skills/real-user-e2e-verification/SKILL.md)

---

## 0. KẾ HOẠCH THỰC NGHIỆM, CHỈ SỐ ĐÁNH GIÁ & RỦI RO (FRAMEWORK GIAI ĐOẠN 6)

### 0.1. Kiến trúc Môi trường Kiểm thử (Testbed Topology)
- **Unit & Integration Testbed:** Vitest 3.2.7 chạy trực tiếp trên PostgreSQL 16 + Redis 7 thật (local Podman Rootless & GitHub Actions Service Containers).
- **Browser Real-User E2E Testbed (Mục tiêu Giai đoạn D):** Playwright Chromium Headless thực thi luồng người dùng trắng mới (`fresh_a`, `fresh_b`) trên `http://127.0.0.1:3000`.
- **Security & Smoke Probes:** `scripts/verify-security-curl.sh`, `scripts/manage-homelab.sh qa`.

### 0.2. Khung Chỉ Số Đánh Giá Định Lượng (Evaluation Metrics & Benchmarks)

| Mã chỉ số | Tên chỉ số | Công thức / Phương pháp đo | Ngưỡng mục tiêu | Trạng thái đo gần nhất |
| :--- | :--- | :--- | :--- | :--- |
| **MTR-01** | **Tỷ lệ nhất quán bộ đếm DB (`Zero Fake Data`)** | `thread_counters == COUNT(thread_votes)` & `<= COUNT(users)` | **100% khớp** | ✅ Đạt `0` sai lệch (`users=16`, `vote_mismatches=0`, `inflated=0`, `comment_mismatches=0`, `space_*_mismatches=0`, `8/8` threads `PG=REDIS`) |
| **MTR-02** | **Độ phủ kiểm thử kỹ thuật (`Vitest + Real DB`)** | Unit + Postgres/Redis Integration pass rate | **100% Pass** | ✅ `175` unit/endpoint tests (`18` files) + `4` Real Postgres 16/Redis 7 integration tests Pass |
| **MTR-03** | **Tỷ lệ vượt qua luồng Tài khoản trắng E2E** | Playwright 2-user fresh journey (`Home/Popular/Explore` + `Create Chat DM`) | **100% Pass** | ✅ Pass 100% trên Chromium Headless (`tests/e2e/real-user-e2e.spec.ts`) |
| **MTR-04** | **An ninh & Rò rỉ PII** | Security Headers + Auth Rate Limit 429 + Public Profile 0 PII bytes | **0 Bytes PII lộ** | ✅ `verify-security-curl.sh` Pass + `/auth/users/search` & `/users/:username` không trả `email`/`passwordHash` |

### 0.3. Mốc Kiểm Soát Chất Lượng (Quality Gates)
- **QG-1 (Design & SAD Docs - Giai đoạn A):** Hoàn thiện đủ 6 giai đoạn tài liệu + 37 sơ đồ Mermaid cho cả 7 phân hệ $\rightarrow$ **✅ Đã hoàn tất**.
- **QG-2 (Database Real Integrity - Giai đoạn B):** Migration `000007` + Seeds sạch 100% không số ảo, đối soát `reconcile_platform_counters()` lệch 0 $\rightarrow$ **✅ Đã hoàn tất**.
- **QG-3 (UX & API Sync - Giai đoạn C):** Tách `Home`/`Popular`/`/explore`, hoàn thiện **Create Chat (Search by username)** + Incoming/Sent Requests $\rightarrow$ **✅ Đã hoàn tất**.
- **QG-4 (Real-User E2E Gate - Giai đoạn D):** Playwright browser thật pass 100% kịch bản 2 tài khoản trắng mới (`fresh_a`, `fresh_b`) $\rightarrow$ **✅ Đã hoàn tất**.

### 0.4. Ma Trận Quản Trị Rủi Ro Kỹ Thuật (Technical Risk Management)

| Mã rủi ro | Nhận diện nguy cơ | Mức độ | Kịch bản tác động | Giảm thiểu (Mitigation) | Dự phòng (Contingency) |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **RSK-01** | Nghiệm thu ảo (`HTTP 200` SSR rỗng / test trên seed `admin_pro`) | Cao | Báo xong nhưng user mới mở UI không dùng được | Kích hoạt bắt buộc Skill `real-user-e2e-verification` & Playwright 2 tài khoản trắng | Khóa mọi PR/Commit UI nếu thiếu kịch bản E2E user mới |
| **RSK-02** | Lệch bộ đếm Redis (`target:{id}:*`) vs Postgres (`thread_counters`) & soft-delete `comments` | Cao | Số vote/comment ở feed lệch khi mở chi tiết | Cập nhật Trigger `AFTER UPDATE OF is_deleted` + hàm `reconcile_platform_counters()` | Chạy worker/reconcile đồng bộ lại từ bảng gốc `thread_votes`/`comments` |
| **RSK-03** | Ngắt kết nối SSE hoặc Token hết hạn 15m khi Chat lâu | Trung bình | Browser `EventSource` retry với JWT cũ bị `401` | Reconnect lấy JWT mới từ `localStorage` + `PresenceManager` In-Memory fallback | Hiển thị trạng thái SSE rõ & tự hồi phục kết nối |

---

## 1. MỤC LỤC CÁC BIÊN BẢN NGHIỆM THU LỊCH SỬ ĐÃ THỰC THI

Dự án áp dụng quy định bắt buộc tại [`AGENT.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/AGENT.md): *Mọi lần phát hành hoặc hoàn tất tính năng đều phải chạy kiểm thử tự động và lập biên bản lưu vết.*

| Mã Nhật Ký | Thời Điểm | Nội Dung Trọng Tâm | Kết Quả Nghiệm Thu |
| :--- | :---: | :--- | :---: |
| **`LOG-001`** | 2026-10-30 | Kiểm định Vitest 59/59 suites, Typecheck 8 packages, Kiểm tra live probe `/healthz` | **100% Passed** |
| **`LOG-002`** | 2026-10-30 | Kiểm định ma trận 10 phân hệ x 6 tiêu chuẩn kỹ thuật (Module-by-Module Verification) | **Đạt 70% toàn dự án** |
| **`LOG-003`** | 2026-10-30 | Chẩn đoán CSDL Render hết hạn, thiết lập kế hoạch chuyển sang Supabase và tái thiết kế UI | **Đã phê duyệt plan** |
| **`LOG-004`** | 2026-10-30 | Nghiệm thu Wave 2: Spaces, Threads, Ltree generator, Lua voting và Brutalist Dark UI | **Hoàn thành Wave 2** |
| **`LOG-005`** | 2026-10-30 | Khắc phục sự cố lệch đồng bộ `pnpm-lock.yaml` và nâng cấp Node 22 trên GitHub Actions CI | **CI 4 Cổng Đều Xanh** |
| **`LOG-006`** | 2026-10-30 | Nghiệm thu Admin Hub 4 tabs, Quản lý đa thiết bị Sessions, Cổng Docs Brutalist và Search Engine | **Nghiệm thu thành công** |
| **`LOG-B0`** | 2026-11-05 | **Nghiệm thu Phase B0 (Clean Rebuild Monorepo Scaffolding & @acad/contracts)**: Khởi tạo monorepo, Biome 2.6.5, TypeScript 5.9 strict NodeNext ESM, Docker Compose Postgres 16 & Redis 7, 16/16 Vitest tests pass (100%), Biome lint 48ms pass, Typecheck pass | **100% Passed (4 CI Gates Đều Xanh)** |
| **`LOG-B1`** | 2026-11-05 | **Nghiệm thu Phase B1 (Core Identity, Token Rotation & API Gateway)**: DDL PostgreSQL 16 & Redis Session Store, KDF Scrypt/Argon2id 64MB memory-hard, Dual Token Rotation (15m JWT + 7d CSPRNG), 30s Grace Period đa tab, Token Reuse Attack detection & auto-revocation, Client Mutex Lock (`@acad/auth-client`) chống Thundering Herd trên 20 luồng đồng thời, API Gateway Facade RFC 7807, 43/43 tests pass (100%), Biome lint 58ms pass, Typecheck pass | **100% Passed (43/43 Tests Xanh)** |
| **`LOG-B2`** | 2026-11-05 | **Nghiệm thu Phase B2 (Không Gian Thảo Luận, CMS & Cây Bình Luận Đa Tầng `ltree` Base36)**: DDL PostgreSQL 16 migration `000002_create_community_schema`, GIN Trigram indexes, ltree GiST index, Dịch vụ `@acad/community-service` (LtreePathManager Base36 4-char $36^4=1,679,616$ child nodes, Capped Depth 8 Flat Reply & `@mention` injector, SpaceService, ThreadService SEO slug, CommentService Soft Delete bảo toàn cây, ZeroHopStorageService S3 Presigned PUT URL), API Gateway routes (`/spaces`, `/threads`, `/comments`, `/media`), 72/72 tests pass (100%), 17/17 Live cURL probes pass, RFC 7807 problem details 0 errors 500 | **100% Passed (72/72 Tests Xanh, 17/17 cURL Xanh)** |
| **`LOG-B3`** | 2026-11-06 | **Nghiệm thu Phase B3 (Bầu Chọn Nguyên Tử, Danh Tiếng & Bảng Tin Thông Minh)**: DDL PostgreSQL 16 migration `000003_create_voting_and_feed_schema` (bảng `thread_counters` với `fillfactor = 70` tối ưu HOT updates, bảng `thread_votes`, `comment_votes`, `user_saved_threads`), Kịch bản Redis Lua nguyên tử `execute_vote.lua` $\mathcal{O}(1)$ xử lý vote, hủy vote, đảo chiều $\pm 2$ và quản lý tập hợp `dirty:votes`, Tiến trình định kỳ `VoteFlushWorker` xả dữ liệu dồn về CSDL và cập nhật điểm Karma, Động cơ xếp hạng Hacker News `GravityDecayEngine` ($G=1.8$) & `WilsonScoreEngine` ($z=1.96$), Phân tầng nguồn cấp tin `/feed/home` (theo subscriptions) & `/feed/popular` (toàn cầu), Phân trang con trỏ `CursorManager` Base64URL tổng hợp, 100/100 Vitest tests pass (100%), Biome lint pass (114ms), Typecheck pass, 16/16 Live cURL probes pass, RFC 7807 problem details 0 errors 500 | **100% Passed (100/100 Tests Xanh, 16/16 cURL Xanh)** |
| **`LOG-B4`** | 2026-11-06 | **Nghiệm thu Phase B4 (Phân Hệ Nhắn Tin Thời Gian Thực & Hàng Đợi Duyệt Chat Reddit)**: DDL PostgreSQL 16 migration `000004_create_chat_schema` (bảng `chat_channels`, `chat_members`, `chat_messages`, `chat_requests`), Dịch vụ `@acad/chat-service` (ChatService, InMemoryChatRepository, PostgresChatRepository, PresenceManager TTL 15s trực tuyến & TTL 5s typing, SseManager chuẩn RFC 8895 kèm nhịp tim `: ping\\n\\n` 15s và hỗ trợ multi-tab), Hàng đợi duyệt tin nhắn người lạ (Stranger Requests Queue PENDING -> ACCEPTED / IGNORED / BLOCKED), Chặn quấy rối cấm liên lạc vĩnh viễn (HTTP 403 Forbidden), Chat Threads đa tầng qua `parent_message_id`, Phân trang con trỏ Keyset Cursor Base64URL, API Gateway routes (`/chat/channels`, `/chat/channels/direct`, `/chat/channels/group`, `/chat/channels/:id/messages`, `/chat/requests`, `/chat/requests/:id`, `/chat/events`, `/chat/channels/:id/typing`, `/chat/presence/heartbeat`), 120/120 Vitest tests pass (100%), Biome lint 0 errors, Typecheck 0 errors, 16/16 Live cURL probes pass, RFC 7807 problem details 0 errors 500 | **100% Passed (120/120 Tests Xanh, 16/16 cURL Xanh)** |
| **`LOG-B5`** | 2026-11-06 | **Nghiệm thu Phase B5 (Phân Hệ Kiểm Duyệt, Hàng Đợi Báo Cáo & Quản Trị Hệ Thống - Reddit Moderation & Admin Hub)**: DDL PostgreSQL 16 migration `000005_create_moderation_and_admin_schema` (bảng `reports`, `audit_logs`, enums `mod_report_status`, `mod_report_target_type`), Dịch vụ `@acad/moderation-service` (ModerationService, InMemoryModerationRepository, PostgresModerationRepository, Hàng đợi Mod Queue PENDING -> RESOLVED / DISMISSED, Cơ chế Shadowban ẩn bài viết âm thầm, Cưỡng chế thu hồi phiên khi đổi quyền/khóa tài khoản qua `sessionStore.revokeAllUserSessions`, Ghi vết kiểm toán bất biến Audit Logs `AuditLogEntity`, Tổng hợp chỉ số hệ thống AdminStats, Ghi đè ghim/khóa/xóa bài viết và xóa không gian), API Gateway middleware `adminGuard` (phân quyền ADMIN / GLOBAL_MOD, 403 Forbidden), routes `/admin` & `/reports`, 162/162 Vitest tests pass (100%), Biome lint 0 errors, Typecheck 0 errors, 18/18 Live cURL probes pass | **100% Passed (162/162 Tests Xanh, 18/18 cURL Xanh, Hoàn Tất Stream B)** |
| **`LOG-E2E-001`** | 2026-11-12 | **Nghiệm thu Toàn Diện Giai Đoạn B+C+D (DB `000007` + Real UX + Playwright Chromium Two-Fresh-User E2E)**: Migration `000007`, xóa 100% số ảo, đồng bộ `8/8` bài viết Postgres ↔ Redis; Biome check (`153` files, `0` lỗi), `typecheck`, Next.js build (`11/11` pages), `175/175` unit/API tests (`18` files) + `4/4` Real Postgres 16/Redis 7 integration tests; Playwright Chromium Headless [`real-user-e2e.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/real-user-e2e.spec.ts) (`fresh_a` & `fresh_b`): đã phát hiện và sửa triệt để 4 lỗi thực tế (`authRateLimiter` áp nhầm `GET /auth/me`, `initSession` xóa token khi `429`, độ trễ 5s counter khi reload `/threads/:id`, và state `messages` cũ sót khi chuyển sang tab rỗng); kiểm toán SQL `0` sai lệch | **100% Passed (175 Unit + 4 Real DB + 1 Two-User Chromium E2E Pass)** |
| **`LOG-V3-B0B1`** | 2026-11-12 | **Nghiệm thu v3.0.0 Phase B0/B1 (Deploy-Anchored Clean Rebuild — Contracts, Auth Client, Auth Service & API Gateway)**: Khởi tạo lại 4 packages (`@acad/contracts`, `@acad/auth-client`, `@acad/auth-service`, `@acad/api-gateway`) trên TypeScript Project References (`tsc -b`), đồng bộ seed `$scrypt$` & `user_sessions`, non-blocking Redis `SCAN`, Split Rate Limiter (`10/60s` chỉ chặn `POST /login`, `POST /register`, `POST /refresh`; `GET /me` đi qua `globalRateLimiter`), Client SDK phân biệt `AuthRefreshRevokedError` (`401/403`) vs transient `429/503`; Biome check (`58` files, `0` lỗi), `typecheck` & `build` 4/4 projects, Vitest unit `16/16` (`6` files: `contracts` 5, `auth-client` 3, `auth-service` 3, `api-gateway` 5), Real PostgreSQL 16 + Redis 7 integration `2/2` (`auth.integration.test.ts`), và Live `acad-api.service` `:10000` (`admin_pro`, user trắng mới `201`, 15x `GET /me` 200, `pg_trgm` search không PII, `refresh` rotation, `429` RFC 7807) | **100% Passed (16 Unit + 2 Real DB + Live `:10000` E2E)** |
| **`LOG-V3-B2B5`** | 2026-11-12 | **Nghiệm thu v3.0.0 Phase B2–B5 (Toàn Bộ Tầng Nghiệp Vụ Backend: Community, Atomic Voting, Smart Feeds, Realtime Chat & Moderation/Admin)**: Khởi tạo `@acad/community-service`, `@acad/chat-service`, `@acad/moderation-service` và tích hợp toàn diện `@acad/api-gateway`; đồng bộ `SpaceMembershipRoleSchema` hỗ trợ `CREATOR`, `RedisLuaVoteEngine` nạp [`execute_vote.lua`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/redis/execute_vote.lua) kèm HOT write-through 0ms xuống `thread_counters`/`threads`, cây `ltree` Base36 Capped Depth 8 `@mention` & soft-delete active count, SSE RFC 8895 `: ping` 15s & Stranger Queue, Mod Queue 409 & Append-Only `audit_logs` + thu hồi đồng thời Redis & Postgres `user_sessions`; Biome check (`111` files, `0` lỗi), `typecheck` & `build` 7/7 workspace projects, Vitest unit `34/34` tests (`contracts` 5, `auth-client` 3, `auth-service` 3, `community-service` 10, `chat-service` 4, `moderation-service` 1, `api-gateway` 8), Real PostgreSQL 16 + Redis 7 integration `4/4` (`auth`, `community`, `chat-mod`), và Live Two-Fresh-User E2E trên `acad-api.service` `:10000` | **100% Passed (34 Unit + 4 Real DB + Live Two-User `:10000` E2E)** |
| **`LOG-V3-MEDIA-CICD`** | 2026-11-12 | **Hoàn Thiện CI/CD/Deploy & Tính Năng Upload Hình Ảnh Thật (Migration `000008_media_support`)**: Sửa [`Dockerfile.api.prod`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/Dockerfile.api.prod) + [`.dockerignore`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/.dockerignore) (`**/*.tsbuildinfo` & `deploy/redis/`), bổ sung [`.github/workflows/cd.yml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/.github/workflows/cd.yml) & `./scripts/manage-homelab.sh deploy`; triển khai [`ZeroHopStorageService`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/storage/storage-service.ts) hỗ trợ cả AWS SigV4 (S3/R2) lẫn Local Homelab Disk Storage kèm kiểm tra magic bytes, `threads.media_urls` (`MEDIA` thread), và `chat_messages` thuần ảnh không cần văn bản; kiểm chứng `podman build`, `./scripts/manage-homelab.sh deploy`, `34/34` unit + `4/4` integration tests & Live binary PNG upload E2E trên `:10000` | **100% Passed (Docker + Homelab CD + Real Binary Media E2E)** |
| **`LOG-V3-F0F1`** | 2026-11-12 | **Nghiệm thu v3.0.0 Phase F0–F1 (`@acad/web` Next.js 15 Foundation & Identity Shell)**: Khởi tạo ứng dụng `@acad/web` với Design System Slate Indigo Matrix (Dark mặc định & `[data-theme="light"]` toggle), Next.js rewrites zero-CORS (`/auth/*`, `/api/*`, `/healthz` $\rightarrow$ `:10000`) + `resolveRenderableMediaUrl`, 3-column [`AppShell`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/layout/app-shell.tsx) + [`AuthProvider`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/auth/auth-context.tsx) + [`UIProvider`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/store/ui-context.tsx), các trang App Router [`page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/page.tsx) (Home empty-state CTA `/explore`, Popular feed thật, `PostCard` vote/save & cursor pagination), [`login/page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/login/page.tsx), [`register/page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/register/page.tsx), [`settings/sessions/page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/settings/sessions/page.tsx), [`u/[username]/page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/u/[username]/page.tsx) (không lộ PII email); sửa triệt để lỗi đọc `data.sessions` tại `/settings/sessions`; kiểm chứng `biome check` 0 errors, `typecheck` & `build` 8/8 workspaces (`7/7` Next.js static routes), `34/34` unit + `4/4` Postgres/Redis integration tests, `acad-web.service` (`:3000`) + `acad-api.service` (`:10000`) healthy, và Playwright Chromium Real-User E2E [`f0_f1_shell.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/f0_f1_shell.spec.ts) (`1/1` pass) | **100% Passed (`next build` + Live `:3000` + Playwright Real-User E2E)** |
| **`LOG-V3-F2`** | 2026-11-12 | **Nghiệm thu v3.0.0 Phase F2 (Explore, Spaces, Multi-Type Real Image Upload Composer & O(N) `ltree` Comments)**: Bổ sung `voteComment`, `deleteComment`, `createFlair`, `searchSpaceThreads` trong [`community.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/api/community.ts) + [`extractApiErrorMessage`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/api/client.ts); xây dựng [`explore/page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/explore/page.tsx) (Topic pills, Search, Join/Leave, `CreateSpaceModal`), [`s/[slug]/page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/s/%5Bslug%5D/page.tsx) (Flair filter/tạo Flair, Sort, Search nội bộ Space, Rules), [`submit/page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/submit/page.tsx) (`TEXT`/`LINK`/`MEDIA` upload ảnh nhị phân thật qua `/api/v1/media/presign` + `PUT /api/v1/media/upload` + preview `resolveRenderableMediaUrl`), [`threads/[id]/page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/threads/%5Bid%5D/page.tsx) kèm [`CommentTree`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/comments/comment-tree.tsx) / [`CommentNode`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/comments/comment-node.tsx) (`ltree` 1-indexed Capped Depth 8 Flat Reply `@mention`, Collapse/Expand nhánh, Vote comment, Soft-Delete giữ cây con), [`ReportModal`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/moderation/report-modal.tsx), và tab `Bài viết đã lưu` trên `/u/[username]`; kiểm chứng `biome check` (`146` files, `0` lỗi), `typecheck` & `build` 8/8 workspaces (`9/9` Next.js static routes), `34/34` unit + `4/4` integration tests, và Playwright Real-User E2E [`f0_f1_shell.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/f0_f1_shell.spec.ts) + [`f2_community_media.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/f2_community_media.spec.ts) (`2/2` pass, upload PNG thật `naturalWidth > 0`, cây bình luận 10 tầng + `reload()` giữ trạng thái) | **100% Passed (`next build` 9/9 + 2/2 Playwright Real-User E2E)** |
| **`LOG-V3-F3`** | 2026-11-13 | **Nghiệm thu v3.0.0 Phase F3 (Realtime Chat Engine, Stranger Requests Queue, Binary Media Upload & Floating Chat Widget)**: Mở rộng [`chat.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/api/chat.ts) (`createGroupChannel`, `cancelChatRequest`, `markChannelAsRead`, `notifyTyping`, `sendPresenceHeartbeat`, `getPresenceBatch`, `getSseUrl`), xây dựng [`ChatProvider`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/chat/chat-context.tsx) (SSE RFC 8895 `EventSource` ổn định qua `selectedChannelIdRef` không reconnect khi đổi kênh, presence heartbeat 12s theo `visibilityState`, typing TTL), [`NewChatModal`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/chat/new-chat-modal.tsx), [`ChatChannelList`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/chat/chat-channel-list.tsx) (tab Trò chuyện & Lời mời Stranger Requests Accept/Ignore/Block/Cancel), [`ChatMessageView`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/chat/chat-message-view.tsx) (gửi ảnh PNG nhị phân thật qua presigned PUT, reply thread), [`FloatingChatWidget`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/chat/floating-chat-widget.tsx) (`docked`/`minimized`/`closed`), trang [`/chat`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/chat/page.tsx), badge unread trên [`Header`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/layout/header.tsx)/[`BottomNav`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/layout/bottom-nav.tsx) và nút `Nhắn tin trực tiếp` trên [`/u/[username]`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/u/%5Busername%5D/page.tsx); kiểm chứng `biome check` (`153` files, `0` lỗi), `typecheck` & `build` (`10/10` Next.js static pages), `34/34` unit + `4/4` integration tests, `./scripts/manage-homelab.sh deploy`, và Playwright Real-User Two-User E2E [`f0_f1_shell.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/f0_f1_shell.spec.ts) + [`f2_community_media.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/f2_community_media.spec.ts) + [`f3_realtime_chat.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/f3_realtime_chat.spec.ts) (`3/3` pass) | **100% Passed (`next build` 10/10 + 3/3 Playwright Real-User E2E)** |
| **`LOG-V3-F4`** | 2026-11-13 | **Nghiệm thu v3.0.0 Phase F4 (Admin Console, Moderation Queue, RBAC, Audit Logs & Inline Mod Toolbar)**: Hoàn thiện [`ModerationApi`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/api/moderation.ts) bao phủ toàn bộ 14 endpoints `/api/v1/admin/*` & `/api/v1/reports/*`; xây dựng bộ 5 phân hệ quản trị [`/admin`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/admin/page.tsx) (cổng RBAC chặt chẽ chặn khách/USER kèm `0` request `/admin/*`, đồng bộ `?tab=overview\|reports\|users\|content\|audit`): [`AdminStatsGrid`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/admin/admin-stats-grid.tsx), [`ModQueuePanel`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/admin/mod-queue-panel.tsx), [`AdminUsersPanel`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/admin/admin-users-panel.tsx) (tìm kiếm, phân vai trò `USER`/`SPACE_MOD`/`GLOBAL_MOD`/`ADMIN`, `ACTIVE`/`SUSPENDED`/`SHADOWBANNED`, thu hồi phiên làm việc), [`AdminContentPanel`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/admin/admin-content-panel.tsx) (Pin/Lock/xác nhận xóa 2 bước thread & xóa space xác nhận slug), [`AuditLogsPanel`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/admin/audit-logs-panel.tsx); bổ sung Inline Mod Toolbar trên [`/threads/[id]`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/threads/%5Bid%5D/page.tsx) cho `ADMIN`/`GLOBAL_MOD` và tab `Báo cáo đã gửi` trên [`/u/[username]`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/u/%5Busername%5D/page.tsx); kiểm chứng `biome check` (`160` files, `0` lỗi), `typecheck` & `build` (`11/11` Next.js static pages), `34/34` unit + `4/4` Postgres/Redis integration tests, `./scripts/manage-homelab.sh deploy`, và Playwright Real-User E2E [`f4_admin_moderation.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/f4_admin_moderation.spec.ts) (`6.1s` pass — RBAC 403 UI+API, Report 201/409, Resolve queue -> `RESOLVED`, Inline Pin/Lock, Content Delete, User Suspend+Revoke `refresh` 401 & Audit Logs bất biến) cùng [`f0_f1_shell.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/f0_f1_shell.spec.ts) + [`f2_community_media.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/f2_community_media.spec.ts) + [`f3_realtime_chat.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/f3_realtime_chat.spec.ts) | **100% Passed (`next build` 11/11 + 4/4 Playwright Real-User E2E)** |

---

## 2. BIÊN BẢN NGHIỆM THU CHI TIẾT PHASE B5 (LOG-B5)

- **Mục tiêu:** Xây dựng phân hệ kiểm duyệt & quản trị hệ thống Reddit Moderation Queue & Admin Hub: Mod Queue tiếp nhận và xử lý báo cáo vi phạm bài viết/bình luận, Cơ chế Shadowban, Cập nhật vai trò/trạng thái người dùng kèm cưỡng chế thu hồi phiên làm việc, Ghi đè ghim bài / khóa bình luận / xóa nội dung, Ghi vết kiểm toán bất biến Audit Logs và Tổng hợp số liệu thống kê hệ thống.
- **Môi trường thực thi:** Debian GNU/Linux 13 (trixie) x86_64, Node.js v22.23.4 LTS, pnpm v10.15.0, Biome 2.6.5, bash 5.2.
- **Kết quả 4 Cổng kiểm định CI:**
  1. *Cổng 1 (Linting & Formatting):* `pnpm run lint` $\rightarrow$ Đạt 100% (0 errors, 0 warnings trên 100 files).
  2. *Cổng 2 (TypeScript Strict Typecheck):* `pnpm run typecheck` $\rightarrow$ Đạt 100% trên tất cả 8 packages/services (`@acad/contracts`, `@acad/auth-client`, `@acad/auth-service`, `@acad/community-service`, `@acad/chat-service`, `@acad/moderation-service`, `@acad/api-gateway`, `@acad/web`).
  3. *Cổng 3 (Automated Unit QA):* `pnpm test` $\rightarrow$ **162/162 tests Passed (100%)**:
     - `@acad/contracts`: 16/16 tests pass.
     - `@acad/auth-client`: 3/3 tests pass.
     - `@acad/auth-service`: 11/11 tests pass.
     - `@acad/community-service`: 36/36 tests pass.
     - `@acad/chat-service`: 14/14 tests pass.
     - `@acad/moderation-service`: 21/21 tests pass.
     - `@acad/api-gateway`: 61/61 tests pass.
  4. *Cổng 4 (API Live Probes & DDL Migration):*
     - `deploy/migrations/000005_create_moderation_and_admin_schema.up.sql` và `.down.sql` sẵn sàng cho PostgreSQL 16.
     - `scripts/verify-admin-curl.sh`: 18/18 live cURL test steps passed trên HTTP test server (Port 3099).
     - Biên bản live HTTP trace lưu tại: [`docs/05_guides_and_verification/logs/log_B5_moderation_admin.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/05_guides_and_verification/logs/log_B5_moderation_admin.md).

---

## 3. BIÊN BẢN NGHIỆM THU CHI TIẾT PHASE B4 (LOG-B4)

- **Mục tiêu:** Xây dựng hệ thống chat thời gian thực chuẩn Reddit: Gateway Server-Sent Events (SSE) RFC 8895, Hàng đợi tin nhắn người lạ PENDING/ACCEPTED/BLOCKED, Chat Threads phân nhánh thảo luận, Quản lý trạng thái hiện diện và nhịp tim trực tuyến.
- **Môi trường thực thi:** Debian GNU/Linux 13 (trixie) x86_64, Node.js v22.23.4 LTS, pnpm v10.15.0, Biome 2.6.5, bash 5.2.
- **Kết quả 4 Cổng kiểm định CI:**
  1. *Cổng 1 (Linting & Formatting):* `pnpm run lint` $\rightarrow$ Đạt 100% (0 errors, 0 warnings).
  2. *Cổng 2 (TypeScript Strict Typecheck):* `pnpm run typecheck` $\rightarrow$ Đạt 100% trên tất cả 6 packages/services (`@acad/contracts`, `@acad/auth-client`, `@acad/auth-service`, `@acad/community-service`, `@acad/chat-service`, `@acad/api-gateway`).
  3. *Cổng 3 (Automated Unit QA):* `pnpm test` $\rightarrow$ **120/120 tests Passed (100%)**:
     - `@acad/contracts`: 16/16 tests pass.
     - `@acad/auth-client`: 3/3 tests pass.
     - `@acad/auth-service`: 10/10 tests pass.
     - `@acad/community-service`: 36/36 tests pass.
     - `@acad/chat-service`: 13/13 tests pass (`chat-service`: 9, `presence-and-sse`: 4).
     - `@acad/api-gateway`: 42/42 tests pass (`healthz`: 1, `auth-endpoints`: 13, `community-endpoints`: 11, `voting-and-feeds`: 10, `chat-endpoints`: 7).
  4. *Cổng 4 (API Live Probes & DDL Migration):*
     - `deploy/migrations/000004_create_chat_schema.up.sql` và `.down.sql` sẵn sàng cho PostgreSQL 16.
     - `scripts/verify-chat-curl.sh`: 16/16 live cURL test steps passed trên HTTP test server (Port 3099).
     - Biên bản live HTTP trace lưu tại: [`docs/05_guides_and_verification/logs/log_B4_realtime_chat.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/05_guides_and_verification/logs/log_B4_realtime_chat.md).

---

## 3. BIÊN BẢN NGHIỆM THU CHI TIẾT PHASE B3 (LOG-B3)

- **Mục tiêu:** Xây dựng hệ thống biểu quyết nguyên tử $\mathcal{O}(1)$ triệt tiêu race condition, tối ưu hóa ghi đĩa PostgreSQL HOT updates, động cơ bảng tin Hacker News & Wilson Score, phân trang con trỏ Keyset Cursor Base64URL.
- **Môi trường thực thi:** Debian GNU/Linux 13 (trixie) x86_64, Node.js v22.23.4 LTS, pnpm v10.15.0, Biome 2.6.5, bash 5.2.
- **Kết quả 4 Cổng kiểm định CI:**
  1. *Cổng 1 (Linting & Formatting):* `pnpm run lint` $\rightarrow$ Đạt 100% (74 files checked in 114ms, 0 errors, 0 warnings).
  2. *Cổng 2 (TypeScript Strict Typecheck):* `pnpm run typecheck` $\rightarrow$ Đạt 100% trên cả 5 packages (`@acad/contracts`, `@acad/auth-client`, `@acad/auth-service`, `@acad/community-service`, `@acad/api-gateway`).
  3. *Cổng 3 (Automated Unit QA):* `pnpm test` $\rightarrow$ **100/100 tests Passed (100%)**:
     - `@acad/contracts`: 16/16 tests pass.
     - `@acad/auth-client`: 3/3 tests pass.
     - `@acad/auth-service`: 10/10 tests pass.
     - `@acad/community-service`: 36/36 tests pass (`ltree-path`: 7, `ranking-algorithms`: 7, `lua-vote`: 6, `feed-services`: 5, `community-services`: 11).
     - `@acad/api-gateway`: 35/35 tests pass (`healthz`: 1, `auth-endpoints`: 13, `community-endpoints`: 11, `voting-and-feeds`: 10).
  4. *Cổng 4 (API Live Probes & DDL Migration):*
     - `deploy/migrations/000003_create_voting_and_feed_schema.up.sql` và `.down.sql` sẵn sàng cho PostgreSQL 16.
     - `deploy/redis/execute_vote.lua`: Kịch bản Redis Lua nguyên tử $\mathcal{O}(1)$.
     - `scripts/verify-feeds-and-voting-curl.sh`: 16/16 live cURL test steps passed trên HTTP test server (Port 3099).
     - Biên bản live HTTP trace lưu tại: [`docs/05_guides_and_verification/logs/log_B3_voting_and_feeds.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/05_guides_and_verification/logs/log_B3_voting_and_feeds.md).

---

## 3. BIÊN BẢN NGHIỆM THU CHI TIẾT PHASE B2 (LOG-B2)

- **Mục tiêu:** Xây dựng hoàn chỉnh hạ tầng CSDL PostgreSQL 16 mở rộng (`ltree`, `pg_trgm`), Dịch vụ Không gian thảo luận & Nội dung `@acad/community-service`, và Tích hợp API Gateway `@acad/api-gateway`.
- **Môi trường thực thi:** Debian GNU/Linux 13 (trixie) x86_64, Node.js v22.23.4 LTS, pnpm v10.15.0, Biome 2.6.5, bash 5.2.
- **Kết quả 4 Cổng kiểm định CI:**
  1. *Cổng 1 (Linting & Formatting):* `pnpm run lint` $\rightarrow$ Đạt 100% (63 files checked in 46ms, 0 errors, 0 warnings).
  2. *Cổng 2 (TypeScript Strict Typecheck):* `pnpm run typecheck` $\rightarrow$ Đạt 100% trên cả 5 packages (`@acad/contracts`, `@acad/auth-client`, `@acad/auth-service`, `@acad/community-service`, `@acad/api-gateway`).
  3. *Cổng 3 (Automated Unit QA):* `pnpm test` $\rightarrow$ 72/72 tests Passed (100%):
     - `@acad/contracts`: 16/16 tests pass.
     - `@acad/auth-client`: 3/3 tests pass.
     - `@acad/auth-service`: 10/10 tests pass.
     - `@acad/community-service`: 18/18 tests pass (LtreePathManager 7 tests, Space/Thread/Comment/Storage Services 11 tests).
     - `@acad/api-gateway`: 25/25 tests pass (Healthz 1 test, Auth Endpoints 13 tests, Community Endpoints 11 tests).
  4. *Cổng 4 (API Live Probes & DDL Migration):*
     - `deploy/migrations/000002_create_community_schema.up.sql` và `.down.sql` sẵn sàng cho PostgreSQL 16.
     - `scripts/verify-community-curl.sh`: 17/17 live cURL test steps passed trên HTTP test server (Port 3099).
     - Biên bản live HTTP trace lưu tại: [`docs/05_guides_and_verification/logs/log_B2_spaces_and_content.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/05_guides_and_verification/logs/log_B2_spaces_and_content.md).

---

## 3. BIÊN BẢN NGHIỆM THU CHI TIẾT PHASE B1 (LOG-B1)

- **Mục tiêu:** Xây dựng hoàn chỉnh hạ tầng CSDL PostgreSQL 16, Redis 7, Dịch vụ Định danh `@acad/auth-service`, Thư viện Client `@acad/auth-client` với Mutex Lock, và Cổng kết nối API Gateway `@acad/api-gateway`.
- **Môi trường thực thi:** Debian GNU/Linux 13 (trixie) x86_64, Node.js v22.23.4 LTS, pnpm v10.15.0, Biome 2.6.5, bash 5.2.
- **Kết quả 4 Cổng kiểm định CI:**
  1. *Cổng 1 (Linting & Formatting):* `pnpm run lint` $\rightarrow$ Đạt 100% (49 files checked in 58ms, 0 errors, 0 warnings).
  2. *Cổng 2 (TypeScript Strict Typecheck):* `pnpm run typecheck` $\rightarrow$ Đạt 100% trên cả 4 packages (`@acad/contracts`, `@acad/auth-client`, `@acad/auth-service`, `@acad/api-gateway`).
  3. *Cổng 3 (Automated Unit QA):* `pnpm test` $\rightarrow$ 43/43 tests Passed (100%):
     - `@acad/contracts`: 16/16 tests pass.
     - `@acad/auth-client`: 3/3 tests pass (Mutex Lock 20 luồng gọi đồng thời chỉ kích hoạt 1 network call duy nhất; Xử lý lỗi tập trung; Client 20 requests retry 200 OK tự động).
     - `@acad/auth-service`: 10/10 tests pass (Password KDF 64MB RAM O(1) constant-time comparison; Token rotation case 1 current token; Case 2 multi-tab race 30s grace period; Case 3 Token reuse attack detection & immediate family revocation).
     - `@acad/api-gateway`: 14/14 tests pass (Healthz 200 OK; Register 400 schema error, 201 created, 409 conflict; Login 401 wrong password, 200 ok; Auth guard 401 missing/forged, 200 profile; Token rotation 200 ok, 30s grace period, 401 reuse attack; Sessions listing 200 ok, revoke session 200 ok, logout 200 ok).
  4. *Cổng 4 (Database DDL & Docker Migration):* `deploy/migrations/000001_create_auth_schema.up.sql` và `.down.sql` với CSDL PostgreSQL 16 và Redis 7.

---

## 3. BIÊN BẢN NGHIỆM THU CHI TIẾT PHASE B0 (LOG-B0)

- **Mục tiêu:** Khởi tạo nền tảng Monorepo sạch và package `@acad/contracts` làm nguồn chân lý duy nhất (Single Source of Truth).
- **Môi trường thực thi:** Debian GNU/Linux 13 (trixie) x86_64, Node.js v22.23.4 LTS, pnpm v10.15.0, Biome 2.6.5.
- **Kết quả 4 Cổng kiểm định tự động:**
  1. *Cổng 1 (Linting & Formatting):* `pnpm run lint` $\rightarrow$ Đạt 100% (16 files checked in 48ms, 0 errors, 0 warnings).
  2. *Cổng 2 (TypeScript Strict Typecheck):* `pnpm run typecheck` $\rightarrow$ Đạt 100% (`tsc --noEmit`, exit code 0).
  3. *Cổng 3 (Automated Unit QA):* `pnpm test` $\rightarrow$ 16/16 test suites Passed (100%). Bao phủ toàn bộ schemas: Auth, Spaces, Threads, Ltree Comments Base36, Lua Voting, Chat Requests, Admin Hub, và RFC 7807 Problem Details.
  4. *Cổng 4 (Docker Scaffolding):* `deploy/docker/docker-compose.dev.yml` và `init-db.sql` sẵn sàng cho PostgreSQL 16 (4 extensions) và Redis 7.

---

## 3. QUY TRÌNH TẠO NHẬT KÝ KIỂM THỬ MỚI

Khi phát triển thêm các phân hệ mới (ví dụ: Reddit Chats, Post Flairs), kỹ sư hoặc AI Agent tuân thủ cấu trúc:
1. Đặt tên tệp: `docs/05_guides_and_verification/logs/log_<ID>_<tên_nội_dung>.md`.
2. Ghi nhận thời gian, commit hash và môi trường thực thi (Debian 13, Node 22, pnpm 10).
3. Trích xuất toàn bộ log output từ câu lệnh kiểm thử tự động Vitest và TypeScript typecheck.
4. Ghi nhận bảng kiểm Acceptance Criteria (Tiêu chí chấp thuận).
