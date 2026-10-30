# Kế hoạch Tài liệu hoá & Mã hóa Giai đoạn 1 (Discovery & Product Definition) - Trọng tâm Phân hệ Auth

## Tổng quan & Bối cảnh

Giai đoạn 1 trong Checklist tổng thể của dự án là **Khảo sát & Định vị sản phẩm (Discovery & Product Definition)**, bao gồm:
1. Xây dựng tài liệu Đặc tả Yêu cầu Sản phẩm (PRD), xác định phạm vi MVP, mục tiêu kinh doanh (OKRs, North Star Metric) và chân dung người dùng (Personas).
2. Xây dựng Sơ đồ luồng người dùng cốt lõi (User Flows & State Transitions).
3. Thiết lập Ma trận phân quyền toàn diện (RBAC kết hợp ABAC).

Để đáp ứng yêu cầu **"tài liệu hoá, mã hóa giai đoạn 1 và làm thật chắc Phân hệ Auth"**, kế hoạch này được thiết kế theo 2 trục song hành:
- **Trục Tài liệu hoá (Documentation):** Chuẩn hóa toàn bộ hồ sơ PRD, User Flows và đặc tả kiến trúc kỹ thuật chi tiết của Phân hệ Auth (Token Rotation, Threat Model, Session Security, Cookie Security Policy, RBAC/ABAC Specification).
- **Trục Mã hóa (Implementation):** Thiết lập cấu trúc nền móng dự án chuẩn monorepo, mã hóa toàn bộ cơ chế xác thực an toàn tuyệt đối từ lược đồ Database (PostgreSQL), Bộ băm mật khẩu Argon2id, Động cơ Token Rotation kép chống tấn công tái sử dụng (Token Reuse Attack), Bộ đánh giá chính sách RBAC/ABAC động, cho tới Client Mutex-locked Interceptor và bộ kiểm thử tự động (Unit & Integration Tests).

---

## User Review Required

> [!IMPORTANT]
> **Lựa chọn ngôn ngữ triển khai Backend Auth Core**:
> - Tài liệu kiến trúc dự án đưa ra đề xuất chính là **Go** (cho Core API chịu tải cao) kết hợp **Next.js** (Frontend/BFF). Trên máy chủ hiện tại đã cài đặt sẵn **Node.js 24 + pnpm**, trong khi **Go** có thể cài đặt thông qua `apt` (`golang-go 1.24`) hoặc chạy qua Docker.
> - **Đề xuất của chúng tôi:** 
>   1. Xây dựng gói **`packages/contracts`** bằng TypeScript + Zod + OpenAPI làm chuẩn giao tiếp Source of Truth dùng chung.
>   2. Triển khai lõi **Backend API Service** có cấu trúc module độc lập, sẵn sàng chạy với Go (hoặc TypeScript Fastify/Node sạch sẽ với đầy đủ types). Ở đây chúng tôi đề xuất cài đặt Go 1.24 qua package manager để xây dựng service bằng Go chuẩn theo đúng tài liệu thiết kế ban đầu của dự án, hoặc dựng phiên bản TypeScript nếu người dùng muốn tập trung toàn bộ ngăn xếp vào JS/TS ecosystem.

> [!WARNING]
> **Cơ chế Lưu trữ Session trong môi trường phát triển (Redis vs DB fallback)**:
> - Theo thiết kế, Token Rotation State Machine lưu trữ tại Redis (Hash: `session:{user_id}:{device_fingerprint}`).
> - Để đảm bảo code chạy test tự động độc lập ngay cả khi chưa khởi động cụm Redis Docker bên ngoài, Session Store sẽ được thiết kế theo mẫu **Repository / Storage Adapter Pattern**: hỗ trợ cả `RedisSessionStore` và `MemorySessionStore` (dùng cho unit/integration testing nội bộ).

---

## Open Questions

> [!NOTE]
> Không có câu hỏi gây nghẽn. Các quy chuẩn về bảo mật (Argon2id, JWT 15m, Refresh Token 7d, 30s Grace Period, RBAC 6 cấp vai trò, ABAC rules) đã được tài liệu hóa rõ ràng trong `acad_devOps-project-docs-checklist.md` và sẽ được triển khai chính xác theo đúng đặc tả.

---

## Proposed Changes

Kế hoạch triển khai được chia làm 5 tầng thành phần rõ rệt:

