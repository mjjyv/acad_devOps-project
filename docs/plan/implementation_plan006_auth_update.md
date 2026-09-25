# Kế Hoạch Triển Khai: Cập Nhật Toàn Diện Phân Hệ Auth (Admin Console, Session Management, Rate Limiting & Render URL)

Nhận diện toàn bộ tài liệu [UPDATE_AUTH.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/UPDATE_AUTH.md) và các yêu cầu kỹ thuật còn thiếu trong Phân hệ Auth 4.1:
1. **Trang Quản trị ADMIN (`/admin/users`)**: Bảng điều khiển quản lý người dùng, thay đổi vai trò (USER, MODERATOR, ADMIN), khóa/mở tài khoản (ACTIVE, SUSPENDED), cưỡng chế thu hồi phiên đăng nhập, thống kê hệ thống.
2. **Giao diện Quản trị Thiết bị & Phiên làm việc (`/settings/sessions`)**: Danh sách phiên đăng nhập theo User-Agent, địa chỉ IP, nhận diện "Thiết bị hiện tại", nút thu hồi từng phiên hoặc tất cả thiết bị khác.
3. **Bảo vệ Rate Limiting**: Chống tấn công dò quét mật khẩu (Brute-force / Credential Stuffing) trên endpoint `/api/v1/auth/login` và `/register`.
4. **Chuẩn hóa Tương thích URL Render Cloud**: Chuẩn hóa biến môi trường `NEXT_PUBLIC_API_URL` (tự động gắn giao thức `https://` khi Render trả về hostname trần), bảo đảm gọi API qua lại giữa `acad-web-client` và `acad-core-api` mượt mà 100%.
5. **Cập nhật Navigation Toàn Cục**: Thanh Header thông minh hiển thị trạng thái người dùng, Karma score, nút mở Admin (chỉ hiển thị cho tài khoản `ADMIN`), Quản lý phiên, và Đăng xuất.

---

## User Review Required

> [!IMPORTANT]
> - **Chính sách phân quyền Admin**: Endpoint `/api/v1/admin/*` và trang giao diện `/admin/*` yêu cầu quyền hạn `role === 'ADMIN'`. Để người dùng đầu tiên có thể trải nghiệm trang Admin ngay trên Render, hệ thống sẽ tự động gán quyền `ADMIN` cho tài khoản quản trị khởi tạo hoặc cung cấp cơ chế gán quyền trực quan.
> - **Chống Brute-force**: Áp dụng giới hạn tối đa 10 lần đăng nhập sai trong 15 phút trên mỗi IP/Tài khoản; khi vượt ngưỡng sẽ trả về HTTP 429 Too Many Requests.
> - **Tương thích Render**: Tự động xử lý URL protocol cho `NEXT_PUBLIC_API_URL` để loại bỏ nguy cơ lỗi CORS hoặc fetch sai URL trên Cloud.

---

## Proposed Changes

Grouped by component layer:

### 1. Tầng Khế Ước Dữ Liệu (`packages/contracts`)

Bổ sung các Zod schemas và kiểu dữ liệu quản trị:

#### [MODIFY] [auth.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/src/auth.ts)
- Bổ sung `AdminUserListQuerySchema`: Phân trang (`page`, `limit`), lọc theo `role`, `status`, tìm kiếm `search`.
- Bổ sung `AdminUpdateRoleSchema`: Schema cập nhật vai trò (`role: UserRole`).
- Bổ sung `AdminUpdateStatusSchema`: Schema cập nhật trạng thái (`status: UserStatus`).
- Bổ sung `AdminSystemStatsSchema`: Thống kê tổng số user, số user active, suspended, admins, mods.

---

### 2. Tầng Nghiệp Vụ & Dịch Vụ Auth (`services/auth`)

Bổ sung các hàm quản trị vào User Repository và bộ đếm Rate Limiting:

#### [MODIFY] [auth-controller.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/handlers/auth-controller.ts)
- Mở rộng interface `IUserRepository` với:
  - `listUsers(filter)`: Truy vấn danh sách người dùng kèm phân trang và bộ lọc.
  - `updateRole(id, role)`: Cập nhật vai trò.
  - `updateStatus(id, status)`: Cập nhật trạng thái.
- Cập nhật `InMemoryUserRepository` thực thi các phương thức này.

#### [MODIFY] [postgres-user-repository.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/repository/postgres-user-repository.ts)
- Viết câu truy vấn SQL an toàn (Prepared Statements) cho `listUsers`, `updateRole`, `updateStatus` với `RETURNING`.

#### [NEW] [rate-limiter.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/middleware/rate-limiter.ts)
- Tạo lớp `AuthRateLimiter`: Sliding Window Counter giới hạn số lần yêu cầu từ một IP/Identifier trong cửa sổ thời gian (hỗ trợ Redis và fallback In-Memory).

---

### 3. Tầng Gateway Backend (`apps/api`)

Xây dựng Router Quản trị Admin và bổ sung kiểm soát phiên:

#### [NEW] [admin-router.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/admin-router.ts)
- `GET /api/v1/admin/users`: Danh sách người dùng có tìm kiếm, lọc theo vai trò và trạng thái.
- `PATCH /api/v1/admin/users/:id/role`: Cấp/hạ quyền vai trò người dùng.
- `PATCH /api/v1/admin/users/:id/status`: Khóa (`SUSPENDED`), mở khóa (`ACTIVE`), cấm ẩn (`SHADOWBANNED`).
- `POST /api/v1/admin/users/:id/revoke-sessions`: Cưỡng chế thu hồi toàn bộ phiên đăng nhập của người dùng.
- `GET /api/v1/admin/stats`: Tổng kết các chỉ số người dùng và hệ thống.
- Middleware kiểm tra: Xác thực JWT token và đảm bảo `claims.role === 'ADMIN'`.

