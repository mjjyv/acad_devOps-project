# Kế hoạch Chi tiết Triển khai Giai đoạn 4: Phân hệ Định danh, Quản lý Phiên & Truyền dẫn Token (Auth Subsystem)

## Tổng quan & Bối cảnh

Sau khi đã hoàn thành xuất sắc **Giai đoạn 3** (Khởi tạo khung ứng dụng `apps/web` Next.js 15, `apps/api` HTTP Gateway, Docker Compose đa dịch vụ, Multi-stage Dockerfile, CI/CD Pipeline 4 cổng GitHub Actions và Render Blueprint) và **đã kích hoạt thành công GitHub Actions CI/CD trên cloud** (commit `18207d4` trên nhánh `main`), dự án bước vào **Giai đoạn 4: Phát triển Lõi & Tích hợp Hệ thống (Core Development & Integration)**.

Theo sát mục **4.1 trong checklist dự án**, trọng tâm hàng đầu của phân hệ Auth là hiện thực hóa toàn diện cơ chế định danh cấp độ doanh nghiệp:
1. **Luồng Xác thực Kép & Xoay vòng Refresh Token (Token Rotation Protocol)** với cửa sổ an toàn **Grace Period 30s** chống race conditions do trễ mạng hoặc đa tab trình duyệt.
2. **Cơ chế Phát hiện Tái sử dụng Token (Token Reuse Attack Detection)**: Tự động vô hiệu hóa và quét sạch toàn bộ cụm phiên làm việc của người dùng (`DEL session:{user_id}:*`) khi phát hiện token cũ bị phát lại trái phép.
3. **Bộ nhớ đệm Phiên phân tán Redis (Persistent Session Store)** với khóa `session:{user_id}:{device_fingerprint}` lưu trữ SHA-256 hash của tokens và family metadata.
4. **Kho lưu trữ Dữ liệu PostgreSQL (User Repository & Audit Log)**: Tích hợp bảng `users`, `user_sessions`, và `auth_audit_logs` khớp 100% với migration `000001_create_auth_schema.up.sql`.
5. **Cổng API RESTful hoàn chỉnh trong `apps/api`**:
   - `POST /api/v1/auth/register`
   - `POST /api/v1/auth/login`
   - `POST /api/v1/auth/refresh`
   - `POST /api/v1/auth/logout`
   - `GET /api/v1/auth/me`
   - `GET /api/v1/auth/sessions`
   - `DELETE /api/v1/auth/sessions/:id`
6. **Client Auth Interceptor & Mutex Lock trên `apps/web`**: Đảm bảo chỉ duy nhất một request refresh chạy đồng thời, đưa các request 401 song song vào hàng đợi `Subscriber Queue` và tự động re-play với Bearer token mới.

---

## User Review Required

> [!IMPORTANT]
> **1. Quy chuẩn Lưu trữ Session & Cookie Kép (Strict Separation)**:
> - **Access Token (15 phút)**: Lưu trữ trong Cookie `access_token` với cờ `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900` (đồng thời trả về trong response body để Client Interceptor có thể lưu vào in-memory runtime).
> - **Refresh Token (7 ngày)**: Lưu trữ trong Cookie `refresh_token` với cờ `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800` (chỉ duy nhất endpoint `/refresh` mới có quyền truy cập cookie này, ngăn ngừa hoàn toàn rò rỉ token qua CSRF hoặc cross-origin fetch).

> [!IMPORTANT]
> **2. Cơ chế Grace Period 30s & Phản ứng Phát hiện Token Reuse**:
> - Khi một Refresh Token cũ được gửi lên:
>   - Nếu token khớp với `previous_token_hash` và thời gian hiện tại nằm trong cửa sổ `grace_period_expires_at` (30 giây tính từ lần xoay vòng gần nhất): Hệ thống coi đây là hiện tượng trễ mạng hoặc yêu cầu song song từ nhiều tab trình duyệt hợp lệ. Hệ thống cấp lại Access Token hiện hành mà **không** xoay vòng thêm Refresh Token.
>   - Nếu token không khớp cả `current_token_hash` lẫn `previous_token_hash` trong cửa sổ Grace Period: Hệ thống xác định đây là hành vi phát lại (Token Reuse Attack) do token đã bị rò rỉ hoặc đánh cắp. Hệ thống lập tức thu hồi toàn bộ cụm phiên `family_id` hoặc toàn bộ phiên của tài khoản (`DEL session:{user_id}:*`), ghi nhận sự kiện vào `auth_audit_logs` với `event_type = 'TOKEN_REUSE_DETECTED'`, và trả về HTTP `403 Forbidden`.

