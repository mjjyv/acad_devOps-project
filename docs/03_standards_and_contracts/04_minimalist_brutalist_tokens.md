# Ngôn Ngữ Thiết Kế & Design Tokens Brutalist Dark Mode (UI Design Tokens)

> **Mã tài liệu:** `STD-UI-TOKENS`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Gói thư viện:** [`packages/ui-tokens`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/ui-tokens)  
> **Tỷ lệ phối màu chủ đạo:** `#222831` (40%), `#393E46` (25%), `#948979` (15%), `#DFD0B8` (15%)

---

## 1. BẢNG PHÂN BỔ 4 GAM MÀU CỐT LÕI (COLOR HIERARCHY)

Hệ thống giao diện triệt tiêu hoàn toàn phong cách bo tròn và màu neon chói mắt, áp dụng phong cách **Minimalist Brutalism Dark Mode**:

```
[████████████████ #222831 (40% Deep Void Charcoal - Nền Canvas)]
[██████████ #393E46 (25% Industrial Graphite - Bề mặt Thẻ & Container)]
[██████ #948979 (15% Muted Earthy Taupe - Viền Dứt Khoát & Metadata)]
[██████ #DFD0B8 (15% Warm Parchment - Text Tiêu Đề & Nút Hành Động Hero)]
```

| Mã Màu HEX | Tỷ Lệ | Tên Kỹ Thuật | Ứng Dụng Trong Giao Diện |
| :---: | :---: | :--- | :--- |
| **`#222831`** | **40%** | **Deep Void Charcoal** | Nền chính của toàn bộ body trang web, backdrop modal. |
| **`#393E46`** | **25%** | **Industrial Graphite** | Thẻ bài viết (Thread Cards), thanh Navbar, Sidebar, khung Chat. |
| **`#948979`** | **15%** | **Muted Earthy Taupe** | Viền dứt khoát `border: 1px solid #948979`, đường kẻ cây bình luận, thời gian. |
| **`#DFD0B8`** | **15%** | **Warm Parchment** | Chữ tiêu đề `h1, h2, h3`, nút bấm CTA chính, bóng đổ phẳng tương phản cao. |

---

## 2. QUY CHUẨN ĐỔ BÓNG PHẲNG DỨT KHOÁT (HARD FLAT SHADOWS)

Tuyệt đối không dùng blur shadow mờ nhạt (`box-shadow: 0 4px 6px rgba(...)`). Thay vào đó sử dụng bóng đổ phẳng góc 45°:
- **Trạng thái tĩnh:** `box-shadow: 3px 3px 0px #948979;`
- **Trạng thái Hover / Active:**
  ```css
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0px #DFD0B8;
  ```

---

## 3. KIỂU CHỮ KỸ THUẬT & PHÍM TẮT (TYPOGRAPHY)

- **Font chữ đọc chính:** `Inter` hoặc hệ thống system sans-serif (`color: #DFD0B8`).
- **Font chữ kỹ thuật / Số liệu:** `JetBrains Mono` cho nhãn badge, điểm số voting, karma, đường dẫn URL (`color: #DFD0B8` hoặc `#948979`).
- **Bo góc cực tiểu:** Triệt tiêu hoàn toàn góc bo tròn (`border-radius: 0px` đến tối đa `2px`).
