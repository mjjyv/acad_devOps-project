# Kế hoạch Chi tiết Xây dựng Giao diện Web Bọc Tài Liệu Dự Án (Documentation Portal)

## Tổng quan & Bối cảnh

Dự án hiện đã hoàn thiện một khối lượng lớn tài liệu đặc tả kỹ thuật chuyên sâu tại thư mục `docs/`:
- **PRD & Định vị sản phẩm**: [PRD_STAGE_1_DISCOVERY.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-1/PRD_STAGE_1_DISCOVERY.md)
- **Đặc tả An ninh & Ma trận RBAC/ABAC**: [AUTH_SECURITY_SPECIFICATION.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-1/AUTH_SECURITY_SPECIFICATION.md)
- **Thiết kế UI/UX & Kiến trúc Hệ thống**: [UI_UX_DESIGN_SPECIFICATION.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-2/UI_UX_DESIGN_SPECIFICATION.md)
- **Cẩm nang Vận hành DevOps & CI/CD**: [DEVOPS_SETUP_GUIDE.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-3/DEVOPS_SETUP_GUIDE.md)
- **Checklist 7 Giai đoạn (2050 dòng)**: [acad_devOps-project-docs-checklist.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs-checklist.md)
- **Kế hoạch & Báo cáo Nghiệm thu qua các giai đoạn**: [docs/plan/](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/plan/)

Theo yêu cầu của người dùng, chúng ta cần:
1. **Duy trì việc commit & push GitHub sau mỗi lần triển khai** (đã hoàn thành đẩy mã nguồn Auth giai đoạn 4 lên remote `main` tại commit `2128a1a`).
2. **Xây dựng một giao diện web chuyên biệt để bọc và trình diễn toàn bộ tài liệu dự án** (Documentation Portal), giúp các lập trình viên, DevOps engineers và ban dự án có một trang web trực quan, tra cứu dễ dàng.
3. **Note lại mọi thứ hữu ích vào dữ liệu của trang web tài liệu đó**: Trích lọc các bí kíp, lưu ý bảo mật, cheat sheet câu lệnh Docker/Git/Redis/Postgres, công thức thuật toán, bảng mã lỗi và ma trận quyền hạn thành một kho dữ liệu có cấu trúc (`docs-data`), cho phép tìm kiếm nhanh (`Ctrl + K`) và hiển thị trực quan.

---

## User Review Required

> [!IMPORTANT]
> **Vị trí Triển khai Giao diện Tài liệu**:
> - Tích hợp phân hệ Docs Portal trực tiếp vào ứng dụng Frontend `apps/web` tại route **`/docs`** (và các route con như `/docs/checklist`, `/docs/security`, `/docs/architecture`, `/docs/devops`, `/docs/api`).
> - **Lợi ích**: Tận dụng trực tiếp hệ thống Design Tokens `@acad/ui-tokens`, chia sẻ layout với Next.js 15, tối ưu hiệu năng SSR/RSC, không làm phát sinh thêm container hay port mới khi đóng gói Docker và deploy lên Render Cloud.

> [!NOTE]
> **Tổ chức Dữ liệu & Ghi chú Kỹ thuật (Technical Notes & Cheat Sheets)**:
> Mỗi tài liệu sẽ được cấu trúc với:
> 1. **Quick Notes & Key Takeaways** ở đầu trang: Tóm tắt 3-5 điểm cốt lõi nhất cần nhớ.
> 2. **Cheat Sheet & Code Snippets**: Bảng tra cứu lệnh, mã nguồn mẫu có nút "Copy to Clipboard".
> 3. **Interactive Diagrams**: Sơ đồ kiến trúc, DAG flows hiển thị trực quan.
> 4. **Interactive Checklist Tracker**: Bảng theo dõi tiến độ thực tế 7 giai đoạn có thanh phần trăm hoàn thành và bộ lọc trạng thái.

---

## Open Questions

Không có câu hỏi chặn. Thiết kế giao diện và cấu trúc dữ liệu tuân thủ hoàn toàn Design Tokens trong `@acad/ui-tokens` và phong cách tối ưu của Next.js 15 App Router.

---

## Proposed Changes

```
┌────────────────────────────────────────────────────────────────────────┐
│                   KIẾN TRÚC GIAO DIỆN WEB TÀI LIỆU (/docs)             │
└────────────────────────────────────────────────────────────────────────┘
 ┌──────────────────────────────────────────────────────────────────────┐
 │ TOP NAVBAR: Logo | Global Search (Ctrl+K) | Stage Badges | GitHub    │
 └──────────────────────────────────┬───────────────────────────────────┘
                                    │
 ┌──────────────────────┬───────────┴───────────────┬───────────────────┐
 │ LEFT SIDEBAR         │ CENTER CONTENT STAGE      │ RIGHT SIDEBAR     │
 │ (Cây Điều Hướng)     │ (Nội Dung & Ghi Chú)      │ (Table of Contents│
 │                      │                           │  - On this page)  │
 │ ├─ 1. Khảo sát & PRD │ ├─ Breadcrumbs            │                   │
 │ ├─ 2. An ninh & Auth │ ├─ Key Takeaways Callout  │ ├─ H2: Khảo sát   │
 │ ├─ 3. Kiến trúc CSDL │ ├─ Nội dung chi tiết      │ ├─ H2: Ma trận    │
 │ ├─ 4. DevOps & Cloud │ ├─ Code Blocks (Copyable) │ ├─ H3: Grace 30s  │
 │ ├─ 5. Checklist 7 GĐ │ ├─ Interactive Diagrams   │ └─ H3: Token Reuse│
 │ └─ 6. Báo cáo & Plans│ └─ Next/Prev Navigation   │                   │
 └──────────────────────┴───────────────────────────┴───────────────────┘
```

