Listed directory acad_devOps_project
Listed directory docs
Viewed project-file-system.txt:1-133
Viewed acad_devOps-project-docs-checklist-note.md:1-200
Viewed acad_devOps-project-docs-checklist-note.md:201-318
Searched for "Giai đoạn 4"
Searched for "Auth"
Searched for "^#+ "
Searched for "^###+ "
Ran command: `grep -n -E '^###+ ' docs/acad_devOps-project-docs-checklist.md | tail -n 30`
Viewed walkthrough001.md:1-94
Viewed walkthrough002.md:1-100
Viewed implementation_plan003.md:1-100
Viewed problem001.txt:1-60
Viewed problem002.txt:1-60
Viewed problem003.txt:1-60
Ran command: `git status`
Listed directory plan
Viewed implementation_plan004_auth_stage4.md:1-150
Viewed implementation_plan004_auth_stage4.md:151-226
Viewed walkthrough004_auth_stage4.md:1-100
Viewed walkthrough0051.md:1-81
Ran command: `git log -n 10 --oneline`
Listed directory src
Listed directory repository
Listed directory src
Listed directory routes
Listed directory src
Listed directory app
Viewed server.ts:1-111
Viewed auth-router.ts:1-100
Viewed auth-router.ts:101-293
Ran command: `pnpm run build:libs && pnpm run typecheck && pnpm test`
Viewed acad_devOps-project-docs.md:1-100
Used tool: manage_task

Dưới đây là báo cáo nhận diện toàn bộ mã nguồn, tài liệu cốt lõi và phân tích chuyên sâu hiện trạng triển khai theo checklist, trọng tâm là **Giai đoạn 4: Phân hệ Auth (Auth Subsystem)**.

---

# I. NHẬN DIỆN MÃ NGUỒN TOÀN HỆ THỐNG (CODEBASE INVENTORY)

Dự án được tổ chức theo kiến trúc **Monorepo chuẩn mực** quản lý bởi `pnpm workspace`, áp dụng triết lý phân tầng nghiêm ngặt: **Contracts $\rightarrow$ Shared Packages $\rightarrow$ Core Services $\rightarrow$ Applications & Infrastructure**.

```
acad_devOps_project/
├── apps/                         # Tầng Ứng dụng Chạy thực tế (Applications)
│   ├── api/                      # Backend HTTP API Gateway (Node.js runtime, port 8080)
│   └── web/                      # Frontend Client (Next.js 15 App Router, Tailwind CSS, port 3000)
│
├── packages/                     # Tầng Thư viện Dùng chung (Shared Libraries)
│   ├── contracts/                # Single Source of Truth: Zod Schemas, TypeScript Types & OpenAPI Specs
│   ├── auth-client/              # HTTP Client Interceptor với Mutex Lock chống refresh đồng thời
│   ├── ui-tokens/                # Hệ thống Design Tokens: Typography, Color Palette (Dark/Light), Grids
│   └── tree-virtualizer/         # Thuật toán trải phẳng cây bình luận ltree sang mảng tuyến tính O(N)
│
├── services/                     # Tầng Dịch vụ Nghiệp vụ Lõi (Core Domain Services)
│   ├── auth/                     # Phân hệ Xác thực: Crypto, JWT, Token Rotation, Redis Session, Postgres Repo, RBAC/ABAC
│   └── community/                # Phân hệ Cộng đồng: ltree Base36 Path Generator, Lua Voting Engine, Gravity Decay
│
├── deploy/                       # Tầng Hạ tầng Triển khai & Vận hành (DevOps & IaC)
│   ├── docker/                   # docker-compose.dev.yml, Dockerfile.api.prod, Dockerfile.web.prod, init-db.sql
│   ├── migrations/               # PostgreSQL 16 DDL: 000001 (Auth schema) & 000002 (Community schema)
│   ├── redis/                    # execute_vote.lua (Atomic Vote O(1))
│   ├── render/                   # render.yaml (Blueprint IaC cho Render Cloud)
│   └── scripts/                  # keep-alive.sh (Chống spin-down trên Free Tier)
│
└── .github/workflows/            # CI/CD Pipeline 4 cổng GitHub Actions (Lint, Typecheck, Test, Docker Build)
```

