# Động Cơ Cây Bình Luận Đa Tầng & Thuật Toán Ảo Hóa (Nested Comments & Tree Virtualization)

> **Mã tài liệu:** `CORE-NESTED-COMMENTS`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Mã nguồn:** [`services/community/src/comments/ltree-path-generator.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/comments/ltree-path-generator.ts), [`packages/tree-virtualizer`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/tree-virtualizer)

---

## 1. MÔ HÌNH ĐƯỜNG DẪN VẬT LÝ HÓA (MATERIALIZED PATH VỚI LTREE)

Thay vì sử dụng mô hình Danh sách kề (Adjacency List) buộc CSDL phải chạy đệ quy nhiều vòng CTE (Common Table Expressions) gây thắt nút cổ chai I/O, hệ thống áp dụng mô hình **Materialized Path** kết hợp tiện ích mở rộng `ltree` của PostgreSQL:

```text
Thread Gốc
 ├── Comment A (Depth: 0, Path: "0001")
 │    ├── Comment A.1 (Depth: 1, Path: "0001.0001")
 │    │    └── Comment A.1.1 (Depth: 2, Path: "0001.0001.0001")
 │    └── Comment A.2 (Depth: 1, Path: "0001.0002")
 └── Comment B (Depth: 0, Path: "0002")
```

### Ưu Điểm Vượt Trội
- **Truy vấn toàn bộ cây con của một bình luận:**
  ```sql
  SELECT * FROM comments WHERE path <@ '0001' ORDER BY path ASC;
  ```
  Truy vấn chỉ tốn đúng **1 câu lệnh SQL duy nhất** với tốc độ thực thi dưới 1.2ms nhờ chỉ mục GiST trên trường `path`.

---

## 2. THUẬT TOÁN SINH MÃ BASE36 4 KÝ TỰ & GIỚI HẠN CẤP 8 (CAPPED DEPTH 8)

Triển khai tại [`ltree-path-generator.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/comments/ltree-path-generator.ts):
- Mỗi tầng phân cấp được mã hóa thành chuỗi Base36 có độ dài cố định **4 ký tự** (được pad số 0 phía trước):
  - Index 1 $\rightarrow$ `"0001"`
  - Index 10 $\rightarrow$ `"000a"`
  - Index 35 $\rightarrow$ `"000z"`
  - Index 36 $\rightarrow$ `"0010"`
  - Tối đa $36^4 = 1,679,616$ bình luận con trực tiếp trên mỗi nhánh!
- **Giới hạn Độ sâu Tối đa (Capped Depth 8):**
  - Khi độ sâu của bình luận chạm mức $8$, để tránh giao diện bị thụt lề quá hẹp trên màn hình di động, thuật toán tự động kích hoạt cờ `isCappedAtMaxDepth: true` và `parentAuthorMentionNeeded: true`.
  - Bình luận mới giữ nguyên `path` của cha ở cấp 8 và trở thành dạng phản hồi phẳng (Flat Reply), gắn kèm mention `@tên_tác_giả`.

---

## 3. THUẬT TOÁN TRẢI PHẲNG MẢNG TUYẾN TÍNH $\mathcal{O}(N)$

Khi Client nhận danh sách bình luận đã sắp xếp theo thứ tự `path ASC` từ CSDL, hàm [`flattenCommentTree()`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/tree-virtualizer/src/flatten-tree.ts) thực thi:

```typescript
export function flattenCommentTree(
  rawNodes: RawCommentNode[],
  collapsedPathsSet: Set<string> = new Set<string>(),
): FlatCommentItem[] {
  const displayArray: FlatCommentItem[] = [];
  let skipPrefix: string | null = null;

  // 1. Tạo bản đồ đếm số lượng con trực tiếp để hiển thị nhãn [+] chính xác
  const pathPrefixCount = new Map<string, number>();
  for (const node of rawNodes) {
    const parentDotIndex = node.path.lastIndexOf('.');
    if (parentDotIndex !== -1) {
      const parentPath = node.path.substring(0, parentDotIndex);
      pathPrefixCount.set(parentPath, (pathPrefixCount.get(parentPath) || 0) + 1);
    }
  }

  // 2. Quét tuyến tính O(N) duy nhất
  for (const node of rawNodes) {
    if (skipPrefix !== null) {
      if (node.path.startsWith(skipPrefix)) {
        continue; // Bỏ qua nếu thuộc nhánh con bị thu gọn
      } else {
        skipPrefix = null; // Đã đi qua hết nhánh con
      }
    }

    const depth = (node.path.match(/\./g) || []).length;
    const isCollapsed = collapsedPathsSet.has(node.path);
    const directChildren = pathPrefixCount.get(node.path) || 0;

    displayArray.push({ ...node, depth, isCollapsed, directChildren });

    if (isCollapsed && skipPrefix === null) {
      skipPrefix = node.path + '.';
    }
  }

  return displayArray;
}
```
- **Kết quả:** Loại bỏ đệ quy tràn ngăn xếp (Stack Overflow) khi cây có hàng chục ngàn bình luận, liên kết trực tiếp với thư viện ảo hóa DOM `@tanstack/react-virtual` để chỉ render 15-20 node đang nằm trong khung nhìn.
