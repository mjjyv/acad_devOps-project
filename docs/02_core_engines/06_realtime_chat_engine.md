# Module M6: Nhắn Tin Thời Gian Thực, Tìm Kiếm Username & Requests (Realtime Chat v2.2)

> **Mã tài liệu:** `CORE-REALTIME-CHAT`  
> **Khung chuẩn:** Giai đoạn 4 & 5 trong [`SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/SYSTEM%20ANALYSIS%20%26%20DESIGN%20LIFECYCLE%20FRAMEWORK.md)  
> **Mã nguồn triển khai:** [`services/chat`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/chat), [`chat-router.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/chat-router.ts), [`use-realtime-chat.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/hooks/use-realtime-chat.ts), [`floating-chat-widget.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/components/chat/floating-chat-widget.tsx), [`apps/web/src/app/chat/page.tsx`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/app/chat/page.tsx)

---

## 1. PHẠM VI, ACTORS & QUY TẮC NGHIỆP VỤ (BUSINESS RULES)

- **Actors:** `ACT-02 Member` (tìm kiếm user theo username để tạo Direct Chat, lập Group Chat, gửi/nhận tin nhánh con `Chat Threads`, xử lý `Requests`), `AGT-03 SseManager`, `AGT-04 PresenceManager`.
- **Luồng Create Chat (Search for people by username):**
  - Tài khoản trắng mới (`Direct (0)`, `Groups (0)`) bắt buộc phải có nút **+ New Chat / Create Chat** ngay trên cả Widget nổi và `/chat`, tích hợp ô tìm kiếm username thời gian thực (`GET /api/v1/auth/users/search?q=...`).
- **Quy tắc Direct Chat & Requests Queue:**
  - Nếu 2 người đã có kênh `DIRECT` $\rightarrow$ mở thẳng kênh & gửi tin nhắn (`isRequest: false`).
  - Nếu chưa có kênh `DIRECT` (hoặc tùy chọn giữ cơ chế chống spam) $\rightarrow$ tạo bản ghi `PENDING` trong `chat_requests`. Bên nhận thấy ở **Incoming Requests** (`Accept` / `Ignore` / `Block`); bên gửi phải thấy được trạng thái trong **Sent Requests** (kèm quyền hủy lời mời `DELETE /api/v1/chat/requests/:id`), tránh cảm giác tin nhắn bị mất vào hố đen.
  - Nếu bị `BLOCKED`, mọi lần gửi tiếp theo bị từ chối **HTTP 403**.
- **Quy tắc Group Chat:** Phải có **tối thiểu 1 thành viên khác `creatorId`** (cấm tạo nhóm tự kỷ chỉ có 1 người).
- **Quy tắc Chuyển Tab & Đọc tin:** Chuyển sang tab rỗng (`Direct` khi 0 kênh) phải xóa `selectedChannelId` khỏi view hiện tại; mở kênh phải gọi cập nhật `chat_members.last_read_message_id` để đồng bộ `unreadCount`.

---

## 2. BIỂU ĐỒ HOẠT ĐỘNG (ACTIVITY DIAGRAM — TÀI KHOẢN MỚI TÌM USER & NHẮN TIN)

```mermaid
flowchart TD
    Start(["User mở Synapse Chat (Floating hoặc /chat)"]) --> ClickNew["Bấm Create Chat / + New Chat"]
    ClickNew --> TypeSearch["Nhập từ khóa username vào ô Search for people"]
    TypeSearch --> CallSearch["GET /api/v1/auth/users/search?q=..."]
    CallSearch --> SelectUser["Chọn 1 người nhận (u/target) & gõ tin nhắn đầu tiên"]
    SelectUser --> PostDirect["POST /api/v1/chat/channels/direct"]
    PostDirect --> Branch{"Đã có kênh DIRECT hoặc bị BLOCKED?"}
    Branch -- BLOCKED --> Err403["Báo lỗi HTTP 403 UserBlocked"]
    Branch -- Đã có kênh DIRECT --> OpenChannel["Mở thẳng kênh & phát SSE message:new"]
    Branch -- Chưa có kênh --> CreateReq["Tạo Chat Request (PENDING)"]
    CreateReq --> NotifySender["Hiển thị tại Sent Requests của người gửi"]
    CreateReq --> NotifyReceiver["SSE chat_request:new -> tab Incoming Requests của người nhận"]
    NotifyReceiver --> ReceiverAct{"Người nhận chọn?"}
    ReceiverAct -- Accept --> MakeChannel["Tạo DIRECT channel + chèn tin nhắn đầu + SSE channel:created"]
    ReceiverAct -- Ignore --> HideReq["Đánh dấu IGNORED"]
    ReceiverAct -- Block --> BlockReq["Đánh dấu BLOCKED vĩnh viễn cặp user"]
```