```
[Tầng 1: Tài liệu hóa PRD & Auth Specs]
       │
[Tầng 2: Contracts & Shared Schemas (OpenAPI, Zod, Types)]
       │
[Tầng 3: Database Migrations (PostgreSQL 16 Schema cho Identity & Sessions)]
       │
[Tầng 4: Core Auth Engine (Crypto, Token Rotation, RBAC/ABAC Policy)]
       │
[Tầng 5: Client Auth Interceptors, Handlers & Test Suite]
```

---

### Tầng 1: Tài liệu hóa Giai đoạn 1 & Đặc tả Phân hệ Auth

Tạo các tài liệu kỹ thuật chuẩn mực lưu trữ trực tiếp trong thư mục `docs/stage-1/` để đóng gói toàn bộ tri thức của Giai đoạn 1.

#### [NEW] [PRD_STAGE_1_DISCOVERY.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-1/PRD_STAGE_1_DISCOVERY.md)
- Hoàn thiện bản PRD chính thức:
  - Bối cảnh sản phẩm, North Star Metric ($WMD \ge 5$ comments/thread), OKRs kinh doanh ($W_4 \ge 25\%$, Creator ratio $\ge 8\%$).
  - 3 Chân dung người dùng chi tiết (The Lurker, The Contributor, The Curator/Mod) kèm User Journey Maps.
  - Phân loại MoSCoW toàn diện cho MVP.
  - Sơ đồ luồng 5 User Flows kinh điển (Guest to User, Creation Pipeline, Nested Discussion, Moderation Flow, Resync Flow).

#### [NEW] [AUTH_SECURITY_SPECIFICATION.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-1/AUTH_SECURITY_SPECIFICATION.md)
- Đặc tả kỹ thuật chuyên sâu về Bảo mật & Phân hệ Auth:
  - Threat Modeling: Phân tích các mối đe dọa (XSS, CSRF, Token Theft, Session Fixation, Credential Stuffing, Brute-force).
  - Giao thức Xác thực Kép (Dual-Token Protocol): Cặp Access Token (15m, Bearer / httpOnly cookie `Lax`) & Refresh Token (7d, httpOnly cookie `Strict`).
  - Giao thức Xoay vòng Token (Token Rotation DAG): Cơ chế băm SHA-256, Quản lý Session Family UUID, Cửa sổ an toàn 30s Grace Period chống trôi mạng, Phát hiện Tái sử dụng (Token Reuse Detection) và kích hoạt Hủy toàn bộ phiên (Session Family Invalidation).
  - Ma trận Phân quyền Toàn diện RBAC (Guest, Member <7d, Member $\ge$ 500 Karma, Space Mod, Global Mod, Super Admin) kết hợp ABAC (10 điều kiện ràng buộc thuộc tính).
  - Chính sách Cookie (SameSite, Secure, HttpOnly, Domain, Path-scoping).

---

### Tầng 2: Gói Hợp đồng Dùng chung (Packages / Contracts)

Định nghĩa Hợp đồng dữ liệu (API Contracts) làm tiêu chuẩn giao tiếp chung giữa Client và Server, ngăn ngừa lỗi sai lệch schema.

#### [NEW] [packages/contracts/package.json](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/package.json)
- Khởi tạo package `@acad/contracts` quản lý schemas và types.

#### [NEW] [packages/contracts/src/auth.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/src/auth.ts)
- Zod schemas & TypeScript types:
  - `RegisterInputSchema`, `LoginInputSchema` (email, username, password validation).
  - `TokenPayloadSchema`, `SessionInfoSchema`, `UserProfileSchema`.
  - `UserRoleEnum` (`GUEST`, `USER`, `SPACE_MOD`, `GLOBAL_MOD`, `ADMIN`).
  - `UserStatusEnum` (`ACTIVE`, `SUSPENDED`, `SHADOWBANNED`, `DELETED`).

#### [NEW] [packages/contracts/src/rbac-abac.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/src/rbac-abac.ts)
- Định nghĩa các hành động (`Action`), thực thể (`Resource`) và giao diện kiểm tra thuộc tính (`ABACContext`, `ABACPolicyRule`).

