# Động Cơ Biểu Quyết Nguyên Tử & Điểm Danh Tiếng (Voting & Reputation)

> **Mã tài liệu:** `CORE-VOTING-REPUTATION`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Mã nguồn triển khai:** [`deploy/redis/execute_vote.lua`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/redis/execute_vote.lua), [`services/community/src/voting`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/voting)

---

## 1. THUẬT TOÁN XẾP HẠNG THỊNH HÀNH (GRAVITY DECAY FORMULA)

Điểm số của bài viết thảo luận trong bảng tin Hot / Trending áp dụng biến thể của thuật toán Hacker News / Reddit Gravity Decay:

$$HotScore = \frac{NetScore}{(AgeHours + 2.0)^{1.8}}$$

*Trong đó:*
- $NetScore = Upvotes - Downvotes$: Tổng điểm số tương tác thực của cộng đồng.
- $AgeHours = \frac{Now - CreatedAt}{3600 \times 1000}$: Khoảng thời gian từ lúc xuất bản đến hiện tại tính bằng giờ.
- $TimeOffset = 2.0$: Hằng số bù trừ giờ giúp các bài viết mới đăng không bị bùng nổ điểm số ảo khi mẫu số tiệm cận 0.
- $Gravity = 1.8$: Trọng số phân rã trọng lực. Trọng số càng cao thì bài viết cũ càng nhanh bị hạ nhiệt để nhường vị trí hàng đầu cho các chủ đề thảo luận mới nổi.

```typescript
// Triển khai thực tế tại services/community/src/voting/gravity-decay.ts
export class GravityDecayEngine {
  public static readonly GRAVITY = 1.8;
  public static readonly TIME_OFFSET_HOURS = 2.0;

  public static computeHotScore(netScore: number, createdAt: Date, now: Date = new Date()): number {
    const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
    const ageHours = ageMs / (1000 * 60 * 60);

    const denominator = Math.pow(ageHours + this.TIME_OFFSET_HOURS, this.GRAVITY);
    if (denominator === 0) return 0;

    return Math.round((netScore / denominator) * 10000) / 10000;
  }
}
```

---

## 2. KỊCH BẢN NGUYÊN TỬ REDIS LUA (ATOMIC VOTE PROCESSOR)

Thay vì chạy nhiều câu lệnh riêng rẽ (`HGET`, `HSET`, `HINCRBY`) gây ra hiện tượng tranh chấp điều kiện (Race Conditions), hệ thống biên dịch toàn bộ logic bầu chọn thành một kịch bản Lua Script duy nhất chạy trực tiếp trong nhân Redis ([`deploy/redis/execute_vote.lua`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/redis/execute_vote.lua)):
- **Bấm lại nút cũ:** Nhận diện hành vi hủy vote (Unvote), giảm điểm tương ứng và xóa khỏi bảng băm `voters`.
- **Bầu mới hoặc đảo chiều (Upvote $\leftrightarrow$ Downvote):** Tính toán delta chênh lệch chính xác (+2 hoặc -2) trong 1 micro-giây.
- **Gắn cờ Dirty Set:** Thêm `target_id` vào `dirty:votes` để chuẩn bị cho chu trình xả dồn (batch flush) về CSDL quan hệ.

---

## 3. TỐI ƯU HÓA HEAP-ONLY TUPLES (HOT UPDATES) TRÊN POSTGRESQL

- Bảng `thread_counters` được cấu hình tham số `WITH (fillfactor = 70)`.
- **Nguyên lý:** Giữ lại 30% dung lượng trống trên mỗi trang dữ liệu (data page) 8KB. Khi worker cập nhật `upvotes`, `downvotes`, `net_score`, PostgreSQL thực hiện cập nhật ngay trên trang hiện tại (In-page update) mà không cần tạo con trỏ mới trên cây chỉ mục B-Tree, giảm 90% chi phí I/O ghi đĩa.
