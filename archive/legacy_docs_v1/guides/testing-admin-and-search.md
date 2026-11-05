# HƯỚNG DẪN KIỂM THỬ: ADMIN HUB, DOCS BRUTALIST, SESSIONS & SEARCH ENGINE

> **Phân hệ**: Quản trị Viên (Admin Hub), Quản Lý Phiên (Sessions), Cổng Tài Liệu (Docs) & Công Cụ Tìm Kiếm / Sắp Xếp  
> **Ngôn ngữ thiết kế**: Minimalist Brutalism Dark Mode (`#222831`, `#393E46`, `#948979`, `#DFD0B8`)  
> **Môi trường Web Client**: `https://acad-web-client.onrender.com` hoặc `http://localhost:3000`  
> **Môi trường API Gateway**: `https://acad-core-api.onrender.com` hoặc `http://localhost:8080`

---

## 1. KIỂM THỬ GIAO DIỆN PHÂN HỆ ADMIN HUB (`/admin`)

### 1.1. Thẩm quyền Quản trị (Admin Guard)
1. Truy cập trực tiếp URL `/admin` khi chưa đăng nhập:
   - Hệ thống hiển thị hộp thoại Brutalist Dark Mode: `[!] YÊU CẦU ĐĂNG NHẬP ADMIN`.
   - Nút `ĐĂNG NHẬP NGAY →` điều hướng về `/login?redirect=/admin`.
2. Đăng nhập với tài khoản người dùng thông thường (`USER`):
   - Truy cập `/admin`, hệ thống chặn với thông báo lỗi `[403] TRUY CẬP BỊ TỪ CHỐI`.
3. Đăng nhập với tài khoản Quản trị viên (`ADMIN`):
   - Truy cập thành công vào Trung tâm Điều hành `ADMIN.PANEL //`.
   - Thanh Sub-Navbar hiển thị 4 tab điều hướng:
     - `[CONSOLE // TỔNG QUAN]` (`/admin`)
     - `[QUẢN LÝ NGƯỜI DÙNG]` (`/admin/users`)
     - `[CỘNG ĐỒNG // SPACES]` (`/admin/spaces`)
     - `[BÀI VIẾT // THREADS]` (`/admin/threads`)

---

### 1.2. Dashboard Tổng Quan (`/admin`)
- **Chỉ số Live Metrics**:
  - `TỔNG NGƯỜI DÙNG`: Số lượng user, chi tiết số user Active và Suspended.
  - `PHIÊN HOẠT ĐỘNG`: Số lượng Refresh Tokens đang hoạt động với Scrypt KDF.
  - `KHÔNG GIAN (SPACES)`: Số lượng không gian cộng đồng hiện có.
  - `BÀI VIẾT (THREADS)`: Số lượng bài viết và bình luận (Ltree path).
- **Lối tắt Quản trị (Quick Actions)**: Chuyển nhanh giữa Quản lý người dùng, Spaces, Threads và Sessions.
- **Hạ tầng & An ninh (Specs)**: Xác nhận runtime Node.js 22 LTS, PostgreSQL 16, Ltree Base36, Gravity Decay (G=1.8).

---

### 1.3. Quản lý Người dùng & Số lượng Bài viết (`/admin/users`)
- Kiểm tra bảng người dùng:
  - Cột **SỐ BÀI VIẾT (`threadsCount`)**: Hiển thị chính xác tổng số bài viết mà mỗi tác giả đã đóng góp.
  - Cột **VAI TRÒ (Role)**: Đổi role qua dropdown (`USER` ⇄ `SPACE_MOD` ⇄ `GLOBAL_MOD` ⇄ `ADMIN`).
  - Cột **TRẠNG THÁI (Status)**: Nút `KHÓA` / `MỞ KHÓA` tài khoản người dùng (`ACTIVE` / `SUSPENDED`).
  - Cột **THAO TÁC**: Nút `HỦY PHIÊN` cưỡng chế thu hồi toàn bộ session token của người dùng.
- Bộ lọc: Lọc theo vai trò, trạng thái, hoặc tìm kiếm theo username / email.

---

### 1.4. Quản lý Không gian Thảo luận (`/admin/spaces`)
- Bảng quản trị Spaces:
  - Hiển thị tên không gian, mô tả tóm tắt.
  - Cột **SỐ THÀNH VIÊN (`memberCount`)**: Đếm số thành viên đã gia nhập không gian.
  - Cột **SỐ BÀI VIẾT (`threadCount`)**: Đếm số bài viết thuộc không gian.
  - Nút `XEM`: Mở trực tiếp trang không gian `/s/[slug]`.
  - Nút `XÓA`: Hộp thoại xác nhận an toàn trước khi xóa không gian và dọn dẹp bài viết liên kết.

---

### 1.5. Quản lý Bài viết & Nội dung Vi phạm (`/admin/threads`)
- Bảng danh sách bài viết toàn hệ thống:
  - Hiển thị tiêu đề bài viết, liên kết mở bài viết `/threads/[slug]`.
  - Tác giả (@username), Không gian (s/[slug]), Điểm bình chọn (`netScore`), Số bình luận.
  - Trạng thái: Badge `GHIM` (Pinned) và `KHÓA` (Locked).
- Thao tác quản trị viên:
  - Nút `GHIM` / `BỎ GHIM`: Đưa bài viết lên đầu trang hoặc bỏ ghim.
  - Nút `KHÓA` / `MỞ KHÓA`: Ngăn chặn thành viên bình luận thêm vào bài viết vi phạm.
  - Nút `XÓA`: Xóa bài viết vi phạm khỏi hệ thống.