#### [NEW] [packages/contracts/openapi-auth.yaml](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/openapi-auth.yaml)
- File OpenAPI 3.1 đặc tả chuẩn xác các endpoints:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/me`
  - `GET /api/v1/auth/sessions`
  - `DELETE /api/v1/auth/sessions/{session_id}`

---

### Tầng 3: Lược đồ Cơ sở Dữ liệu & Migrations (PostgreSQL 16)

Dựng các tệp SQL DDL Migration phục vụ khởi tạo bảng dữ liệu danh tính và phiên người dùng theo chuẩn PostgreSQL 16.

#### [NEW] [deploy/migrations/000001_create_auth_schema.up.sql](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/000001_create_auth_schema.up.sql)
- Bật extensions: `uuid-ossp`, `pgcrypto`.
- Tạo các ENUMs: `user_role`, `user_status`.
- Tạo bảng `users`:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `username VARCHAR(32) UNIQUE NOT NULL`
  - `email VARCHAR(255) UNIQUE NOT NULL`
  - `password_hash VARCHAR(255) NOT NULL`
  - `role user_role NOT NULL DEFAULT 'USER'`
  - `karma_score INTEGER NOT NULL DEFAULT 0`
  - `status user_status NOT NULL DEFAULT 'ACTIVE'`
  - `avatar_url TEXT`, `bio TEXT`
  - `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`
- Tạo bảng `user_identities` (cho OAuth Google/GitHub).
- Tạo bảng `user_sessions`:
  - Lưu trữ định danh thiết bị (`device_fingerprint`), `family_id` (UUID), `current_token_hash`, `previous_token_hash`, `grace_period_until`, `ip_address`, `user_agent`, `expires_at`, `is_revoked`.
- Tạo bảng `auth_audit_logs`: Ghi nhận lịch sử đăng nhập, đổi mật khẩu, và các cảnh báo vi phạm Token Reuse.
- Tạo các Chỉ mục tối ưu: B-tree index trên `(email)`, `(username)`, `(family_id)`, `(user_id, is_revoked)`.

#### [NEW] [deploy/migrations/000001_create_auth_schema.down.sql](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/000001_create_auth_schema.down.sql)
- Script rollback toàn bộ các bảng, ENUMs và extensions khi cần.

---

### Tầng 4: Lõi Dịch vụ Backend Auth (Auth Core Engine)

Triển khai mã nguồn lõi xử lý nghiệp vụ xác thực và phân quyền với các nguyên lý bảo mật cao nhất.

#### [NEW] [services/auth/crypto/password.ts] (hoặc Go tương ứng)
- Xử lý băm mật khẩu bằng thuật toán an toàn **Argon2id** (hoặc `bcrypt` với cost 12 theo OWASP recommendations).
- Chống tấn công Timing Attack khi so khớp mật khẩu bằng hàm so sánh thời gian hằng số `crypto.timingSafeEqual`.

#### [NEW] [services/auth/crypto/token.ts]
- Cấp phát và giải mã JWT Access Token (15 phút) sử dụng thuật toán HMAC-SHA256 hoặc RS256.
- Sinh chuỗi ngẫu nhiên mật mã (Cryptographically Secure Pseudo-Random) 64 bytes cho Refresh Token.
- Băm SHA-256 cho Refresh Token để lưu vết trên kho dữ liệu (không bao giờ lưu raw token).

#### [NEW] [services/auth/session/token_rotation_service.ts]
- Hiện thực hóa máy trạng thái **Token Rotation Protocol**:
  - Khi refresh: Kiểm tra `current_token_hash`.
  - Khớp hợp lệ: Tạo cặp token mới, ghi đè `current_token_hash`, lưu token cũ vào `previous_token_hash` kèm thời hạn 30 giây (Grace Period).
  - Khớp trong Grace Period: Cấp lại token hiện hành, không báo lỗi mạng race-condition.
  - Không khớp (Phát hiện Tái Sử Dụng - Token Reuse Attack): Kích hoạt báo động, lập tức đánh dấu thu hồi toàn bộ `family_id` của phiên, ghi nhật ký `auth_audit_logs`, trả về `403 Forbidden`.

#### [NEW] [services/auth/policy/rbac_abac_engine.ts]
- Bộ đánh giá quyền hạn (Policy Evaluator):
  - Kiểm tra vai trò tĩnh (RBAC).
  - Kiểm tra các thuộc tính động (ABAC):
    - Tài khoản < 7 ngày tuổi: Giới hạn tần suất đăng bài/bình luận (Slow-down barrier).
    - Karma $\ge 500$: Mở khóa Downvote và tạo Space.
    - Thời gian sửa bài: Khóa chỉnh sửa sau 24h từ lúc xuất bản.
    - Space Boundary: Kiểm tra vai trò Moderator trong phạm vi Space sở tại.

#### [NEW] [services/auth/middleware/auth_guard.ts]
- Middleware trích xuất token từ httpOnly cookie hoặc `Authorization: Bearer <token>`.
- Xác thực chữ ký, kiểm tra trạng thái tài khoản (`ACTIVE`, `SHADOWBANNED`), inject user context vào request lifecycle.

#### [NEW] [services/auth/handlers/auth_controller.ts]
- Cung cấp đầy đủ các API Handlers:
  - `register`: Xác thực input, kiểm tra trùng lặp email/username, băm mật khẩu, tạo user.
  - `login`: So khớp mật khẩu, sinh session family, cấp phát cặp token và thiết lập Cookie an toàn (`HttpOnly`, `Secure`, `SameSite=Lax/Strict`).
  - `refresh`: Thực thi Token Rotation DAG.
  - `logout`: Thu hồi session hiện tại và xóa cookies.
  - `revokeAllSessions`: Thu hồi toàn bộ session của tài khoản khi người dùng đổi mật khẩu hoặc phát hiện nghi vấn.
  - `me`: Trả về thông tin hồ sơ và danh sách quyền hiện hành của người dùng.

---

### Tầng 5: Client Interceptor & Bộ Kiểm thử Tự động

#### [NEW] [packages/auth-client/src/interceptor.ts]
- Máy trạng thái phía Client xử lý lỗi HTTP 401:
  - Trạng thái: `AUTHENTICATED`, `REFRESHING`, `QUEUED`, `UNAUTHENTICATED`.
  - Cơ chế **Mutex Lock**: Chỉ cho phép 1 request duy nhất gọi `/api/v1/auth/refresh`.
  - Hàng đợi **Subscriber Queue**: Các request 401 phát sinh trong lúc đang refresh được giữ lại; sau khi có token mới sẽ tự động phát lại (re-play) với token mới mà người dùng không bị gián đoạn trải nghiệm.

#### [NEW] [services/auth/tests/crypto.test.ts]
- Unit tests cho Argon2id/bcrypt hashing và timing-safe equality.
- Unit tests cho JWT claims issuance & validation.

#### [NEW] [services/auth/tests/token_rotation.test.ts]
- Integration test cho chu trình Token Rotation:
  1. Login $\rightarrow$ nhận AT1 + RT1.
  2. Refresh lần 1 $\rightarrow$ nhận AT2 + RT2 thành công.
  3. Gửi lại RT1 trong vòng 30s Grace Period $\rightarrow$ vẫn nhận kết quả hợp lệ mà không phát sinh thêm session mới.
  4. Gửi lại RT1 sau 30s Grace Period (Mô phỏng Hacker đánh cắp token cũ) $\rightarrow$ Hệ thống lập tức phát hiện tấn công, hủy toàn bộ session family, từ chối mọi request tiếp theo bằng 403.

#### [NEW] [services/auth/tests/rbac_abac.test.ts]
- Test ma trận phân quyền:
  - Guest không thể đăng bài, bình luận.
  - Member mới < 7 ngày bị chặn khi đăng quá 2 bài/ngày hoặc bình luận cách nhau dưới 60s.
  - Member < 500 Karma bị chặn Downvote; Member $\ge 500$ Karma được phép Downvote.
  - Kiểm tra giới hạn sửa bài sau 24h.

---

## Verification Plan

### Automated Tests
1. **Chạy kiểm tra cú pháp và kiểu dữ liệu (Type Check & Lint)**:
   - Chạy lệnh type-check cho toàn bộ schemas và contracts:
     ```bash
     pnpm --filter @acad/contracts run typecheck
     ```
2. **Chạy bộ kiểm thử tự động toàn diện cho Auth Subsystem**:
   - Chạy toàn bộ unit test và integration test:
     ```bash
     pnpm --filter @acad/auth run test
     ```
   - Xác nhận 100% test cases cho Token Rotation, Grace Period, Token Reuse Detection và ABAC Rules đều vượt qua (`PASS`).

### Manual Verification
1. **Kiểm tra Cookie Security Attributes**:
   - Xác nhận header phản hồi chứa đúng các cờ bảo mật: `HttpOnly`, `Secure`, `SameSite=Lax` (cho access_token) và `SameSite=Strict; Path=/api/v1/auth/refresh` (cho refresh_token).
2. **Kiểm tra Luồng Client Mutex Lock**:
   - Mô phỏng 10 request song song bị lỗi 401; kiểm tra log chỉ có đúng 1 request refresh được gửi lên backend, 9 request còn lại chờ và tự động re-play thành công.
