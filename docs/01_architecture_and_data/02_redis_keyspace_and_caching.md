# Cấu Trúc Bộ Nhớ Đệm & Keyspace Redis 7 (Redis Topology v2.1)

> **Mã tài liệu:** `DATA-REDIS-KEYSPACE`  
> **Dự án:** Acad DevOps Fullstack Monorepo (**SYNAPSE Engine**)  
> **Phiên bản:** Redis 7.4 (Podman Rootless local + Tương thích Redis Cluster / Upstash)  
> **Mã nguồn triển khai:** [`deploy/redis/execute_vote.lua`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/redis/execute_vote.lua), [`RedisSessionStore`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/session/redis-session-store.ts), [`LuaVoteEngine`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/voting/lua-vote-engine.ts), [`PresenceManager`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/chat/src/realtime/presence-manager.ts), [`RateLimiter`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/middleware/rate-limiter.ts)

---

## 1. BẢN ĐỒ KEYSPACE REDIS THỰC TẾ

| Cấu Trúc Key Redis | Kiểu | TTL | Nguồn Ghi / Đọc Thực Tế | Mục Đích Nghiệp Vụ |
| :--- | :---: | :---: | :--- | :--- |
| `session:{userId}:{sessionId}` | `HASH` | 7 ngày (`604800s`) | `RedisSessionStore` | Lưu phiên đăng nhập (`currentTokenHash`, `previousTokenHash`, `gracePeriodExpiresAt`, `deviceFingerprint`, `ipAddress`, `userAgent`, `isRevoked`) |
| `session_lookup:{tokenHash}` | `STRING` | 7d / 35s | `RedisSessionStore` | Ánh xạ O(1) từ SHA-256 refresh token $\rightarrow$ `{userId}:{sessionId}` (35s cho `previousTokenHash`) |
| `target:{targetId}:voters` | `HASH` | 30 ngày | `execute_vote.lua` / `LuaVoteEngine` | Ánh xạ `userId` $\rightarrow$ `direction` (`1` hoặc `-1`) để chạy FSM Unvote/Switch/New nguyên tử |
| `target:{targetId}:counters` | `HASH` | 30 ngày | `execute_vote.lua` / `LuaVoteEngine` | Bộ đếm tốc độ cao: `upvotes`, `downvotes`, `net_score` |
| `dirty:votes` | `SET` | Bền vững (tới khi flush) | `execute_vote.lua` + `VoteFlushWorker` | Tập `targetId` có thay đổi vote cần xả về `thread_counters` PostgreSQL mỗi 5 giây |
| `ratelimit:{tierName}:{clientKey}` | `STRING` | Theo `windowMs` | `RateLimiter` (`apps/api`) | Bộ đếm `INCR` + `EXPIRE` phân tầng (`auth`, `interaction`, `general`) theo `user:{id}` hoặc `ip:{addr}` (tự lùi In-Memory khi Redis mất kết nối) |
| `presence:online:{userId}` | `STRING` | 15 giây | `PresenceManager` (`services/chat`) | Cờ trực tuyến (`'1'`), được làm mới từ SSE connect & heartbeat 12s của UI |
| `typing:{channelId}:{userId}` | `STRING` | 5 giây | `PresenceManager` (`services/chat`) | Lưu `username` đang soạn tin trong kênh chat cụ thể |

---

## 2. ĐẶC TẢ CHI TIẾT CÁC LUỒNG REDIS CỐT LÕI

### 2.1. Quản Lý Phiên & Grace Period 30s (`RedisSessionStore`)
- Mỗi khi đăng nhập thành công, pipeline Redis tạo 2 key: `session:{userId}:{sessionId}` (Hash) và `session_lookup:{currentTokenHash}` (String, TTL 7 ngày).
- Khi xoay vòng Token (Refresh), `previousTokenHash` được gán khóa lookup tạm TTL 35 giây (`grace_period_expires_at` = +30 giây) để các request song song trong cùng thời điểm chuyển giao không bị văng 401.
- Nếu phát hiện `previousTokenHash` bị gửi lại sau khi quá 30s $\rightarrow$ hệ thống coi là Token Reuse Attack, thu hồi toàn bộ chuỗi `session:{userId}:*` trên Redis và `is_revoked = TRUE` trên PostgreSQL.

### 2.2. Biểu Quyết Nguyên Tử O(1) (`execute_vote.lua`)
- Toàn bộ thao tác đọc `HGET target:{targetId}:voters`, quyết định trạng thái (`Unvote` / `New Vote` / `Reverse Direction +2/-2`), cập nhật `HINCRBY target:{targetId}:counters` và đánh dấu `SADD dirty:votes` diễn ra trong một lần thực thi Lua Script đơn luồng trên Redis.
- `VoteFlushWorker` chạy nền định kỳ 5 giây đọc tập `dirty:votes` và đồng bộ ngược vào `thread_counters` (bảng cấu hình `fillfactor=70` tối ưu Heap-Only Tuples).

### 2.3. Presence, Typing & Rate Limit Graceful Degradation
- Cả `PresenceManager` và `RateLimiter` đều thiết kế cơ chế **In-Memory Fallback**: nếu kết nối Redis tạm ngắt, API Gateway vẫn hoạt động kiểm soát rate-limit và typing mà không gây sập toàn bộ dịch vụ.
