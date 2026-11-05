# Sơ Đồ Luồng Dữ Liệu & Chuỗi Xử Lý (Data Flows & Sequence Diagrams)

> **Mã tài liệu:** `DATA-FLOWS-DAG`  
> **Dự án:** Acad DevOps Fullstack Monorepo

---

## 1. LUỒNG XOAY VÒNG TOKEN, 30S GRACE PERIOD & PHÁT HIỆN TÁI SỬ DỤNG (AUTH SEQUENCE)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Trình Duyệt Web Client
    participant Interceptor as Client Auth Interceptor
    participant Gateway as API Gateway
    participant Redis as Redis Session Store
    participant DB as PostgreSQL 16
    
    Note over Client, Gateway: Access Token hết hạn (Nhận mã HTTP 401)
    Client->>Interceptor: Gọi API bị từ chối 401
    Interceptor->>Interceptor: Khóa Mutex Lock (Anti-Thundering Herd)
    Interceptor->>Gateway: POST /api/v1/auth/refresh (Gửi kèm Cookie Refresh Token)
    Gateway->>Redis: HGET session data qua SHA256(RefreshToken)
    
    alt Trường hợp 1: Token hợp lệ (Khớp current_token_hash)
        Redis-->>Gateway: Hợp lệ -> Sinh cặp Access/Refresh Token mới
        Gateway->>Redis: Cập nhật current_token_hash mới, previous_token_hash cũ, grace_expires = NOW() + 30s
        Gateway-->>Interceptor: Trả về Access Token mới (15m) + Cookie Refresh Token (7d)
        Interceptor->>Interceptor: Mở khóa Mutex, giải phóng hàng đợi Subscriber Queue
        Interceptor-->>Client: Thực hiện lại yêu cầu API ban đầu thành công
    else Trường hợp 2: Token cũ được gửi trong vòng 30s (Grace Period)
        Redis-->>Gateway: Khớp previous_token_hash VÀ NOW() < grace_expires
        Gateway-->>Interceptor: Cấp lại Access Token mới (Không tạo Refresh Token mới)
    else Trường hợp 3: Token bị phát lại sau 30s (Token Reuse Attack Detected!)
        Redis-->>Gateway: Phát hiện Token đã thu hồi bị dùng lại!
        Gateway->>Redis: DEL session:{userId}:* (Xóa toàn bộ cụm phiên)
        Gateway->>DB: UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = ?
        Gateway-->>Interceptor: HTTP 403 Forbidden (Force Re-login)
        Interceptor->>Client: Xóa trạng thái, điều hướng về /login
    end
```

---

## 2. LUỒNG BỎ PHIẾU NGUYÊN TỬ QUA REDIS LUA (ATOMIC VOTING SEQUENCE)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant Web as Web Client (Optimistic UI)
    participant Gateway as API Gateway
    participant Redis as Redis 7 (execute_vote.lua)
    participant Worker as 5s Batch Sync Worker
    participant DB as PostgreSQL (thread_counters)
    
    User->>Web: Bấm nút Upvote (+1)
    Web->>Web: Cập nhật lạc quan: Điểm số +1, Nút sáng cam
    Web->>Gateway: POST /api/v1/threads/:id/vote { direction: 1 }
    Gateway->>Redis: EVAL execute_vote.lua (keys: voters, counters, dirty)
    Note over Redis: Thực thi nguyên tử O(1):<br/>1. Đọc hướng vote cũ<br/>2. Tính toán delta thay đổi<br/>3. HINCRBY upvotes, net_score<br/>4. SADD dirty:votes target_id
    Redis-->>Gateway: Trả về { final_direction: 1, net_score: 42 }
    Gateway-->>Web: HTTP 200 OK
    
    Note over Worker, DB: Worker nền chạy định kỳ mỗi 5 giây
    Worker->>Redis: SMEMBERS dirty:votes & DEL dirty:votes
    Worker->>Redis: HGETALL vote:{target_id}:counters
    Worker->>DB: Bulk Upsert vào thread_counters (fillfactor = 70, HOT update)
```

---

## 3. LUỒNG NHẮN TIN TỨC THỜI & DUYỆT TIN NHẮN LẠ (REDDIT CHAT REQUEST FLOW)

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Người Gửi (Alice)
    actor Bob as Người Nhận (Bob)
    participant Gateway as Chat Service / API
    participant DB as PostgreSQL
    participant SSE as Realtime Event Stream (SSE)
    
    Alice->>Gateway: POST /api/v1/chat/messages { receiverId: Bob, content: "Chào bạn!" }
    Gateway->>DB: Kiểm tra quan hệ giữa Alice & Bob
    
    alt Chưa có kênh hội thoại chính thức
        Gateway->>DB: INSERT INTO chat_requests (sender: Alice, receiver: Bob, status: PENDING)
        Gateway->>SSE: Gửi thông báo ChatRequestReceived tới Bob
        SSE-->>Bob: Hiển thị banner "[!] Bạn có 1 yêu cầu tin nhắn mới từ Alice"
        
        alt Bob bấm Chấp Nhận (Accept)
            Bob->>Gateway: POST /api/v1/chat/requests/:id/accept
            Gateway->>DB: Tạo chat_channel mới, chuyển trạng thái ACCEPTED
            Gateway->>SSE: Mở kênh chat thời gian thực cho Alice & Bob
        else Bob bấm Bỏ Qua (Ignore) hoặc Chặn (Block)
            Bob->>Gateway: POST /api/v1/chat/requests/:id/block
            Gateway->>DB: Đánh dấu BLOCKED, thêm Alice vào Blocklist
        end
    else Đã có kênh hội thoại được chấp thuận
        Gateway->>DB: INSERT INTO chat_messages (content: "Chào bạn!")
        Gateway->>SSE: Broadcast MessageCreated tới phòng chat
        SSE-->>Bob: Nhận tin nhắn trực tiếp tức thì
    end
```
