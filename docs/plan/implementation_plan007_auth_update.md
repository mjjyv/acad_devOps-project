# Kế Hoạch Khắc Phục Lỗi Render HTTP 502 & Tái Thiết Kế UI Mạng Xã Hội Kỹ Nghệ & Quản Trị Admin

Tài liệu này phân tích chi tiết nguyên nhân sự cố HTTP ERROR 502 của `acad-web-client.onrender.com` trên Render Cloud, đồng thời trình bày kế hoạch kiến trúc tái thiết kế giao diện ứng dụng theo chuẩn **Premium Utilitarian Minimalism & Editorial UI** ([`docs/SKILL_UI.md`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/SKILL_UI.md)) với 3 tông màu chủ đạo:
- **`#12544F`**: Primary Deep Emerald Teal (Đại diện kỹ thuật uy quyền, chính xác)
- **`#4A4A4A`**: Neutral Slate / Graphite (Tông màu cấu trúc chữ, viền, icon sắc nét)
- **`#F5EFE3`**: Warm Linen / Cream Canvas (Nền ấm áp chuẩn tạp chí kỹ nghệ và tri thức)

---

## 1. Phân Tích Nguyên Nhân Gốc Rễ Lỗi HTTP 502 Trên Render

### Hiện trạng
- `https://acad-core-api.onrender.com/` chạy hoàn hảo và trả về JSON định tuyến.
- `acad-web-client.onrender.com` báo lỗi **HTTP ERROR 502 (Bad Gateway)**.

