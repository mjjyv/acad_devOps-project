# Trung Tâm Quản Trị & Kiểm Duyệt Nội Dung (Admin & Moderation Hub)

> **Mã tài liệu:** `CORE-ADMIN-MODERATION`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Mã nguồn:** [`apps/api/src/routes/admin-router.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/admin-router.ts), [`apps/web/src/app/admin`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/admin)

---

## 1. PHÂN QUYỀN VAI TRÒ QUẢN TRỊ (RBAC & ABAC GUARDS)

Trung tâm Quản trị được bảo vệ bởi bộ lọc an ninh nghiêm ngặt tại [`auth-guard.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/middleware/auth-guard.ts):
- Chỉ người dùng có vai trò `role === 'ADMIN'` mới được phép truy cập vào cụm route `/api/v1/admin/*` và giao diện Web `/admin/*`.
- Các yêu cầu từ người dùng chưa đăng nhập sẽ nhận mã lỗi `401 Unauthorized` và điều hướng về `/login?redirect=/admin`.
- Người dùng có vai trò `USER` thông thường sẽ bị chặn với mã lỗi `403 Forbidden`.

---

## 2. BỐ BỤC 4 PHÂN HỆ QUẢN TRỊ BRUTALIST DARK MODE

Giao diện Quản trị tại `apps/web/src/app/admin` được thiết kế theo phong cách Brutalist Dark Mode với Sub-Navbar 4 tabs điều hướng mượt mà:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      ADMIN.PANEL // SUB-NAVBAR                         │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ [CONSOLE TỔNG QUAN]│ [QUẢN LÝ NGƯỜI DÙNG]│ [CỘNG ĐỒNG SPACES] / [BÀI VIẾT]│
└───────────────────┴───────────────────┴────────────────────────────────┘
```

1. **Dashboard Tổng Quan (`/admin`):**
   - Live Metrics: Tổng người dùng (Active / Suspended), Số lượng phiên làm việc đang hoạt động (Active Sessions), Tổng số Không gian (Spaces), Tổng số Bài viết (Threads) và Bình luận.
   - Bảng thông số kỹ thuật hệ thống (Specs): Node 22 LTS, PostgreSQL 16, Ltree Base36, Gravity Decay (G=1.8).
2. **Quản Trị Người Dùng (`/admin/users`):**
   - Hiển thị danh sách người dùng kèm cột **Số Lượng Bài Viết (`threadsCount`)** và điểm danh tiếng Karma.
   - Thao tác: Đổi vai trò (Role), Khóa / Mở khóa tài khoản (`ACTIVE` / `SUSPENDED`), Cưỡng chế thu hồi phiên làm việc (Revoke Sessions).
3. **Quản Trị Không Gian Thảo Luận (`/admin/spaces`):**
   - Danh sách Không gian kèm chính xác **Số lượng Thành viên (`memberCount`)** và **Số lượng Bài viết (`threadCount`)**.
   - Thao tác: Xem trực tiếp trang Space hoặc Xóa bỏ không gian vi phạm kèm toàn bộ dữ liệu liên kết (`ON DELETE CASCADE`).
4. **Quản Trị Bài Viết & Nội Dung Vi Phạm (`/admin/threads`):**
   - Xem danh sách bài viết toàn hệ thống với bộ lọc theo Space và tìm kiếm theo tiêu đề.
   - Thao tác: **Ghim / Bỏ ghim (`Pin/Unpin`)**, **Khóa / Mở khóa bình luận (`Lock/Unlock`)**, **Xóa bài viết vi phạm**.