### Bảng Ánh Xạ Vai Trò Chi Tiết:

| Phân Vùng | Mô-đun | Trách Nhiệm Kỹ Thuật |
| :--- | :--- | :--- |
| **`apps/api`** | [server.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/server.ts), [auth-router.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/auth-router.ts) | HTTP Server xử lý CORS có credentials, Healthcheck (`/healthz`), điều hướng xác thực Auth REST endpoints. |
| **`apps/web`** | [page.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/page.tsx), [middleware.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/middleware.ts), [auth-context.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/contexts/auth-context.tsx) | Next.js 15, SSR/Client Components, Edge Auth Middleware, Docs Portal (`/docs`), trang đăng nhập/đăng ký. |
| **`packages/contracts`** | [auth.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/src/auth.ts), [rbac-abac.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/src/rbac-abac.ts), [openapi.yaml](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/openapi.yaml) | Chuẩn hóa khế ước API, schema Zod runtime validator, chính sách Cookie, định dạng Payload. |
| **`packages/auth-client`**| [interceptor.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/auth-client/src/interceptor.ts) | Client Interceptor xử lý 401 với cơ chế **Mutex Lock & Subscriber Queue** chống lặp refresh token. |
| **`services/auth`** | [token-rotation-service.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/session/token-rotation-service.ts), [redis-session-store.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/session/redis-session-store.ts), [postgres-user-repository.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/repository/postgres-user-repository.ts) | Scrypt hashing, HS256 JWT, 64-byte CSPRNG refresh token, cửa sổ an toàn Grace Period 30s, phát hiện Token Reuse, kiểm soát phân quyền kép RBAC+ABAC. |
| **`services/community`**| [ltree-path-generator.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/comments/ltree-path-generator.ts), [gravity-decay.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/voting/gravity-decay.ts) | Sinh đường dẫn Base36 tối đa 8 cấp, thuật toán HackerNews Gravity Decay tính điểm Hot Trending. |

---

# II. TÀI LIỆU CỐT LÕI (CORE DOCUMENTATION ARCHITECTURE)

Hệ thống tài liệu được lưu trữ tập trung tại thư mục `docs/`:

1. **Tài liệu Đặc tả Tổng thể**:
   - [acad_devOps-project-docs.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs.md): Bản thiết kế kiến trúc toàn diện (Frontend RSC, Feed Engine, Hybrid Push/Pull, Meilisearch, SSE Realtime, Security).
2. **Bộ Checklist Kỹ thuật**:
   - [acad_devOps-project-docs-checklist.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs-checklist.md): **Kim chỉ nam phát triển dự án** chia làm 4 giai đoạn lớn (Discovery $\rightarrow$ Design & Architecture $\rightarrow$ Foundation & DevOps $\rightarrow$ Core Development & Integration).
   - [acad_devOps-project-docs-checklist-note.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs-checklist-note.md): Hướng dẫn thực thi từng bước và bộ câu lệnh mẫu chuẩn hóa để giao việc cho AI Agent.
3. **Hồ sơ Chuyên biệt Theo Giai đoạn**:
   - `docs/stage-1/`: [PRD_STAGE_1_DISCOVERY.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-1/PRD_STAGE_1_DISCOVERY.md) (MVP Scope, Personas, MoSCoW, 5 User Flows) và [AUTH_SECURITY_SPECIFICATION.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-1/AUTH_SECURITY_SPECIFICATION.md) (Threat Modeling, Token Rotation DAG, Cookie Policies).
   - `docs/stage-2/`: [UI_UX_DESIGN_SPECIFICATION.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-2/UI_UX_DESIGN_SPECIFICATION.md) (Design tokens, 3-column layout, RSC boundaries, UI Statecharts).
   - `docs/stage-3/`: [DEVOPS_SETUP_GUIDE.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-3/DEVOPS_SETUP_GUIDE.md) (Hướng dẫn Docker Compose, CI/CD GitHub Actions, Render Cloud).