### Nguyên nhân kỹ thuật
1. **Lệnh khởi động không tìm thấy file thực thi (`startCommand`)**:
   - Trong [`deploy/render/render.yaml`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/render/render.yaml#L16):
     ```yaml
     startCommand: node apps/web/.next/standalone/apps/web/server.js
     ```
   - Trong kiến trúc pnpm monorepo hiện tại, Next.js build **không** sinh ra tệp `apps/web/.next/standalone/apps/web/server.js`.
   - Kết quả: Tiến trình `node` bị crash ngay lập tức tại bước boot container (`Cannot find module...`), port `3000` / `$PORT` không được mở -> Nginx reverse proxy của Render không kết nối được tới backend container và lập tức trả về **HTTP 502 Bad Gateway**.
2. **Giải pháp xử lý dứt điểm**:
   - Sử dụng lệnh khởi chạy Next.js tiêu chuẩn cho monorepo:
     ```yaml
     buildCommand: pnpm install --frozen-lockfile && pnpm run build:libs && pnpm --filter @acad/web run build
     startCommand: pnpm --filter @acad/web exec next start -p $PORT -H 0.0.0.0
     ```
   - Lệnh này đảm bảo Next.js tự động nhận diện đúng cổng `$PORT` do Render cấp phát động (Render native port routing) và bind trực tiếp vào interface `0.0.0.0` để tiếp nhận toàn bộ traffic internet.

---

## 2. Thiết Kế Kiến Trúc Giao Diện Mạng Xã Hội Kỹ Nghệ (Social Feed)

Hiện tại trang chủ `apps/web/src/app/page.tsx` là landing page tĩnh. Để biến trang chủ thành **Mạng Xã Hội Chuyên Sâu IT / DevOps Doanh Nghiệp thực thụ**, giao diện sẽ được tổ chức theo bố cục **3 Cột Tiêu Chuẩn (Tri-Column Layout)** kết hợp nguyên tắc thẩm mỹ của `docs/SKILL_UI.md`:

```
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TOP NAVBAR (#FFFFFF / #F5EFE3)                            │
│  [ACAD TECH COMMUNITY]     [ 🔍 Tìm kiếm bài viết, mã nguồn, tag...]     [Docs] [User/Admin]│
├─────────────────┬─────────────────────────────────────────────────────────┬───────────────┤
│  LEFT RAIL      │                     CENTER STAGE                        │  RIGHT RAIL   │
│  (Navigation)   │                     (Social Feed)                       │  (Widgets)    │
│                 │                                                         │               │
│ • Tất cả bài viết│ ┌─────────────────────────────────────────────────────┐ │ • Về Cộng Đồng│
│ • Thịnh hành 🔥 │ │ [ Khung Tạo Bài Viết Nhanh / Thảo Luận Mới ]        │ │ • Top Spaces  │
│ • Đang theo dõi │ └─────────────────────────────────────────────────────┘ │   s/devops-k8s│
│                 │ ┌─ Tab: Mới nhất | Bình chọn cao | Tranh luận nóng ─┐ │   s/sys-design│
│ CÁC KHÔNG GIAN: │ │                                                   │ │   s/cloud-arch│
│ s/devops-infra  │ │ [BÀI VIẾT 1]: Phân tích kiến trúc ltree trong Pg  │ │ • Top Kỹ Sư   │
│ s/docker-k8s    │ │ ▲ +142 ▼  | s/sys-design | Tác giả: @alex_dev     │ │   (Karma Board)│
│ s/system-design │ │ [Trích đoạn bài viết + Code snippet + Tags]       │ │ • Quy chuẩn   │
│ s/security-auth │ │ 💬 38 Thảo luận  |  🔖 Lưu lại  |  ↗ Chia sẻ      │ │   thảo luận   │
│                 │ └─────────────────────────────────────────────────────┘ │               │
└─────────────────┴─────────────────────────────────────────────────────────┴───────────────┘
```

### Các thành phần chính của Mạng Xã Hội:
1. **Khung Soạn Bài Viết Nhanh (Create Post Box)**:
   - Cho phép người dùng nhập nhanh tiêu đề, nội dung, chọn Space chủ đề (`s/devops-infra`, `s/docker-k8s`, `s/security-auth`).
   - Tích hợp nút chèn code snippet, định dạng kỹ thuật.
2. **Thẻ Bài Viết Xã Hội (Social Post Cards)**:
   - Cột điểm Karma / Upvote-Downvote tương tác tức thì (sử dụng icon SVG tối giản, không dùng emoji).
   - Tên tác giả, không gian chuyên môn (Space badge màu pastel `#EAF2F1` chữ `#12544F`), thời gian đăng.
   - Tiêu đề đậm rõ ràng, tóm tắt nội dung kèm khung mã nguồn/kiến trúc.
   - Thẻ chủ đề (Tags) bo góc `4px`, chữ xám `#4A4A4A`.
   - Thanh tương tác: Số lượng bình luận phân cấp, nút Chia sẻ, Bookmark.
3. **Sidebar Điều Hướng & Widgets Xã Hội**:
   - Bảng xếp hạng Kỹ sư uy tín (Karma Leaderboard).
   - Danh sách Không gian chuyên môn (Spaces Directory).
   - Liên kết nhanh tài liệu hướng dẫn và checklist (`/docs`).

---

## 3. Cập Nhật Trang Quản Trị ADMIN (`/admin/users`)

Trang Admin sẽ được nâng cấp giao diện toàn diện để đồng bộ chuẩn thiết kế `docs/SKILL_UI.md`:
1. **Bảng màu chủ đạo**: Nền canvas `#F5EFE3`, thẻ card `#FFFFFF`, viền `1px solid #E6DFD5`, chữ chính `#4A4A4A`, điểm nhấn thương hiệu `#12544F`.
2. **4 Thẻ KPI Tối Giản**: Thống kê số lượng (Tổng người dùng, Tài khoản hoạt động, Tài khoản khóa, Quản trị viên) với typography tương phản cao.
3. **Bảng Dữ Liệu Người Dùng Đẳng Cấp**:
   - Header bảng nền kem `#FAF7F2`, viền dưới `1px solid #E6DFD5`.
   - Badges vai trò tinh tế: `ADMIN` (xanh ngọc teal pastel `#EAF2F1`, chữ `#12544F`), `MOD` (vàng ngà pastel `#FDF6E2`, chữ `#8C6514`), `USER` (xám slate pastel `#F0F0EE`, chữ `#4A4A4A`).
   - Badges trạng thái: `ACTIVE` (xanh lá pastel nhạt `#EDF7ED`, chữ `#1E4620`), `SUSPENDED` (đỏ pastel nhạt `#FDEBEC`, chữ `#9F2F2D`).
   - Thao tác trực tiếp: Dropdown thay đổi vai trò tức thì, nút Khóa/Mở tài khoản, nút Thu hồi toàn bộ phiên đăng nhập.
4. **Modal / Notification Xác Nhận Hành Động**: Thay thế hoàn toàn alert mặc định bằng thông báo mượt mà.

---

## 4. Danh Mục Tệp Tin Đề Xuất Thay Đổi

### A. Hạ Tầng & Triển Khai
- `deploy/render/render.yaml`: Sửa `startCommand` thành lệnh chạy chuẩn Next.js và cập nhật `buildCommand`.
- `apps/web/next.config.mjs`: Giữ nguyên hoặc tối ưu cấu hình Next.js.

### B. Tokens & Toàn Cục UI
- `apps/web/src/app/globals.css` [NEW]: Thiết lập các biến CSS tokens (`--color-canvas: #F5EFE3`, `--color-primary: #12544F`, `--color-neutral: #4A4A4A`), font chữ SF Pro / Geist Sans, loại bỏ scrollbar thô, áp dụng typographic scale.
- `apps/web/src/app/layout.tsx`: Import `globals.css` và cấu hình typography hệ thống.
- `apps/web/src/components/navbar.tsx`: Nâng cấp Navbar với bảng màu mới, search input hiện đại, menu hồ sơ và nút truy cập Admin.

### C. Mạng Xã Hội Trang Chủ
- `apps/web/src/app/page.tsx`: Thiết kế lại hoàn chỉnh thành Social Network Feed 3 cột (Left Rail, Center Feed, Right Rail) kèm Create Post Box, Post Card tương tác, Upvote/Downvote, Spaces filter, Tags.

### D. Trang Quản Trị ADMIN & Quản Lý Phiên
- `apps/web/src/app/admin/layout.tsx`: Cập nhật layout Admin theo tông màu `#F5EFE3` & `#FFFFFF`, breadcrumbs trang nhã.
- `apps/web/src/app/admin/users/page.tsx`: Nâng cấp giao diện bảng quản trị, thanh tìm kiếm, bộ lọc role/status và KPI cards theo `docs/SKILL_UI.md`.
- `apps/web/src/app/settings/sessions/page.tsx`: Cập nhật giao diện quản lý phiên đăng nhập sang bộ màu mới.
- `apps/web/src/app/login/page.tsx` & `apps/web/src/app/register/page.tsx`: Cập nhật giao diện đăng nhập/đăng ký đồng bộ phong cách tối giản cao cấp.

---

## 5. Kế Hoạch Kiểm Định (Verification Plan)

### Automated Tests & Quality Gate
1. `pnpm run build:libs`: Biên dịch các thư viện packages.
2. `pnpm run typecheck`: Kiểm tra tính toàn vẹn kiểu dữ liệu TypeScript trên cả 8 packages.
3. `pnpm test`: Chạy 52/52 unit & integration tests trong monorepo.
4. `pnpm --filter @acad/web run build`: Kiểm tra Next.js production build, bảo đảm tạo đủ 15 static/SSG pages và middleware không lỗi.

### Render Cloud & Git
1. Commit sạch các thay đổi và push lên remote `origin/main`.
2. Kiểm tra log deploy trên Render Cloud để xác nhận `acad-web-client` boot thành công và phản hồi HTTP 200 thay vì HTTP 502.
