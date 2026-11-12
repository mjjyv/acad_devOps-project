# Hệ Thống Design Tokens — Slate Indigo Matrix (UI Design Tokens v2.1)

> **Mã tài liệu:** `STD-UI-TOKENS`  
> **Dự án:** Acad DevOps Fullstack Monorepo (**SYNAPSE Engine**)  
> **Nguồn chân lý CSS:** [`apps/web/src/app/globals.css`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/globals.css) & bảng `space_flairs` (`000002_create_community_schema.up.sql`)  
> **Tỷ lệ phối màu chủ đạo:** `#30364F` (40%) | `#ACBAC4` (35%) | `#E1D9BC` (15%) | `#F0F0DB` (10%)

---

## 1. BẢNG PHÂN BỔ 4 GAM MÀU CỐT LÕI (SLATE INDIGO MATRIX)

```text
[████████████████ #30364F (40% Slate Indigo Matrix - Nền Canvas chính)]
[██████████████   #ACBAC4 (35% Cool Pewter Slate - Viền mờ, metadata, secondary text)]
[██████           #E1D9BC (15% Warm Sandstone Silk - Brand CTA, điểm nhấn Upvote, Flair text)]
[████             #F0F0DB (10% Crisp Cream Ivory - Tiêu đề & văn bản độ tương phản cao)]
```

| Biến CSS (`globals.css`) | Giá Trị Thực Tế | Vai Trò Giao Diện |
| :--- | :---: | :--- |
| `--bg-canvas` | `#30364f` | Nền tổng thể toàn trang web |
| `--bg-surface` | `#262b40` | Thẻ bài viết (`PostCard`), Header, Sidebar cards, Chat dock |
| `--bg-surface-hover` | `#353c58` | Trạng thái Hover của thẻ, nút sidebar |
| `--bg-subtle` | `#202436` | Khối trích dẫn, hộp viết bình luận, nền code block |
| `--bg-input` | `#23283c` | Thanh tìm kiếm, ô nhập liệu |
| `--text-primary` | `#f0f0db` | Tiêu đề, nội dung bài viết và bình luận chính |
| `--text-secondary` | `#acbac4` | Metadata, thông tin tác giả, mô tả phụ |
| `--color-brand` / `--color-upvote` | `#e1d9bc` | Nút hành động chính (`primary`), điểm nhấn Upvote, biểu tượng thương hiệu |
| `--border-subtle` / `--border-strong` | `rgba(172, 186, 196, 0.22 / 0.45)` | Viền thẻ và phân cách |

---

## 2. ĐỒNG BỘ VỚI CƠ SỞ DỮ LIỆU (`space_flairs`)

Lược đồ PostgreSQL `000002_create_community_schema.up.sql` & `000006_harmonize_schema_triggers.up.sql` áp đặt giá trị mặc định đồng nhất với bảng màu này:
- `space_flairs.color_hex`: `#E1D9BC`
- `space_flairs.background_hex`: `#30364F`

---

## 3. KIỂU CHỮ & LAYOUT METRICS

- **Header height:** `--header-height: 56px`
- **Sidebar width:** `--sidebar-width: 260px`
- **Feed max width:** `--feed-max-width: 680px` (tự động giới hạn độ dài dòng đọc tối ưu)
- **Kiểu chữ kỹ thuật:** Sans-serif hiện đại cho nội dung thảo luận + Monospace cho khối code, con trỏ số liệu và chỉ mục kỹ thuật.
