# Sơ Đồ Luồng Dữ Liệu & Chuỗi Xử Lý (Data Flows & Sequence Diagrams v2.1)

> **Mã tài liệu:** `DATA-FLOWS-DAG`  
> **Dự án:** Acad DevOps Fullstack Monorepo (**SYNAPSE Engine**)

---

## 1. LUỒNG XOAY VÒNG TOKEN, 30S GRACE PERIOD & PHÁT HIỆN TÁI SỬ DỤNG (AUTH SEQUENCE)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Trình Duyệt Web Client
    participant Interceptor as AcadClient Auth Interceptor
    participant Gateway as API Gateway (/api/v1/auth)
    participant Redis as Redis Session Store
    participant DB as PostgreSQL 16 (user_sessions)

    Note over Client, Gateway: Access Token hết hạn (Nhận HTTP 401)
    Client->>Interceptor: Gọi API bị từ chối 401
    Interceptor->>Interceptor: Khóa Mutex Lock (Anti-Thundering Herd)
    Interceptor->>Gateway: POST /api/v1/auth/refresh { refreshToken }
    Gateway->>Redis: Lookup session_lookup:{SHA256(refreshToken)} -> HGETALL session:{userId}:{sessionId}

    alt Trường hợp 1: Token hợp lệ (Khớp currentTokenHash)
        Redis-->>Gateway: Hợp lệ -> Sinh cặp Access (15m) + Refresh Token mới (7d)
        Gateway->>Redis: Cập nhật currentTokenHash mới, previousTokenHash cũ, TTL grace = 30s
        Gateway->>DB: UPDATE user_sessions SET refresh_token_hash, previous_token_hash, grace_period_expires_at
        Gateway-->>Interceptor: Trả cặp tokens mới
        Interceptor->>Interceptor: Mở khóa Mutex, phát lại toàn bộ Subscriber Queue
    else Trường hợp 2: Token cũ gửi trong vòng 30s (Grace Period)
        Redis-->>Gateway: Khớp previousTokenHash VÀ NOW() < gracePeriodExpiresAt
        Gateway-->>Interceptor: Cấp lại Access Token mới (giữ nguyên Refresh Token hiện tại)
    else Trường hợp 3: Token cũ bị dùng lại sau 30s (Token Reuse Attack!)
        Redis-->>Gateway: Phát hiện Replay Attack!
        Gateway->>Redis: DEL toàn bộ session:{userId}:*
        Gateway->>DB: UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = $1
        Gateway-->>Interceptor: HTTP 401 Token Reuse Attack Detected
        Interceptor->>Client: Xóa localStorage tokens & yêu cầu đăng nhập lại
    end
```

---

## 2. LUỒNG BỎ PHIẾU NGUYÊN TỬ QUA REDIS LUA (`execute_vote.lua`)

```mermaid
sequenceDiagram
    autonumber
    actor User as Người dùng
    participant Web as Web Client (Optimistic UI)
    participant Gateway as API Gateway (/api/v1)
    participant Redis as Redis 7 (execute_vote.lua)
    participant Worker as VoteFlushWorker (5s Batch)
    participant DB as PostgreSQL (thread_counters & thread_votes)

    User->>Web: Bấm Upvote (+1) / Downvote (-1)
    Web->>Web: Cập nhật lạc quan (0ms)
    Web->>Gateway: POST /api/v1/threads/:id/vote { direction: 1 | -1 }
    Gateway->>Redis: EVAL execute_vote.lua (target:{id}:voters, target:{id}:counters, dirty:votes)
    Note over Redis: Thực thi nguyên tử O(1):<br/>1. Kiểm tra direction cũ<br/>2. Tính delta (+1 / -1 / +2 / -2 / unvote)<br/>3. HINCRBY target:{id}:counters<br/>4. SADD dirty:votes target_id
    Gateway->>DB: UPSERT/DELETE thread_votes (kích hoạt Trigger Karma tác giả)
    Redis-->>Gateway: { userVote, upvotes, downvotes, netScore }
    Gateway-->>Web: HTTP 200 OK

    Note over Worker, DB: VoteFlushWorker chạy nền mỗi 5 giây
    Worker->>Redis: SMEMBERS dirty:votes & HGETALL target:{id}:counters
    Worker->>DB: Bulk Upsert thread_counters (HOT update fillfactor=70)
```

---

## 3. LUỒNG NHẮN TIN TỨC THỜI & DUYỆT TIN NHẮN LẠ (CHAT & SSE FLOW)

```mermaid
sequenceDiagram
    autonumber
    actor Alice as Người Gửi (Alice)
    actor Bob as Người Nhận (Bob)
    participant Gateway as API Gateway (/api/v1/chat)
    participant DB as PostgreSQL (chat_*)
    participant SSE as SseManager (/api/v1/chat/events)

    Alice->>Gateway: POST /api/v1/chat/channels/direct { recipientId: Bob, initialMessage: "Chào bạn!" }
    Gateway->>DB: Kiểm tra chat_requests & kênh DIRECT hiện có

    alt Chưa có kênh DIRECT chính thức
        Gateway->>DB: INSERT INTO chat_requests (status: PENDING)
        Gateway->>SSE: sendToUser(Bob, "chat_request:new", requestDto)
        SSE-->>Bob: Cập nhật tab Requests (+1)
        alt Bob phản hồi ACCEPTED / IGNORED / BLOCKED
            Bob->>Gateway: PATCH /api/v1/chat/requests/:id { status }
            Gateway->>DB: Nếu ACCEPTED -> tạo chat_channels(DIRECT), chat_members, chat_messages đầu tiên
            Gateway->>SSE: Phát "channel:created" & "chat_request:updated"
        end
    else Đã có kênh DIRECT giữa Alice & Bob
        Gateway->>DB: INSERT INTO chat_messages
        Gateway->>SSE: Broadcast "message:new" tới các thành viên trong kênh
    end
```