- Bộ lọc: Lọc theo Không gian hoặc ô tìm kiếm từ khóa bài viết / tác giả.

---

## 2. KIỂM THỬ QUẢN LÝ PHIÊN ĐA THIẾT BỊ (`/settings/sessions`)

1. Truy cập `/settings/sessions`:
   - Giao diện Brutalist Dark Mode với bảng 4 màu tối giản.
   - Thẻ phiên hiện tại có badge nổi bật: `[THIẾT BỊ HIỆN TẠI NÀY]`.
   - Hiển thị thông tin nhận diện thiết bị: Hệ điều hành (Windows/macOS/Linux), Trình duyệt (Chrome/Safari/Edge), Địa chỉ IP, Thời điểm đăng nhập và thời gian hết hạn token.
2. Thu hồi từng phiên:
   - Đăng nhập tài khoản trên 2 trình duyệt hoặc chế độ ẩn danh (Incognito).
   - Tại trình duyệt chính, ấn nút `[THU HỒI PHIÊN]` của thiết bị phụ.
   - Kiểm tra thiết bị phụ: Phiên làm việc bị thu hồi, yêu cầu đăng nhập lại.
3. Đăng xuất tất cả thiết bị khác:
   - Ấn nút `[!] ĐĂNG XUẤT TẤT CẢ THIẾT BỊ KHÁC`.
   - Toàn bộ các phiên phụ bị thu hồi, chỉ giữ lại phiên hiện hành.

---

## 3. KIỂM THỬ CỔNG TÀI LIỆU KỸ THUẬT (`/docs`)

1. Truy cập `/docs`:
   - Giao diện đồng bộ Brutalist Dark Mode (#222831 Canvas, #393E46 Panels, #948979 Borders, #DFD0B8 Text).
   - Thanh Header có ô tìm kiếm nhanh (hỗ trợ phím tắt `Ctrl + K`).
   - Sidebar phân cấp 5 nhóm chuyên đề kỹ thuật.
2. Truy cập `/docs/checklist`:
   - Bảng theo dõi 7 Giai đoạn với thanh tiến độ trực quan.
   - Bộ lọc trạng thái: `TẤT CẢ`, `✓ HOÀN THÀNH`, `⏳ ĐANG LÀM`, `📋 DỰ KIẾN`.
3. Truy cập chi tiết tài liệu `/docs/[category]/[slug]`:
   - Khối `CalloutNote` và `CodeBlock` viền vuông 2px sắc nét với nút `[SAO CHÉP]`.
   - Thanh mục lục bài viết (Table of Contents) cuộn theo vị trí người đọc.

---

## 4. KIỂM THỬ TÌM KIẾM TOÀN DIỆN & SẮP XẾP BÀI VIẾT

### 4.1. Tìm kiếm trên Navbar & Bảng Tin
1. Nhấn phím tắt `/` ở bất kỳ trang nào:
   - Con trỏ tự động focus vào ô tìm kiếm trên Navbar.
2. Nhập từ khóa (ví dụ: `CI/CD` hoặc `Kubernetes`) và nhấn `Enter`:
   - Hệ thống chuyển hướng về `/?q=...` và lọc bài viết theo thời gian thực.
   - Xuất hiện Banner thông báo:
     `KẾT QUẢ TÌM KIẾM CHO: "CI/CD" (X bài viết tìm thấy)` kèm nút `[XÓA BỘ LỌC]`.
3. Nhấn `[XÓA BỘ LỌC]`:
   - Bảng tin trở lại trạng thái hiển thị toàn bộ bài viết.

### 4.2. Sắp xếp Bài Viết (Sort Engine)
- Tab `THỊNH HÀNH`: Sắp xếp theo thuật toán Gravity Decay `(Score) / (T + 2)^1.8`.
- Tab `MỚI NHẤT`: Sắp xếp theo thứ tự thời gian tạo (`created_at DESC`).
- Tab `ĐIỂM CAO`: Sắp xếp theo điểm bình chọn ròng (`net_score = upvotes - downvotes`).
- Kết hợp hoàn hảo với bộ lọc Không gian (Space Tabs bên cột trái).

---

## 5. KIỂM THỬ QUA CURL (API ENDPOINTS)

```bash
# 1. Thống kê hệ thống kèm số liệu cộng đồng
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" \
  https://acad-core-api.onrender.com/api/v1/admin/stats | jq

# 2. Danh sách người dùng kèm số bài viết (threadsCount)
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" \
  "https://acad-core-api.onrender.com/api/v1/admin/users?page=1&limit=5" | jq

# 3. Danh sách không gian quản trị (kèm memberCount và threadCount)
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" \
  https://acad-core-api.onrender.com/api/v1/admin/spaces | jq

# 4. Danh sách bài viết quản trị
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" \
  "https://acad-core-api.onrender.com/api/v1/admin/threads?page=1&limit=5" | jq

# 5. Tìm kiếm bài viết theo từ khóa
curl -s "https://acad-core-api.onrender.com/api/v1/threads?q=DevOps&sort=hot" | jq

# 6. Ghim bài viết
curl -s -X PATCH -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"isPinned": true}' \
  https://acad-core-api.onrender.com/api/v1/admin/threads/<THREAD_ID>/pin | jq

# 7. Khóa bình luận bài viết
curl -s -X PATCH -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"isLocked": true}' \
  https://acad-core-api.onrender.com/api/v1/admin/threads/<THREAD_ID>/lock | jq
```
