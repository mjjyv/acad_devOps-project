# Kiến Trúc Giao Diện & Quản Lý Trạng Thái 3 Tầng (Frontend State Architecture)

> **Mã tài liệu:** `ARCH-FRONTEND-STATE`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Framework:** Next.js 15 (App Router), React 19, Tailwind CSS v4, `@acad/ui-tokens`

---

## 1. MÔ HÌNH PHÂN TẦNG TRẠNG THÁI 3 LỚP (THREE-TIER STATE MANAGEMENT)

Nhằm tối ưu hóa hiệu năng, loại bỏ re-render lan truyền và đảm bảo tính nhất quán dữ liệu, giao diện người dùng phân ranh giới rõ ràng giữa 3 tầng trạng thái:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      3 TẦNG TRẠNG THÁI GIAO DIỆN                      │
├─────────────────────┬─────────────────────┬────────────────────────────┤
│ 1. SERVER STATE     │ 2. CLIENT UI STATE  │ 3. URL QUERY PARAMS STATE  │
├─────────────────────┼─────────────────────┼────────────────────────────┤
│ • TanStack Query v5 │ • Zustand Store     │ • nuqs (Type-safe search)  │
│ • Dữ liệu API Server│ • Mở/Đóng Sidebar   │ • Bộ lọc Feed (hot/new/top)│
│ • Bảng tin, Bình luận│• Thu gọn nhánh Cây │ • Mốc thời gian (t=day)    │
│ • Infinite Cursor   │ • Trạng thái Modal  │ • Con trỏ trang (cursor)   │
│ • Tự động Garbage   │ • Pop-out Chat View │ • Bộ lọc Không gian (space)│
│   Collection & Cache│ • Chủ đề giao diện  │ • Từ khóa tìm kiếm (q)     │
└─────────────────────┴─────────────────────┴────────────────────────────┘
```

---

## 2. MÁY TRẠNG THÁI HỮU HẠN CỦA THAO TÁC BẦU CHỌN (VOTE ACTION FSM)

Nút Upvote/Downvote áp dụng máy trạng thái hữu hạn với cập nhật lạc quan (Optimistic UI Mutation):

```text
BẢNG CHUYỂN TRẠNG THÁI [VoteAction FSM]:
---------------------------------------------------------------------------------------------------------------
Trạng Thái Ban Đầu   | Sự Kiện Bấm Nút | Trạng Thái Kế Tiếp | Thay Đổi Điểm Số | Hiệu Ứng Giao Diện / Tác Vụ Phụ
---------------------------------------------------------------------------------------------------------------
IDLE_UNVOTED         | CLICK_UP        | OPTIMISTIC_UP      | +1               | Up sáng cam; Gọi API(UP)
IDLE_UNVOTED         | CLICK_DOWN      | OPTIMISTIC_DOWN    | -1               | Down sáng xanh; Gọi API(DOWN)
UPVOTED              | CLICK_UP        | OPTIMISTIC_UNVOTE  | -1               | Up tắt; Gọi API(UNVOTE)
UPVOTED              | CLICK_DOWN      | OPTIMISTIC_DOWN    | -2               | Up tắt, Down sáng; Gọi API(DOWN)
DOWNVOTED            | CLICK_DOWN      | OPTIMISTIC_UNVOTE  | +1               | Down tắt; Gọi API(UNVOTE)
DOWNVOTED            | CLICK_UP        | OPTIMISTIC_UP      | +2               | Down tắt, Up sáng; Gọi API(UP)
OPTIMISTIC_*         | API_SUCCESS     | [TƯƠNG ỨNG]        | 0                | Chốt delta, ghi đè cache server
OPTIMISTIC_*         | API_ERROR       | SYNC_ERROR_ROLLBACK| Hoàn tác điểm cũ | Bật Toast lỗi, khôi phục trạng thái
---------------------------------------------------------------------------------------------------------------
```

---

## 3. MÁY TRẠNG THÁI ĐIỀU HƯỚNG REDDIT CHAT WIDGET

Giao diện chat tích hợp hỗ trợ 3 chế độ hiển thị linh hoạt:
- **`MINIMIZED` (Thu nhỏ):** Chỉ hiển thị một thanh ngang ở góc dưới bên phải màn hình kèm số lượng tin nhắn chưa đọc (`unreadCount`).
- **`DOCK_EXPANDED` (Neo mở rộng):** Khung chat kích thước $380\text{px} \times 520\text{px}$ nổi trên bề mặt trang, cho phép vừa đọc bài viết vừa nhắn tin.
- **`POPOUT_WINDOW` (Cửa sổ độc lập):** Nhấp vào biểu tượng Pop-out `↗` để chuyển toàn bộ giao diện chat sang một tab trình duyệt riêng biệt (`/chat`).
