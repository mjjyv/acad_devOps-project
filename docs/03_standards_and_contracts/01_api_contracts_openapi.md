# Quy Chuẩn Khế Ước API RESTful & Giao Thức Thời Gian Thực SSE (Phase 5.3 Contracts v2.2)

> **Mã tài liệu:** `STD-API-CONTRACTS`  
> **Dự án:** Acad DevOps Fullstack Monorepo (**SYNAPSE Engine**)  
> **Khung chuẩn:** Giai đoạn 5 (Mục 3: Protocol & Interface Specification) trong [`SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/SYSTEM%20ANALYSIS%20%26%20DESIGN%20LIFECYCLE%20FRAMEWORK.md)  
> **Mã nguồn chuẩn:** [`packages/contracts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts)

---

## 1. MA TRẬN GIAO THỨC TRUYỀN THÔNG

| Kênh truyền thông | Giao thức & Định dạng | Đường dẫn | Mô hình giao tiếp | Giới hạn & Độ trễ mục tiêu |
| :--- | :--- | :--- | :--- | :--- |
| **Core REST API** | `HTTP / HTTPS JSON` (RFC 7807 lỗi) | `/api/v1/*` | Request – Response | Payload JSON `< 1MB`, timeout `25s` |
| **Realtime Stream** | `SSE RFC 8895` (`text/event-stream`) | `/api/v1/chat/events` | Server Push 1 chiều | Keep-alive `: ping` `15s`, `X-Accel-Buffering: no` |
| **Zero-Hop Media** | `HTTPS PUT Binary` | Presigned S3/R2 URL | Client $\rightarrow$ Object Storage | Giới hạn kích thước & MIME qua `file-guard.ts` |

---

## 2. DANH MỤC ENDPOINTS RESTFUL THỰC TẾ + MỞ RỘNG SUY XUẤT (`000007`)

| Phân hệ | Phương thức & Đường dẫn | Mô tả chức năng | Mã HTTP |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST /api/v1/auth/register`, `POST /login`, `POST /refresh`, `POST /logout` | Đăng ký, đăng nhập (`scrypt`), xoay vòng token 30s Grace | `200`, `201`, `401`, `409`, `429` |
| **Auth Users** | `GET /api/v1/auth/me`, `GET /auth/users/:username`, `GET /auth/users/search?q=` *(C)* | Hồ sơ cá nhân, hồ sơ công khai (ẩn PII), tìm kiếm username cho Chat | `200`, `401`, `404` |
| **Sessions** | `GET /api/v1/auth/sessions`, `POST /api/v1/auth/sessions/:id/revoke` | Danh sách phiên đa thiết bị & thu hồi phiên từ xa | `200`, `401` |
| **Spaces** | `GET /api/v1/spaces?topic=&q=`, `POST /spaces`, `GET /spaces/:slug`, `POST /join`, `POST /leave` | Duyệt/tạo Space, lọc theo `topic`, Join/Leave đồng bộ `member_count` | `200`, `201`, `403`, `409` |
| **Threads** | `GET /spaces/:slug/threads`, `GET /spaces/:slug/search?q=`, `POST /threads`, `GET /threads/:id` | Keyset pagination, `pg_trgm` In-Space search, tạo & đọc bài viết | `200`, `201`, `403`, `404` |
| **Comments** | `GET /threads/:id/comments`, `POST /threads/:id/comments`, `DELETE /comments/:id` | Cây `ltree` Base36 Capped Depth 8, soft-delete trừ counter active | `200`, `201`, `403` |
| **Votes & Feeds** | `POST /threads/:id/vote`, `POST /comments/:id/vote`, `GET /feed/home`, `GET /feed/popular` | Vote FSM Lua O(1), bảng tin Home (joined) & Popular (toàn sàn) | `200`, `401`, `403` |
| **Chat & Presence** | `GET /chat/channels`, `POST /chat/channels/direct`, `POST /chat/channels/group`, `GET/POST /chat/channels/:id/messages`, `POST /chat/channels/:id/read` *(C)* | Quản lý kênh 1-1 / nhóm (>= 2 người), tin nhắn, Chat Threads, mark-read | `200`, `201`, `400`, `403` |
| **Chat Requests** | `GET /chat/requests?direction=`, `PATCH /chat/requests/:id`, `DELETE /chat/requests/:id` *(C)* | Xem Incoming/Sent requests, Accept/Ignore/Block hoặc hủy lời mời | `200`, `403`, `404`, `409` |
| **Mod & Admin** | `POST /reports`, `GET /reports/my`, `GET/PATCH/DELETE /admin/*` | Báo cáo chống trùng 409, Mod Queue, Users/Spaces/Threads, Audit Logs | `200`, `201`, `403`, `409` |

---

## 3. ĐẶC TẢ GIAO THỨC THỜI GIAN THỰC (REALTIME SSE EVENTS)

- **Kết nối Client:** `EventSource('/api/v1/chat/events?token=<accessToken>')` (tự làm mới token khi reconnect).
- **Client Heartbeat & Typing Invocations:**
  - `POST /api/v1/chat/presence/heartbeat` (mỗi `12s` $\rightarrow$ làm mới `presence:online:{userId}` TTL `15s`).
  - `POST /api/v1/chat/channels/:id/typing { isTyping }` (`EX 5s` $\rightarrow$ phát sóng `typing:update`).
- **Server Push Events (`SseManager`):**
  - `connected` (`{ status: "connected", timestamp }`)
  - `message:new` (`ChatMessage` payload — tin chính & nhánh `parentMessageId`)
  - `chat_request:new` (`ChatRequest` payload tới người nhận)
  - `chat_request:updated` (`ChatRequest` payload khi `ACCEPTED`/`IGNORED`/`BLOCKED`)
  - `channel:created` (`ChatChannel` payload tới các thành viên mới)
  - `typing:update` (`{ channelId, userId, username, isTyping }`)

---

## 4. CHUẨN LỖI RFC 7807 PROBLEM DETAILS & PHÂN TRANG KEYSET

```json
{
  "type": "https://api.acad.vn/errors/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "The payload provided does not conform to the required schema.",
  "instance": "/api/v1/chat/channels/group",
  "correlationId": "uuid-v4"
}
```
- **Phân trang Feed/Messages:** Sử dụng Keyset Cursor Base64URL (`nextCursor`, `hasMore`, `limit`) thay cho `OFFSET` để chống trùng lặp/nhảy trang khi dữ liệu thay đổi liên tục.
