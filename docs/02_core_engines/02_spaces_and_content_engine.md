# Động Cơ Không Gian Thảo Luận & Nội Dung Đa Định Dạng (Spaces & CMS Engine)

> **Mã tài liệu:** `CORE-SPACES-CMS`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Mã nguồn:** [`services/community`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community), [`apps/api/src/routes/community-router.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/community-router.ts)

---

## 1. MÔ HÌNH KHÔNG GIAN THẢO LUẬN (SPACES / SUBREDDIT ANALOGUE)

Mỗi không gian (Space `/s/[slug]`) là một cộng đồng độc lập tương tự Subreddit (`r/...`):
- **Quy tắc cộng đồng (Space Rules):** Danh sách các quy chuẩn được lưu dưới dạng JSONB trong CSDL (`rules`), hiển thị trên thanh công cụ bên phải để thành viên tuân thủ trước khi đăng bài.
- **Vai trò trong không gian (Space Roles):**
  - `MEMBER`: Thành viên thông thường, có quyền đăng bài, bình luận, vote.
  - `MODERATOR`: Quản trị viên không gian, có quyền ghim bài (Pin/Highlight), khóa bình luận (Lock), xóa bài vi phạm.
  - `ADMIN`: Người tạo không gian, có toàn quyền chỉnh sửa thông tin, banner, rules, và phân quyền cho moderators.
- **Thống kê thời gian thực:** Tự động đếm chính xác số lượng thành viên (`memberCount`) và số lượng bài viết (`threadCount`).

---

## 2. HỆ THỐNG NHÃN PHÂN LOẠI (POST FLAIRS)

Để phục vụ môi trường kỹ thuật chuyên sâu, bài viết trong mỗi Space có thể được gắn kèm một nhãn phân loại (Post Flair):

| Nhãn Flair | Màu Sắc Brutalist | Ý Nghĩa Chuyên Môn |
| :--- | :---: | :--- |
| **`[DevOps]`** | `#DFD0B8` trên `#393E46` | Quy trình phát triển, tích hợp CI/CD, Container, Automation |
| **`[SecOps]`** | `#EF4444` trên `#393E46` | An ninh hệ thống, phát hiện lỗ hổng, Zero-Trust |
| **`[SystemArch]`** | `#3B82F6` trên `#393E46` | Thiết kế kiến trúc chịu tải cao, Microservices, Database |
| **`[Incident]`** | `#F97316` trên `#393E46` | Báo cáo phân tích sự cố thực tế (Post-Mortem Reports) |
| **`[Question]`** | `#22C55E` trên `#393E46` | Thắc mắc kỹ thuật, gỡ lỗi, yêu cầu trợ giúp |

---

## 3. CƠ CHẾ TẢI NỘI DUNG ĐA PHƯƠNG TIỆN ZERO-HOP (ZERO-HOP MEDIA UPLOAD)

Nhằm bảo vệ băng thông và tài nguyên CPU của máy chủ Backend API:
1. Client gửi yêu cầu lấy URL tải ảnh lên: `POST /api/v1/media/presigned-url { filename, mimeType, size }`.
2. Backend kiểm tra quyền hạn và cấp phát một URL ký trước (Presigned PUT URL) kết nối trực tiếp tới kho lưu trữ đối tượng tương thích S3 (Cloudflare R2 / AWS S3) có thời hạn 5 phút.
3. Trình duyệt người dùng thực hiện lệnh `PUT` tải ảnh trực tiếp lên Cloudflare R2 mà không đi qua máy chủ Node.js trung gian (Zero-hop).
4. Sau khi tải thành công, Client đính kèm URL CDN công khai vào nội dung bài viết và gửi lệnh tạo bài viết.