> [!NOTE]
> **3. Kiến trúc Đa Tầng Cơ sở Dữ liệu (Dual-layer Persistence Strategy)**:
> - Cung cấp driver `pg` (PostgreSQL) và `ioredis` (Redis) sẵn sàng kết nối CSDL thực tế khi có biến môi trường `DATABASE_URL` và `REDIS_URL`.
> - Đồng thời giữ nguyên interface trừu tượng (`IUserRepository`, `ISessionStore`) với adapter in-memory fallback cho môi trường Unit Test / Local Offline, đảm bảo CI/CD pipeline luôn thực thi trơn tru mà không phụ thuộc vào daemon bên ngoài khi chạy test độc lập.

---

## Open Questions

Không có câu hỏi chặn. Thiết kế hoàn toàn tuân thủ đặc tả an ninh [AUTH_SECURITY_SPECIFICATION.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-1/AUTH_SECURITY_SPECIFICATION.md) và checklist kỹ thuật [acad_devOps-project-docs-checklist.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs-checklist.md#L1443).

---

## Proposed Changes

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KIẾN TRÚC PHÂN HỆ AUTH 4.1                     │
└────────────────────────────────────────────────────────────────────────┘
          Frontend (Next.js 15)                Backend API Gateway (Node HTTP)
     ┌──────────────────────────────┐        ┌──────────────────────────────┐
     │ apps/web                     │        │ apps/api                     │
     │ - AuthProvider & Context     │        │ - server.ts                  │
     │ - Next.js Middleware Guard   │───────>│ - auth-router.ts             │
     │ - ClientAuthInterceptor      │ (HTTP) │   ├─ POST /register          │
     │   (Mutex Lock & Queue)       │        │   ├─ POST /login             │
     └──────────────────────────────┘        │   ├─ POST /refresh           │
                                             │   ├─ POST /logout            │
                                             │   ├─ GET /me                 │
                                             │   └─ GET /sessions           │
                                             └──────────────┬───────────────┘
                                                            │
                                             ┌──────────────┴───────────────┐
                                             │ services/auth                │
                                             │ - AuthController             │
                                             │ - TokenRotationService       │
                                             │ - PasswordHasher (Argon2id)  │
                                             │ - TokenManager (JWT HS256)   │
                                             └───────┬──────────────┬───────┘
                                                     │              │
                                    ┌────────────────┴────┐   ┌─────┴────────────────┐
                                    │ RedisSessionStore   │   │ PostgresUserRepo     │
                                    │ HSET session:{u}:{d}│   │ PostgreSQL 16 DB     │
                                    │ Grace Period 30s    │   │ users, sessions,     │
                                    │ DEL session:{u}:*   │   │ auth_audit_logs      │
                                    └─────────────────────┘   └──────────────────────┘
```

---

### Component 1: Lõi Dịch vụ Auth & Persistence Adapters (`services/auth`)

Cài đặt thư viện kết nối cơ sở dữ liệu `pg`, `@types/pg`, `ioredis`, `@types/ioredis`. Xây dựng các adapter cơ sở dữ liệu thực tế và bộ ghi nhật ký an ninh.

#### [MODIFY] [services/auth/package.json](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/package.json)
- Bổ sung dependencies: `pg`, `ioredis`.
- Bổ sung devDependencies: `@types/pg`, `@types/ioredis`.

#### [NEW] [services/auth/src/repository/postgres-user-repository.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/repository/postgres-user-repository.ts)
- Hiện thực hóa `IUserRepository` trên nền tảng `pg.Pool`:
  - `create(user)`: Insert vào bảng `users` với câu lệnh SQL parameterized, trả về bản ghi `UserRecord`.
  - `findByEmail(email)`: Truy vấn `SELECT * FROM users WHERE LOWER(email) = LOWER($1)`.
  - `findByUsername(username)`: Truy vấn `SELECT * FROM users WHERE LOWER(username) = LOWER($1)`.
  - `findById(id)`: Truy vấn `SELECT * FROM users WHERE id = $1`.
  - `updateKarma(id, delta)`: Cập nhật điểm karma của người dùng.
  - `logAuditEvent(event)`: Insert vào bảng `auth_audit_logs` với `event_type` enum (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `TOKEN_REFRESH_SUCCESS`, `TOKEN_REUSE_DETECTED`, `LOGOUT`, etc.).

#### [NEW] [services/auth/src/session/redis-session-store.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/session/redis-session-store.ts)
- Hiện thực hóa `ISessionStore` trên nền tảng cụm Redis (`ioredis`):
  - Khóa lưu trữ chuẩn: `session:{user_id}:{device_fingerprint}` dạng Hash (HSET).
  - Thuộc tính hash: `session_id`, `user_id`, `family_id`, `device_fingerprint`, `current_token_hash`, `previous_token_hash`, `grace_period_expires_at`, `ip_address`, `user_agent`, `is_revoked`, `created_at`, `updated_at`, `expires_at`.
  - Thiết lập TTL 7 ngày cho hash key (`EXPIRE session:{user_id}:{device_fingerprint} 604800`).
  - `revokeFamily(familyId)` / `revokeAllUserSessions(userId)`: Quét và xóa toàn bộ các phiên `session:{user_id}:*` (atomic pipeline hoặc Lua script), ngắt quyền truy cập ngay lập tức.
  - Cập nhật Grace Period 30s atomic qua pipeline.

#### [NEW] [services/auth/src/factory.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/factory.ts)
- Cung cấp `createAuthModule(options?: { dbUrl?: string; redisUrl?: string; inMemory?: boolean })`:
  - Tự động phát hiện biến môi trường hoặc cấu hình: nếu có `DATABASE_URL` và `REDIS_URL`, khởi tạo `PostgresUserRepository` + `RedisSessionStore`.
  - Nếu ở chế độ test hoặc offline, sử dụng `InMemoryUserRepository` + `InMemorySessionStore`.
  - Đảm bảo tính linh hoạt tối đa cho cả kiểm thử đơn vị và môi trường production.

#### [MODIFY] [services/auth/src/index.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/index.ts)
- Export các repository mới, redis session store, factory, và audit logging interfaces.

---

### Component 2: API Gateway & Auth Endpoints (`apps/api`)

Hiện thực hóa toàn diện các endpoint xác thực HTTP theo đặc tả OpenAPI 3.1 và checklist 4.1.

#### [MODIFY] [apps/api/package.json](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/package.json)
- Bổ sung dependencies nếu cần: `cookie` (parser và serializer tiện lợi) hoặc helper parse cookies chuẩn RFC 6265.

#### [NEW] [apps/api/src/routes/auth-router.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/auth-router.ts)
- Bộ định tuyến xử lý các yêu cầu HTTP Auth:
  - `POST /api/v1/auth/register`: Đọc body JSON, kiểm tra hợp lệ Zod schema, gọi `authController.register()`, đính kèm 2 header `Set-Cookie` (`access_token` và `refresh_token`), trả về `201 Created` với `UserProfile`.
  - `POST /api/v1/auth/login`: Xác thực thông tin đăng nhập, gọi `authController.login()`, đính kèm 2 header `Set-Cookie`, trả về `200 OK`.
  - `POST /api/v1/auth/refresh`:
    - Trích xuất `refresh_token` từ Cookie `refresh_token` (hoặc body fallback).
    - Gọi `authController.refresh()`.
    - Xử lý 3 nhánh:
      1. Thành công: Đính kèm cặp cookie mới, trả về `200 OK` với `accessToken` mới.
      2. Grace Period Match: Đính kèm access token mới, trả về `200 OK`.
      3. Token Reuse Detected: Trả về `403 Forbidden` với thông báo bảo mật rõ ràng, xóa sạch cookies.
  - `POST /api/v1/auth/logout`: Thu hồi session hiện tại, trả về `Set-Cookie` với `Max-Age=0` để trình duyệt xóa cookies.
  - `GET /api/v1/auth/me`: Bảo vệ bởi middleware `AuthGuard`, giải mã JWT từ header `Authorization: Bearer <token>` hoặc cookie `access_token`, trả về thông tin hồ sơ và quyền hạn của người dùng.
  - `GET /api/v1/auth/sessions`: Lấy danh sách các thiết bị/phiên đang hoạt động của người dùng hiện tại.
  - `DELETE /api/v1/auth/sessions/:sessionId`: Thu hồi phiên làm việc trên một thiết bị cụ thể.

#### [MODIFY] [apps/api/src/server.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/server.ts)
- Đăng ký bộ định tuyến `handleAuthRoutes` vào vòng lặp xử lý request của HTTP server.
- Cấu hình phân tích Cookie header (`parseCookies`) và Body JSON parser có giới hạn kích thước an toàn (chống DDoS Payload).

---

### Component 3: Frontend Client Integration (`packages/auth-client` & `apps/web`)

Tích hợp cơ chế xác thực an toàn vào ứng dụng Next.js 15.

#### [NEW] [apps/web/src/lib/auth-client.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/auth-client.ts)
- Cấu hình phiên bản đơn lẻ (Singleton) của `ClientAuthInterceptor` từ `@acad/auth-client`:
  - Hàm `refreshEndpoint`: Gọi tới `POST /api/v1/auth/refresh` với `credentials: 'include'` (tự động gửi cookie `refresh_token`).
  - Hàm `onUnauthenticated`: Kích hoạt chuyển hướng về `/login?reason=session_expired`.

#### [NEW] [apps/web/src/contexts/auth-context.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/contexts/auth-context.tsx)
- Tạo React Context `AuthProvider` và hook `useAuth()`:
  - Cung cấp: `user`, `isAuthenticated`, `isLoading`, `login()`, `register()`, `logout()`.
  - Tự động gọi `GET /api/v1/auth/me` khi khởi động ứng dụng để kiểm tra phiên làm việc hiện có qua cookie.

#### [NEW] [apps/web/src/middleware.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/middleware.ts)
- Next.js Edge Middleware:
  - Kiểm tra các route cần bảo vệ (như `/dashboard`, `/settings`, `/profile`, `/create`).
  - Đọc cookie `access_token`. Nếu không tồn tại, kiểm tra xem có cookie `refresh_token` không; nếu không có cả hai, chuyển hướng an toàn về `/login?redirect=...`.

#### [NEW] [apps/web/src/app/login/page.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/login/page.tsx)
- Trang Đăng nhập tối ưu với giao diện Design Tokens của hệ thống, xử lý form đăng nhập, hiển thị thông báo lỗi bảo mật (nếu bị khóa tài khoản hoặc phát hiện Token Reuse).

#### [NEW] [apps/web/src/app/register/page.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/register/page.tsx)
- Trang Đăng ký với xác thực form mật khẩu mạnh (tối thiểu 8 ký tự, chữ hoa, chữ thường, số, ký tự đặc biệt).

---

### Component 4: Bộ Kiểm Thử Tích Hợp Toàn Diện (Integration & Verification Suites)

#### [NEW] [apps/api/tests/auth-endpoints.test.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/tests/auth-endpoints.test.ts)
- Bộ kiểm thử tích hợp HTTP API hoàn chỉnh (Integration Tests):
  1. **Đăng ký tài khoản mới (`POST /api/v1/auth/register`)**: Kiểm tra mã 201, định dạng profile, 2 header `Set-Cookie` (Lax cho access, Strict cho refresh).
  2. **Đăng nhập (`POST /api/v1/auth/login`)**: Xác thực tài khoản vừa tạo, kiểm tra mã 200 và cookies trả về.
  3. **Bảo vệ Endpoint (`GET /api/v1/auth/me`)**:
     - Gửi không kèm token -> Nhận 401 Unauthorized.
     - Gửi kèm Bearer token hợp lệ -> Nhận 200 OK với đúng UserProfile.
     - Gửi kèm Cookie `access_token` hợp lệ -> Nhận 200 OK.
  4. **Token Rotation bình thường (`POST /api/v1/auth/refresh`)**: Gửi kèm `refresh_token` hợp lệ -> Nhận cặp tokens mới, cookies mới được cập nhật.
  5. **Grace Period 30s chống Race Conditions**:
     - Gửi 2 request refresh liên tiếp với cùng một refresh token cũ trong khoảng cách thời gian nhỏ (< 30s).
     - Cả 2 request đều thành công và trả về token hợp lệ.
  6. **Phát hiện Tấn công Tái sử dụng Token (Token Reuse Attack)**:
     - Giả lập sau khi token đã được xoay vòng và hết hạn Grace Period, một bên thứ ba gửi lại token cũ đã dùng trước đó.
     - Hệ thống phát hiện tấn công, trả về HTTP `403 Forbidden`, hủy toàn bộ các session của tài khoản (`DEL session:{user_id}:*`).
     - Yêu cầu tiếp theo với access token hoặc refresh token đều bị từ chối 401/403.
  7. **Đăng xuất (`POST /api/v1/auth/logout`)**: Hủy phiên làm việc, xóa cookies với `Max-Age=0`.

---

## Verification Plan

### Automated Tests
1. **Kiểm thử Toàn diện Monorepo**:
   ```bash
   pnpm test
   ```
   - Xác minh toàn bộ test suites hiện tại (37 tests) cùng các test suites mới của Phân hệ Auth đều đạt kết quả **100% PASS**.
2. **Kiểm tra Tính Toàn Vẹn Kiểu (Type Integrity)**:
   ```bash
   pnpm run typecheck
   ```
   - Xác minh toàn bộ 8 packages/apps không có bất kỳ lỗi TypeScript nào (`tsc --noEmit`).
3. **Kiểm tra Chuẩn Code (Linting & Formatting)**:
   ```bash
   pnpm run lint
   ```
   - Kiểm tra mã nguồn bằng Biome linter.

### Manual Verification
1. Chạy máy chủ API cục bộ: `pnpm --filter @acad/api dev`.
2. Kiểm tra các luồng gọi API Auth thông qua curl/fetch:
   - Gửi yêu cầu đăng ký tài khoản mới: kiểm tra Set-Cookie headers.
   - Gửi yêu cầu truy cập `/api/v1/auth/me` với cookie.
   - Thử nghiệm gửi refresh token hai lần để kiểm chứng Grace Period 30s.
