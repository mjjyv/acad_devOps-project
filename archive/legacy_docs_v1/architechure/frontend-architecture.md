# Kiến Trúc Giao Diện & Ranh Giới Server/Client (Frontend Architecture)

**Framework:** Next.js 15 (App Router) + React 19  
**Styling Engine:** Tailwind CSS v4 + Design Tokens ([`packages/ui-tokens`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/ui-tokens))  
**Nguyên tắc thiết kế:** Editorial Utilitarian Minimalism ([`reference-docs/SKILL_UI.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/reference-docs/SKILL_UI.md))  

---

## 1. RANH GIỚI THÀNH PHẦN (RSC VS CLIENT COMPONENT BOUNDARIES)

Quy tắc tối ưu hóa kích thước bundle JavaScript: **Mặc định toàn bộ cấu trúc cây thư mục là Server Components (0KB JS tải về trình duyệt), chỉ chuyển sang Client Component (`'use client'`) tại các nút lá tương tác người dùng sâu nhất.**

```
[Trang Chi Tiết Bài Viết - Server Component] (0 KB JS Bundle)
  │
  ├──> [ThreadMetadata - Server Component] (JSON-LD SEO Schema, OpenGraph, Breadcrumb)
  ├──> [ThreadArticleBody - Server Component] (Render HTML tĩnh từ Tiptap AST / Prism Code)
  │
  ├──> [PostInteractionButtons - Client Component] (Bắt sự kiện click Upvote, Optimistic UI)
  │
  ├──> [AuthorBadge - Server Component] (Avatar tĩnh, Huy hiệu chức danh, Điểm Karma)
  │
  └──> [CommentSection - Server Component] (Truy vấn trước 20 bình luận gốc tầng 1)
        │
        ├──> [VirtualizedCommentTree - Client Component] (Sử dụng @tanstack/react-virtual)
        │     ├── [CommentNodeRow - Client Component] (Đường kẻ phân cấp thụt lề, Thu gọn nhánh)
        │     └── [VoteAction - Client Component] (Upvote/Downvote bình luận)
        │
        └──> [ReplyComposerBox - Client Component] (Nạp lười Tiptap Editor khi người dùng bấm Trả lời)
```

---

## 2. QUẢN TRỊ TRẠNG THÁI 3 TẦNG (THREE-TIER STATE MANAGEMENT)

Hệ thống phân định rạch ròi 3 tầng trạng thái độc lập để tránh re-render diện rộng:

| Tầng Trạng Thái | Công Nghệ Lựa Chọn | Phạm Vi Áp Dụng |
| :--- | :--- | :--- |
| **Server Cache State** | **TanStack Query v5 / Server Actions** | Quản lý dữ liệu bất đồng bộ từ Backend API, phân trang con trỏ vô tận (`useInfiniteQuery`), tự động xóa rác (`gcTime`), khử trùng lặp request API (`deduplication`). |
| **Client UI Ephemeral State** | **Zustand** | Trạng thái cục bộ siêu nhẹ (~1KB): Mở/đóng Sidebar, Modal đăng nhập, Trạng thái thu gọn nhánh bình luận (`collapsedPathsSet`), Chế độ giao diện (Dark/Light mode). |
| **URL State Synchronization** | **nuqs** | Đồng bộ trực tiếp bộ lọc (`sort=hot|new|top`, `time=day|week`, `cursor`) lên URL Search Params dưới dạng type-safe, đảm bảo người dùng sao chép liên kết gửi cho người khác vẫn giữ nguyên trạng thái hiển thị. |

---

## 3. MÁY TRẠNG THÁI GIAO DIỆN BÌNH CHỌN (VOTE STATECHART)

Thao tác bầu chọn áp dụng mô hình máy trạng thái hữu hạn (FSM) với cập nhật lạc quan (Optimistic UI):

```text
STATE_TRANSITION_TABLE [VoteAction]:
  Current_State        | Event         | Next_State            | Side_Effects / UI Mutation
  -------------------------------------------------------------------------------------------------------------
  IDLE_UNVOTED         | CLICK_UP      | OPTIMISTIC_UP         | UI: Score +1, UpActive=true; Queue: API_CALL(UP)
  IDLE_UNVOTED         | CLICK_DOWN    | OPTIMISTIC_DOWN       | UI: Score -1, DownActive=true; Queue: API_CALL(DOWN)
  UPVOTED              | CLICK_UP      | OPTIMISTIC_UNVOTE     | UI: Score -1, UpActive=false; Queue: API_CALL(UNVOTE)
  UPVOTED              | CLICK_DOWN    | OPTIMISTIC_DOWN       | UI: Score -2, UpActive=false, DownActive=true; Queue: API_CALL(DOWN)
  DOWNVOTED            | CLICK_DOWN    | OPTIMISTIC_UNVOTE     | UI: Score +1, DownActive=false; Queue: API_CALL(UNVOTE)
  DOWNVOTED            | CLICK_UP      | OPTIMISTIC_UP         | UI: Score +2, DownActive=false, UpActive=true; Queue: API_CALL(UP)
  OPTIMISTIC_UP        | API_SUCCESS   | UPVOTED               | Commit delta, Invalidate cache
  OPTIMISTIC_DOWN      | API_SUCCESS   | DOWNVOTED             | Commit delta, Invalidate cache
  OPTIMISTIC_UNVOTE    | API_SUCCESS   | IDLE_UNVOTED          | Commit delta, Invalidate cache
  OPTIMISTIC_*         | API_ERROR     | SYNC_ERROR_ROLLBACK   | Revert score, Hiện Toast("Lỗi lưu phiếu"), Khôi phục state cũ
  ANY_STATE            | AUTH_REQUIRED | SAME_STATE            | Bật AuthModal(preserve_intent=true)
```

---

## 4. CHIẾN LƯỢC ẢO HÓA CÂY BÌNH LUẬN ĐA TẦNG

Trong các bài thảo luận có hàng nghìn bình luận, việc render toàn bộ cây đệ quy DOM sẽ gây tràn bộ nhớ trình duyệt và lag giật khung hình:
1. **Trải phẳng cây ($\mathcal{O}(N)$ Flattening):**
   - Khi client nhận danh sách bình luận với thuộc tính `path` (ví dụ `0001.000a.0003`), hàm [`flattenCommentTree()`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/tree-virtualizer/src/flatten-tree.ts) duyệt tuyến tính mảng, tính toán độ sâu `depth`, kiểm tra nhánh cha có bị thu gọn hay không để tạo ra một mảng một chiều phẳng.
2. **Ảo hóa khung nhìn (`@tanstack/react-virtual`):**
   - Trình duyệt chỉ render 15-20 phần tử DOM đang hiển thị trong màn hình cuộn (viewport), tái sử dụng các node DOM khi người dùng cuộn lên/xuống.
3. **Thu gọn nhánh tức thời (Collapsing):**
   - Khi bấm vào thanh dẫn hướng bên trái, `collapsedPathsSet` thêm vào `parentPath`. Thuật toán trải phẳng tự động bỏ qua toàn bộ các node con có tiền tố bắt đầu bằng `parentPath.*`, cập nhật chiều cao ảo mượt mà không cần gọi lại API.