---

### Component 1: Kho Dữ liệu Cấu trúc & Ghi Chú Kỹ thuật (`apps/web/src/lib/docs-data`)

Tạo module dữ liệu tài liệu có cấu trúc, bao gồm toàn bộ nội dung từ `docs/` kết hợp với các ghi chú kỹ thuật cốt lõi (Cheat sheets, key notes).

#### [NEW] [apps/web/src/lib/docs-data/types.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/docs-data/types.ts)
- Định nghĩa các kiểu dữ liệu cho tài liệu:
  - `DocItem`: id, slug, title, category, description, stage, keyTakeaways, content, updatedAt, tags.
  - `ChecklistItem`: id, stageNumber, stageTitle, taskName, description, status (`COMPLETED` | `IN_PROGRESS` | `PLANNED`), deliverables, tags.
  - `CheatSheetItem`: category, command/pattern, explanation, example.

#### [NEW] [apps/web/src/lib/docs-data/docs-registry.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/docs-data/docs-registry.ts)
- Đăng ký danh mục toàn diện các chuyên mục tài liệu:
  1. `discovery`: Tổng quan dự án, PRD, OKRs, Chân dung người dùng & 5 Luồng tương tác cốt lõi.
  2. `security`: An ninh Auth, Ma trận phân quyền RBAC/ABAC, Token Rotation DAG, Grace Period 30s, Token Reuse Attack.
  3. `architecture`: Lược đồ CSDL PostgreSQL 16 (`ltree`, `thread_counters`), Design Tokens, Gravity Decay, Cây bình luận $\mathcal{O}(N)$, OpenAPI 3.1 & SSE.
  4. `devops`: Docker Compose 4 containers, Multi-stage Docker builds, CI/CD Pipeline 4 cổng GitHub Actions, Render Cloud Blueprint & Keep-alive.
  5. `plans`: Báo cáo nghiệm thu & kế hoạch chi tiết từ Giai đoạn 1 đến Giai đoạn 4.

#### [NEW] [apps/web/src/lib/docs-data/checklist-data.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/docs-data/checklist-data.ts)
- Phân tích và cấu trúc hóa toàn bộ 7 giai đoạn trong checklist thành dữ liệu tương tác:
  - Giai đoạn 1: Discovery & Product Definition (Trạng thái: COMPLETED - 100%)
  - Giai đoạn 2: Design & Architecture (Trạng thái: COMPLETED - 100%)
  - Giai đoạn 3: Foundation & DevOps Setup (Trạng thái: COMPLETED - 100%)
  - Giai đoạn 4: Core Development & Integration (Phân hệ 4.1 Auth: COMPLETED, các phân hệ tiếp theo: IN_PROGRESS)
  - Giai đoạn 5: Testing & QA (Trạng thái: PLANNED)
  - Giai đoạn 6: Production Hardening (Trạng thái: PLANNED)
  - Giai đoạn 7: Launch & Post-Launch (Trạng thái: PLANNED)

#### [NEW] [apps/web/src/lib/docs-data/cheat-sheets.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/docs-data/cheat-sheets.ts)
- Tổng hợp các ghi chú hữu ích phục vụ devops và lập trình:
  - Docker & Database CLI Commands (khởi động cụm, psql, redis-cli)
  - Token Rotation Rules (Cookie flags, TTLs, Lua scripts, Grace period logic)
  - Tree Virtualizer & ltree Base36 formulas
  - REST & SSE Event Types (`thread_voted`, `comment_created`, `reputation_changed`)

---

### Component 2: Các Thành phần Giao diện Tài liệu (`apps/web/src/components/docs`)

Xây dựng các component giao diện trực quan tái sử dụng chuẩn theo Design Tokens.

#### [NEW] [apps/web/src/components/docs/docs-header.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/docs/docs-header.tsx)
- Top Navigation Bar với logo, breadcrumbs, nút Search Modal `Ctrl+K`, nút chuyển chế độ, liên kết GitHub và nút quay lại ứng dụng chính.

#### [NEW] [apps/web/src/components/docs/docs-sidebar.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/docs/docs-sidebar.tsx)
- Left Rail Sidebar phân cấp theo từng giai đoạn, highlight trang hiện tại, hiển thị badge trạng thái (Done / In Progress).

