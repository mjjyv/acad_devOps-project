# Động Cơ Bảng Tin & Khám Phá Nội Dung (Feed Aggregation & Discovery)

> **Mã tài liệu:** `CORE-FEED-DISCOVERY`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Tham chiếu Reddit:** Nhóm 2 & 3 trong [`docs/reddit.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/reddit.md)

---

## 1. CÁC THUẬT TOÁN SẮP XẾP BẢNG TIN (FEED SORTING ENGINES)

Hệ thống hỗ trợ 4 chế độ sắp xếp bảng tin linh hoạt:
1. **`HOT` (Thịnh Hành - Gravity Decay):** Sắp xếp theo điểm số $HotScore = \frac{NetScore}{(AgeHours + 2.0)^{1.8}}$, cân bằng giữa lượng tương tác lớn và tính thời điểm mới xuất bản.
2. **`NEW` (Mới Nhất):** Sắp xếp theo thứ tự thời gian giảm dần (`created_at DESC`), phục vụ việc theo dõi bài viết vừa đăng tải theo thời gian thực.
3. **`TOP` (Hàng Đầu):** Sắp xếp theo tổng điểm $NetScore$ cao nhất trong một khoảng thời gian được chỉ định (`t=day`, `t=week`, `t=month`, `t=year`, `t=all`).
4. **`BEST` (Tối Ưu - Wilson Score Interval):**
   Phân tích khoảng tin cậy của tỷ lệ upvote/downvote theo công thức Wilson Score Confidence Interval với độ tin cậy 95% ($z = 1.96$):

   $$\hat{p} = \frac{Upvotes}{TotalVotes}, \quad Score = \frac{\hat{p} + \frac{z^2}{2n} - z \sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}$$

   *Trong đó:*
   - $n = Upvotes + Downvotes$: Tổng lượt tương tác đánh giá.
   - $\hat{p}$: Tỷ lệ ủng hộ quan sát được.
   - $z = 1.96$: Phân vị chuẩn tương ứng với độ tin cậy 95% ($\alpha = 0.05$).
   - *Tác dụng cốt lõi:* Bảo vệ các bài viết kỹ thuật chuyên sâu có tỷ lệ đồng thuận cao (ví dụ: 10 upvotes, 0 downvotes $\rightarrow$ $\hat{p} = 1.0$) không bị chìm trước các bài viết có số lượng vote đông nhưng tỷ lệ tranh cãi cao (ví dụ: 500 upvotes, 480 downvotes $\rightarrow$ $\hat{p} \approx 0.51$). Thuật toán ước lượng cận dưới của tỷ lệ đồng thuận thực sự.

---

## 2. PHÂN TẦNG NGUỒN CẤP TIN (FEED CLASSIFICATION)

- **Home Feed (`/api/v1/feed/home`):**
  - Tập hợp bài viết từ các không gian mà người dùng đã bấm **Join** (`space_memberships`).
  - Hỗ trợ 2 tab con: **For You** (được gợi ý theo thuật toán tương tác) và **Following** (chỉ hiển thị đúng các Space đã tham gia).
- **Popular Feed (`/api/v1/feed/popular`):**
  - Tổng hợp các bài viết có tương tác cao nhất trên toàn bộ các không gian công khai toàn sàn mà không phụ thuộc vào danh sách theo dõi của người dùng.
- **Custom Feeds (Gom Nhóm Tùy Chọn):**
  - Cho phép người dùng tự tạo danh mục gom nhóm (ví dụ: nhóm các Spaces "DevOps + Cloud + SRE" thành 1 feed riêng).

---

## 3. CÔNG CỤ TÌM KIẾM TOÀN DIỆN & GIỚI HẠN PHẠM VI (SEARCH ENGINE)

Triển khai tại [`apps/api/src/routes/community-router.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/community-router.ts):
- **Tham số tìm kiếm `q`:** Hỗ trợ tìm kiếm từ khóa không phân biệt hoa thường.
- **Tối ưu hóa GIN Trigram:** Trên PostgreSQL sử dụng `title gin_trgm_ops` cho phép tìm kiếm mờ (fuzzy search) với tốc độ $O(\log N)$.
- **In-Space Scoped Search:** Truyền tham số `spaceSlug` hoặc `spaceId` vào endpoint tìm kiếm để giới hạn kết quả chỉ nằm trong không gian đang duyệt.
- **Phím tắt giao diện:** Bấm phím tắt `/` trên bàn phím tại bất kỳ trang nào để kích hoạt tức thì thanh tìm kiếm trên Navbar.
