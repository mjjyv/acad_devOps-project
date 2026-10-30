# Phân Tích Chuyên Sâu: Động Cơ Bầu Chọn & Điểm Tín Nhiệm (Voting & Reputation)

**Mã nguồn triển khai:** [`deploy/redis/execute_vote.lua`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/redis/execute_vote.lua), [`services/community/src/voting`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/voting)  
**Mục tiêu kỹ thuật:** Xử lý bình chọn nguyên tử đạt chuẩn $\mathcal{O}(1)$, chịu tải 50,000 requests/giây, xếp hạng bảng tin không thiên vị bài cũ.

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

Thay vì chạy nhiều câu lệnh riêng rẽ (`HGET`, `HSET`, `HINCRBY`) gây ra hiện tượng tranh chấp điều kiện (Race Conditions), hệ thống biên dịch toàn bộ logic bầu chọn thành một kịch bản Lua Script duy nhất chạy trực tiếp trong nhân Redis:

```lua
-- File: deploy/redis/execute_vote.lua
-- KEYS: [1] voters_key, [2] counters_key, [3] dirty_registry_key
-- ARGV: [1] user_id,    [2] target_direction (+1 hoặc -1), [3] target_id

local voters_key = KEYS[1]
local counters_key = KEYS[2]
local dirty_registry_key = KEYS[3]

local user_id = ARGV[1]
local target_direction = tonumber(ARGV[2])
local target_id = ARGV[3]

local current_raw = redis.call('HGET', voters_key, user_id)
local current_direction = current_raw and tonumber(current_raw) or 0
local final_direction = 0

-- TRƯỜNG HỢP 1: BẤM LẠI NÚT CŨ -> HÀNH VI HỦY VOTE (UNVOTE)
if current_direction == target_direction then
    redis.call('HDEL', voters_key, user_id)
    if target_direction == 1 then
        redis.call('HINCRBY', counters_key, 'upvotes', -1)
        redis.call('HINCRBY', counters_key, 'net_score', -1)
    else
        redis.call('HINCRBY', counters_key, 'downvotes', -1)
        redis.call('HINCRBY', counters_key, 'net_score', 1)
    end
    final_direction = 0

-- TRƯỜNG HỢP 2: BẦU MỚI HOẶC ĐẢO CHIỀU (UPVOTE <-> DOWNVOTE)
else
    redis.call('HSET', voters_key, user_id, target_direction)
    if current_direction == 0 then
        -- Bầu mới (+1 hoặc -1)
        if target_direction == 1 then
            redis.call('HINCRBY', counters_key, 'upvotes', 1)
            redis.call('HINCRBY', counters_key, 'net_score', 1)
        else
            redis.call('HINCRBY', counters_key, 'downvotes', 1)
            redis.call('HINCRBY', counters_key, 'net_score', -1)
        end
    else
        -- Đảo chiều (-1 sang +1 hoặc ngược lại) -> Biên độ chênh lệch là 2 điểm!
        if target_direction == 1 then
            redis.call('HINCRBY', counters_key, 'upvotes', 1)
            redis.call('HINCRBY', counters_key, 'downvotes', -1)
            redis.call('HINCRBY', counters_key, 'net_score', 2)
        else
            redis.call('HINCRBY', counters_key, 'upvotes', -1)
            redis.call('HINCRBY', counters_key, 'downvotes', 1)
            redis.call('HINCRBY', counters_key, 'net_score', -2)
        end
    end
    final_direction = target_direction
end

-- Đưa target_id vào dirty set để worker đồng bộ chậm vào PostgreSQL
redis.call('SADD', dirty_registry_key, target_id)

local upvotes = tonumber(redis.call('HGET', counters_key, 'upvotes') or '0')
local downvotes = tonumber(redis.call('HGET', counters_key, 'downvotes') or '0')
local net_score = tonumber(redis.call('HGET', counters_key, 'net_score') or '0')

return { final_direction, upvotes, downvotes, net_score }
```

---

## 3. QUY TRÌNH ĐỒNG BỘ GHI CHẬM (BATCH FLUSH WORKER)

Nhằm tối ưu hóa số lượng truy vấn ghi vào CSDL quan hệ:
1. Mỗi khi có thao tác vote, bài viết được thêm vào Redis Set `dirty_threads_registry`.
2. Định kỳ mỗi 5 giây, Worker quét toàn bộ các ID trong registry này.
3. Gom cụm các giá trị counters từ Redis Pipeline và thực thi một câu lệnh `BULK UPDATE` duy nhất xuống bảng `thread_counters` của PostgreSQL.
4. Xóa các ID đã xử lý khỏi `dirty_threads_registry`.
5. Phát sự kiện cập nhật qua kênh Pub/Sub tới Realtime Hub để truyền thông tin về client qua Server-Sent Events.
