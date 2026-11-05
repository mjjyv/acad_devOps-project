# Cấu Trúc Bộ Nhớ Đệm & Keyspace Redis 7 (Redis Topology)

> **Mã tài liệu:** `DATA-REDIS-KEYSPACE`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Phiên bản:** Redis 7.0+ (Tương thích Upstash Serverless & Redis Cluster)

---

## 1. PHÂN BỔ BẢN ĐỒ KEYSPACE REDIS (KEYSPACE ARCHITECTURE)

Hệ thống quản lý dữ liệu tạm, phiên đăng nhập, khóa nguyên tử và hàng đợi dựa trên phân vùng tiền tố tiêu chuẩn:

```
┌───────────────────────────────────┬────────────┬─────────────┬──────────────────────────────────────────┐
│ Cấu Trúc Key Redis                │ Kiểu Dữ Liệu│ TTL         │ Mục Đích Nghiệp Vụ                      │
├───────────────────────────────────┼────────────┼─────────────┼──────────────────────────────────────────┤
│ session:{user_id}:{session_id}    │ HASH       │ 7 ngày      │ Lưu trữ dữ liệu phiên, hash token hiện tại│
│ session_lookup:{token_hash}       │ STRING     │ 7 ngày      │ Tra cứu nhanh O(1) từ token -> session   │
│ vote:{target_id}:voters           │ HASH       │ 30 ngày     │ Lưu trữ trạng thái vote của user (+1/-1) │
│ vote:{target_id}:counters         │ HASH       │ 30 ngày     │ Bộ đếm nguyên tử upvotes, downvotes, net │
│ dirty:votes                       │ SET        │ Không hết hạn│ Danh sách các target_id cần flush về DB  │
│ rate_limit:login:{ip}             │ ZSET       │ 15 phút     │ Sliding-window rate limit chống brute    │
│ chat:online_users                 │ SET        │ 5 phút      │ Theo dõi trạng thái trực tuyến (Presence) │
│ chat:channel:{channel_id}:typing  │ HASH       │ 5 giây      │ Trạng thái "đang soạn tin nhắn..."       │
│ feed:hot:cache                    │ ZSET       │ 60 giây     │ Danh sách các thread_id xếp theo hotScore│
└───────────────────────────────────┴────────────┴─────────────┴──────────────────────────────────────────┘
```

---

## 2. CHI TIẾT CÁC CẤU TRÚC TRỌNG YẾU

### 2.1. Cụm Quản Lý Phiên Làm Việc (Session Management)
- **`session:{user_id}:{session_id}` (Hash):**
  - `current_token_hash`: Băm SHA-256 của refresh token hợp lệ hiện tại.
  - `previous_token_hash`: Băm của token vừa bị thu hồi trong vòng 30s Grace Period.
  - `grace_period_expires_at`: Mốc timestamp hết hạn ân hạn (epoch ms).
  - `device_fingerprint`: Mã định danh phần cứng của trình duyệt.
  - `ip_address`: Địa chỉ IP kết nối gần nhất.

### 2.2. Động Cơ Biểu Quyết Nguyên Tử (Atomic Lua Voting)
- **`vote:{target_id}:voters` (Hash):** Ánh xạ `user_id` $\rightarrow$ `direction` (`1` cho upvote, `-1` cho downvote).
- **`vote:{target_id}:counters` (Hash):** Chứa 3 trường `upvotes`, `downvotes`, `net_score`.
- **`dirty:votes` (Set):** Bất cứ khi nào có thay đổi vote từ [`execute_vote.lua`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/redis/execute_vote.lua), `target_id` sẽ được thêm vào Set này. Worker chạy mỗi 5s sẽ đọc Set này và thực thi ghi dồn (bulk upsert) vào bảng `thread_counters` của PostgreSQL.

### 2.3. Trạng Thái Trực Tuyến & Chat Tức Thời (Reddit Chats Presence)
- **`chat:online_users` (Set):** Lưu danh sách `user_id` đang mở kết nối WebSocket/SSE. Được làm mới mỗi 60s qua lệnh Ping/Pong Heartbeat.
- **`chat:channel:{channel_id}:typing` (Hash):** Lưu danh sách người dùng đang gõ phím kèm timestamp, tự động xóa sau 5 giây nếu không nhận được typing event mới.