4. **Nhật ký Sự cố & Thực thi (Post-mortems & Walkthroughs)**:
   - `docs/plan/`: Bộ kế hoạch và báo cáo thực thi từ `walkthrough001.md` đến `walkthrough0051.md`.
   - `docs/problem001.txt` $\rightarrow$ `problem003.txt`: Ghi chép chi tiết các lỗi CI/CD và Docker startup trên Render, đã được phân tích nguyên nhân gốc và xử lý triệt để.

---

# III. PHÂN TÍCH CHECKLIST: HIỆN TRẠNG GIAI ĐOẠN 4 - PHÂN HỆ AUTH

Theo [acad_devOps-project-docs-checklist.md: L1443](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs-checklist.md#L1443), **Giai đoạn 4** là *Phát triển Tính năng Cốt lõi & Ghép nối Hệ thống (Core Development & Integration)*, với phân hệ mở đầu là **4.1 Phân hệ Định danh, Quản lý Phiên & Truyền dẫn Token (Auth Subsystem)**.

Dưới đây là bảng đối chiếu chi tiết giữa **Yêu cầu kỹ thuật** và **Mã nguồn thực tế**:

```
                       HIỆN TRẠNG PHÂN HỆ AUTH 4.1
──────────────────────────────────────────────────────────────────────────
[1. Lõi Mật Mã & Token]       ──> HOÀN THÀNH 100% (Scrypt, JWT, CSPRNG, Hash)
[2. Token Rotation Protocol]   ──> HOÀN THÀNH 100% (Grace Period 30s, Reuse Detection)
[3. Tách biệt Cookie An Toàn]  ──> HOÀN THÀNH 100% (Access: Lax 15m, Refresh: Strict 7d)
[4. Khế ước API & Interceptor] ──> HOÀN THÀNH 100% (Mutex Lock, Subscriber Queue)
[5. Cơ chế Lưu trữ Đa Tầng]   ──> HOÀN THÀNH 100% (Postgres User Repo, Redis Session Store)
──────────────────────────────────────────────────────────────────────────
[6. Tích hợp OAuth 2.0]        ──> CHƯA HOÀN THIỆN (Mới có DDL, chưa có Provider Handler)
[7. Giao diện Quản lý Phiên]   ──> CHƯA HOÀN THIỆN (Có API backend, thiếu UI Device Manager)
[8. Áp dụng RBAC/ABAC Gate]    ──> CHƯA HOÀN THIỆN (Engine đã xong, chưa gắn vào Thread/Comment API)
[9. Bảo vệ Rate Limiting]      ──> CHƯA HOÀN THIỆN (Chưa áp dụng rate limit chống Brute-force)
[10. Xác thực Email & Reset]   ──> CHƯA HOÀN THIỆN (Chưa có luồng Verify Email / Quên mật khẩu)
──────────────────────────────────────────────────────────────────────────
```

---

## 1. Các Hạng Mục ĐÃ HOÀN THÀNH XUẤT SẮC (Verified)

Toàn bộ các tiêu chuẩn an ninh cốt lõi đã được xây dựng và kiểm thử đạt **100% PASS (45/45 tests)**:

1. **Mật mã & Cấp phát Token Chuẩn Doanh nghiệp**:
   - [password.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/crypto/password.ts): Băm mật khẩu bằng `scrypt` (memory cost 64MB) kèm hàm so sánh an toàn `timingSafeEqual` chống tấn công đo thời gian (Timing Attack).
   - [token.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/crypto/token.ts): Ký số và kiểm thực Access Token HMAC-SHA256 (15 phút). Sinh Refresh Token 64-byte từ CSPRNG `randomBytes(64)` và băm SHA-256 trước khi ghi vào bộ nhớ đệm.

2. **Giao thức Xoay vòng Token Kép & Cửa sổ Grace Period 30 Giây**:
   - [token-rotation-service.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/session/token-rotation-service.ts):
     - Khi refresh: Cấp Access Token mới (15m) và Refresh Token mới (7d), đồng thời lưu vết `previous_token_hash`.
     - **Grace Period 30s**: Nếu nhận được yêu cầu lặp bằng token cũ trong vòng 30s (do trễ mạng hoặc người dùng mở nhiều tab trình duyệt song song), hệ thống cấp lại Access Token mà không xoay vòng thêm Refresh Token, triệt tiêu race condition.
     - **Phát hiện Tái sử dụng Token (Token Reuse Attack)**: Nếu phát hiện Refresh Token cũ ngoài cửa sổ 30s, hệ thống lập tức xác định phiên bị đánh cắp $\rightarrow$ Hủy sạch toàn bộ Session Family của người dùng (`DEL session:{user_id}:*`), phát tín hiệu bảo mật `TOKEN_REUSE_DETECTED` và trả về HTTP `403 Forbidden`.

3. **Chính sách Cookie Phân ly Tuyệt đối (Strict Cookie Policy)**:
   - Theo [COOKIE_CONFIG](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/src/auth.ts):
     - `access_token`: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900` (15 phút).
     - `refresh_token`: `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800` (7 ngày). *Chỉ duy nhất endpoint `/refresh` mới có quyền đọc cookie này*, ngăn ngừa hoàn toàn nguy cơ rò rỉ qua CSRF hoặc Cross-Origin Fetch.

4. **Client Interceptor Xử lý 401 Phía Trình Duyệt**:
   - [interceptor.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/auth-client/src/interceptor.ts): Cơ chế **Mutex Lock & Subscriber Queue**. Khi có nhiều request song song cùng nhận mã 401, chỉ DUY NHẤT 1 request refresh được gọi lên server, các request khác đưa vào hàng đợi chờ và tự động re-play ngay sau khi nhận được token mới.

5. **Bộ Lưu Trữ Cơ Sở Dữ Liệu & Bộ Nhớ Đệm Thực Tế**:
   - [postgres-user-repository.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/repository/postgres-user-repository.ts): Thao tác bảng `users` qua `pg.Pool`, ghi nhật ký an ninh vào `auth_audit_logs`.
   - [redis-session-store.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/session/redis-session-store.ts): Quản lý phiên dạng Hash `session:{user_id}:{device_fingerprint}` với TTL 7 ngày và cơ chế xóa cả cụm phiên qua pipeline.
   - [factory.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/factory.ts): Cơ chế thích ứng tự động (fallback In-Memory cho test/offline, kết nối Postgres/Redis khi chạy staging/production).

6. **Đầy Đủ 7 REST Endpoints Tại Gateway**:
   - `POST /api/v1/auth/register` (201 Created kèm 2 cookies)
   - `POST /api/v1/auth/login` (200 OK kèm 2 cookies)
   - `POST /api/v1/auth/refresh` (Xoay vòng token / Grace Period / Reuse Detection)
   - `POST /api/v1/auth/logout` (Thu hồi phiên, Set-Cookie `Max-Age=0`)
   - `GET /api/v1/auth/me` (AuthGuard xác thực JWT)
   - `GET /api/v1/auth/sessions` (Liệt kê danh sách phiên hoạt động)
   - `DELETE /api/v1/auth/sessions/:sessionId` (Thu hồi thiết bị cụ thể)

7. **Động cơ Phân quyền Kép RBAC + ABAC**:
   - [rbac-abac-engine.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/policy/rbac-abac-engine.ts): Đầy đủ các logic biên nghiệp vụ (Karma $\ge 500$ mới được Downvote, Newbie $< 7$ ngày giới hạn 2 bài/ngày, khóa sửa bài viết sau 24h, Space boundary cho Moderator).

---

## 2. Các Hạng Mục CHƯA HOÀN THIỆN Trong Phân Hệ Auth (Gaps & Incomplete Items)

Mặc dù lõi kỹ thuật và các luồng API chính đã hoạt động hoàn hảo, Phân hệ Auth được xem là **chưa hoàn thiện toàn diện** do còn thiếu 5 mắt xích quan trọng sau:

### ⚠️ 1. Tích Hợp Đăng Nhập Mạng Xã Hội OAuth 2.0 (Google / GitHub)
- **Hiện trạng**: Trong migration DDL [000001_create_auth_schema.up.sql](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/000001_create_auth_schema.up.sql) đã có sẵn bảng `user_identities` (`provider`, `provider_user_id`, `access_token`, `refresh_token`), và mật khẩu trong bảng `users` cho phép `NULL` cho tài khoản thuần OAuth.
- **Điểm khuyết**: Chưa triển khai code trao đổi mã Authorization Code (`POST /api/v1/auth/oauth/:provider/callback`), chưa có client ID/Secret trong config, và giao diện `apps/web` chưa có nút *"Đăng nhập với Google / GitHub"*.

### ⚠️ 2. Giao Diện Quản Trị Thiết Bị & Phiên Đăng Nhập (Device Session Manager UI)
- **Hiện trạng**: Backend đã có đầy đủ API `GET /api/v1/auth/sessions` và `DELETE /api/v1/auth/sessions/:id`.
- **Điểm khuyết**: Phía Frontend `apps/web` mới chỉ có trang `/login` và `/register`. Chưa có trang cài đặt tài khoản (`/settings/sessions` hoặc Profile Modal) để người dùng xem danh sách: tên thiết bị (User-Agent), địa chỉ IP, thời gian đăng nhập lần cuối, và nút *"Đăng xuất thiết bị này"* / *"Đăng xuất khỏi tất cả thiết bị khác"*.

### ⚠️ 3. Tích Hợp RBAC & ABAC Policy Engine Vào Toàn Bộ Endpoints Gateway
- **Hiện trạng**: Lớp `PolicyEngine` đã được kiểm thử 7 test cases đạt 100%, nhưng chỉ đang nằm độc lập trong `services/auth`.
- **Điểm khuyết**: Máy chủ `apps/api` hiện tại mới chỉ dựng router Auth, chưa tích hợp các router nghiệp vụ (như Thread, Comment, Space, Vote) để cắm middleware `AuthGuard.requirePermission(...)` vào kiểm soát truy cập thực tế.

### ⚠️ 4. Bảo Vệ Rate Limiting Chống Tấn Công Dò Quét (Brute-Force / Credential Stuffing)
- **Hiện trạng**: Tài liệu [AUTH_SECURITY_SPECIFICATION.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-1/AUTH_SECURITY_SPECIFICATION.md) yêu cầu khóa tạm thời hoặc giới hạn tối đa 5 lần đăng nhập sai trong 15 phút trên mỗi IP/Username.
- **Điểm khuyết**: `apps/api/src/routes/auth-router.ts` hiện tại chưa tích hợp bộ đếm Redis Rate Limiter cho các endpoint `/login` và `/register`.

### ⚠️ 5. Quy Trình Xác Thực Email & Đặt Lại Mật Khẩu (Email Verification / Password Reset)
- **Hiện trạng**: Enum `UserStatus` có trạng thái `PENDING_VERIFICATION`, nhưng hàm đăng ký hiện tại tự động gán ngay `ACTIVE`.
- **Điểm khuyết**: Chưa có bảng/token lưu mã xác nhận email, chưa có endpoint `/api/v1/auth/verify-email`, `/api/v1/auth/forgot-password`, `/api/v1/auth/reset-password` và chưa tích hợp dịch vụ gửi mail (SMTP / Resend / SendGrid).

---

# IV. BỨC TRANH TOÀN CẢNH GIAI ĐOẠN 4 (CORE DEVELOPMENT ROADMAP)

Để đưa dự án từ trạng thái hiện tại đến phiên bản hoàn chỉnh toàn diện, Giai đoạn 4 cần được triển khai tuần tự theo 6 phân hệ cốt lõi:

| Phân hệ | Nội dung Kỹ thuật | Trạng thái Hiện tại | Mã nguồn Đã có / Cần bổ sung |
| :--- | :--- | :---: | :--- |
| **4.1. Auth Subsystem** | Token Rotation, Grace Period, Redis Session, Postgres Repo, RBAC/ABAC, OAuth2. | 🟡 **80% (Đang hoàn thiện)** | Lõi Auth, Interceptor, APIs, Tests: Xong. Cần: OAuth2, UI Session Manager, Rate Limiting. |
| **4.2. CMS Pipeline** | Trình soạn thảo Tiptap, Direct Presigned URL upload lên S3/R2, AST Schema Sanitizer. | 🟡 **30% (Khung Spec)** | Đã có Zod AST validator trong `@acad/contracts`. Cần: S3 Presign API, Worker dọn file rác, Tiptap UI. |
| **4.3. Nested Comments** | Cây bình luận `ltree` PostgreSQL, Base36 path generation, DOM Virtualization. | 🟢 **70% (Lõi Thuật toán Xong)** | Đã xong `LtreePathGenerator` và `@acad/tree-virtualizer`. Cần: REST Endpoints `/threads/:id/comments` & UI Tree View. |
| **4.4. Voting Engine** | Lua Script $\mathcal{O}(1)$ trên Redis, Batch Flush Worker mỗi 5s vào `thread_counters`, Gravity Decay. | 🟢 **70% (Lõi Thuật toán Xong)** | Đã xong `execute_vote.lua`, `lua-vote-engine.ts`, `gravity-decay.ts`. Cần: Asynq/BullMQ Batch Flush Worker & Optimistic Vote UI. |
| **4.5. Feed Aggregator** | Hybrid Feed (Push follower, Pull KOLs), K-Way Merge Heap Sort, Cursor Base64 pagination. | ⚪ **20% (Khung Spec)** | Đã có `FeedCursorHelper` Base64 trong contracts. Cần: Thuật toán K-Way Min-Heap Merge trong Backend. |
| **4.6. Notification Hub** | Server-Sent Events (SSE) `/realtime/events`, Heartbeat 15s, Gom cụm thông báo Sliding Window 5m. | ⚪ **20% (Khung Spec)** | Đã có Zod SSE schemas trong contracts. Cần: SSE Event Hub engine trong `apps/api` và SSE listener hook phía React. |

---

# V. HÀNH ĐỘNG ĐỀ XUẤT TIẾP THEO

Tùy theo định hướng ưu tiên, các bước hành động tiếp theo có thể thực hiện:

1. **Lựa chọn 1 (Hoàn thiện dứt điểm Phân hệ Auth 4.1)**:
   - Dựng giao diện quản lý thiết bị/phiên đăng nhập (`apps/web/src/app/settings/sessions`).
   - Bổ sung Redis Rate Limiting cho `/login` và `/register` để chống Brute-force.
   - Thêm luồng OAuth 2.0 (Google/GitHub) hoặc luồng Forgot/Reset Password.
2. **Lựa chọn 2 (Mở rộng sang các Phân hệ Nghiệp vụ kế tiếp của Giai đoạn 4)**:
   - Triển khai **Phân hệ 4.4 (Voting Engine Worker)**: Viết Batch Flush Worker gom `dirty_threads_registry` từ Redis xả dồn vào bảng `thread_counters` của Postgres.
   - Hoặc triển khai **Phân hệ 4.3 (Nested Comments API & UI)**: Đấu nối API cây bình luận với thuật toán ảo hóa DOM `@acad/tree-virtualizer` trên Next.js.