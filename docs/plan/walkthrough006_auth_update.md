# Walkthrough: Khắc Phục Lỗi Render HTTP 502 & Tái Thiết Kế UI Mạng Xã Hội Kỹ Nghệ & Quản Trị Admin

Hoàn thành phân tích và xử lý triệt để sự cố HTTP ERROR 502 trên Render Cloud, đồng thời tái thiết kế toàn diện giao diện trang chủ theo mô hình **Mạng Xã Hội Kỹ Nghệ Tri-Column** và nâng cấp trang **Quản Trị ADMIN** theo đúng chuẩn **Premium Utilitarian Minimalism & Editorial UI** ([`docs/SKILL_UI.md`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/SKILL_UI.md)) với 3 tông màu chủ đạo:
- **`#12544F`**: Primary Deep Emerald Teal (Uy quyền kỹ thuật, sắc sảo)
- **`#4A4A4A`**: Neutral Slate / Graphite (Cấu trúc typography, viền và icon)
- **`#F5EFE3`**: Warm Linen / Cream Canvas (Nền ấm áp sang trọng phong cách báo chí học thuật)

---

## 1. Nguyên Nhân Sự Cố Render HTTP 502 & Giải Pháp

### Nguyên nhân
- File `deploy/render/render.yaml` trước đây sử dụng:
  ```yaml
  startCommand: node apps/web/.next/standalone/apps/web/server.js
  ```
- Do cấu trúc pnpm monorepo symlinks, lệnh `next build` không sinh tệp `server.js` tại đường dẫn này.
- Khi Render kích hoạt container, tiến trình Node.js crash ngay lập tức (`Cannot find module...`), không listen trên cổng dịch vụ -> Nginx Reverse Proxy của Render trả về **HTTP ERROR 502**.

### Giải pháp đã triển khai
- Sửa lại trong [`deploy/render/render.yaml`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/render/render.yaml):
  ```yaml
  buildCommand: pnpm install --frozen-lockfile && pnpm run build:libs && pnpm --filter @acad/web run build
  startCommand: pnpm --filter @acad/web exec next start -p $PORT -H 0.0.0.0
  ```
- Đảm bảo Next.js tự động liên kết với biến `$PORT` do Render cấp phát động và bind toàn cục vào `0.0.0.0`.

---

## 2. Các Thay Đổi Về Giao Diện & Tính Năng

### A. Hệ thống Token & CSS Toàn Cục ([`globals.css`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/globals.css))
- Khai báo đầy đủ biến CSS cho Canvas `#F5EFE3`, Primary `#12544F`, Slate `#4A4A4A`, Surface `#FFFFFF`, Border `#E6DFD5` và các gam màu pastel.
- Typography sắc nét: `-apple-system, SF Pro Display, Geist Sans, Roboto, sans-serif`.
- Loại bỏ thanh cuộn thô kệch, thay bằng scrollbar tối giản.

### B. Thanh Điều Hướng Toàn Cục ([`navbar.tsx`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/navbar.tsx))
- Nền trắng tinh khôi `#FFFFFF` với viền `#E6DFD5`.
- Brand Logo `ACAD - DevOps Community` màu xanh ngọc `#12544F`.
- Thanh tìm kiếm trung tâm toàn cầu phong cách Minimalist với phím tắt `/`.
- Nút truy cập nhanh Tài Liệu (`/docs`), Badge Admin (`/admin/users`) màu pastel `#EAF2F1` chữ `#12544F`, và hiển thị Avatar người dùng + điểm Karma tín nhiệm.
- Loại bỏ hoàn toàn emoji, sử dụng SVG icons kỹ thuật chính xác.

### C. Trang Chủ: Mạng Xã Hội Kỹ Nghệ 3 Cột ([`page.tsx`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/page.tsx))
1. **Cột Trái (Navigation Rail - 240px)**:
   - Danh mục Luồng khám phá (Toàn bộ thảo luận, Thịnh hành).
   - Danh sách Không Gian Chuyên Sâu: `s/devops-infra`, `s/docker-k8s`, `s/system-design`, `s/security-auth`, `s/ci-cd`.
   - Card lối tắt tra cứu Tài liệu & Checklist 2050 dòng.
2. **Cột Giữa (Center Stage - Social Feed)**:
   - **Khung Soạn Thảo Nhanh**: Cho phép khởi tạo chủ đề thảo luận, chọn Không gian, nhập tiêu đề và nội dung.
   - **Sorting Tabs**: Mới nhất, Bình chọn cao, Sôi nổi.
   - **Thẻ Bài Viết Xã Hội (Post Cards)**:
     - Cột Upvote/Downvote tương tác với số điểm Karma tức thì.
     - Tác giả, Space badge, thời gian đăng.
     - Tiêu đề đậm rõ ràng, nội dung tóm tắt chuyên sâu, khung trích đoạn mã nguồn (SQL/Dockerfile) font Monospace.
     - Thẻ hashtag kỹ thuật (`#PostgreSQL`, `#ltree`, `#Docker`, `#Alpine`).
     - Thanh hành động: Số bình luận, Lưu lại, Chia sẻ.
3. **Cột Phải (Community Widgets - 310px)**:
   - Widget Giới thiệu Cộng đồng Kỹ nghệ với số lượng thành viên trực tuyến.
   - Bảng Xếp Hạng Đóng Góp Tuần (Karma Leaderboard) vinh danh các kỹ sư hàng đầu.
   - Quy chuẩn thảo luận văn minh (dẫn chứng kiến trúc, benchmark).

### D. Trang Quản Trị ADMIN ([`admin/users/page.tsx`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/admin/users/page.tsx) & [`admin/layout.tsx`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/admin/layout.tsx))
- Nền canvas `#F5EFE3`, thẻ card `#FFFFFF`, viền mỏng `1px solid #E6DFD5`.
- 4 Bento KPI cards (Tổng người dùng, Đang hoạt động, Tạm khóa, Quản trị viên).
- Bảng dữ liệu người dùng chuẩn Editorial với Role & Status Badges màu pastel.
- Thao tác trực tiếp: Dropdown thay đổi vai trò tức thì, nút Khóa/Mở tài khoản, nút Thu hồi phiên.
- Phân trang sắc nét.

### E. Đồng Bộ Trang Phiên & Xác Thực
- [`settings/sessions/page.tsx`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/settings/sessions/page.tsx): Nhận diện OS/Trình duyệt, hiển thị IP, đăng xuất từng thiết bị hoặc hàng loạt.
- [`login/page.tsx`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/login/page.tsx) & [`register/page.tsx`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/register/page.tsx): Đồng bộ thiết kế tối giản cao cấp.

---

## 3. Kết Quả Kiểm Định Chất Lượng Mã Nguồn

| Hạng Mục | Kết Quả | Chi Tiết |
| :--- | :---: | :--- |
| **Monorepo Tests** | **52 / 52 PASS (100%)** | `tree-virtualizer` (3/3), `community-service` (11/11), `auth-service` (19/19), `apps/api` (19/19) |
| **Typecheck** | **PASS (100%)** | Toàn bộ 8 package đạt chuẩn TypeScript nghiêm ngặt (`tsc --noEmit`) |
| **Next.js Production Build** | **PASS (100%)** | Biên dịch thành công 15/15 static & SSG routes, First Load JS tối ưu 103 kB |
