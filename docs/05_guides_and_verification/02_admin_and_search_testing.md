# Cẩm Nang Kiểm Thử Phân Hệ Admin Console & Tìm Kiếm (Admin & Search Testing)

> **Mã tài liệu:** `GUIDE-ADMIN-SEARCH`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Giao diện Web:** `https://acad-web-client.onrender.com/admin` (hoặc `http://localhost:3000/admin`)

---

## 1. KIỂM THỬ THẨM QUYỀN TRUY CẬP (ADMIN GUARD)

1. **Truy cập khi chưa đăng nhập:**
   - Điều hướng trình duyệt tới `/admin`.
   - Kết quả: Hệ thống chặn và hiển thị hộp thoại `[!] YÊU CẦU ĐĂNG NHẬP ADMIN`, nút bấm điều hướng về `/login?redirect=/admin`.
2. **Truy cập với tài khoản người dùng thường (`USER`):**
   - Đăng nhập với tài khoản thường và truy cập `/admin`.
   - Kết quả: Hệ thống trả về màn hình lỗi `[403] TRUY CẬP BỊ TỪ CHỐI`.
3. **Truy cập với tài khoản Quản trị viên (`ADMIN`):**
   - Đăng nhập với tài khoản có `role: 'ADMIN'`.
   - Kết quả: Mở giao diện `ADMIN.PANEL //`, hiển thị Sub-Navbar với 4 tabs.

---

## 2. KIỂM THỬ CÁC TÍNH NĂNG QUẢN TRỊ TRÊN GIAO DIỆN

1. **Dashboard Tổng Quan (`/admin`):**
   - Xác nhận hiển thị 4 thẻ chỉ số: Tổng Người Dùng, Phiên Hoạt Động, Không Gian (Spaces), Bài Viết & Bình Luận.
2. **Quản Trị Người Dùng (`/admin/users`):**
   - Kiểm tra cột **SỐ BÀI VIẾT (`threadsCount`)**: Đếm chính xác số bài viết mà user đó đã đăng tải.
   - Bấm nút **KHÓA TÀI KHOẢN**: Đổi trạng thái user sang `SUSPENDED`, người dùng bị khóa không thể đăng nhập.
   - Bấm nút **HỦY PHIÊN**: Thu hồi lập tức toàn bộ Refresh Token của user khỏi Redis và DB.
3. **Quản Trị Không Gian Thảo Luận (`/admin/spaces`):**
   - Xác nhận hiển thị cột **Số Thành Viên (`memberCount`)** và **Số Bài Viết (`threadCount`)**.
   - Bấm nút **XÓA KHÔNG GIAN**: Hộp thoại cảnh báo xuất hiện; xác nhận xóa thành công không gian và dọn dẹp các bài viết liên kết.
4. **Quản Trị Bài Viết (`/admin/threads`):**
   - Bấm nút **GHIM / BỎ GHIM (`Pin/Unpin`)**: Bài viết được ghim lên đầu bảng tin.
   - Bấm nút **KHÓA BÌNH LUẬN (`Lock/Unlock`)**: Ngăn chặn thành viên gửi thêm bình luận mới vào bài viết.
   - Bấm nút **XÓA BÀI VIẾT**: Xóa bỏ bài viết vi phạm khỏi hệ thống.

---

## 3. KIỂM THỬ TÍNH NĂNG TÌM KIẾM THỜI GIAN THỰC (SEARCH ENGINE)

1. Nhấp phím tắt `/` trên bàn phím: Con trỏ tự động nhảy vào thanh tìm kiếm trên thanh Navbar.
2. Nhập từ khóa: Gõ từ khóa `Kubernetes` hoặc `DevOps`.
3. Kiểm tra kết quả: Bảng tin trang chủ xuất hiện dải banner `KẾT QUẢ TÌM KIẾM CHO: [từ_khóa]` và lọc đúng các bài viết chứa từ khóa trong tiêu đề.
4. Kết hợp bộ lọc: Chuyển đổi giữa các tab **Hot**, **New**, **Top** trong khi đang tìm kiếm để xác minh bộ lọc hoạt động độc lập và chính xác.