#### [MODIFY] [auth-router.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/auth-router.ts)
- Tích hợp `AuthRateLimiter` vào luồng `/login` (trả về HTTP 429 nếu vi phạm).
- Bổ sung `DELETE /api/v1/auth/sessions`: Thu hồi tất cả các phiên khác ngoại trừ phiên hiện tại.

#### [MODIFY] [server.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/server.ts)
- Định tuyến `/api/v1/admin/*` vào `createAdminRouter(authModule)`.

#### [NEW] [admin-endpoints.test.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/tests/admin-endpoints.test.ts)
- Bộ kiểm thử tích hợp HTTP cho các API Admin: xác thực quyền Admin, lọc người dùng, cập nhật role, khóa tài khoản và cưỡng chế thu hồi phiên.

---

### 4. Tầng Giao Diện Web (`apps/web`)

Xây dựng các trang quản trị, trang quản lý phiên và thanh điều hướng:

#### [MODIFY] [auth-client.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/auth-client.ts)
- Chuẩn hóa hàm `getApiBaseUrl()`: tự động bổ sung tiền tố `https://` nếu biến môi trường `NEXT_PUBLIC_API_URL` trên Render chỉ chứa hostname trần (`acad-core-api.onrender.com`).
- Bổ sung các phương thức:
  - `listSessions()`
  - `revokeSession(sessionId)`
  - `revokeAllOtherSessions(currentSessionId)`
  - `adminListUsers(query)`
  - `adminUpdateRole(userId, role)`
  - `adminUpdateStatus(userId, status)`
  - `adminRevokeUserSessions(userId)`
  - `adminGetStats()`

#### [NEW] [navbar.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/navbar.tsx)
- Thanh điều hướng toàn cục:
  - Logo và link trang chủ.
  - Nút Cổng Tài liệu (`/docs`).
  - Nếu chưa đăng nhập: Nút "Đăng nhập", "Đăng ký".
  - Nếu đã đăng nhập: Hiển thị Username, Karma badge, liên kết "Quản lý thiết bị" (`/settings/sessions`), huy hiệu "🛡️ Quản trị" (`/admin/users`) (chỉ hiện khi là ADMIN), và nút "Đăng xuất".

#### [NEW] [page.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/settings/sessions/page.tsx)
- Trang Quản trị Phiên & Thiết bị (`/settings/sessions`):
  - Hiển thị danh sách thiết bị đang đăng nhập (nhận diện Browser, OS từ User-Agent, IP, thời gian tạo, hạn dùng).
  - Huy hiệu "Thiết bị hiện tại".
  - Nút "Đăng xuất thiết bị này" cho từng phiên.
  - Nút "Đăng xuất khỏi tất cả thiết bị khác" bảo vệ an toàn tài khoản.

#### [NEW] [layout.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/admin/layout.tsx)
- Layout bảo vệ khu vực Admin: Kiểm tra `user.role === 'ADMIN'`. Nếu không phải Admin, hiển thị thông báo "Truy cập bị từ chối" và hướng dẫn an ninh.

#### [NEW] [page.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/admin/users/page.tsx)
- Trang Bảng điều khiển Quản trị Người dùng (`/admin/users`):
  - Thẻ thống kê (KPIs): Tổng thành viên, Active, Suspended, Quản trị viên.
  - Thanh tìm kiếm và bộ lọc nhanh theo Vai trò (`ALL`, `USER`, `SPACE_MOD`, `GLOBAL_MOD`, `ADMIN`) và Trạng thái (`ALL`, `ACTIVE`, `SUSPENDED`).
  - Bảng dữ liệu người dùng: Avatar, Email, Username, Điểm Karma, Vai trò hiện tại, Trạng thái.
  - Thao tác nhanh:
    - Dropdown đổi vai trò (thăng cấp / hạ cấp tức thì).
    - Nút Khóa tài khoản (`SUSPEND`) / Kích hoạt lại (`ACTIVE`).
    - Nút Thu hồi toàn bộ phiên đăng nhập của người dùng.

#### [MODIFY] [page.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/page.tsx)
- Cập nhật trang chủ sử dụng Navbar thông minh mới.

#### [MODIFY] [middleware.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/middleware.ts)
- Bảo vệ các đường dẫn `/admin/*` và `/settings/*` yêu cầu đăng nhập hợp lệ.

---

## Verification Plan

### Automated Tests
```bash
# 1. Biên dịch shared libraries
pnpm run build:libs

# 2. Kiểm định toàn bộ TypeScript types trên 8 projects
pnpm run typecheck

# 3. Chạy toàn bộ test suites (bao gồm tests mới cho Admin & Rate Limiting)
pnpm test

# 4. Đóng gói Next.js Production Build
pnpm --filter @acad/web run build
```

### Manual & Deployment Verification
1. **Kiểm tra trực quan trên Render**:
   - Truy cập URL Render của Web Client.
   - Đăng ký / Đăng nhập tài khoản.
   - Thử nghiệm truy cập `/settings/sessions`: xác minh danh sách thiết bị và thu hồi phiên.
   - Thử nghiệm truy cập `/admin/users` với quyền Admin: tìm kiếm, đổi vai trò, khóa/mở tài khoản.
2. **Kích hoạt CI/CD Pipeline**:
   - Push commit sạch lên `origin/main`.
   - Giám sát luồng GitHub Actions và xác nhận cả 4 cổng đều PASS xanh 100%.
