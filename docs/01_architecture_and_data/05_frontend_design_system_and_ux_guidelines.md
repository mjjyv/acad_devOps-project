# Hệ Thống Thiết Kế Giao Diện & Trải Nghiệm Người Dùng (Design System & UX v2.1)

> **Mã tài liệu:** `DESIGN-SYSTEM-FRONTEND-UX`  
> **Dự án:** Acad DevOps Fullstack Monorepo (**SYNAPSE Engine**)  
> **Nền tảng:** Next.js `15.5.29` (App Router), React 19, Custom CSS Tokens ([`globals.css`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/globals.css))

---

## 1. BẢNG MÀU CHUẨN SLATE INDIGO MATRIX (40 / 35 / 15 / 10)

| Nhóm Token | Giá Trị CSS (`globals.css`) | Ứng Dụng UI |
| :--- | :--- | :--- |
| **Nền & Bề mặt (40%)** | `--bg-canvas: #30364f`, `--bg-surface: #262b40`, `--bg-subtle: #202436`, `--bg-input: #23283c` | Nền trang, Card bài viết, Header, Sidebar, Chat Dock |
| **Viền & Chữ phụ (35%)** | `--text-secondary: #acbac4`, `--text-muted: #8896a2`, `--border-subtle: rgba(172,186,196,0.22)` | Metadata, tác giả, đường phân cách, đường kẻ nhánh comment |
| **Điểm nhấn Thương hiệu (15%)** | `--color-brand: #e1d9bc`, `--color-upvote: #e1d9bc`, `--border-focus: #e1d9bc` | Nút `primary`, icon thương hiệu, Upvote active, badge Flair |
| **Chữ tương phản cao (10%)** | `--text-primary: #f0f0db`, `--text-inverse: #30364f` | Tiêu đề, nội dung bài viết/bình luận, chữ trên nút vàng kem |
| **Trạng thái Semantic** | `--color-downvote: #f87171`, `--color-success: #86efac`, `--color-warning: #fde047` | Downvote, SSE Online dot, cảnh báo |

---

## 2. BỐ CỤC 3 CỘT & DANH SÁCH ROUTES THỰC TẾ

- **App Shell 3 cột:** `Header` cố định (`56px`, tìm kiếm phím `/`) + `LeftSidebar` (`260px`) + `Main Feed` (`max-width: 680px`) + `RightRail` + `BottomNav` (mobile) + `FloatingChatWidget` (tự ẩn trên `/chat`).
- **Bản đồ Routes App Router:**
  - `/`: Trang chủ & bảng tin (`?tab=following` cho **Home** cá nhân / `?tab=for_you&sort=hot|new|top|best` cho **Popular**).
  - `/explore` *(Mục tiêu Giai đoạn C)*: Duyệt toàn bộ không gian, lọc theo `Topics`, tìm kiếm Space, Join/Leave ngay.
  - `/s/[slug]`: Không gian thảo luận chi tiết (Flairs, Sort bar, In-Space `pg_trgm` Search, Infinite Scroll, kiểm tra Space riêng tư 403).
  - `/threads/[id]`: Chi tiết bài viết, Render Markdown an toàn, Vote FSM, `CommentTree` (`Theo nhánh`/`Nổi bật`/`Mới nhất` + cuốn chiếu batch 80 + Capped Depth 8 `@mention`), `ReportModal`.
  - `/submit`: Soạn thảo bài viết `TEXT`/`LINK`/`MEDIA` kèm xem trước Markdown thật & Upload Zero-Hop.
  - `/u/[username]`: Hồ sơ công khai (ẩn PII `email`) + khởi tạo Direct Chat 1-1.
  - `/chat`: Không gian Chat toàn màn hình (`Direct`, `Groups`, `Requests` Incoming/Sent, `Chat Threads`, nút **Create Chat theo Username**).
  - `/settings/sessions`: Quản trị & thu hồi phiên đăng nhập đa thiết bị.
  - `/admin`: Admin Console 5 tabs (`Tổng quan`, `Báo cáo`, `Người dùng`, `Không gian`, `Bài viết`).

---

## 3. NGUYÊN TẮC UX TRẠNG THÁI RỖNG & TƯƠNG TÁC THẬT (ZERO FAKE UI)

1. **Tài khoản mới (Empty-State CTA):** Không bao giờ để người dùng mới rơi vào màn hình cụt:
   - Tab `Home` khi chưa tham gia Space nào phải có nút dẫn thẳng sang `/explore`.
   - Tab `Chat` khi chưa có kênh nào phải có nút **Create Chat / Search for people by username** ngay tại màn hình trống để bắt đầu trò chuyện được ngay.
2. **Không dùng Toast giả thay cho điều hướng:** Mọi item điều hướng (`Home`, `Popular`, `Explore`, `Topics`, `Recent Posts`) bắt buộc phải đổi route/lọc dữ liệu thật, không chỉ hiện `showToast(...)`.