---

## 3. BIỂU ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM — REALTIME SSE, TYPING & CHAT THREADS)

```mermaid
sequenceDiagram
    autonumber
    actor Alice as fresh_a (Browser)
    participant API as ChatRouter & Service
    participant DB as PostgreSQL (chat_*)
    participant Redis as PresenceManager
    participant SSE as SseManager
    actor Bob as fresh_b (Browser)

    Bob->>SSE: GET /api/v1/chat/events?token=JWT_Bob
    SSE-->>Bob: event: connected
    Alice->>API: POST /api/v1/chat/channels/:id/typing { isTyping: true }
    API->>Redis: SET typing:{ch}:{Alice} TTL 5s
    API->>SSE: sendToUsers(members, "typing:update", ...)
    SSE-->>Bob: Hiển thị "u/fresh_a đang nhập..."
    Alice->>API: POST /api/v1/chat/channels/:id/messages { content, parentMessageId? }
    API->>DB: INSERT INTO chat_messages (Trigger touch channel updated_at)
    API->>SSE: broadcastToUsers(members, "message:new", msgDto)
    SSE-->>Bob: Render tin nhắn / reply nhánh ngay lập tức
    Bob->>API: POST /api/v1/chat/channels/:id/read { lastReadMessageId }
    API->>DB: UPDATE chat_members SET last_read_message_id = ...
```

---

## 4. BIỂU ĐỒ TRẠNG THÁI (STATE MACHINE — VÒNG ĐỜI CHAT REQUEST)

```mermaid
stateDiagram-v2
    [*] --> PENDING : POST /chat/channels/direct (người lạ)
    PENDING --> ACCEPTED : Người nhận bấm Accept (tạo channel_id)
    PENDING --> IGNORED : Người nhận bấm Ignore
    PENDING --> BLOCKED : Người nhận bấm Block (chặn 403 về sau)
    PENDING --> CANCELLED : Người gửi hủy lời mời (Target Giai đoạn C)
    ACCEPTED --> [*]
    IGNORED --> [*]
    BLOCKED --> [*]
    CANCELLED --> [*]
```

---

## 5. BIỂU ĐỒ LỚP MIỀN & CẬP NHẬT DB SUY XUẤT

```mermaid
classDiagram
    class ChatService {
        +listChannels(userId)
        +initiateDirectChat(senderId, recipientId, initialMessage)
        +respondChatRequest(requestId, receiverId, status)
        +createGroupChannel(creatorId, name, memberIds)
        +sendMessage(senderId, input)
        +markChannelAsRead(channelId, userId, messageId)
    }
    class SseManager {
        +registerClient(userId, res, req)
        +sendToUser(userId, eventName, data)
        +broadcastToUsers(userIds, eventName, data)
    }
    class PresenceManager {
        +setOnline(userId)
        +setTyping(channelId, userId, username, isTyping)
        +getTypingUsers(channelId)
    }

    ChatService --> SseManager : pushes RFC 8895 events
    ChatService --> PresenceManager : tracks online & typing
```

### Ràng buộc & Cập nhật DB suy xuất cho Giai đoạn B (`000007`)
1. **Index tìm kiếm user `idx_users_username_trgm`:** Hỗ trợ chức năng *Search for people by username to chat with them* ở Giai đoạn C.
2. **Index `idx_chat_requests_sender_status (sender_id, status, created_at DESC)`:** Hỗ trợ truy vấn tab **Sent Requests** cho người gửi.
3. **Đồng bộ Mark-As-Read (`chat_members.last_read_message_id`)** & **Validation Group Chat >= 2 distinct members** ở tầng Service/Router.