#### [NEW] [apps/web/src/components/docs/docs-toc.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/docs/docs-toc.tsx)
- Right Rail Table of Contents trích xuất các tiêu đề H2, H3, hỗ trợ cuộn mượt và highlight theo vị trí cuộn trang.

#### [NEW] [apps/web/src/components/docs/docs-search-modal.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/docs/docs-search-modal.tsx)
- Modal tìm kiếm nhanh toàn văn (Full-text search) có hỗ trợ phím tắt `Ctrl + K` hoặc `Cmd + K`, gợi ý từ khóa tức thì.

#### [NEW] [apps/web/src/components/docs/code-block.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/docs/code-block.tsx)
- Khung mã nguồn đẹp mắt, có tên file, badge ngôn ngữ (TypeScript, Bash, SQL, YAML), và nút "Copy code".

#### [NEW] [apps/web/src/components/docs/callout-note.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/docs/callout-note.tsx)
- Các khối ghi chú nổi bật (Important, Note, Tip, Warning, Danger) để nhấn mạnh các kiến thức an ninh và quy chuẩn kiến trúc.

---

### Component 3: Các Trang Portal Tài Liệu trong Next.js App Router (`apps/web/src/app/docs`)

#### [NEW] [apps/web/src/app/docs/layout.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/docs/layout.tsx)
- Layout 3 cột chuyên dụng cho phân hệ tài liệu (Left Sidebar, Main Content, Right TOC) tuân thủ tỉ lệ Design Tokens (`leftRailWidth: 240px`, `centerStageMaxWidth: 820px`, `rightRailWidth: 280px`).

#### [NEW] [apps/web/src/app/docs/page.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/docs/page.tsx)
- Trang chủ cổng tài liệu:
  - Tổng quan kiến trúc hệ thống
  - Bảng thống kê tiến độ các giai đoạn
  - Quick Access Cards dẫn tới các tài liệu trọng điểm (PRD, Auth Security, PostgreSQL Architecture, DevOps Guide, 7-Stage Checklist)
  - Quick Cheat Sheet các lệnh thường dùng

#### [NEW] [apps/web/src/app/docs/[category]/[slug]/page.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/docs/[category]/[slug]/page.tsx)
- Trang xem chi tiết tài liệu:
  - Header với badge giai đoạn, tác giả, thời gian cập nhật
  - Hộp Callout "Key Takeaways" tóm tắt điểm cốt lõi
  - Nội dung bài viết với sơ đồ trực quan và code blocks
  - Bộ điều hướng bài trước / bài sau

#### [NEW] [apps/web/src/app/docs/checklist/page.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/docs/checklist/page.tsx)
- Trang tương tác Checklist 7 Giai đoạn:
  - Thanh tiến độ tổng thể (Overall Progress Bar: ví dụ 55% đã hoàn thành)
  - Thống kê theo giai đoạn: GĐ 1 (100%), GĐ 2 (100%), GĐ 3 (100%), GĐ 4 (35%), GĐ 5-7 (0%)
  - Bộ lọc tác vụ: Tất cả / Đã hoàn thành / Đang thực hiện / Dự kiến
  - Bảng danh mục công việc chi tiết trích xuất từ `acad_devOps-project-docs-checklist.md`

#### [MODIFY] [apps/web/src/app/page.tsx](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/page.tsx)
- Bổ sung nút bấm nổi bật "📚 Xem Tài Liệu Kỹ Thuật (/docs)" tại trang chủ và thanh điều hướng để người dùng truy cập ngay lập tức.

---

## Verification Plan

### Automated Tests
1. **Kiểm tra Tính Toàn Vẹn Kiểu (Type Integrity)**:
   ```bash
   pnpm run typecheck
   ```
   - Xác minh toàn bộ mã nguồn của docs portal không có lỗi kiểu TypeScript.
2. **Kiểm thử Monorepo**:
   ```bash
   pnpm test
   ```
   - Xác minh toàn bộ 45 unit/integration test suites vẫn đạt 100% PASS.
3. **Kiểm tra Next.js Build**:
   ```bash
   pnpm --filter @acad/web run build
   ```
   - Xác minh Next.js App Router build thành công tất cả các route tĩnh và động của `/docs`.

### Manual Verification
1. Chạy máy chủ `apps/web`: `pnpm --filter @acad/web run dev`.
2. Truy cập trình duyệt tại `http://localhost:3000/docs`:
   - Kiểm tra giao diện 3 cột, bảng màu dark/light phù hợp Design Tokens.
   - Thử nghiệm nhấn phím `Ctrl + K` mở Search Modal, tìm kiếm bài viết.
   - Xem trang Checklist tại `/docs/checklist`, kiểm tra thanh tiến độ và bộ lọc.
   - Thử nghiệm xem các trang tài liệu cụ thể: PRD, Auth Security, DevOps Guide.
3. **Cam kết Thực thi**: Tiếp tục commit & push lên GitHub remote sau khi hoàn thành triển khai theo đúng chỉ thị của người dùng.
