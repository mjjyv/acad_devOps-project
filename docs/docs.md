Hệ thống **Acad DevOps Monorepo** là một nền tảng mạng xã hội thảo luận kỹ thuật phân tầng cao (High-throughput Technical Discussion Engine) kết hợp giữa mô hình phân cấp cộng đồng của Reddit và kiến trúc mở của mạng xã hội phi tập trung. Bản phân tích dưới đây mổ xẻ toàn diện kiến trúc, giải pháp kỹ thuật, cơ sở dữ liệu và kế hoạch triển khai chi tiết của toàn bộ dự án từ mốc xuất phát **0%**.

### 1. Định Vị Sản Phẩm & Mục Tiêu Kỹ Thuật (Product Vision & Scoping)

#### 1.1. Vấn đề thực tế và Giải pháp đột phá

- **Thách thức của diễn đàn truyền thống (vBulletin, phpBB):** Tốc độ phản hồi chậm, cấu trúc cây bình luận đệ quy CTE gây nghẽn I/O cơ sở dữ liệu khi mở rộng quy mô, trải nghiệm duyệt thiếu linh hoạt.
- **Thách thức của mạng xã hội dòng thời gian ngắn (X, Facebook Groups):** Bài viết giá trị kỹ thuật cao nhanh chóng bị trôi; thuật toán tối ưu hóa tương tác gây tranh cãi thay vì chiều sâu chuyên môn; thiếu công cụ hỗ trợ khối mã lệnh (Code blocks) và công thức toán học.
- **Giải pháp cốt lõi của Acad DevOps:**
    - Cấu trúc không gian chủ đề (**Spaces** `/s/[slug]`) độc lập tương tự Subreddit, kiểm soát bằng quy tắc riêng và đội ngũ kiểm duyệt.
    - Cây thảo luận đa tầng vô hạn cấp xử lý bằng PostgreSQL `ltree` và ảo hóa DOM tuyến tính $\mathcal{O}(N)$.
    - Cơ chế bỏ phiếu nguyên tử qua Redis Lua $\mathcal{O}(1)$ kết hợp thuật toán xếp hạng phân rã trọng lực (Gravity Decay) Hacker News.
    - Hệ thống nhắn tin tức thời Reddit Chat hỗ trợ hàng đợi phê duyệt tin nhắn lạ (Chat Requests) chống spam và phân nhánh hội thoại (Chat Threads).

#### 1.2. Thước đo thành công & Tiêu chuẩn hiệu năng (KPIs / OKRs)

- **North Star Metric:** $WMD$ (Weekly Meaningful Discussions) — Tối thiểu 5 bình luận kỹ thuật giá trị trên mỗi chủ đề thảo luận hằng tuần.
- **Tỷ lệ giữ chân người dùng:** $W_4 \text{ Retention} \ge 25\%$.
- **Tỷ lệ đóng góp:** $\ge 8\%$ người dùng chủ động tạo nội dung (vượt xa mô hình 1-9-90 thông thường).
- **Hiệu năng Web Vitals:** $FCP \le 0.8\text{s}$, $LCP \le 1.2\text{s}$, $INP \le 100\text{ms}$, $CLS = 0$.
- **Khả năng chịu tải backend:** $\ge 5,000 \text{ RPS}$ với độ trễ $P_{95} < 50\text{ms}$.

#### 1.3. Phân loại yêu cầu theo MoSCoW

```đoạn mã
mindmap
  root((Phân Hạng MoSCoW))
    Must-Have
      Argon2id & Token Rotation 30s Grace Period
      Spaces /s/slug & Post Flairs
      Cây bình luận ltree Base36 Capped Depth 8
      Redis Lua Atomic Voting O 1
      Feed Gravity Decay & Base64 Cursor
      Admin Console 4 tabs RBAC
    Should-Have
      Reddit Chat 1-1 & Group Chat
      Hàng đợi Chat Requests chống spam
      Wilson Score Best ranking
      Zero-hop Media Upload Presigned URL S3
      In-Space Scoped Search
    Could-Have
      Minigames giải trí Canvas
      Hệ thống User Badges theo mốc Karma
      Custom Feeds gom nhóm Spaces
    Won't-Have
      Không tích hợp banner quảng cáo rác
      Không lưu trữ token tại Web Storage
```

### 2. Kiến Trúc Hệ Thống & Mô Hình Dữ Liệu (Architecture & Data Topology)

Hệ thống được tổ chức theo cấu trúc Layered Microservices Monorepo (`pnpm workspace`), phân lập nghiêm ngặt giữa tầng giao diện, tầng gateway, tầng dịch vụ nghiệp vụ và tầng lưu trữ.

#### 2.1. Sơ đồ địa hình hệ thống tổng thể (System Topology)

```đoạn mã
graph TD
    subgraph ClientLayer ["1. Tầng Trình Duyệt & Giao Diện"]
        Browser["Trình duyệt Web (Desktop / Mobile)"]
        Browser -->|HTTPS :443| NextApp["apps/web: Next.js 15 App Router<br/>(Server Components First, Brutalist Dark UI)"]
    end

    subgraph GatewayLayer ["2. Tầng Cổng Điều Phối & API Gateway"]
        NextApp -->|REST / JSON| ApiGateway["apps/api: Core API Gateway<br/>(Routing, Rate Limiter, CORS, RFC 7807)"]
        Browser -->|SSE / WebSocket| RealtimeHub["apps/api: Realtime Hub<br/>(Live Chat, Presence, Heartbeat 15s)"]
    end

    subgraph ServiceLayer ["3. Tầng Dịch Vụ Nghiệp Vụ (Services)"]
        ApiGateway --> AuthSvc["services/auth<br/>(Argon2id, Session Shield, RBAC)"]
        ApiGateway --> CommSvc["services/community<br/>(Spaces, Threads, Ltree, Feeds, Chat)"]
    end

    subgraph SharedPackages ["4. Tầng Thư Viện Dùng Chung (Packages)"]
        Contracts["packages/contracts (OpenAPI 3.1, Zod Schemas)"]
        Tokens["packages/ui-tokens (Brutalist Design Tokens)"]
        TreeVirt["packages/tree-virtualizer (O N Tree Flattening)"]
        AuthClient["packages/auth-client (Mutex Interceptor)"]
    end

    subgraph StorageLayer ["5. Tầng Dữ Liệu & Bộ Nhớ Đệm"]
        AuthSvc & CommSvc --> Postgres["PostgreSQL 16 (Supabase Managed)<br/>• ltree, pgcrypto, pg_trgm<br/>• thread_counters fillfactor=70 (HOT)"]
        AuthSvc & CommSvc --> Redis["Redis 7 (In-Memory & Cache)<br/>• Lua Voting Engine O(1)<br/>• Session Hashes & Sliding Window"]
    end

    CommSvc -.-> TreeVirt
    NextApp -.-> Tokens
    ApiGateway -.-> Contracts
    NextApp -.-> AuthClient
```

#### 2.2. Lược đồ cơ sở dữ liệu quan hệ (PostgreSQL 16)

Cơ sở dữ liệu kích hoạt 4 tiện ích mở rộng: `uuid-ossp`, `pgcrypto`, `ltree`, `pg_trgm`.

```đoạn mã
erDiagram
    users ||--o{ user_sessions : "sở hữu"
    users ||--o{ spaces : "khởi tạo"
    users ||--o{ space_memberships : "tham gia"
    spaces ||--o{ space_flairs : "định nghĩa"
    spaces ||--o{ threads : "chứa"
    users ||--o{ threads : "đăng tải"
    space_flairs ||--o{ threads : "gán nhãn"
    threads ||--|| thread_counters : "đồng bộ HOT"
    threads ||--o{ comments : "nhánh thảo luận"
    users ||--o{ comments : "viết"
    users ||--o{ chat_members : "tham gia"
    chat_channels ||--o{ chat_members : "chứa"
    chat_channels ||--o{ chat_messages : "lưu trữ"
    users ||--o{ chat_requests : "gửi/nhận"

    users {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        user_role role
        user_status status
        int karma_score
        timestamptz created_at
    }

    user_sessions {
        uuid id PK
        uuid user_id FK
        varchar refresh_token_hash
        varchar previous_token_hash
        timestamptz grace_period_expires_at
        boolean is_revoked
        timestamptz expires_at
    }

    spaces {
        uuid id PK
        varchar slug UK
        varchar name
        jsonb rules
        boolean is_private
        uuid creator_id FK
    }

    space_flairs {
        uuid id PK
        uuid space_id FK
        varchar name
        varchar slug
        varchar color_hex
        varchar background_hex
    }

    threads {
        uuid id PK
        uuid space_id FK
        uuid author_id FK
        uuid flair_id FK
        varchar title
        varchar slug UK
        text content_text
        jsonb content_ast
        boolean is_pinned
        boolean is_locked
    }

    thread_counters {
        uuid thread_id PK,FK
        int upvotes
        int downvotes
        int net_score
        int comments_count
        timestamptz updated_at
    }

    comments {
        uuid id PK
        uuid thread_id FK
        uuid author_id FK
        uuid parent_id FK
        ltree path
        jsonb content_ast
        int net_score
        boolean is_deleted
    }

    chat_channels {
        uuid id PK
        chat_channel_type type
        varchar name
        uuid creator_id FK
    }

    chat_messages {
        uuid id PK
        uuid channel_id FK
        uuid sender_id FK
        uuid parent_message_id FK
        text content
        jsonb attachments
        boolean is_deleted
    }

    chat_requests {
        uuid id PK
        uuid sender_id FK
        uuid receiver_id FK
        text initial_message
        chat_request_status status
    }
```

- **Cơ chế tối ưu hóa Heap-Only Tuples (HOT):** Bảng `thread_counters` được cấu hình `WITH (fillfactor = 70)`, để dành 30% dung lượng trống trên mỗi trang dữ liệu (data page 8KB). Khi background worker cập nhật số vote định kỳ, PostgreSQL thực hiện cập nhật ngay trên data page mà không cần ghi lại chỉ mục B-Tree, cắt giảm 90% chi phí I/O.

#### 2.3. Cấu trúc bộ nhớ đệm và Keyspace Redis 7

- `session:{user_id}:{session_id}` (Hash, TTL 7d): Lưu trữ hash token hiện tại, token cũ trong grace period, fingerprint thiết bị.
- `session_lookup:{token_hash}` (String, TTL 7d): Tra cứu ngược $O(1)$ từ token băm sang ID phiên.
- `vote:{target_id}:voters` (Hash, TTL 30d): Ánh xạ `user_id` $\rightarrow$ hướng vote (`1` hoặc `-1`).
- `vote:{target_id}:counters` (Hash, TTL 30d): Bộ đếm nguyên tử `upvotes`, `downvotes`, `net_score`.
- `dirty:votes` (Set): Danh sách các `target_id` có biến động điểm cần xả về PostgreSQL.
- `rate_limit:login:{ip}` (ZSet, TTL 15m): Sliding-window rate limit chống tấn công dò mật khẩu.
- `chat:online_users` (Set, TTL 5m): Theo dõi trạng thái trực tuyến của người dùng.
- `feed:hot:cache` (ZSet, TTL 60s): Lưu thứ hạng thread theo điểm Hot Score.

### 3. Thiết Kế Các Động Cơ Kỹ Thuật Cốt Lõi (Core Engines)

#### 3.1. Phân hệ Định danh & Kháng tấn công phiên (Zero-Trust Identity)

Hệ thống sử dụng cơ chế bảo mật xác thực kép:

- **Băm mật khẩu:** Argon2id với cấu hình kháng tấn công phần cứng GPU/ASIC (`memoryCost = 64MB`, `timeCost = 3`, `parallelism = 4`), so khớp qua `crypto.timingSafeEqual` chống tấn công dò thời gian.
- **Access Token:** Ký số HMAC-SHA256 (HS256), thời gian sống ngắn (15 phút).
- **Refresh Token:** Chuỗi CSPRNG 64 bytes ngẫu nhiên, mã hóa Base64 URL-safe, lưu trong HttpOnly Cookie (thời hạn 7 ngày).
- **Cửa sổ ân hạn 30 giây (30s Grace Period) & Phát hiện xâm nhập (Token Reuse Attack):**

```đoạn mã
sequenceDiagram
    autonumber
    actor Client as Trình Duyệt Web Client
    participant Interceptor as Client Interceptor (Mutex)
    participant Gateway as API Gateway
    participant Redis as Redis Session Store
    participant DB as PostgreSQL 16
    
    Note over Client, Gateway: Access Token hết hạn (401 Unauthorized)
    Client->>Interceptor: Gọi API bị từ chối
    Interceptor->>Interceptor: Khóa Mutex Lock (Anti-Thundering Herd)
    Interceptor->>Gateway: POST /api/v1/auth/refresh (Gửi Cookie Refresh Token)
    Gateway->>Redis: Tra cứu session data qua SHA256(RefreshToken)
    
    alt Trường hợp 1: Token hợp lệ (Khớp current_token_hash)
        Redis-->>Gateway: Hợp lệ -> Sinh cặp Access & Refresh Token mới
        Gateway->>Redis: Cập nhật current mới, previous cũ, grace_expires = NOW() + 30s
        Gateway-->>Interceptor: Trả về Access Token (15m) + Cookie Refresh Token (7d)
        Interceptor->>Interceptor: Mở khóa Mutex, giải phóng subscriberQueue
        Interceptor-->>Client: Thực thi lại yêu cầu ban đầu thành công
    else Trường hợp 2: Token cũ được gửi trong vòng 30s (Grace Period)
        Redis-->>Gateway: Khớp previous_token_hash VÀ NOW() < grace_expires
        Gateway-->>Interceptor: Cấp lại Access Token mới (Không cấp lại Refresh Token)
        Interceptor-->>Client: Hoàn tất yêu cầu
    else Trường hợp 3: Token bị dùng lại sau 30s (Phát hiện Replay Attack / Session Hijacking)
        Redis-->>Gateway: Phát hiện Token đã thu hồi bị gửi lại!
        Gateway->>Redis: DEL session:{userId}:* (Xóa sạch toàn bộ phiên)
        Gateway->>DB: UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = ?
        Gateway-->>Interceptor: HTTP 403 Forbidden (Cưỡng chế đăng xuất)
        Interceptor->>Client: Xóa trạng thái, chuyển hướng sang /login
    end
```

#### 3.2. Cây bình luận đa tầng `ltree` & Thuật toán ảo hóa tuyến tính $\mathcal{O}(N)$

- **Mô hình Materialized Path Base36:** Mỗi nút phân cấp dùng chuỗi Base36 4 ký tự (ví dụ: `0001.000a.0002`). Hệ thống đánh chỉ mục GiST trên trường `path`, cho phép truy vấn toàn bộ một nhánh thảo luận con trong **1 câu lệnh SQL duy nhất** với thời gian $< 1.2\text{ms}$ (`SELECT * FROM comments WHERE path <@ '0001' ORDER BY path ASC`).
- **Giới hạn Capped Depth 8:** Khi thảo luận đạt độ sâu cấp 8, để bảo vệ giao diện di động khỏi tình trạng thụt lề quá sâu, hệ thống tự động gán cờ `isCappedAtMaxDepth: true` và chuyển các phản hồi tiếp theo thành dạng phẳng (Flat Reply) kèm `@mention` tác giả.
- **Trải phẳng mảng tuyến tính $\mathcal{O}(N)$:** Hàm `flattenCommentTree()` quét qua danh sách node đúng 1 lượt duy nhất, tính toán độ sâu, số lượng nút con trực tiếp và bỏ qua các nhánh con bị thu gọn (collapsed), loại bỏ hoàn toàn đệ quy gây tràn bộ nhớ (Stack Overflow) trước khi cấp cho `@tanstack/react-virtual`.

#### 3.3. Động cơ bỏ phiếu nguyên tử qua Redis Lua & Xếp hạng Feed

- **Thực thi nguyên tử $\mathcal{O}(1)$ qua Lua Script (`execute_vote.lua`):** Xử lý vote mới (+1/-1), hủy vote (unvote), hoặc đảo chiều vote (+2/-2) trong 1 chu kỳ vi mô trên Redis, sau đó thêm `target_id` vào `dirty:votes`.
- **Cơ chế ghi dồn (Batch Sync):** Worker nền chạy mỗi 5 giây quét `dirty:votes`, đọc các bộ đếm từ Redis và thực hiện bulk upsert vào bảng `thread_counters` của PostgreSQL.
- **Thuật toán Gravity Decay (Hot Ranking):**

    $$
    HotScore = \frac{NetScore}{(AgeHours + 2.0)^{1.8}}
    $$

    Trọng số $Gravity = 1.8$ đảm bảo các chủ đề cũ hạ nhiệt đều đặn, nhường vị trí cho các chủ đề công nghệ mới nổi.

- **Thuật toán Wilson Score Interval ("Best"):**

    $$
    \hat{p} = \frac{Upvotes}{TotalVotes}, \quad Score = \frac{\hat{p} + \frac{z^2}{2n} - z \sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}
    $$

    Cân bằng khoảng tin cậy 95% giữa tỷ lệ vote tích cực và tổng số lượng vote, tránh việc bài viết ít người xem nhưng tỷ lệ 100% upvote áp đảo các bài viết thảo luận sôi nổi.

#### 3.4. Hệ thống nhắn tin tức thời Reddit Chat & Hàng đợi kiểm duyệt

- **Chat Scoping:** Hỗ trợ tin nhắn trực tiếp 1-1 qua username và nhóm chat kỹ thuật.
- **Hàng đợi Chat Requests:** Người dùng lạ gửi tin nhắn sẽ tạo bản ghi ở trạng thái `PENDING`. Người nhận có quyền:
    1. `Accept`: Chuyển thành hội thoại chính thức và kích hoạt thông báo.
    2. `Ignore`: Ẩn tin nhắn, không hiển thị chấm đỏ.
    3. `Block / Report`: Chặn vĩnh viễn và đẩy thông tin vào Mod Queue.

- **Chat Threads & Floating View:** Cho phép mở luồng thảo luận phụ theo tin nhắn (`parent_message_id`), chuyển đổi linh hoạt giữa giao diện cửa sổ nổi (Docked), thu nhỏ (Minimized) hoặc tab riêng biệt (Pop-out `↗`).

```đoạn mã
sequenceDiagram
    autonumber
    actor Alice as Người gửi (Alice)
    actor Bob as Người nhận (Bob)
    participant API as Chat Gateway
    participant DB as PostgreSQL
    participant SSE as Realtime Stream (SSE)
    
    Alice->>API: POST /api/v1/chat/messages { receiverId: Bob, content: "Chào bạn!" }
    API->>DB: Kiểm tra mối quan hệ kênh giữa Alice và Bob
    
    alt Chưa có kênh hội thoại chính thức
        API->>DB: INSERT INTO chat_requests (status: PENDING)
        API->>SSE: Gửi sự kiện ChatRequestReceived tới Bob
        SSE-->>Bob: Hiển thị banner "Yêu cầu tin nhắn mới từ Alice"
        
        alt Bob bấm Chấp nhận (Accept)
            Bob->>API: POST /api/v1/chat/requests/:id/accept
            API->>DB: Tạo chat_channel, cập nhật status = ACCEPTED
            API->>SSE: Khởi tạo kênh đối thoại trực tiếp
        else Bob bấm Bỏ qua (Ignore) hoặc Chặn (Block)
            Bob->>API: POST /api/v1/chat/requests/:id/block
            API->>DB: Cập nhật status = BLOCKED, thêm vào blacklist
        end
    else Kênh đã tồn tại
        API->>DB: INSERT INTO chat_messages
        API->>SSE: Broadcast MessageCreated
        SSE-->>Bob: Tin nhắn hiển thị tức thì trên màn hình
    end
```

### 4. Quy Chuẩn Kỹ Thuật, Giao Tiếp & Giao Diện (Standards & UX)

#### 4.1. Khế ước API & Chuẩn giao tiếp dữ liệu

- **Tiền tố & Định danh:** Toàn bộ RESTful API dùng tiền tố `/api/v1/` và danh từ số nhiều.
- **Mã lỗi theo chuẩn RFC 7807 (Problem Details):** Cung cấp cấu trúc lỗi chuẩn hóa gồm `type`, `title`, `status`, `detail`, `code`, `instance`.
- **Phân trang con trỏ Base64 (Cursor-based Pagination):** Tuyệt đối không dùng `offset/limit` trên luồng feed để tránh hiện tượng trùng hoặc bỏ sót bài khi có nội dung mới chèn vào đầu:

    $$
    \text{Cursor} = \text{base64}(\text{sort\_score} : \text{timestamp} : \text{item\_id})
    $$

#### 4.2. Ngôn ngữ thiết kế Minimalist Brutalism Dark Mode

Hệ thống sử dụng tỷ lệ phân bổ 4 gam màu chủ đạo:

- `#222831` (40% - Deep Void Charcoal): Nền canvas chính của toàn bộ hệ thống.
- `#393E46` (25% - Industrial Graphite): Bề mặt thẻ bài viết, khung chat, thanh điều hướng.
- `#948979` (15% - Muted Earthy Taupe): Đường viền dứt khoát `border: 1px solid`, đường kẻ nhánh cây bình luận.
- `#DFD0B8` (15% - Warm Parchment): Màu chữ tiêu đề, nút bấm CTA chính, độ tương phản cao.
- **Đổ bóng phẳng dứt khoát (Hard Flat Shadows):** Triệt tiêu góc bo tròn (`border-radius: 0px` đến `2px`) và hiệu ứng bóng mờ; sử dụng bóng góc 45° phẳng: `box-shadow: 3px 3px 0px #948979`.

#### 4.3. Quản lý trạng thái giao diện 3 tầng

- **Server State (TanStack Query v5):** Quản lý bộ nhớ đệm dữ liệu API, phân trang vô hạn, tự động thu hồi bộ nhớ.
- **Client UI State (Zustand):** Quản lý đóng/mở sidebar, thu gọn nhánh bình luận, trạng thái widget chat.
- **URL State (`nuqs`):** Đồng bộ các bộ lọc feed (`hot`, `new`, `top`), mốc thời gian (`t=day`), từ khóa tìm kiếm (`q`) trực tiếp lên query params của thanh địa chỉ.

### 5. Hạ Tầng Vận Hành, Container & CI/CD Pipeline

#### 5.1. Bốn cổng kiểm định tự động (GitHub Actions CI Gates)

Mọi commit trên nhánh `main` hoặc pull request bắt buộc phải vượt qua 4 cổng kiểm thử trước khi được đóng gói:

```đoạn mã
flowchart LR
    Gate1["Cổng 1: Linting<br/>(Biome linter < 0.5s)"] --> Gate2["Cổng 2: Typecheck<br/>(TypeScript strict & OpenAPI)"]
    Gate2 --> Gate3["Cổng 3: Test Suites<br/>(Vitest Unit & Integration)"]
    Gate3 --> Gate4["Cổng 4: Container Build<br/>(Multi-stage Docker check)"]
    Gate4 --> Deploy["Render Deploy Hook<br/>(Triển khai tự động)"]
```

#### 5.2. Đóng gói Container tối ưu (Multi-Stage Builds)

- **Backend API Container (`Dockerfile.api.prod`):** Biên dịch mã nguồn trên nền Node 24 Alpine, chuyển giao sang runtime non-root `appuser` (UID 1001), tích hợp `HEALTHCHECK` định kỳ qua endpoint `/healthz`, dung lượng image hoàn thiện **$\sim 85\text{MB}$**.
- **Frontend Web Container (`Dockerfile.web.prod`):** Tận dụng tính năng Standalone Build của Next.js (`output: 'standalone'`), chỉ đóng gói các tệp phụ thuộc cần thiết, chạy dưới user `nextjs:nodejs`, dung lượng hoàn thiện **$\sim 135\text{MB}$**.

#### 5.3. Chiến lược hạ tầng đám mây

- **Cơ sở dữ liệu:** Supabase Managed PostgreSQL tại Singapore kết nối qua Supavisor Pooler (Transaction Mode - Cổng 6543) hỗ trợ hàng ngàn kết nối đồng thời mà không nghẽn tài nguyên.
- **Ứng dụng & Cổng API:** Render Cloud Web Services khai báo dưới dạng Infrastructure-as-Code (`render.yaml`).
- **Cơ chế chống ngủ đông (Keep-Alive Worker):** Triển khai script nền định kỳ mỗi 10 phút gửi HTTP ping tới `/healthz` để ngăn chặn cơ chế đóng băng container (cold start trễ 40-50s) trên hạ tầng Render.

### 6. Lộ Trình Triển Khai Toàn Diện Từ 0% (Zero-Base Implementation Roadmap)

Với giả định tiến độ hiện tại là **0%**, quy trình phát triển áp dụng tuyệt đối tôn chỉ **Backend-First (Hạ tầng dữ liệu và nghiệp vụ API hoàn thiện trước $\rightarrow$ Giao diện người dùng theo sau)** nhằm triệt tiêu rủi ro refactor và xung đột khế ước dữ liệu.

```đoạn mã
gantt
    title LỘ TRÌNH TRIỂN KHAI TOÀN DIỆN DỰ ÁN TỪ MỐC 0% (WEEKS)
    dateFormat  X
    axisFormat  Tuần %d

    section Stream B: Backend
    B1: Hạ tầng DB, Redis & Auth Subsystem        :active, b1, 0, 3
    B2: Spaces, Post Flairs & Ltree Comments      :b2, 3, 6
    B3: Atomic Lua Voting & Feed Gravity Engine   :b3, 6, 9
    B4: Realtime Chat Subsystem & Chat Requests   :b4, 9, 12
    B5: Admin Console API, Mod Queue & RBAC       :b5, 12, 14

    section Stream F: Frontend
    F1: Brutalist Tokens, RSC Layout & Shell     :f1, 4, 7
    F2: Feed View, Lọc Flairs & Cây Virtualizer   :f2, 7, 10
    F3: Soạn thảo Tiptap, Admin UI & Sessions     :f3, 10, 13
    F4: Floating Chat Widget & Request Modals     :f4, 12, 15

    section Stream Q: QA & Load Test
    Q1: Vitest Unit/Integration Test Suites       :q1, 3, 14
    Q2: k6 Stress Testing (5,000 RPS)             :q2, 14, 16

    section Stream D: DevOps & Cloud
    D1: Docker Multi-stage & CI/CD 4 Cổng         :d1, 2, 5
    D2: Supabase Pooler Migration & Keep-Alive   :d2, 14, 16
    D3: Production Launch & Sentry/Prometheus     :d3, 16, 17
```

#### Ma trận công việc chi tiết từ 0%

| Dòng triển khai           | Giai đoạn (Phase)                     | Khối lượng công việc trọng tâm (Deliverables)                                                                                                                                                       | Tiêu chí nghiệm thu (Acceptance Criteria)                                                                                       |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Stream B (Backend)**    | <br>**Phase B1: Core Identity**<br>   | <br>• Thiết lập PostgreSQL 16 extensions & DDL users/sessions<br>• Triển khai thuật toán Argon2id & CSPRNG Token Generator<br>• Redis Session Store, Token Rotation & 30s Grace Period<br>          | <br>• Vượt qua kiểm thử phát hiện Token Reuse<br>• Chặn đứng Thundering Herd qua Mutex<br>                                      |
|                           | <br>**Phase B2: Content & Ltree**<br> | <br>• Bảng `spaces`, `space_memberships`, `space_flairs`<br>• Thuật toán sinh mã `ltree` Base36 4 ký tự (`ltree-path-generator`)<br>• Endpoint cấp Presigned PUT URL Cloudflare R2<br>              | <br>• Truy vấn toàn bộ cây con $\le 1.2\text{ms}$ qua GiST<br>• Capped Depth cấp 8 hoạt động chuẩn xác<br>                      |
|                           | <br>**Phase B3: Voting & Feeds**<br>  | <br>• Kịch bản Lua nguyên tử `execute_vote.lua`<br>• Worker 5s flush dồn từ `dirty:votes` vào `thread_counters`<br>• Thuật toán Gravity Decay, Wilson Score ("Best") và Search GIN<br>              | <br>• 0% race condition khi nhiều luồng cùng vote<br>• Cập nhật điểm không khóa bảng (fillfactor=70)<br>                        |
|                           | <br>**Phase B4: Realtime Chat**<br>   | <br>• Bảng `chat_channels`, `chat_messages`, `chat_requests`<br>• Cổng truyền phát sự kiện Server-Sent Events (SSE) / WebSocket<br>• Heartbeat ping/pong 15s và Presence status trên Redis<br>      | <br>• Người lạ không gửi được tin trực tiếp vào hộp thư<br>• Phân nhánh Chat Threads độc lập<br>                                |
|                           | <br>**Phase B5: Admin Hub**<br>       | <br>• RBAC Guard cho `/api/v1/admin/*` (`role === 'ADMIN'`)<br>• API thống kê Live Metrics và danh sách users có `threadsCount`<br>• Nghiệp vụ ghim bài, khóa comment, thu hồi phiên cưỡng chế<br>  | <br>• Người dùng thường nhận mã lỗi 403 Forbidden<br>• Thao tác Quản trị có nhật ký vết (Audit log)<br>                         |
| **Stream F (Frontend)**   | <br>**Phase F1: Design & Tokens**<br> | <br>• Thiết lập Tailwind CSS v4 và gói `@acad/ui-tokens`<br>• Thiết lập kiến trúc Server Components First (0KB JS tĩnh)<br>• Giao diện `/register`, `/login`, `/settings/sessions`<br>              | <br>• Tỷ lệ phối màu chuẩn Brutalist Dark Mode<br>• Điểm số Core Web Vitals ban đầu xanh mượt<br>                               |
|                           | <br>**Phase F2: Feeds & Tree**<br>    | <br>• Bảng tin Feed hỗ trợ Card View và Compact View<br>• Nút Upvote/Downvote tích hợp máy trạng thái Optimistic UI<br>• Tích hợp thư viện `@acad/tree-virtualizer` vào trang chi tiết<br>          | <br>• Cây hàng ngàn bình luận cuộn mượt mà 60fps<br>• Đảo vote tức thì không giật giao diện<br>                                 |
|                           | <br>**Phase F3: CMS & Admin**<br>     | <br>• Trình soạn thảo Tiptap Editor hỗ trợ Code block, Math KaTeX<br>• Nút tải ảnh Zero-hop trực tiếp lên Cloudflare R2<br>• Giao diện Admin Console 4 tabs (Dashboard, Users, Spaces, Threads)<br> | <br>• Không truyền tệp ảnh dung lượng lớn qua API Gateway<br>• Khóa tài khoản/thu hồi phiên có tác dụng tức thì<br>             |
|                           | <br>**Phase F4: Chat Widgets**<br>    | <br>• Khung Chat Widget nổi góc dưới màn hình<br>• Chuyển đổi 3 trạng thái: Minimized, Docked, Pop-out<br>• Banner cảnh báo Chat Request với 3 nút Accept/Ignore/Block<br>                          | <br>• Nhắn tin tức thời không làm che khuất nội dung đọc<br>• Số tin nhắn chưa đọc cập nhật chuẩn xác<br>                       |
| **Stream Q & D (DevOps)** | <br>**Phase D1 & D2: Release**<br>    | <br>• Dockerfile Multi-stage Alpine cho cả API (<100MB) và Web (<150MB)<br>• Pipeline 4 Cổng trên GitHub Actions<br>• Kịch bản migrate CSDL Supabase và Keep-alive script cho Render<br>            | <br>• Chịu tải thành công 5,000 RPS với độ trễ $P_{95} < 50\text{ms}$<br>• Hệ thống duy trì 100% uptime không bị cold start<br> |

### 7. Ma Trận Đánh Giá Rủi Ro & Chiến Lược Giảm Thiểu (Risk Management)

| Rủi ro kỹ thuật                                                | Mức độ         | Hậu quả tiềm tàng                                                                          | Giải pháp kỹ thuật phòng ngừa                                                                                                                                          |
| -------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <br>**Xung đột token khi mở nhiều tab**<br>                    | **Cao**        | <br>Trình duyệt kích hoạt nhiều lệnh refresh cùng lúc khiến phiên bị hủy hàng loạt.<br>    | <br>Cài đặt **30s Grace Period** trên Redis và áp dụng **Mutex Lock Interceptor** ở client để xếp hàng các request đến sau.<br>                                        |
| <br>**Tràn bộ nhớ khi render cây bình luận lớn**<br>           | **Cao**        | <br>Cây bình luận hàng chục ngàn node đệ quy làm sập tab trình duyệt người dùng.<br>       | <br>Áp dụng cấu trúc `ltree`, thuật toán trải phẳng mảng $\mathcal{O}(N)$ và chỉ render 15-20 node trong khung nhìn qua `@tanstack/react-virtual`.<br>                 |
| <br>**Tranh chấp điều kiện khi bỏ phiếu (Race Condition)**<br> | **Cao**        | <br>Hàng ngàn kỹ sư cùng vote một bài viết dẫn đến sai lệch bộ đếm và nghẽn ghi CSDL.<br>  | <br>Biên dịch logic vote vào kịch bản **Redis Lua nguyên tử $\mathcal{O}(1)$**, kết hợp worker xả dồn theo chu kỳ 5 giây vào bảng HOT update có `fillfactor = 70`.<br> |
| <br>**Tấn công Replay & Đánh cắp phiên làm việc**<br>          | **Trung bình** | <br>Kẻ tấn công sở hữu token cũ cố gắng tạo phiên giả mạo.<br>                             | <br>Cơ chế **Token Reuse Detection** phát hiện việc tái sử dụng token đã thu hồi ngoài cửa sổ ân hạn, lập tức hủy toàn bộ gia đình phiên làm việc liên quan.<br>       |
| <br>**Ngủ đông dịch vụ trên Render Free Tier**<br>             | **Trung bình** | <br>Máy chủ rơi vào trạng thái spin-down sau 15 phút không có request, gây trễ 40-50s.<br> | <br>Chạy tiến trình nền **Keep-Alive Worker** gửi probe định kỳ mỗi 10 phút vào `/healthz` để giữ container luôn ấm.<br>                                               |
| <br>**Tắc nghẽn kết nối cơ sở dữ liệu**<br>                    | **Trung bình** | <br>Các luồng kết nối trực tiếp làm cạn kiệt connection pool của PostgreSQL.<br>           | <br>Định tuyến toàn bộ lưu lượng qua **Supavisor Pooler** ở Transaction Mode (cổng 6543) kết hợp cơ chế tự phục hồi `InMemoryUserRepository` khi gặp sự cố mạng.<br>   |

Thiết kế kiến trúc toàn diện của dự án đã sẵn sàng trên phương diện đặc tả kỹ thuật, lược đồ dữ liệu và quy chuẩn giao tiếp. Toàn bộ quy trình sẽ được tiến hành khởi động tuần tự từ **Phase B1 (Hạ tầng CSDL Supabase, Redis Keyspace và Auth Engine)** để xây dựng bộ khung chịu tải vững chắc trước khi mở rộng lên các tầng ứng dụng tiếp theo.

---

# User [4]

`````markdown
Đi sâu vào roadmap Backend, mở rộng toàn diện.
- Dành cho agent
- Tập trung vào kế hoạch
`````

Bản kế hoạch triển khai Backend toàn diện dưới đây được chuẩn hóa theo định dạng chỉ thị kỹ thuật dành cho AI Agent thực thi, chia nhỏ thành 5 giai đoạn phát triển tuần tự (Stream B: Phases B1 $\rightarrow$ B5) từ mốc tiến độ 0%.

### 1. Nguyên Tắc Vận Hành Của Agent (Operational Directives & Invariants)

1. **Backend-First & Contract-First:** Mọi phân hệ phải định nghĩa Schema (OpenAPI 3.1 & Zod) tại `packages/contracts` trước khi cài đặt logic nghiệp vụ tại `services/` và routing tại `apps/api`.
2. **Tính Bất Biến Ranh Giới (Workspace Isolation):** `packages/*` tuyệt đối không import ngược từ `services/*` hoặc `apps/*`. `apps/api` chỉ đóng vai trò Facade/Gateway, không truy vấn trực tiếp CSDL mà phải ủy quyền cho các service tương ứng.
3. **Quy Chuẩn TypeScript Strict:** Không dùng kiểu `any`, bắt buộc thêm đuôi `.js` trong các import tương đối để tuân thủ Node.js ESM.
4. **Không Phá Vỡ Test Suite Hiện Hữu:** Mỗi thay đổi phải đảm bảo các bài kiểm tra Vitest sẵn có tiếp tục pass 100% trước khi chuyển bước.

### 2. Sơ Đồ Phụ Thuộc Thực Thi (Backend Execution DAG)

```đoạn mã
flowchart TD
    subgraph PhaseB1 ["PHASE B1: HẠ TẦNG & ĐỊNH DANH (AUTH SHIELD)"]
        B1_1["1.1 Supabase Schema: Extensions, Users, Sessions"] --> B1_2["1.2 Crypto Engine: Argon2id & CSPRNG Token"]
        B1_2 --> B1_3["1.3 Redis Session Store & Token Rotation (30s Grace)"]
        B1_3 --> B1_4["1.4 API Gateway: Auth Routing, CORS, Healthz Probe"]
    end

    subgraph PhaseB2 ["PHASE B2: CỘNG ĐỒNG, BÀI VIẾT & CÂY LTREE"]
        B1_4 --> B2_1["2.1 DDL Spaces, Flairs, Memberships & Threads"]
        B2_1 --> B2_2["2.2 Ltree Base36 Generator & Capped Depth 8"]
        B2_2 --> B2_3["2.3 Zero-hop S3/R2 Presigned Upload Service"]
        B2_3 --> B2_4["2.4 Space CMS & Thread CRUD API"]
    end

    subgraph PhaseB3 ["PHASE B3: ATOMIC VOTING, FEEDS & DISCOVERY"]
        B2_4 --> B3_1["3.1 Redis Lua Voting Engine (execute_vote.lua)"]
        B3_1 --> B3_2["3.2 PostgreSQL HOT Counters (fillfactor=70) & 5s Sync Worker"]
        B3_2 --> B3_3["3.3 Feed Engines: Gravity Decay (Hot) & Wilson Score (Best)"]
        B3_3 --> B3_4["3.4 Base64 Cursor Pagination & pg_trgm Search Engine"]
    end

    subgraph PhaseB4 ["PHASE B4: REDDIT REALTIME CHAT ENGINE"]
        B3_4 --> B4_1["4.1 DDL Chat Channels, Members, Messages & Requests"]
        B4_1 --> B4_2["4.2 Anti-spam Chat Requests Queue (Pending/Accept/Block)"]
        B4_2 --> B4_3["4.3 Realtime Hub: SSE / WebSocket Gateway (Ping/Pong 15s)"]
        B4_3 --> B4_4["4.4 Redis Presence & Typing Indicators"]
    end

    subgraph PhaseB5 ["PHASE B5: MODERATION & ADMIN HUB BACKEND"]
        B4_4 --> B5_1["5.1 Admin RBAC Guard (role === 'ADMIN')"]
        B5_1 --> B5_2["5.2 Live Metrics & User Management (threadsCount)"]
        B5_2 --> B5_3["5.3 Mod Queue, Shadowban Logic & Audit Logs"]
        B5_3 --> B5_4["5.4 Thread Moderation (Pin, Lock, Cascade Delete)"]
    end
```

### 3. Kế Hoạch Triển Khai Chi Tiết Từng Giai Đoạn (Phases B1 $\rightarrow$ B5)

#### 🔹 PHASE B1: Hạ Tầng CSDL & Phân Hệ Định Danh (Core Identity & Session Shield)

- **Tiền điều kiện:** Cài đặt Node 22 LTS, Docker Compose chạy PostgreSQL 16 và Redis 7.
- **Mục tiêu:** Cung cấp hạ tầng xác thực Zero-Trust, kháng tấn công phiên và chống nghẽn request.

##### Danh mục tệp tin mục tiêu:

- `deploy/migrations/01_auth_schema.sql`
- `packages/contracts/src/auth.ts`
- `services/auth/src/crypto/argon2id.ts`
- `services/auth/src/session/redis-session-store.ts`
- `services/auth/src/session/token-rotation.ts`
- `services/auth/src/repository/postgres-user-repository.ts`
- `services/auth/src/middleware/auth-guard.ts`
- `apps/api/src/routes/auth-router.ts`

##### Nhiệm vụ chi tiết cho Agent:

1. **Khởi tạo DDL PostgreSQL Auth:**
    - Kích hoạt tiện ích: `uuid-ossp`, `pgcrypto`.
    - Khởi tạo kiểu dữ liệu: `user_role` (`GUEST`, `USER`, `SPACE_MOD`, `GLOBAL_MOD`, `ADMIN`), `user_status` (`ACTIVE`, `SUSPENDED`, `SHADOWBANNED`, `DELETED`).
    - Tạo bảng `users` với ràng buộc `UNIQUE` trên `LOWER(username)` và `LOWER(email)`.
    - Tạo bảng `user_sessions` lưu vết `refresh_token_hash`, `previous_token_hash`, `grace_period_expires_at`, `is_revoked`.

2. **Cài đặt Module Mật Mã (Crypto Subsystem):**
    - Triển khai hàm băm mật khẩu `Argon2id` (`memoryCost: 65536 KB`, `timeCost: 3`, `parallelism: 4`).
    - Cài đặt cơ chế kiểm tra an toàn chống timing attack qua `crypto.timingSafeEqual`.
    - Sinh Access Token dạng JWT (HS256, hạn 15 phút, entropy bí mật $\ge 256\text{ bits}$).
    - Sinh Refresh Token bằng `crypto.randomBytes(64)` mã hóa Base64 URL-safe (hạn 7 ngày).

3. **Cài đặt Quản Lý Phiên (Session Shield):**
    - Quản lý trạng thái phiên trên Redis với hash `session:{user_id}:{session_id}` và lookup string `session_lookup:{token_hash}` (TTL 7 ngày).
    - Xử lý giao thức Token Rotation: Khi refresh, cấp cặp token mới, lưu token cũ vào `previous_token_hash` trong 30 giây.
    - Xử lý Token Reuse Attack: Nếu token cũ gửi lên sau 30 giây, hủy toàn bộ gia đình phiên làm việc (`is_revoked = TRUE` trên DB và `DEL session:{userId}:*` trên Redis).

4. **Cổng API Gateway Auth Router:**
    - Cài đặt các route: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`.
    - Gắn Cookie HttpOnly cho Refresh Token (`SameSite=Strict`, `Secure=true`).
    - Cài đặt route kiểm tra sức khỏe `GET /healthz` trả về trạng thái CSDL và Redis.

##### Tiêu chí nghiệm thu (Definition of Done):

- Test suite `crypto.test.ts` và `token-rotation.test.ts` pass 100%.
- Gọi API refresh đồng thời không bị lỗi phiên; gọi refresh bằng token đã thu hồi ngoài 30s trả về HTTP 403 và thu hồi toàn bộ phiên của tài khoản đó.

#### 🔹 PHASE B2: Quản Lý Không Gian, Nội Dung & Cây Bình Luận Đa Tầng (Spaces & Content)

- **Tiền điều kiện:** Hoàn tất Phase B1, đã có token xác thực người dùng.
- **Mục tiêu:** Cung cấp mô hình cộng đồng kỹ thuật, gán nhãn chuyên môn và cây thảo luận vô hạn cấp.

##### Danh mục tệp tin mục tiêu:

- `deploy/migrations/02_community_ltree.sql`
- `packages/contracts/src/community.ts`
- `services/community/src/spaces/space-service.ts`
- `services/community/src/threads/thread-service.ts`
- `services/community/src/comments/ltree-path-generator.ts`
- `packages/tree-virtualizer/src/flatten-tree.ts`
- `services/community/src/media/presigned-url-service.ts`
- `apps/api/src/routes/community-router.ts`

##### Nhiệm vụ chi tiết cho Agent:

1. **Khởi tạo DDL PostgreSQL Community & Ltree:**
    - Kích hoạt tiện ích mở rộng `ltree`.
    - Tạo bảng `spaces` (slug, name, rules dạng `JSONB`) và `space_memberships` (user_id, space_id, role).
    - Tạo bảng `space_flairs` định nghĩa nhãn theo từng Space (`[DevOps]`, `[SecOps]`, `[SystemArch]`, `[Incident]`, `[Question]`) với trường mã màu `color_hex` và `background_hex`.
    - Tạo bảng `threads` liên kết khóa ngoại với `space_flairs`.
    - Tạo bảng `comments` với trường `path` kiểu `LTREE`, thiết lập chỉ mục GiST trên `path` (`USING GIST (path)`) và B-Tree kết hợp `(thread_id, path)`.

2. **Cài đặt Động Cơ Ltree Base36 Path Generator:**
    - Cài đặt class `LtreePathGenerator`:
        - Chuyển đổi số thứ tự sang chuỗi Base36 4 ký tự cố định (pad số 0 phía trước, ví dụ: $0 \rightarrow \text{"0001"}$, $35 \rightarrow \text{"000z"}$).
        - Giới hạn độ sâu tối đa cấp 8 (Capped Depth 8). Nếu độ sâu đạt mức 8, giữ nguyên path cha và bật cờ `isCappedAtMaxDepth: true` kèm `parentAuthorMentionNeeded: true` để chuyển sang dạng phản hồi phẳng (Flat Reply).

3. **Cài đặt Dịch Vụ Tải Ảnh Zero-Hop Media:**
    - Cài đặt `PresignedUrlService` sinh AWS S3 / Cloudflare R2 Presigned PUT URL có thời hạn 5 phút.
    - Client tải trực tiếp ảnh lên Storage, không truyền payload tệp nhị phân qua API Gateway.

4. **Cài đặt API Gateway Community Endpoints:**
    - `POST /api/v1/spaces` (Tạo không gian mới).
    - `POST /api/v1/spaces/:slug/join` & `POST /api/v1/spaces/:slug/leave`.
    - `POST /api/v1/threads` (Đăng bài kèm `flairId`).
    - `POST /api/v1/threads/:id/comments` (Bình luận phân nhánh tính toán ltree path tự động).
    - `GET /api/v1/threads/:id/comments` (Truy vấn một lệnh SQL duy nhất theo path GiST `path <@ root`).

##### Tiêu chí nghiệm thu (Definition of Done):

- Test suite `ltree-path.test.ts` và `flatten-tree.test.ts` pass 100%.
- Thời gian truy vấn toàn bộ cây bình luận 1,000 node bằng `ltree` dưới $5\text{ms}$.

#### 🔹 PHASE B3: Bầu Chọn Nguyên Tử, Danh Tiếng & Động Cơ Bảng Tin (Voting & Feeds)

- **Tiền điều kiện:** Hoàn tất Phase B2, đã có bài viết và bình luận trong CSDL.
- **Mục tiêu:** Xử lý bình chọn thời gian thực không race condition, tính điểm danh tiếng và tổng hợp feed thông minh.

##### Danh mục tệp tin mục tiêu:

- `deploy/redis/execute_vote.lua`
- `services/community/src/voting/lua-vote-engine.ts`
- `services/community/src/voting/gravity-decay.ts`
- `services/community/src/voting/wilson-score.ts`
- `services/community/src/voting/batch-sync-worker.ts`
- `services/community/src/feeds/feed-aggregator.ts`
- `services/community/src/search/search-engine.ts`
- `apps/api/src/routes/feed-router.ts`

##### Nhiệm vụ chi tiết cho Agent:

1. **Cài đặt Kịch Bản Redis Lua Script Nguyên Tử:**
    - Triển khai kịch bản `execute_vote.lua` tiếp nhận: `KEYS[1]` (`voters`), `KEYS[2]` (`counters`), `KEYS[3]` (`dirty_set`), `ARGV[1]` (`user_id`), `ARGV[2]` (`direction`).
    - Xử lý nguyên tử: Bỏ phiếu mới, hủy bỏ phiếu (unvote) và đảo chiều phiếu (+2/-2).
    - Cập nhật `upvotes`, `downvotes`, `net_score` và thêm `target_id` vào tập hợp `dirty:votes`.

2. **PostgreSQL HOT Update & Batch Sync Worker:**
    - Tạo bảng `thread_counters` với tham số lưu trữ `WITH (fillfactor = 70)`.
    - Cài đặt worker nền chạy định kỳ mỗi 5 giây:
        - Dùng lệnh Redis `SMEMBERS dirty:votes` và `DEL dirty:votes`.
        - Đọc các trường trong `vote:{target_id}:counters`.
        - Thực thi truy vấn `INSERT INTO thread_counters ... ON CONFLICT DO UPDATE` ghi dồn về CSDL mà không ghi lại chỉ mục B-tree.

3. **Cài đặt Thuật Toán Xếp Hạng Feeds:**
    - **Hot Feed:** Áp dụng Gravity Decay:

        $$
        HotScore = \frac{NetScore}{(AgeHours + 2.0)^{1.8}}
        $$

    - **Best Feed:** Cài đặt thuật toán khoảng tin cậy Wilson Score 95%.
    - **Top Feed:** Lọc theo mốc thời gian `t=day|week|month|year|all`.
    - **New Feed:** Sắp xếp theo `created_at DESC`.

4. **Phân Trang Con Trỏ & Tìm Kiếm Toàn Văn Bản:**
    - Mã hóa con trỏ Base64 không dùng `offset/limit`:

        $$
        \text{Cursor} = \text{base64}(\text{sort\_score} : \text{timestamp} : \text{item\_id})
        $$

    - Kích hoạt tiện ích `pg_trgm`, tạo chỉ mục `GIN` trên trường `threads.title` (`gin_trgm_ops`).
    - Cài đặt tìm kiếm theo từ khóa `q` và tìm kiếm có giới hạn phạm vi trong Space (`In-Space Scoped Search` qua tham số `spaceId`).

##### Tiêu chí nghiệm thu (Definition of Done):

- Test suite `lua-vote.test.ts` và `gravity-decay.test.ts` pass 100%.
- Mô phỏng 100 requests đồng thời upvote/downvote trên cùng một thread không xảy ra sai lệch điểm số (0% race condition).

#### 🔹 PHASE B4: Phân Hệ Reddit Chat Tức Thời & Kiểm Duyệt Tin Nhắn (Realtime Chat)

- **Tiền điều kiện:** Hoàn tất Phase B1 và Phase B3.
- **Mục tiêu:** Cung cấp kênh đối thoại trực tiếp 1-1 và Group Chat, giải quyết bài toán chống spam tin nhắn lạ.

##### Danh mục tệp tin mục tiêu:

- `deploy/migrations/03_chat_schema.sql`
- `packages/contracts/src/chat.ts`
- `services/community/src/chat/chat-repository.ts`
- `services/community/src/chat/chat-service.ts`
- `services/community/src/chat/presence-service.ts`
- `apps/api/src/realtime/sse-gateway.ts`
- `apps/api/src/routes/chat-router.ts`

##### Nhiệm vụ chi tiết cho Agent:

1. **Khởi tạo DDL PostgreSQL Chat Subsystem:**
    - Tạo kiểu ENUM: `chat_channel_type` (`DIRECT`, `GROUP`), `chat_request_status` (`PENDING`, `ACCEPTED`, `IGNORED`, `BLOCKED`).
    - Tạo bảng `chat_channels` và bảng thành viên `chat_members` (lưu vết `last_read_at`).
    - Tạo bảng `chat_messages` có trường `parent_message_id` hỗ trợ Chat Threads (nhánh thảo luận con trong tin nhắn).
    - Tạo bảng `chat_requests` với ràng buộc duy nhất trên cặp `(sender_id, receiver_id)`.

2. **Cài đặt Nghiệp Vụ Hàng Đợi Yêu Cầu Tin Nhắn (Chat Requests Queue):**
    - Khi gửi tin nhắn 1-1 tới người dùng chưa từng tương tác: Hệ thống tạo bản ghi trong `chat_requests` ở trạng thái `PENDING`.
    - API xử lý phản hồi từ người nhận:
        - `POST /api/v1/chat/requests/:id/accept`: Nâng cấp thành kênh chat chính thức (`chat_channels`), chuyển trạng thái `ACCEPTED`.
        - `POST /api/v1/chat/requests/:id/ignore`: Đánh dấu `IGNORED`, không thông báo lại.
        - `POST /api/v1/chat/requests/:id/block`: Đánh dấu `BLOCKED`, chặn liên lạc vĩnh viễn.

3. **Cài đặt Cổng Truyền Phát Thời Gian Thực (SSE / WebSocket Gateway):**
    - Triển khai Server-Sent Events (SSE) tại endpoint `/api/v1/chat/stream` xác thực qua Access Token.
    - Cài đặt cơ chế Heartbeat ping định kỳ mỗi 15 giây để duy trì kết nối.
    - Broadcast các sự kiện: `MessageCreated`, `ChatRequestReceived`, `UserTyping`, `MessageRead`.

4. **Quản Lý Trạng Thái Trực Tuyến & Typing Indicator Trên Redis:**
    - Theo dõi trạng thái hoạt động qua Redis Set `chat:online_users` (TTL 5 phút, làm mới qua Heartbeat).
    - Quản lý trạng thái đang soạn tin nhắn qua Redis Hash `chat:channel:{channel_id}:typing` với TTL 5 giây.

##### Tiêu chí nghiệm thu (Definition of Done):

- Tin nhắn từ người chưa kết nối bắt buộc chuyển vào hàng đợi Chat Requests, không phát thông báo âm thanh hoặc tin nhắn trực tiếp tới người nhận khi chưa được chấp thuận.
- Hai client gửi tin nhắn nhận được payload tức thì qua SSE stream với độ trễ nội bộ $< 20\text{ms}$.

#### 🔹 PHASE B5: Trung Tâm Quản Trị, Mod Queue & Kiểm Duyệt Nội Dung (Admin & Mod Hub)

- **Tiền điều kiện:** Hoàn tất Phase B1 tới B4.
- **Mục tiêu:** Cung cấp bộ công cụ điều hành toàn diện, phân quyền kép RBAC/ABAC và kiểm soát an toàn nội dung.

##### Danh mục tệp tin mục tiêu:

- `deploy/migrations/04_moderation_schema.sql`
- `packages/contracts/src/admin.ts`
- `services/auth/src/middleware/admin-guard.ts`
- `services/community/src/moderation/moderation-service.ts`
- `services/community/src/moderation/audit-log-service.ts`
- `apps/api/src/routes/admin-router.ts`

##### Nhiệm vụ chi tiết cho Agent:

1. **Cài đặt Bộ Lọc Bảo Vệ Quyền Quản Trị (Admin Guard):**
    - Triển khai middleware `adminGuard`: Kiểm tra `user.role === 'ADMIN'`, trả về HTTP 401 nếu chưa đăng nhập và HTTP 403 nếu vai trò là `USER` hoặc `SPACE_MOD`.

2. **Cài đặt Cụm API Quản Trị Thống Kê & Người Dùng:**
    - `GET /api/v1/admin/stats`: Truy vấn số liệu thời gian thực gồm tổng người dùng (phân loại Active/Suspended), số phiên làm việc, tổng số Spaces, Threads và Comments.
    - `GET /api/v1/admin/users`: Trả về danh sách người dùng kèm cột đếm chính xác số lượng bài viết đã đăng (`threadsCount`) và điểm Karma.
    - `PATCH /api/v1/admin/users/:id/role`: Cập nhật vai trò người dùng.
    - `PATCH /api/v1/admin/users/:id/status`: Khóa tài khoản (`SUSPENDED`) hoặc cấm ngầm (`SHADOWBANNED`).
    - `POST /api/v1/admin/users/:id/revoke-sessions`: Thu hồi cưỡng chế toàn bộ phiên của tài khoản.

3. **Cài đặt Cụm API Quản Trị Không Gian & Bài Viết:**
    - `GET /api/v1/admin/spaces`: Trả về danh sách không gian kèm chính xác số lượng thành viên (`memberCount`) và số lượng bài viết (`threadCount`).
    - `DELETE /api/v1/admin/spaces/:id`: Xóa bỏ không gian và kích hoạt cascade xóa toàn bộ bài viết, bình luận liên quan (`ON DELETE CASCADE`).
    - `PATCH /api/v1/admin/threads/:id/pin`: Ghim hoặc bỏ ghim bài viết.
    - `PATCH /api/v1/admin/threads/:id/lock`: Khóa hoặc mở khóa bình luận.
    - `DELETE /api/v1/admin/threads/:id`: Xóa bỏ bài viết vi phạm.

4. **Nhật Ký Kiểm Toán (Audit Trail) & Hàng Đợi Báo Cáo (Mod Queue):**
    - Tạo bảng `reports` lưu báo cáo từ người dùng (lý do vi phạm, target_id).
    - Tạo bảng `audit_logs` ghi nhận mọi thao tác can thiệp của Quản trị viên (admin_id, action, target_type, target_id, changes_json, ip_address).

##### Tiêu chí nghiệm thu (Definition of Done):

- Test suite `admin-endpoints.test.ts` pass 100%.
- Mọi hành động nhạy cảm (khóa user, xóa space, thu hồi phiên) đều sinh bản ghi trong `audit_logs`.

### 4. Bảng Kiểm Rủi Ro Kỹ Thuật Dành Cho Agent (Edge Cases & Resilience Matrix)

| Kịch bản lỗi / Tình huống biên                              | Hành vi bắt buộc của Agent khi cài đặt                                                                                                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <br>**Mất kết nối Supabase CSDL đột ngột**<br>              | <br>Kích hoạt cơ chế fallback sang `InMemoryUserRepository` trong `postgres-user-repository.ts` để API không bị crash tiến trình, duy trì trả mã lỗi 503 thay vì sập container.<br> |
| <br>**Bão yêu cầu khi token hết hạn (Thundering Herd)**<br> | <br>Bắt buộc kiểm tra client interceptor có khóa Mutex Lock và hàng đợi `subscriberQueue` giải phóng Promise tuần tự.<br>                                                           |
| <br>**Cây bình luận vượt quá cấp 8**<br>                    | <br>Không được tiếp tục nối chuỗi `path.0001` sang cấp 9. Bắt buộc kích hoạt cờ `isCappedAtMaxDepth: true` và giữ nguyên độ sâu của cấp 8.<br>                                      |
| **Redis gặp sự cố hoặc cạn bộ nhớ (OOM)**                   | Kịch bản Lua vote phải bắt lỗi `pcall()`. Nếu Redis lỗi, ghi trực tiếp giao dịch vào CSDL PostgreSQL qua khối lệnh `BEGIN ... COMMIT` an toàn.                                      |
| <br>**Người dùng bị Shadowban cố gắng đăng bài**<br>        | <br>API trả về HTTP 201 Created như bình thường, bản ghi được lưu nhưng gắn cờ ẩn với toàn bộ truy vấn của người dùng khác.<br>                                                     |

### 5. Cổng Kiểm Định Thực Thi Của Agent (Verification Commands)

Sau khi hoàn thành mã nguồn của từng phase, Agent bắt buộc chạy tuần tự bộ lệnh xác minh sau trên môi trường dòng lệnh Linux:

```bash
# 1. Kiểm tra chuẩn hóa mã nguồn qua Biome (Yêu cầu 0 lỗi format/lint)
pnpm run lint

# 2. Kiểm tra tính hợp lệ của TypeScript Strict trên toàn bộ Monorepo
pnpm run build:libs && pnpm run typecheck

# 3. Thực thi toàn bộ bộ kiểm thử tự động Backend qua Vitest
node ./packages/tree-virtualizer/node_modules/vitest/vitest.mjs run

# 4. Kiểm tra cấu hình đóng gói Docker Multi-stage
docker compose -f deploy/docker/docker-compose.dev.yml config --quiet
```

Chỉ khi cả 4 lệnh trên trả về mã trạng thái `0` (Exit Code 0), giai đoạn Backend đó mới được coi là hoàn tất và đủ điều kiện để chuyển tiếp sang giai đoạn kế tiếp.

---

# User [5]

`````markdown
Đi sâu vào roadmap Frontend, mở rộng toàn diện.
- Dành cho agent
- Tập trung vào kế hoạch
`````

Bản kế hoạch triển khai Frontend toàn diện dưới đây được thiết kế thành tài liệu chỉ thị kỹ thuật dành cho AI Agent thực thi, chia nhỏ thành 4 giai đoạn tuần tự (Stream F: Phases F1 $\rightarrow$ F4) từ mốc tiến độ 0% trên nền tảng Next.js 15 App Router, React 19 và Tailwind CSS v4.

### 1. Nguyên Tắc Vận Hành Của Agent (Frontend Directives & Invariants)

1. **Server Components First (Mặc định 100% RSC):** Mọi trang (`page.tsx`) và khung bố cục (`layout.tsx`) bắt buộc là Server Component. Không gửi mã nguồn JavaScript tĩnh về client đối với các trang xem nội dung bài viết và tài liệu nhằm giữ kích thước bundle tối thiểu.
2. **Thu Hẹp Tối Đa Biên Giới Client (`'use client'`):** Chỉ khai báo `'use client'` tại các nút tương tác sâu nhất ở tầng lá (Leaf Nodes): nút bấm biểu quyết Up/Downvote, khung soạn thảo phản hồi phân cấp, widget Reddit Chat nổi và thanh tìm kiếm phím tắt.
3. **Phân Định Nghiêm Ngặt 3 Tầng Trạng Thái (MECE State Boundary):**
    - **Server State:** Quản lý tập trung bằng **TanStack Query v5** (cache, garbage collection, phân trang con trỏ vô hạn).
    - **Client UI State:** Quản lý bằng **Zustand Store** (thu gọn nhánh cây bình luận, trạng thái mở/đóng widget chat, modal).
    - **URL State:** Quản lý hai chiều thông qua **`nuqs`** (loại sắp xếp feed `hot/new/top/best`, mốc thời gian `t=day`, con trỏ trang `cursor`, từ khóa tìm kiếm `q`).

4. **Chuẩn Mực Thiết Kế Brutalist Dark Mode Bất Biến:**
    - Bảng màu 4 cấp độ: `#222831` (Canvas 40%), `#393E46` (Bề mặt 25%), `#948979` (Viền/Metadata 15%), `#DFD0B8` (Text/Hero 15%).
    - Triệt tiêu bo góc lớn (`border-radius: 0px` đến tối đa `2px`), không dùng bóng mờ nhạt (blur); bắt buộc dùng bóng đổ phẳng góc 45°: `box-shadow: 3px 3px 0px #948979`.
    - Kiểu chữ: `Inter` cho văn bản nội dung, `JetBrains Mono` cho khối mã, số liệu vote, thời gian và nhãn badge kỹ thuật.

5. **Đồng Bộ Khế Ước An Ninh Với Client Interceptor:** Tích hợp trực tiếp `@acad/auth-client` với cơ chế khóa Mutex Lock chống bão yêu cầu (Thundering Herd) khi Access Token hết hạn.

### 2. Sơ Đồ Phụ Thuộc Thực Thi (Frontend Execution DAG)

```đoạn mã
flowchart TD
    subgraph PhaseF1 ["PHASE F1: NỀN TẢNG UI, TOKENS & HỆ THỐNG AUTH"]
        F1_1["1.1 Khởi tạo @acad/ui-tokens & Tailwind v4 Config"] --> F1_2["1.2 Root Shell, Navbar (Shortcut /) & Sidebar"]
        F1_2 --> F1_3["1.3 Tích hợp @acad/auth-client & Mutex Interceptor"]
        F1_3 --> F1_4["1.4 Auth Pages: /login, /register, /settings/sessions"]
    end

    subgraph PhaseF2 ["PHASE F2: BẢNG TIN, NHÃN FLAIRS & CÂY ẢO HÓA"]
        F1_4 --> F2_1["2.1 Feed Layout: Card View vs Compact View"]
        F2_1 --> F2_2["2.2 Đồng bộ URL State với nuqs (hot/new/top/best)"]
        F2_2 --> F2_3["2.3 Optimistic Voting Button (VoteAction FSM)"]
        F2_3 --> F2_4["2.4 Chi tiết /threads/[slug] & @acad/tree-virtualizer"]
    end

    subgraph PhaseF3 ["PHASE F3: SOẠN THẢO TIPTAP & ADMIN CONSOLE"]
        F2_4 --> F3_1["3.1 Trình soạn thảo Tiptap (Code highlight, KaTeX)"]
        F3_1 --> F3_2["3.2 Tải ảnh Zero-hop trực tiếp lên Cloudflare R2/S3"]
        F3_2 --> F3_3["3.3 Admin Guard Layout (/admin) & Sub-Navbar 4 Tabs"]
        F3_3 --> F3_4["3.4 Admin Views: Users (threadsCount), Spaces, Threads"]
    end

    subgraph PhaseF4 ["PHASE F4: REDDIT CHAT WIDGET & REALTIME SSE"]
        F3_4 --> F4_1["4.1 Floating Chat Widget FSM (Minimized/Docked/Pop-out)"]
        F4_1 --> F4_2["4.2 Hook useRealtimeChat kết nối SSE Gateway & Heartbeat"]
        F4_2 --> F4_3["4.3 Hàng đợi Chat Requests (Accept/Ignore/Block UI)"]
        F4_3 --> F4_4["4.4 Phân nhánh Chat Threads & Chia sẻ Post nhúng"]
    end
```

### 3. Kế Hoạch Triển Khai Chi Tiết Từng Giai Đoạn (Phases F1 $\rightarrow$ F4)

#### 🔹 PHASE F1: Nền Tảng Giao Diện, Brutalist Tokens & Phân Hệ Auth (Foundation & Auth Shell)

- **Tiền điều kiện:** Backend Phase B1 đã sẵn sàng các endpoint `/api/v1/auth/*`.
- **Mục tiêu:** Thiết lập cấu trúc Design Tokens, bộ layout toàn cục Server-First, tích hợp Interceptor chống race-condition token và các trang xác thực.

##### Danh mục tệp tin mục tiêu:

- `packages/ui-tokens/src/colors.ts`
- `packages/ui-tokens/src/typography.ts`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/layout/Navbar.tsx`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/SearchTrigger.tsx`
- `apps/web/src/app/(auth)/login/page.tsx`
- `apps/web/src/app/(auth)/register/page.tsx`
- `apps/web/src/app/(auth)/settings/sessions/page.tsx`

##### Nhiệm vụ kỹ thuật chi tiết:

1. **Thiết lập `@acad/ui-tokens` và Tailwind CSS v4:**
    - Cấu hình CSS Variables chuẩn Brutalist Dark:

```css
:root {
  --canvas-bg: #222831;
  --surface-bg: #393E46;
  --border-taupe: #948979;
  --text-parchment: #DFD0B8;
  --shadow-flat: 3px 3px 0px #948979;
  --shadow-flat-hover: 4px 4px 0px #DFD0B8;
}
```

    - Cấu hình font nạp từ `@next/font`: `Inter` (sans-serif) và `JetBrains Mono` (monospace).

2. **Cấu trúc Bố Cục Toàn Cục (Root Layout):**
    - `apps/web/src/app/layout.tsx`: Thành phần RSC thuần túy bọc ngoài. Nạp font, gán class `bg-[#222831] text-[#DFD0B8]`, tích hợp `TanStackQueryProvider` ở dạng client leaf component.
    - `Navbar.tsx`: Hiển thị logo Brutalist góc trái, cụm điều hướng chính, thanh tìm kiếm kích hoạt bằng phím tắt `/` hoặc `Ctrl + K`, và cụm thông tin hồ sơ/đăng nhập.
    - `Sidebar.tsx`: Điều hướng nhanh các kênh Feeds (Home, Popular, News), danh sách không gian đã tham gia (Spaces) và các minigames tích hợp.

3. **Tích hợp `@acad/auth-client` với Mutex Interceptor:**
    - Cài đặt cơ chế bắt mã HTTP 401: Ngăn chặn nhiều yêu cầu làm mới đồng thời (anti-thundering herd). Khóa mutex chỉ cho phép duy nhất một request gọi `POST /api/v1/auth/refresh`, các request khác xếp vào `subscriberQueue`.

4. **Xây dựng Giao Diện Đăng Ký, Đăng Nhập & Quản Lý Phiên:**
    - `/login` & `/register`: Thiết kế thẻ form hình khối phẳng tương phản cao (`border: 1px solid #948979`, `box-shadow: 3px 3px 0px #948979`), hiển thị lỗi chi tiết định dạng RFC 7807.
    - `/settings/sessions`: Hiển thị danh sách phiên thiết bị (IP, User Agent, Thời điểm đăng nhập), nút "Hủy phiên này" và "Đăng xuất khỏi tất cả thiết bị khác".

##### Tiêu chí nghiệm thu (Definition of Done):

- Lệnh `pnpm --filter @acad/web build` hoàn thành không có lỗi biên dịch TypeScript.
- Đăng nhập thành công thiết lập đúng HttpOnly Cookie, token tự động quay vòng khi gọi API bảo mật.
- Phím tắt `/` đưa tiêu điểm (focus) vào ô tìm kiếm từ bất kỳ vị trí nào trên trang.

#### 🔹 PHASE F2: Bảng Tin Đa Chế Độ, Hệ Thống Nhãn Flairs & Cây Bình Luận Ảo Hóa (Feeds & Tree Engine)

- **Tiền điều kiện:** Backend Phase B2 và B3 đã hoàn thành các API feeds, voting và comments ltree.
- **Mục tiêu:** Cung cấp luồng đọc bài viết tốc độ cao, hỗ trợ chuyển đổi giao diện linh hoạt, nhãn phân loại bài viết và cây bình luận hiển thị hàng ngàn node không giật lag.

##### Danh mục tệp tin mục tiêu:

- `apps/web/src/app/page.tsx`
- `apps/web/src/components/feed/FeedContainer.tsx`
- `apps/web/src/components/feed/FeedViewSwitcher.tsx`
- `apps/web/src/components/feed/ThreadCard.tsx`
- `apps/web/src/components/feed/PostFlairBadge.tsx`
- `apps/web/src/components/voting/OptimisticVoteButton.tsx`
- `apps/web/src/app/threads/[slug]/page.tsx`
- `apps/web/src/components/comments/VirtualCommentTree.tsx`
- `apps/web/src/components/comments/CommentNode.tsx`

##### Nhiệm vụ kỹ thuật chi tiết:

1. **Bảng Tin Feed & Đồng Bộ Trạng Thái URL Qua `nuqs`:**
    - Triển khai bộ đọc tham số URL hai chiều:
        - `sort`: `'hot' | 'new' | 'top' | 'best'` (mặc định `'hot'`).
        - `t`: `'day' | 'week' | 'month' | 'year' | 'all'` (khi `sort === 'top'`).
        - `view`: `'card' | 'compact'`.
        - `q`: Từ khóa tìm kiếm.

    - Hỗ trợ 2 chế độ hiển thị:
        - **Card View:** Thẻ bài viết đầy đủ độ rộng, xem trước trích đoạn văn bản, hình ảnh đại diện, danh số bình luận và cụm vote dọc.
        - **Compact View:** Danh sách cô đọng một dòng tối ưu mật độ thông tin kỹ thuật cao.

2. **Cụm Nút Bỏ Phiếu Nguyên Tử Lạc Quan (Optimistic Voting FSM):**
    - Triển khai máy trạng thái hữu hạn cho nút Up/Downvote tại client:

```đoạn mã
stateDiagram-v2
    [*] --> Idle: Khởi tạo từ Server State
    Idle --> OptimisticUp: Bấm Upvote (+1)
    Idle --> OptimisticDown: Bấm Downvote (-1)
    
    OptimisticUp --> OptimisticUnvote: Bấm lại Upvote (Hủy)
    OptimisticUp --> OptimisticDown: Bấm Downvote (Đảo chiều -2)
    
    OptimisticDown --> OptimisticUnvote: Bấm lại Downvote (Hủy)
    OptimisticDown --> OptimisticUp: Bấm Upvote (Đảo chiều +2)
    
    OptimisticUp --> Idle: API Thành Công (Chốt điểm số)
    OptimisticDown --> Idle: API Thành Công (Chốt điểm số)
    OptimisticUnvote --> Idle: API Thành Công (Chốt điểm số)
    
    OptimisticUp --> Rollback: API Báo Lỗi
    OptimisticDown --> Rollback: API Báo Lỗi
    OptimisticUnvote --> Rollback: API Báo Lỗi
    Rollback --> Idle: Hoàn tác điểm cũ + Bật Toast cảnh báo
```

3. **Gắn Nhãn Bài Viết Kỹ Thuật (Post Flairs Badge):**
    - Thành phần `PostFlairBadge.tsx` hiển thị nhãn phân loại với bảng màu Brutalist:
        - `[DevOps]`: Nền `#393E46`, chữ `#DFD0B8`, viền `#948979`.
        - `[SecOps]`: Nền `#393E46`, chữ `#EF4444`, viền `#EF4444`.
        - `[SystemArch]`: Nền `#393E46`, chữ `#3B82F6`, viền `#3B82F6`.
        - `[Incident]`: Nền `#393E46`, chữ `#F97316`, viền `#F97316`.

4. **Trang Chi Tiết Bài Viết & Tích Hợp `@acad/tree-virtualizer`:**
    - Tuyến đường `apps/web/src/app/threads/[slug]/page.tsx` nạp dữ liệu bài viết qua RSC.
    - Danh sách bình luận được xử lý qua hàm `flattenCommentTree()` của gói `@acad/tree-virtualizer`: Quét tuyến tính $\mathcal{O}(N)$, chuyển cấu trúc cây thành mảng phẳng kèm độ sâu (`depth`) và số lượng nút con (`directChildren`).
    - Tích hợp `@tanstack/react-virtual`: Bất kể cây thảo luận có $5,000$ bình luận, DOM chỉ render đúng $15 - 20$ phần tử nằm trong vùng hiển thị (viewport), loại bỏ hoàn toàn độ trễ giao diện.
    - Xử lý trường hợp chạm ngưỡng cấp 8 (`isCappedAtMaxDepth: true`): Khóa thụt lề, hiển thị badge phẳng và chèn tiền tố `@tác_giả`.

##### Tiêu chí nghiệm thu (Definition of Done):

- Cuộn trang chi tiết bài viết có $1,000+$ bình luận duy trì ổn định $60\text{ fps}$ trên trình duyệt di động.
- Thao tác Upvote/Downvote phản hồi đổi màu và nhảy số tức thời trong $< 16\text{ms}$ (Optimistic Mutation).
- Thu gọn một nhánh bình luận cấp cha tự động ẩn toàn bộ các nhánh con tức thì.

#### 🔹 PHASE F3: Trình Soạn Thảo Kỹ Thuật Tiptap & Trung Tâm Admin Console (CMS & Admin Panel)

- **Tiền điều kiện:** Backend Phase B5 đã hoàn thiện cụm route `/api/v1/admin/*` và quyền hạn `role === 'ADMIN'`.
- **Mục tiêu:** Cung cấp trải nghiệm soạn thảo Markdown kỹ thuật chuyên sâu, cơ chế tải ảnh Zero-hop và cổng quản trị vận hành 4 phân hệ.

##### Danh mục tệp tin mục tiêu:

- `apps/web/src/components/editor/TiptapEditor.tsx`
- `apps/web/src/components/editor/CodeBlockHighlight.tsx`
- `apps/web/src/components/editor/ZeroHopImageUploader.tsx`
- `apps/web/src/app/admin/layout.tsx`
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/admin/users/page.tsx`
- `apps/web/src/app/admin/spaces/page.tsx`
- `apps/web/src/app/admin/threads/page.tsx`

##### Nhiệm vụ kỹ thuật chi tiết:

1. **Trình Soạn Thảo Đa Năng Tiptap (Engineering-Grade CMS):**
    - Tích hợp Tiptap Editor hỗ trợ:
        - Định dạng khối mã nguồn cú pháp chuẩn với `lowlight` (hỗ trợ `bash`, `typescript`, `sql`, `yaml`, `json`, `dockerfile`).
        - Công thức toán học KaTeX inline ($...$) và display (

            $$
            ...
            $$

            ).

        - Phím tắt Markdown tiêu chuẩn (`#`, `>`, ```` `).


2. **Cơ Chế Tải Ảnh Zero-Hop Media:**
    - Khi người dùng kéo thả ảnh vào khung soạn thảo:
        1. Khung soạn thảo gọi `POST /api/v1/media/presigned-url` để nhận Presigned PUT URL.
        2. Gửi tệp nhị phân trực tiếp từ trình duyệt lên Cloudflare R2 / AWS S3 qua lệnh `fetch(presignedUrl, { method: 'PUT', body: file })`.
        3. Nhận URL CDN công khai và tự động chèn cú pháp ảnh `![alt](url)` vào vị trí con trỏ.


3. **Bố Cục Cổng Quản Trị Hệ Thống (`/admin` Layout & Guard):**
    - `apps/web/src/app/admin/layout.tsx`: Kiểm tra quyền truy cập ở tầng Server Component. Nếu chưa đăng nhập $\rightarrow$ chuyển hướng về `/login?redirect=/admin`; nếu `role !== 'ADMIN'` $\rightarrow$ hiển thị giao diện báo lỗi Brutalist `[403] TRUY CẬP BỊ TỪ CHỐI`.
    - Sub-Navbar 4 tab chuyển đổi mượt mà không tải lại trang:
```plaintext
[CONSOLE TỔNG QUAN] | [QUẢN LÝ NGƯỜI DÙNG] | [CỘNG ĐỒNG SPACES] | [BÀI VIẾT & MOD QUEUE]

```


4. **Xây Dựng 4 Màn Hình Quản Trị Trọng Điểm:**
    - **Dashboard (`/admin`):** Thẻ Live Metrics đo lường tổng Users (Active/Suspended), Active Sessions, Tổng Spaces, Threads và bảng thông số hệ điều hành.
    - **Quản trị Users (`/admin/users`):** Bảng hiển thị danh sách người dùng kèm cột số lượng bài viết đã xuất bản (`threadsCount`) và Karma. Các nút hành động: Đổi Role, Khóa tài khoản (`SUSPENDED`), Thu hồi toàn bộ phiên.
    - **Quản trị Spaces (`/admin/spaces`):** Danh sách hiển thị chính xác số thành viên (`memberCount`), số bài viết (`threadCount`) và nút Xóa Không Gian (kèm cảnh báo cascade dữ liệu).
    - **Quản trị Threads (`/admin/threads`):** Bộ lọc theo Space, thao tác nút bấm Ghim/Bỏ ghim (`Pin/Unpin`), Khóa/Mở bình luận (`Lock/Unlock`), và Xóa bài viết vi phạm.




##### Tiêu chí nghiệm thu (Definition of Done):


- Trình duyệt không tải payload tệp ảnh qua máy chủ backend API (kiểm tra Network tab thấy request `PUT` đi thẳng tới domain lưu trữ R2/S3).
- Tài khoản `USER` thông thường truy cập `/admin` bị chặn đứng bởi màn hình lỗi 403.
- Thao tác ghim hoặc khóa bài viết trong Admin Console cập nhật tức thì trạng thái trên Bảng tin công khai.



#### 🔹 PHASE F4: Hệ Thống Reddit Chat Nổi & Phê Duyệt Yêu Cầu Tin Nhắn (Realtime Chat Engine)


- **Tiền điều kiện:** Backend Phase B4 đã kích hoạt SSE stream `/api/v1/chat/stream` và các endpoints quản lý chat.
- **Mục tiêu:** Cung cấp widget nhắn tin tức thời linh hoạt, hàng đợi duyệt tin nhắn lạ chống spam và phân nhánh hội thoại.



##### Danh mục tệp tin mục tiêu:


- `apps/web/src/components/chat/FloatingChatWidget.tsx`
- `apps/web/src/components/chat/ChatChannelsList.tsx`
- `apps/web/src/components/chat/ChatWindow.tsx`
- `apps/web/src/components/chat/ChatRequestBanner.tsx`
- `apps/web/src/components/chat/ChatThreadDrawer.tsx`
- `apps/web/src/hooks/useRealtimeChat.ts`
- `apps/web/src/stores/chat-store.ts`
- `apps/web/src/app/chat/page.tsx`



##### Nhiệm vụ kỹ thuật chi tiết:


1. **Máy Trạng Thái Điều Khiển Widget Chat (Floating Chat FSM):**
    - Quản lý trạng thái widget nổi góc phải màn hình qua Zustand `chat-store.ts`:
        - `MINIMIZED`: Nút tròn nổi hoặc thanh ngang thu nhỏ, hiển thị huy hiệu đỏ đếm số tin nhắn chưa đọc (`unreadCount`).
        - `DOCK_EXPANDED`: Cửa sổ nổi kích thước $380\text{px} \times 520\text{px}$ đặt ở góc dưới bên phải, cho phép vừa đọc bài viết vừa trò chuyện.
        - `POPOUT_WINDOW`: Chuyển sang trang độc lập `/chat` toàn màn hình khi nhấp vào nút Pop-out `↗`.


2. **Hook Quản Lý Kết Nối Thời Gian Thực (`useRealtimeChat`):**
    - Khởi tạo kết nối `EventSource` tới endpoint `/api/v1/chat/stream` kèm Access Token.
    - Bắt các sự kiện truyền phát:
        - `MessageCreated`: Đẩy tin nhắn mới vào danh sách hội thoại tương ứng.
        - `ChatRequestReceived`: Kích hoạt banner cảnh báo tin nhắn từ người lạ.
        - `UserTyping`: Hiển thị chỉ báo "... đang gõ" và tự động tắt sau 5 giây.

    - Giám sát Heartbeat ping 15 giây: Nếu quá 30 giây không nhận được tín hiệu ping, tự động kích hoạt tiến trình kết nối lại theo thuật toán lũy thừa giảm trừ (exponential backoff).

3. **Giao Diện Hàng Đợi Yêu Cầu Tin Nhắn (Chat Requests Banner):**
    - Khi mở hội thoại từ người dùng lạ, hộp thoại cảnh báo chống spam xuất hiện đầu khung chat với 3 nút bấm dứt khoát:
        - **[CHẤP NHẬN]**: Gọi API `accept`, kích hoạt khung nhập văn bản đầy đủ.
        - **[BỎ QUA]**: Gọi API `ignore`, đóng hộp thoại và ẩn khỏi danh sách chờ.
        - **[CHẶN]**: Gọi API `block`, thêm đối phương vào blacklist và đóng kênh.


4. **Phân Nhánh Chat Threads & Trích Dẫn Bài Viết (Card Embedding):**
    - Bấm vào nút `Reply in Thread` trên bất kỳ tin nhắn nào sẽ mở thanh trượt phụ bên phải (`ChatThreadDrawer.tsx`), cho phép thảo luận sâu một vấn đề kỹ thuật mà không làm loãng dòng tin chung của nhóm.
    - Khi người dùng dán liên kết `/threads/[slug]` hoặc `/s/[slug]`, giao diện tự động trích xuất metadata và render thành thẻ bài viết thu nhỏ ngay trong khung chat.




##### Tiêu chí nghiệm thu (Definition of Done):


- Widget chat mở rộng hoặc thu nhỏ không làm mất nội dung đang soạn thảo dở.
- Tin nhắn mới gửi từ một phiên khác xuất hiện trên màn hình trong $< 100\text{ms}$ thông qua kết nối SSE.
- Bấm nút Pop-out `↗` điều hướng sang `/chat` giữ nguyên phiên hội thoại đang mở.



### 4. Chiến Lược Phòng Thủ Hiệu Năng & Web Vitals (Web Vitals Defense Matrix)



Nhằm bảo đảm đạt chuẩn hiệu năng đã cam kết ($FCP \le 0.8\text{s}$, $LCP \le 1.2\text{s}$, $INP \le 100\text{ms}$, $CLS = 0$), Agent phải áp dụng nghiêm ngặt các quy tắc sau:



| Chỉ số Web Vitals                           | Mục tiêu kỹ thuật          | Chiến lược thực thi chi tiết của Agent                                                                                                                                                                                                                                                              |
| ------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <br>**LCP (Largest Contentful Paint)**<br>  | <br>$\le 1.2\text{s}$<br>  | <br>• Tiêu đề bài viết và khung nội dung chính được render trực tiếp từ Server Component (RSC), không chờ JavaScript phía client tải xong mới fetch dữ liệu.<br>• Hình ảnh thumbnail dùng `next/image` với thuộc tính `priority` cho các bài viết nằm trong màn hình đầu tiên (Above-the-fold).<br> |
| <br>**FCP (First Contentful Paint)**<br>    | <br>$\le 0.8\text{s}$<br>  | <br>• Nạp font hệ thống nội bộ qua `@next/font/google` với cơ chế zero-layout-shift `display: 'swap'`.<br>• Toàn bộ CSS cốt lõi đóng gói qua Tailwind v4 không có runtime overhead.<br>                                                                                                             |
| <br>**INP (Interaction to Next Paint)**<br> | <br>$\le 100\text{ms}$<br> | <br>• 100% các nút biểu quyết và thu gọn bình luận áp dụng **Optimistic UI Updates**.<br>• Không thực hiện tính toán nặng trên Main Thread; thuật toán `flattenCommentTree` đạt độ phức tạp tuyến tính $\mathcal{O}(N)$.<br>                                                                        |
| <br>**CLS (Cumulative Layout Shift)**<br>   | <br>$= 0$<br>              | <br>• Khai báo kích thước cố định (`min-height`) cho các container bài viết và widget chat nổi.<br>• Dành trước không gian cố định cho dải banner kết quả tìm kiếm và Post Flairs.<br>                                                                                                              |
| <br>**Kích thước JavaScript Bundle**<br>    | <br>**0KB JS tĩnh**<br>    | • Sử dụng `next/dynamic` với `ssr: false` để nạp chậm (lazy load) toàn bộ trình soạn thảo Tiptap và thư viện KaTeX, chỉ tải về khi người dùng nhấp vào nút "Viết Bài" hoặc "Bình Luận".                                                                                                             |



### 5. Cổng Kiểm Định Thực Thi Frontend (Agent Verification Pipeline)



Trước khi đóng dấu hoàn tất bất kỳ giai đoạn nào trong Stream F, Agent bắt buộc phải chạy và vượt qua chuỗi lệnh kiểm định kỹ thuật sau:



```bash

# 1. Kiểm tra chuẩn hóa mã nguồn, định dạng dấu nháy và thụt lề bằng Biome
pnpm run lint

# 2. Kiểm tra tính hợp lệ kiểu dữ liệu nghiêm ngặt của TypeScript (Strict Mode)
pnpm run build:libs && pnpm --filter @acad/web exec tsc --noEmit

# 3. Chạy kiểm thử tự động toàn bộ Unit và Component Tests qua Vitest
node ./packages/tree-virtualizer/node_modules/vitest/vitest.mjs run

# 4. Kiểm tra khả năng đóng gói bản dựng sản xuất Next.js Standalone
pnpm --filter @acad/web run build

```

Chỉ khi quy trình đóng gói hiển thị thông báo `Route (app) ... Size First Load JS shared by all` hoàn toàn hợp lệ và mã thoát lệnh là `0` (Exit Code 0), giai đoạn Frontend đó mới được xác nhận đủ điều kiện bàn giao.

---

# User [6]

`````markdown
Đi sâu vào roadmap Backend, mở rộng toàn diện.

`````

Lộ trình phát triển Backend (Stream B) của dự án Acad DevOps được xây dựng theo tôn chỉ **Backend-First**, chia thành 5 giai đoạn liên hoàn (Phases B1 $\rightarrow$ B5) nhằm thiết lập toàn bộ mô hình dữ liệu, cơ chế mã hóa, logic xếp hạng và bảo mật trước khi kết nối với tầng giao diện.

```đoạn mã
flowchart TD
    subgraph B1 ["Phase B1: Hạ Tầng CSDL & Phân Hệ Định Danh (Tuần 1 - 3)"]
        D1["PostgreSQL 16 Extensions & Schemas"] --> A1["Argon2id Hashing & Dual-Token Engine"]
        A1 --> S1["Session Shield: 30s Grace Period & Token Reuse"]
        S1 --> R1["Redis Session Store & Client Interceptor Mutex"]
    end

    subgraph B2 ["Phase B2: Spaces, CMS & Cây Bình Luận Ltree (Tuần 4 - 6)"]
        B1 --> SP1["Spaces Engine (/s/[slug]) & Post Flairs"]
        SP1 --> T1["Threads CMS & Zero-hop Media Upload"]
        T1 --> L1["Cây Bình Luận ltree Base36 & Capped Depth 8"]
    end

    subgraph B3 ["Phase B3: Bỏ Phiếu Nguyên Tử, Feeds & Search (Tuần 7 - 9)"]
        B2 --> V1["Redis Lua Voting Script O(1) & 5s Batch Sync"]
        V1 --> F1["Gravity Decay & Wilson Score ('Best') Engine"]
        F1 --> P1["Base64 Composite Cursor & GIN Trigram Search"]
    end

    subgraph B4 ["Phase B4: Realtime Reddit Chat & Request Queue (Tuần 10 - 12)"]
        B3 --> C1["Chat Channels (1-1, Group) & Message Store"]
        C1 --> Q1["Hàng Đợi Duyệt Tin Nhắn Lạ (Chat Requests)"]
        Q1 --> RT1["SSE/WebSocket Hub, Heartbeat 15s & Presence"]
    end

    subgraph B5 ["Phase B5: Admin Hub, Moderation & Audit Logs (Tuần 13 - 14)"]
        B4 --> M1["Admin Guard (RBAC/ABAC) & Live Stats Engine"]
        M1 --> MOD1["Hàng Đợi Kiểm Duyệt (Mod Queue) & Shadowban"]
        MOD1 --> AUD1["Audit Logging Interceptor & System Diagnostics"]
    end

```

### Giai Đoạn B1: Hạ Tầng CSDL, Cơ Chế Mật Mã & Quản Lý Phiên (Core Identity & Session Shield)

- **Thời gian thực hiện:** Tuần 1 – Tuần 3 (Khởi tạo từ 0%)
- **Mục tiêu:** Thiết lập nền móng lưu trữ dữ liệu với PostgreSQL 16 và Redis 7; triển khai hệ thống xác thực Zero-Trust chống tấn công chiếm đoạt phiên.

```đoạn mã
sequenceDiagram
    autonumber
    actor Client as Web Client Interceptor
    participant Gateway as API Gateway (/api/v1/auth)
    participant Redis as Redis 7 (Session Store)
    participant DB as PostgreSQL 16 (users / user_sessions)

    Client->>Gateway: POST /refresh (Gửi kèm Cookie Refresh Token)
    Gateway->>Redis: HGET session data qua SHA-256(RefreshToken)

    alt Trường hợp 1: Token hợp lệ (Trùng current_token_hash)
        Redis-->>Gateway: Hợp lệ
        Gateway->>Gateway: Tạo Access Token mới (15m) & Refresh Token mới (7d)
        Gateway->>Redis: current = token_mới, previous = token_cũ, grace_expires = NOW() + 30s
        Gateway-->>Client: Trả về Access Token + Set-Cookie Refresh Token mới
    else Trường hợp 2: Token cũ gửi trong 30s Grace Period
        Redis-->>Gateway: Trùng previous_token_hash VÀ NOW() < grace_expires
        Gateway->>Gateway: Cấp Access Token mới (Giữ nguyên Refresh Token)
        Gateway-->>Client: Trả về Access Token mới
    else Trường hợp 3: Token bị phát lại sau 30s (Token Reuse Attack!)
        Redis-->>Gateway: Phát hiện Token bị thu hồi dùng lại!
        Gateway->>Redis: DEL session:{userId}:* (Xóa toàn bộ cụm phiên)
        Gateway->>DB: UPDATE user_sessions SET is_revoked = TRUE WHERE user_id = ?
        Gateway-->>Client: 403 Forbidden (Cưỡng chế đăng xuất toàn bộ)
    end

```

#### 1. Khởi tạo Cơ sở dữ liệu & Cấu trúc DDL B1

- Kích hoạt 4 extensions nền tảng: `uuid-ossp`, `pgcrypto`, `ltree`, `pg_trgm`.
- Bảng `users`: Khóa chính UUIDv4, `username` và `email` đánh chỉ mục `LOWER()` độc bản, trường tích lũy điểm danh tiếng `karma_score INTEGER DEFAULT 0`.
- Bảng `user_sessions`: Lưu trữ `refresh_token_hash`, `previous_token_hash`, `grace_period_expires_at`, `device_fingerprint`, địa chỉ IP và cờ `is_revoked`.
- Driver PostgreSQL: Tích hợp logic tự phát hiện chuỗi kết nối (`.supabase.co`, `.render.com`) để tự động cấu hình SSL `{ rejectUnauthorized: false }`, tích hợp cơ chế dự phòng an toàn `InMemoryUserRepository` khi mất kết nối mạng.

#### 2. Động cơ Mật mã & Chiến lược Token Kép

- **Băm mật khẩu (Argon2id):** Cấu hình `memoryCost: 65536 KB` (64MB RAM/phép tính), `timeCost: 3`, `parallelism: 4`. So khớp mật mã thông qua `crypto.timingSafeEqual` để triệt tiêu lỗ hổng tấn công phân tích thời gian (Timing Attacks).
- **Access Token:** Ký số HMAC-SHA256 (HS256) với độ dài khóa bí mật tối thiểu 256 bits, thời hạn sống ngắn 15 phút (900 giây).
- **Refresh Token:** Sinh từ bộ tạo số ngẫu nhiên mật mã (CSPRNG) độ dài 64 bytes, mã hóa Base64 URL-safe, lưu trữ trong `HttpOnly`, `SameSite=Strict` Cookie với thời hạn sống 7 ngày.

#### 3. Cấu trúc Redis Keyspace & Khắc phục Thundering Herd

- `session:{user_id}:{session_id}` (Hash, TTL 7 ngày): Quản lý metadata phiên, hash token hiện tại và token cũ trong 30s Grace Period.
- `session_lookup:{token_hash}` (String, TTL 7 ngày): Tra cứu nhanh $\mathcal{O}(1)$ từ hash token sang session ID.
- `rate_limit:login:{ip}` (ZSet, TTL 15 phút): Giới hạn tần suất đăng nhập theo thuật toán Sliding-Window Counter.
- **Mutex Lock Interceptor (`@acad/auth-client`):** Khi nhiều yêu cầu đồng thời nhận mã lỗi HTTP 401, tiến trình đầu tiên giữ khóa Mutex gọi `/api/v1/auth/refresh`, các tiến trình còn lại đưa vào hàng đợi chờ và tự động thực thi lại sau khi có Access Token mới.

#### 4. Danh mục API Endpoints Giai đoạn B1

- `POST /api/v1/auth/register`: Đăng ký tài khoản, trả về thông tin user và khởi tạo phiên làm việc.
- `POST /api/v1/auth/login`: Xác thực danh tính, tạo phiên mới, cấp cặp token.
- `POST /api/v1/auth/refresh`: Xoay vòng token theo giao thức 30s Grace Period.
- `POST /api/v1/auth/logout`: Thu hồi token hiện tại, xóa dữ liệu trên Redis và đánh dấu `is_revoked = TRUE` trong CSDL.
- `GET /healthz`: Kiểm tra trạng thái hoạt động của API Gateway, PostgreSQL và Redis.

### Giai Đoạn B2: Không Gian Thảo Luận, CMS & Cây Bình Luận `ltree` (Spaces & Content Engine)

- **Thời gian thực hiện:** Tuần 4 – Tuần 6
- **Mục tiêu:** Xây dựng mô hình Subreddit kỹ thuật (`/s/[slug]`), hệ thống bài viết hỗ trợ Post Flairs, tải đa phương tiện Zero-hop và cây thảo luận sâu không giới hạn bằng PostgreSQL `ltree`.

#### 1. Mô hình Không gian (Spaces) & Nhãn Bài Viết (Post Flairs)

- **Bảng `spaces`:** Định danh bằng `slug` duy nhất, chứa thông tin cấu hình quy tắc cộng đồng dưới dạng `rules JSONB`, phân quyền người tạo không gian.
- **Bảng `space_memberships`:** Quản lý quan hệ giữa người dùng và không gian (`user_id`, `space_id`, `role: MEMBER | MODERATOR | ADMIN`).
- **Bảng `space_flairs`:** Cho phép không gian tự định nghĩa các nhãn bài viết với bảng màu Brutalist chuyên biệt:
    - `[DevOps]`: `#DFD0B8` trên `#393E46`
    - `[SecOps]`: `#EF4444` trên `#393E46`
    - `[SystemArch]`: `#3B82F6` trên `#393E46`
    - `[Incident]`: `#F97316` trên `#393E46`
    - `[Question]`: `#22C55E` trên `#393E46`

#### 2. Cơ chế Tải Ảnh Zero-Hop (Presigned S3/Cloudflare R2)

- Endpoint `POST /api/v1/media/presigned-url`: Tiếp nhận `filename`, `mimeType`, `size`.
- Backend kiểm tra quyền và sinh URL ký trước (Presigned PUT URL) thời hạn 5 phút kết nối thẳng tới bucket Cloudflare R2 / AWS S3.
- Client tải tệp trực tiếp lên Object Storage, không truyền tải nhị phân qua API Gateway, giải phóng băng thông và tài nguyên CPU của máy chủ Node.js.

#### 3. Động cơ Bình luận Phân cấp `ltree` Base36 & Giới hạn Cấp 8

- **Materialized Path với `ltree`:** Thay vì truy vấn đệ quy CTE (Adjacency List) gây nghẽn I/O, đường dẫn bình luận được số hóa thành chuỗi Base36 4 ký tự cố định cho mỗi tầng (ví dụ: `0001.000a.0002`).
- Khả năng mở rộng: Mỗi nút cha có thể chứa tới $36^4 = 1,679,616$ bình luận con trực tiếp.
- Chỉ mục GiST trên trường `path`: Truy vấn toàn bộ một cây con trong duy nhất 1 câu lệnh SQL (`SELECT * FROM comments WHERE path <@ '0001' ORDER BY path ASC`) với thời gian thực thi $< 1.2\text{ms}$.
- **Xử lý Ngưỡng sâu Capped Depth 8:** Khi bình luận đạt cấp thứ 8, thuật toán trong `ltree-path-generator.ts` tự động bật cờ `isCappedAtMaxDepth: true` và `parentAuthorMentionNeeded: true`. Bình luận mới kế thừa `path` cấp 8 của cha và chuyển sang dạng phản hồi phẳng (Flat Reply) kèm tiền tố `@tên_tác_giả` để tránh vỡ bố cục trên giao diện di động.

```đoạn mã
graph TD
    Root["Thread Gốc"] --> C1["Comment 0001 (Depth 0)"]
    Root --> C2["Comment 0002 (Depth 0)"]
    C1 --> C1_1["Comment 0001.0001 (Depth 1)"]
    C1 --> C1_2["Comment 0001.0002 (Depth 1)"]
    C1_1 --> C1_1_1["Comment 0001.0001.0001 (Depth 2)"]
    C1_1_1 -.-> C_Depth8["Comment Depth 8 (Path: ...0001)"]
    C_Depth8 --> C_Flat["Comment Capped (Depth 8, Flat Reply + @mention)"]

```

#### 4. Danh mục API Endpoints Giai đoạn B2

- `GET /api/v1/spaces`: Lấy danh sách không gian kèm tổng số bài viết và thành viên.
- `POST /api/v1/spaces`: Khởi tạo không gian thảo luận mới.
- `POST /api/v1/spaces/:slug/join`: Tham gia hoặc rời khỏi không gian.
- `POST /api/v1/spaces/:slug/flairs`: Quản lý danh mục nhãn bài viết.
- `POST /api/v1/media/presigned-url`: Lấy presigned URL tải ảnh trực tiếp.
- `GET /api/v1/threads/:id/comments`: Lấy cây bình luận phân cấp theo bài viết.
- `POST /api/v1/threads/:id/comments`: Thêm bình luận mới vào cây phân cấp.

### Giai Đoạn B3: Bỏ Phiếu Nguyên Tử, Bảng Tin & Tìm Kiếm Toàn Văn Bản (Voting & Feeds)

- **Thời gian thực hiện:** Tuần 7 – Tuần 9
- **Mục tiêu:** Xử lý hàng ngàn lượt vote đồng thời không xung đột (Race-condition free); xây dựng động cơ bảng tin Hacker News Gravity Decay và Wilson Score Interval.

```đoạn mã
flowchart LR
    User["Người dùng Upvote / Downvote"] --> Gateway["API Gateway"]
    Gateway --> Lua["Redis 7: execute_vote.lua<br/>• Kiểm tra hướng vote cũ O(1)<br/>• Tính delta điểm (+1, -1, +2, -2)<br/>• HINCRBY bộ đếm nguyên tử<br/>• SADD dirty:votes target_id"]
    Lua --> Worker["5s Batch Sync Worker<br/>(Đọc dirty:votes định kỳ)"]
    Worker --> DB["PostgreSQL 16: thread_counters<br/>Bulk Upsert (fillfactor = 70, HOT Updates)"]

```

#### 1. Kịch bản Bỏ phiếu Nguyên tử Redis Lua & Tối ưu Ghi HOT

- **Thực thi nguyên tử qua Lua (`execute_vote.lua`):** Nhận `user_id`, `target_id`, `direction` (+1 hoặc -1). Kịch bản kiểm tra bảng băm `vote:{target_id}:voters`, tự động nhận diện hành vi:
    - Bấm trùng nút cũ $\rightarrow$ Hủy vote (Unvote), giảm điểm.
    - Đổi chiều (Up $\leftrightarrow$ Down) $\rightarrow$ Tính delta chênh lệch 2 điểm.
    - Vote mới $\rightarrow$ Tăng điểm tương ứng.
    - Thêm `target_id` vào tập hợp `dirty:votes`.

- **Worker xả dồn 5 giây (Batch Sync Worker):** Tiến trình nền chạy mỗi 5 giây gọi `SMEMBERS dirty:votes`, đọc bộ đếm từ Redis và thực thi câu lệnh SQL Bulk Upsert cập nhật bảng `thread_counters` của PostgreSQL.
- **Heap-Only Tuples (HOT):** Bảng `thread_counters` được tạo với cấu hình `WITH (fillfactor = 70)`. 30% khoảng trống trên mỗi trang dữ liệu cho phép PostgreSQL cập nhật dữ liệu điểm số ngay trong trang vật lý mà không cần cập nhật lại chỉ mục B-Tree, cắt giảm 90% chi phí I/O.

#### 2. Động cơ Thuật toán Xếp hạng Bảng tin

- **Hot Feed (Hacker News Gravity Decay Engine):**

    $$
    HotScore = \frac{NetScore}{(AgeHours + 2.0)^{1.8}}
    $$

    Trọng số $Gravity = 1.8$ và hằng số bù thời gian $2.0$ giờ ngăn hiện tượng bùng nổ điểm số ảo của bài viết mới đăng và đảm bảo bài viết cũ hạ nhiệt đều đặn.

- **Best Feed (Wilson Score Confidence Interval):**

    $$
    \hat{p} = \frac{Upvotes}{TotalVotes}, \quad Score = \frac{\hat{p} + \frac{z^2}{2n} - z \sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}
    $$

    Áp dụng độ tin cậy 95% ($z = 1.96$), giúp các bài viết có tỷ lệ ủng hộ tuyệt đối của giới chuyên môn không bị chìm lấp bởi các bài viết có số lượng vote đông nhưng tỷ lệ tranh cãi cao.

- **Top Feed:** Bộ lọc điểm số tuyệt đối $NetScore$ phân tầng theo mốc thời gian: `t=day`, `t=week`, `t=month`, `t=year`, `t=all`.

#### 3. Phân trang Con trỏ Base64 & Tìm kiếm Giới hạn Không gian

- **Phân trang Con trỏ Tổng hợp (Base64 Composite Cursor):**

    $$
    \text{Cursor} = \text{base64}(\text{sort\_score} : \text{timestamp} : \text{item\_id})
    $$

    Loại bỏ hoàn toàn kỹ thuật `offset/limit` để triệt tiêu hiện tượng trôi lệch dữ liệu khi có bài đăng mới.

- **Động cơ Tìm kiếm GIN Trigram:** Sử dụng `pg_trgm` trên trường `threads.title`, hỗ trợ tìm kiếm mờ (Fuzzy Search) theo từ khóa `q`.
- **In-Space Scoped Search:** Truyền tham số `spaceId` hoặc `spaceSlug` vào câu truy vấn tìm kiếm để giới hạn kết quả quét chỉ nằm trong không gian người dùng đang truy cập.

#### 4. Danh mục API Endpoints Giai đoạn B3

- `POST /api/v1/threads/:id/vote`: Thực thi bỏ phiếu nguyên tử qua Redis Lua.
- `GET /api/v1/feed/home`: Bảng tin các không gian người dùng đã bấm Tham gia.
- `GET /api/v1/feed/popular`: Bảng tin toàn cầu theo thuật toán Hot/New/Top/Best.
- `GET /api/v1/threads`: Tìm kiếm và lọc bài viết có hỗ trợ con trỏ Base64.
- `POST /api/v1/threads/:id/save`: Lưu bài viết vào danh mục Bookmark cá nhân.

### Giai Đoạn B4: Phân Hệ Nhắn Tin Tức Thời Reddit Chat (Realtime Chat Engine)

- **Thời gian thực hiện:** Tuần 10 – Tuần 12
- **Mục tiêu:** Cung cấp kênh đối thoại trực tiếp 1-1 và chat nhóm kỹ thuật; giải quyết triệt để vấn nạn spam tin nhắn lạ thông qua hàng đợi Chat Requests; hỗ trợ phân nhánh Chat Threads.

```đoạn mã
stateDiagram-v2
    [*] --> PENDING: Người lạ gửi tin nhắn lần đầu
    PENDING --> ACCEPTED: Người nhận chọn Chấp nhận (Accept)
    PENDING --> IGNORED: Người nhận chọn Bỏ qua (Ignore)
    PENDING --> BLOCKED: Người nhận chọn Chặn (Block)

    ACCEPTED --> ActiveChannel: Khởi tạo kênh đối thoại chính thức
    ActiveChannel --> [*]

    IGNORED --> [*]: Ẩn thông báo, không tạo kênh
    BLOCKED --> [*]: Đưa vào Blacklist, cấm gửi tin

```

#### 1. Lược đồ CSDL Nhắn tin & Hàng đợi Yêu cầu Tin nhắn

- **Bảng `chat_channels`:** Phân loại theo `chat_channel_type ('DIRECT', 'GROUP')`.
- **Bảng `chat_members`:** Quản lý thành viên, mốc thời gian đọc tin cuối cùng `last_read_at` phục vụ tính toán số tin chưa đọc (`unreadCount`).
- **Bảng `chat_messages`:** Lưu trữ nội dung văn bản, mảng JSON đính kèm (`attachments`), và khóa ngoại `parent_message_id` phục vụ tính năng **Chat Threads**.
- **Bảng `chat_requests` (Hàng đợi kiểm duyệt tin nhắn lạ):**
    - Lưu trữ cặp `sender_id`, `receiver_id` kèm `initial_message`.
    - Ràng buộc trạng thái: `PENDING`, `ACCEPTED`, `IGNORED`, `BLOCKED`.
    - Nếu hai người dùng chưa từng có kênh chung, tin nhắn gửi tới buộc phải đi qua trạng thái `PENDING` trước khi người nhận cấp quyền kết nối.

#### 2. Cổng Sự Kiện Thời Gian Thực (SSE & Redis Pub/Sub)

- Triển khai Server-Sent Events (SSE) hoặc WebSocket Gateway với cơ chế gửi tin hiệu nhịp tim **Heartbeat ping/pong định kỳ 15 giây** để duy trì kết nối qua các tầng proxy đám mây.
- **Quản lý Hiện diện (Presence) trên Redis:**
    - `chat:online_users` (Set, TTL 5 phút): Lưu danh sách người dùng đang kết nối, tự động gia hạn qua nhịp tim.
    - `chat:channel:{channel_id}:typing` (Hash, TTL 5 giây): Quản lý sự kiện "đang soạn tin nhắn...", tự động hủy sau 5 giây nếu không nhận được typing event mới.

#### 3. Nhánh Thảo luận trong Chat (Chat Threads)

- Trường `parent_message_id` trong bảng `chat_messages` cho phép tạo nhánh trao đổi phụ ngay trên một tin nhắn cụ thể của kênh nhóm.
- API hỗ trợ truy vấn các tin nhắn thuộc cùng một nhánh thread mà không làm loãng luồng hội thoại chính của toàn phòng chat.

#### 4. Danh mục API Endpoints Giai đoạn B4

- `GET /api/v1/chat/channels`: Lấy danh sách các cuộc hội thoại đang tham gia.
- `POST /api/v1/chat/channels`: Tạo mới phòng chat nhóm.
- `GET /api/v1/chat/channels/:id/messages`: Truy vấn lịch sử tin nhắn kèm con trỏ thời gian.
- `POST /api/v1/chat/messages`: Gửi tin nhắn mới (Tự động kích hoạt Chat Request nếu người nhận là người lạ).
- `GET /api/v1/chat/requests`: Xem danh sách yêu cầu tin nhắn đang chờ duyệt.
- `POST /api/v1/chat/requests/:id/accept`: Chấp thuận yêu cầu tin nhắn lạ.
- `POST /api/v1/chat/requests/:id/block`: Chặn người gửi và đưa vào danh sách đen.
- `GET /api/v1/chat/events`: Endpoint SSE lắng nghe sự kiện trực tuyến và tin nhắn đến.

### Giai Đoạn B5: Quản Trị Hệ Thống, Kiểm Duyệt & Audit Logs (Admin & Moderation Hub)

- **Thời gian thực hiện:** Tuần 13 – Tuần 14
- **Mục tiêu:** Thiết lập phân quyền bảo vệ đa tầng (RBAC/ABAC); cung cấp API quản trị chuyên sâu cho Admin Console; xây dựng cơ chế cấm ngầm (Shadowban) và lưu vết kiểm toán hệ thống.

#### 1. Bộ Lọc An Ninh Phân Quyền (RBAC & ABAC Guards)

- Middleware `auth-guard.ts`: Xác thực chữ ký token và vai trò người dùng.
- Phân quyền nghiêm ngặt:
    - Người dùng chưa đăng nhập gọi tới `/api/v1/admin/*` $\rightarrow$ Nhận mã lỗi `401 Unauthorized`.
    - Người dùng có vai trò `USER` thông thường truy cập `/api/v1/admin/*` $\rightarrow$ Chặn đứng với mã lỗi `403 Forbidden`.
    - Chỉ tài khoản có `role === 'ADMIN'` mới được phép thực thi các tác vụ quản trị toàn cục.

#### 2. Cơ Chế Kiểm Duyệt (Mod Queue) & Cấm Ngầm (Shadowban)

- **Bảng `reports`:** Tiếp nhận phản ánh vi phạm từ cộng đồng (`target_type: 'THREAD' | 'COMMENT'`, `reason`, `status: 'PENDING' | 'RESOLVED' | 'DISMISSED'`).
- **Hàng đợi kiểm duyệt (Mod Queue):** Cung cấp API dành riêng cho Space Moderators xem xét và xử lý các bài viết bị gắn cờ vi phạm nội quy của từng không gian.
- **Cơ chế Cấm ngầm (Shadowban):** Khi tài khoản bị chuyển sang trạng thái `user_status = 'SHADOWBANNED'`, người dùng này vẫn có thể đăng bài và bình luận bình thường trên giao diện của họ, nhưng API tự động lọc bỏ các nội dung này đối với toàn bộ người dùng khác trên hệ thống.

#### 3. Nhật Ký Kiểm Toán (Audit Logs) & Thống Kê Thời Gian Thực

- **Bảng `audit_logs`:** Ghi nhận toàn bộ thao tác nhạy cảm của ban quản trị (Khóa tài khoản, Ghim/Khóa bài viết, Xóa không gian, Thu hồi phiên cưỡng chế) kèm IP, User-Agent và payload thay đổi.
- **API Thống kê (`GET /api/v1/admin/stats`):** Tính toán trực tiếp số lượng người dùng đang hoạt động, số lượng phiên làm việc khả dụng trên Redis, tổng số không gian, tổng bài viết và bình luận toàn sàn.
- **API Danh sách Người dùng:** Trả về danh sách kèm trường tính toán chính xác **Số lượng bài viết đã đăng (`threadsCount`)** và điểm danh tiếng Karma.

#### 4. Danh mục API Endpoints Giai đoạn B5

- `GET /api/v1/admin/stats`: Trích xuất số liệu thống kê tổng thể hệ thống.
- `GET /api/v1/admin/users`: Danh sách người dùng toàn sàn kèm `threadsCount`.
- `PATCH /api/v1/admin/users/:id/status`: Đổi trạng thái tài khoản (`ACTIVE`, `SUSPENDED`, `SHADOWBANNED`).
- `POST /api/v1/admin/users/:id/revoke-sessions`: Cưỡng chế xóa sạch toàn bộ phiên làm việc của một người dùng khỏi Redis và CSDL.
- `PATCH /api/v1/admin/threads/:id`: Ghim bài (`Pin/Unpin`) hoặc Khóa thảo luận (`Lock/Unlock`).
- `DELETE /api/v1/admin/spaces/:id`: Xóa không gian vi phạm và dọn dẹp toàn bộ dữ liệu phụ thuộc (`ON DELETE CASCADE`).
- `GET /api/v1/admin/audit-logs`: Truy xuất lịch sử thao tác kiểm toán an ninh.

### Tiêu Chí Nghiệm Thu Kỹ Thuật (Definition of Done - DoD) Cho Từng Module Backend

Mọi giai đoạn phát triển Backend chỉ được coi là hoàn tất khi đáp ứng trọn vẹn ma trận 6 tiêu chuẩn kỹ thuật sau đây:

| Phân hệ Backend                     | <br>Data Integrity (C1)<br>                                  | <br>API Contract (C2)<br>                                  | <br>Security & Auth (C3)<br>                                                   | <br>Performance & Scalability (C4)<br>                                          | <br>Resiliency & Failover (C5)<br>                                   |
| ----------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| <br>**B1: Identity & Sessions**<br> | <br>Ràng buộc khóa ngoại, LOWER() unique indexes<br>         | <br>Chuẩn hóa OpenAPI 3.1 & Zod Schemas<br>                | <br>Argon2id 64MB, Token Rotation, 30s Grace Period, Token Reuse Detection<br> | <br>Tra cứu phiên $\mathcal{O}(1)$ trên Redis Hash<br>                          | <br>Fallback tự động sang `InMemoryUserRepository` khi mất CSDL<br>  |
| <br>**B2: Spaces & Ltree**<br>      | <br>Quan hệ Spaces - Flairs - Threads - Comments<br>         | <br>RFC 7807 Problem Details cho mọi mã lỗi HTTP<br>       | <br>Presigned URL S3 5 phút giới hạn quyền tải<br>                             | <br>Cây bình luận `ltree` truy vấn GiST $< 1.2\text{ms}$<br>                    | <br>Capped Depth 8 tự động biến đổi thành Flat Reply chống vỡ UI<br> |
| <br>**B3: Voting & Feeds**<br>      | <br>Bảng đếm `thread_counters` đồng bộ 1-1 với `threads`<br> | <br>Con trỏ Base64 phân trang, không dùng offset/limit<br> | <br>Rate limit chống spam vote trên Redis<br>                                  | <br>`execute_vote.lua` nguyên tử $\mathcal{O}(1)$, HOT update fillfactor=70<br> | <br>Worker 5s ghi dồn bù trừ sai lệch dữ liệu tự động<br>            |
| <br>**B4: Realtime Chat**<br>       | <br>Toàn vẹn tin nhắn và trạng thái hàng đợi Requests<br>    | <br>Khế ước cấu trúc SSE Events chuẩn hóa<br>              | <br>Hàng đợi Chat Requests chống spam từ người lạ<br>                          | <br>Heartbeat nhịp tim 15s duy trì kết nối sống<br>                             | <br>Tự động dọn dẹp typing keys sau 5 giây qua TTL Redis<br>         |
| <br>**B5: Admin & Mod Hub**<br>     | <br>Toàn vẹn lịch sử kiểm toán trong `audit_logs`<br>        | <br>Đồng bộ kiểu dữ liệu Role và Status<br>                | <br>Admin Guard chặn đứng 401/403 tuyệt đối<br>                                | <br>Thống kê số lượng theo thời gian thực không khóa bảng<br>                   | <br>Xóa không gian an toàn với quy tắc `ON DELETE CASCADE`<br>       |

### Kịch Bản Kiểm Thử Tải Trọng (k6 Stress Testing Suite)

Trước khi kết thúc lộ trình Backend để bàn giao cho tầng Frontend, toàn bộ hệ thống API phải vượt qua kịch bản kiểm thử tải nghiêm ngặt bằng công cụ k6:

- **Tải mục tiêu:** Đạt tối thiểu **5,000 Requests/giây (RPS)**.
- **Phân bổ lưu lượng:**
    - 60% đọc luồng dữ liệu bảng tin: `GET /api/v1/feed/popular?sort=hot`
    - 25% đọc cây bình luận phân cấp: `GET /api/v1/threads/:id/comments`
    - 10% thực thi bỏ phiếu đồng thời: `POST /api/v1/threads/:id/vote` (kích hoạt kịch bản Lua)
    - 5% truy vấn trạng thái sức khỏe: `GET /healthz`

- **Tiêu chuẩn vượt qua (Pass Thresholds):**
    - Tỷ lệ yêu cầu thành công (HTTP 200/201): $\ge 99.95\%$.
    - Độ trễ phân vị $P_{95} < 50\text{ms}$.
    - Độ trễ tối đa $P_{99} < 120\text{ms}$.
    - Không phát sinh bất kỳ lỗi rò rỉ bộ nhớ (Memory Leak) nào trên tiến trình Docker container của API Gateway.

---

# User [7]

`````markdown

`````

**Tệp đính kèm:**
- [DOCUMENT] 01: docs

Dự án **Acad DevOps Fullstack Monorepo** (phiên bản `v2.0.0`) là nền tảng mạng xã hội thảo luận kỹ thuật phân tầng cao (High-throughput Technical Discussion Engine) dành riêng cho cộng đồng kỹ sư công nghệ, kiến trúc sư hệ thống, và chuyên gia DevOps/SRE. Dự án giải quyết các hạn chế cố hữu của diễn đàn truyền thống (tải chậm, cấu trúc cây phẳng thiếu trực quan) và mạng xã hội dòng thời gian ngắn (trôi bài chuyên môn sâu, thiếu định dạng code/toán chuẩn) bằng việc kết hợp mô hình tổ chức phân tầng của Reddit với kiến trúc tối ưu hóa hiệu năng hiện đại.

Toàn bộ hệ thống được phân tích toàn diện theo các nhóm độc lập và bao hàm toàn diện (MECE) dưới đây:

### 1. Kiến Trúc Tổng Thể & Địa Hình Phân Tầng (System Topology)

Dự án được tổ chức theo mô hình **Layered Microservices Monorepo** quản lý bằng `pnpm workspace`, phân tách độc lập giữa các tầng xử lý:

```text
[apps/web] (Next.js 15 App Router, RSC, Brutalist UI)
      │
      ▼ (REST / JSON & WSS/SSE)
[apps/api] (Core API Gateway Facade: Routing, Rate Limit, CORS, Healthz)
      │
      ├──► [services/auth] (Identity, Argon2id, JWT Rotation, Session Store)
      └──► [services/community] (Spaces, Threads, Ltree Comments, Lua Voting, Chat)
                │
                ├──► PostgreSQL 16 (Supabase Managed: ltree, pgcrypto, pg_trgm, HOT fillfactor=70)
                └──► Redis 7 (Session Hashes, Atomic Lua Engine, Sliding Rate Limit, Pub/Sub)

```

- Tầng Ứng Dụng (Apps):
    - `apps/web`: Web Client xây dựng trên Next.js 15, React 19 và Tailwind CSS v4. Ứng dụng áp dụng triệt để nguyên tắc **Server Component First** (100% trang hiển thị là React Server Components để đạt bundle 0KB JS tĩnh) và chỉ dùng Client Component (`'use client'`) ở các nút lá tương tác sâu như nút vote, editor, chat widget.
    - `apps/api`: Cổng điều phối API Gateway Facade đảm nhiệm routing, phân luồng yêu cầu, CORS, rate limiting và điều hướng tới các service nội bộ.

- Tầng Nghiệp Vụ (Services): Tách biệt logic xác thực (`services/auth`) và nghiệp vụ cộng đồng/thảo luận (`services/community`).
- Tầng Thư Viện Dùng Chung (Packages):
    - `packages/contracts`: Định nghĩa toàn bộ OpenAPI 3.1.0 specifications và schema xác thực Zod.
    - `packages/tree-virtualizer`: Thuật toán trải phẳng mảng phân cấp cây bình luận tuyến tính $\mathcal{O}(N)$.
    - `packages/ui-tokens`: Định nghĩa biến thiết kế Design Tokens theo phong cách Brutalist Dark Mode.
    - `packages/auth-client`: SDK phía client tích hợp cơ chế chống bão yêu cầu (Anti-Thundering Herd).

- Quy tắc phụ thuộc một chiều: Các gói `packages/*` độc lập, tuyệt đối không phụ thuộc ngược vào `services/*` hay `apps/*`.

### 2. Các Động Cơ Kỹ Thuật Cốt Lõi (Core Technical Engines)

Hệ thống được vận hành bởi 7 động cơ nghiệp vụ chuyên sâu:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        7 ĐỘNG CƠ KỸ THUẬT CỐT LÕI (CORE ENGINES)                       │
├─────────────────────────┬──────────────────────────┬───────────────────────────────────┤
│ 1. Auth & Session       │ 2. Spaces & Content      │ 3. Nested Comments (Ltree)        │
│ • Argon2id (64MB RAM)   │ • Subreddit `/s/[slug]`  │ • Materialized Path Base36        │
│ • Token Rotation 15m/7d │ • Rules JSONB & Flairs   │ • Capped Depth 8 -> Flat Reply    │
│ • 30s Grace Period      │ • Zero-hop Media Upload  │ • Query cây con O(1) GiST Index   │
├─────────────────────────┼──────────────────────────┼───────────────────────────────────┤
│ 4. Atomic Voting & Karma│ 5. Feeds & Discovery     │ 6. Realtime Reddit Chat           │
│ • Lua script O(1)       │ • Hot (Gravity Decay)    │ • Direct 1-1 & Group Chat         │
│ • Postgres HOT (ff=70)  │ • Best (Wilson Score)    │ • Chat Requests Queue chống spam  │
│ • 5s Batch Sync Worker  │ • Scoped In-Space Search │ • Chat Threads & Pop-out Window   │
├─────────────────────────┴──────────────────────────┴───────────────────────────────────┤
│ 7. Moderation & Admin Hub                                                              │
│ • RBAC Admin Guard, Sub-Navbar 4 tabs, threadsCount, Pin/Lock, Cascade Spaces          │
└────────────────────────────────────────────────────────────────────────────────────────┘

```

#### 2.1. Phân Hệ Xác Thực & Bảo Mật Phiên (Auth & Session Shield)

- **Băm mật khẩu tiêu chuẩn cao:** Sử dụng **Argon2id** với cấu hình kháng GPU/ASIC (`memoryCost: 65,536 KB`, `timeCost: 3`, `parallelism: 4`) kèm cơ chế so sánh thời gian an toàn `crypto.timingSafeEqual` nhằm triệt tiêu Timing Attack.
- **Chiến lược Token Kép & Xoay Vòng (Dual Token Rotation):** Cấp phát Access Token (JWT HS256, hạn 15 phút) và Refresh Token (chuỗi nhị phân ngẫu nhiên CSPRNG 64 bytes, hạn 7 ngày).
- **Cửa sổ ân hạn 30 giây (30s Grace Period):** Cho phép các tab trình duyệt gửi lại refresh token cũ trong vòng 30 giây mà không bị ngắt phiên. Nếu token đã thu hồi bị sử dụng sau 30 giây, hệ thống nhận diện **Token Reuse Attack** và lập tức thu hồi toàn bộ phiên làm việc của user trên cả PostgreSQL và Redis.
- **Khóa Mutex phía Client (`auth-client`):** Khi gặp mã lỗi HTTP 401, client kích hoạt cơ chế khóa Mutex, chỉ cho phép một yêu cầu đại diện gọi refresh token; các yêu cầu còn lại được đưa vào hàng đợi `subscriberQueue`, giải quyết triệt để vấn đề Thundering Herd.

#### 2.2. Động Cơ Không Gian Thảo Luận & Nội Dung (Spaces & CMS Engine)

- **Mô hình Spaces (`/s/[slug]`):** Đóng vai trò tương tự Subreddit, sở hữu bộ luật riêng (`rules` định dạng JSONB), thống kê số lượng thành viên/bài viết, và phân quyền quản trị (Admin, Space Mod, Member).
- **Hệ thống Post Flairs:** Phân loại bài viết kỹ thuật theo các chủ đề: `[DevOps]`, `[SecOps]`, `[SystemArch]`, `[Incident]`, `[Question]`.
- **Tải tệp đa phương tiện Zero-Hop:** Client yêu cầu Presigned PUT URL từ Backend và tải trực tiếp lên kho lưu trữ đối tượng tương thích S3 (Cloudflare R2 / AWS S3) mà không trung chuyển qua API server, tiết kiệm băng thông và CPU.

#### 2.3. Động Cơ Cây Bình Luận Phân Cấp (Nested Comments & Ltree Engine)

- **Đường dẫn vật lý hóa (Materialized Path):** Thay thế Adjacency List và CTE đệ quy bằng tiện ích mở rộng PostgreSQL `ltree`. Mọi nhánh con được truy vấn trong một lệnh SQL duy nhất thông qua chỉ mục GiST (`WHERE path <@ 'root_path'`) với thời gian dưới 1.2ms.
- **Mã hóa Base36 4 ký tự & Giới hạn độ sâu cấp 8 (Capped Depth 8):** Mỗi tầng phân cấp sử dụng 4 ký tự Base36 (hỗ trợ tối đa $36^4 \approx 1.67$ triệu bình luận trực tiếp/nhánh). Khi độ sâu chạm mức 8, hệ thống tự động chuyển sang dạng Flat Reply có gắn `@mention` tác giả để giữ tính thẩm mỹ và giao diện di động không bị bóp méo.
- **Thuật toán trải phẳng mảng tuyến tính $\mathcal{O}(N)$:** Gói `@acad/tree-virtualizer` quét mảng một lần duy nhất để tính độ sâu, trạng thái thu gọn nhánh và số nút con trực tiếp, liên kết với `@tanstack/react-virtual` để chỉ render các phần tử nằm trong viewport.

#### 2.4. Động Cơ Bầu Chọn Nguyên Tử & Điểm Danh Tiếng (Voting & Reputation)

- **Xử lý nguyên tử $\mathcal{O}(1)$ bằng Redis Lua:** Biên dịch thao tác vote thành kịch bản Lua (`execute_vote.lua`) chạy trực tiếp trên Redis. Kịch bản tính toán chính xác delta thay đổi (+1, -1, +2, -2, hủy vote) và đưa `target_id` vào tập hợp `dirty:votes`.
- **Đồng bộ hàng loạt & Tối ưu HOT Updates:** Worker chạy ngầm định kỳ 5 giây xả dữ liệu từ `dirty:votes` vào bảng `thread_counters` của PostgreSQL. Bảng này được cấu hình `WITH (fillfactor = 70)`, giữ lại 30% khoảng trống trên trang dữ liệu để thực thi Heap-Only Tuples (HOT) update, giảm 90% chi phí I/O ghi đĩa.
- **Thuật toán phân rã trọng lực (Gravity Decay):** Xếp hạng bài viết theo công thức:

    $$
    HotScore = \frac{NetScore}{(AgeHours + 2.0)^{1.8}}
    $$

    Cân bằng giữa điểm đánh giá cộng đồng và thời gian bài viết ra đời.

#### 2.5. Động Cơ Bảng Tin & Tìm Kiếm (Feed Aggregation & Discovery)

- **Thuật toán xếp hạng đa dạng:** Hỗ trợ 4 chế độ: `Hot` (Gravity Decay), `New` (thời gian thực), `Top` (tổng điểm cao nhất theo mốc `day/week/month/year/all`), và `Best` (Wilson Score Confidence Interval nhằm bảo vệ bài viết chất lượng ít vote không bị lấn át bởi bài viết đông vote gây tranh cãi).
- **Phân tầng bảng tin:** Cung cấp Home Feed (chia thành tab *For You* và *Following*), Popular Feed (toàn sàn), và Custom Feeds (nhóm nhiều Spaces).
- **Tìm kiếm toàn văn bản có phạm vi (Scoped Search):** Kết hợp chỉ mục GIN Trigram (`title gin_trgm_ops`) hỗ trợ tìm kiếm mờ độ phức tạp $\mathcal{O}(\log N)$ và tham số lọc theo không gian (`spaceId`/`spaceSlug`).

#### 2.6. Động Cơ Nhắn Tin Tức Thời (Reddit Chats Engine)

- **Hội thoại đa phạm vi:** Hỗ trợ Direct Chat 1-1 và Group Chat đa người dùng.
- **Hàng đợi xét duyệt tin nhắn lạ (Chat Requests Queue):** Người lạ gửi tin nhắn sẽ được lưu ở trạng thái `PENDING`. Người nhận có 3 quyền quyết định: *Accept* (mở kênh chat), *Ignore* (ẩn tin), hoặc *Block/Report* (chặn và báo cáo vi phạm).
- **Phân nhánh hội thoại (Chat Threads):** Cho phép tạo nhánh trao đổi phụ trên từng tin nhắn cụ thể thông qua trường `parent_message_id`.

#### 2.7. Trung Tâm Quản Trị Hệ Thống (Moderation & Admin Hub)

- **Phân quyền kép RBAC & ABAC:** Kiểm soát thông qua `auth-guard.ts`, chỉ tài khoản có vai trò `ADMIN` mới có thể truy cập `/api/v1/admin/*` và giao diện web `/admin`.
- **Console quản trị 4 phân hệ:** Bảng điều khiển gồm Dashboard (chỉ số thời gian thực), Users (quản lý trạng thái, thu hồi phiên, đếm `threadsCount`), Spaces (quản lý thành viên, xóa cascade), và Threads (ghim/bỏ ghim, khóa bình luận, xóa nội dung).

### 3. Ngôn Ngữ Thiết Kế & Quản Lý Trạng Thái Giao Diện

- Phong cách Minimalist Brutalism Dark Mode: Triệt tiêu hoàn toàn hiệu ứng bo tròn lớn và màu sắc neon chói mắt, thiết lập bảng 4 gam màu cốt lõi chuẩn hóa:
    - `#222831` (40% - Deep Void Charcoal): Nền canvas chính.
    - `#393E46` (25% - Industrial Graphite): Bề mặt thẻ, thanh điều hướng, khung chat.
    - `#948979` (15% - Muted Earthy Taupe): Đường viền 1px sắc nét, đường kẻ nhánh bình luận, metadata.
    - `#DFD0B8` (15% - Warm Parchment): Tiêu đề, nút hành động chính, đổ bóng phẳng.

- **Đổ bóng phẳng dứt khoát (Hard Flat Shadows):** Sử dụng bóng góc 45° không làm mờ (`box-shadow: 3px 3px 0px #948979`), khi hover chuyển dịch vị trí `translate(-1px, -1px)` và tăng độ tương phản `4px 4px 0px #DFD0B8`.
- Mô hình quản lý trạng thái 3 tầng:
    - *Server State:* Quản lý bằng TanStack Query v5 (cache, infinite query con trỏ, tự động dọn rác).
    - *Client UI State:* Quản lý bằng Zustand Store (sidebar, mở/đóng modal, thu gọn nhánh cây, widget chat).
    - *URL Query Params State:* Quản lý bằng `nuqs` (lưu trạng thái bộ lọc `hot/new/top`, mốc thời gian, từ khóa tìm kiếm `q`, con trỏ trang `cursor`).

- **Máy trạng thái hữu hạn cho thao tác biểu quyết (Vote Action FSM):** Cập nhật giao diện tức thì (Optimistic UI) khi bấm Up/Down/Unvote và tự động hoàn tác (rollback) nếu API trả về lỗi.

### 4. Tiêu Chuẩn Kỹ Thuật, Khế Ước Dữ Liệu & Quy Trình CI/CD

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   TIÊU CHUẨN KỸ THUẬT & 4 CỔNG KIỂM ĐỊNH TỰ ĐỘNG (CI GATES)            │
├───────────────────┬───────────────────┬──────────────────────┬─────────────────────────┤
│ CỔNG 1: LINTING   │ CỔNG 2: TYPECHECK │ CỔNG 3: AUTOMATED QA │ CỔNG 4: CONTAINER BUILD │
├───────────────────┼───────────────────┼──────────────────────┼─────────────────────────┤
│ • Biome Linter    │ • TypeScript 5.9  │ • Vitest Runner      │ • Docker multi-stage    │
│ • Tốc độ < 0.5s   │   Strict Mode     │ • 59/59 Test Suites  │   Node 24 Alpine        │
│ • Format 2 spaces │ • OpenAPI 3.1 &   │   Passed (100%)      │ • API < 100MB           │
│ • Nháy đơn (')    │   Zod Validation  │ • Bao phủ Auth, Tree,│ • Web Client < 150MB    │
│                   │ • No implicit any │   Lua Vote, Admin    │ • Non-root user (1001)  │
└───────────────────┴───────────────────┴──────────────────────┴─────────────────────────┘
```

- **Khế ước API chuẩn RESTful & RFC 7807:** Mọi endpoint đều có tiền tố `/api/v1/`, tài nguyên danh từ số nhiều, phân trang bằng con trỏ Base64 tổng hợp $\text{base64}(\text{sort\_score}:\text{timestamp}:\text{item\_id})$ để tránh trôi dữ liệu bài viết mới. Phản hồi lỗi tuân thủ định dạng Problem Details RFC 7807.
- **Quy chuẩn mã nguồn TypeScript:** Chế độ `strict: true`, không dùng `any` bừa bãi, các import module tương đối bắt buộc có đuôi `.js` tuân thủ chuẩn Node.js ESM. Thay thế ESLint/Prettier bằng Biome nhằm tối ưu thời gian kiểm tra mã xuống dưới 0.5 giây.
- **Quy trình Git Trunk-Based & Semantic Commits:** Nhánh `main` là nguồn sự thật duy nhất, chỉ merge khi vượt qua 4 cổng CI tự động trên GitHub Actions.

### 5. Hạ Tầng Vận Hành & Khả Năng Chống Chịu (Deployment & SRE)

- Triển khai Đám mây (Render Cloud & Supabase Managed DB):
    - Cơ sở dữ liệu vận hành trên Supabase PostgreSQL (Region Singapore `ap-southeast-1`), kết nối thông qua Supavisor Connection Pooler (chế độ Transaction cổng 6543 hoặc Session cổng 5432) để phục vụ hàng ngàn kết nối đồng thời từ Render.
    - Ứng dụng Web và API Gateway được đóng gói qua Docker Multi-stage tối giản chạy trên Render Cloud.

- **Cơ chế chống ngủ đông (Spin-down Mitigation):** Dịch vụ Render Free Tier tự động ngủ đông sau 15 phút không hoạt động gây ra hiện tượng Cold Start kéo dài 40-50 giây. Dự án giải quyết bằng script nền `keep-alive.sh` gửi yêu cầu HTTP probe định kỳ mỗi 10 phút (600 giây) vào `/healthz` để duy trì container luôn ở trạng thái nóng sẵn sàng.
- **Cơ chế tự phục hồi kết nối (Resilient Fallback):** Driver `pg` tự động nhận diện hostname `.supabase.co` hoặc `pooler.supabase.com` để bật SSL. Trường hợp kết nối CSDL gián đoạn, kho dữ liệu tự động chuyển sang chế độ dự phòng `InMemoryUserRepository`, giữ tiến trình Backend API không bị sập (uptime 100%).

### 6. Ma Trận Đánh Giá Tiến Độ & Lộ Trình Phát Triển

Hệ thống được phát triển theo chiến lược **Backend-First (Hạ tầng dữ liệu và nghiệp vụ đi trước, giao diện theo sau)** nhằm tránh việc phải tái cấu trúc API và ngăn chặn rủi ro race condition.

Tiến độ tổng thể dự án đạt xấp xỉ **82.0%**:

| Phân Hệ (Modules)                        | Dữ Liệu (C1) | Khế Ước (C2) | Bảo Mật (C3) | Hiệu Năng (C4) | Tự Phục Hồi (C5) | Trải Nghiệm UI (C6) | Mức Hoàn Thành   |
| ---------------------------------------- | ------------ | ------------ | ------------ | -------------- | ---------------- | ------------------- | ---------------- |
| **M1: Định Danh & Mã Hóa (Auth)**        | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>    | <br>[x]<br>      | <br>[x]<br>         | <br>**100%**<br> |
| **M2: Quản Lý Phiên (Session Shield)**   | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>    | <br>[x]<br>      | <br>[x]<br>         | <br>**100%**<br> |
| **M3: Không Gian Thảo Luận (Spaces)**    | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>    | <br>[x]<br>      | <br>[x]<br>         | <br>**100%**<br> |
| **M4: Bài Viết & Soạn Thảo (Threads)**   | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>    | <br>[/]<br>      | <br>[/]<br>         | <br>**75%**<br>  |
| **M5: Cây Bình Luận Ảo Hóa (Ltree)**     | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>    | <br>[x]<br>      | <br>[/]<br>         | <br>**85%**<br>  |
| **M6: Bầu Chọn Nguyên Tử (Lua Voting)**  | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>    | <br>[/]<br>      | <br>[/]<br>         | <br>**80%**<br>  |
| **M7: Tin Nhắn Tức Thời (Reddit Chats)** | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>  | <br>[/]<br>    | <br>[ ]<br>      | <br>[ ]<br>         | <br>**40%**<br>  |
| **M8: Trung Tâm Quản Trị (Admin Hub)**   | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>    | <br>[x]<br>      | <br>[/]<br>         | <br>**80%**<br>  |
| **M9: Frontend Web Client (Next.js 15)** | <br>[/]<br>  | <br>[x]<br>  | <br>[x]<br>  | <br>[/]<br>    | <br>[x]<br>      | <br>[/]<br>         | <br>**75%**<br>  |
| **M10: DevOps, CI/CD & Hạ Tầng Cloud**   | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>  | <br>[x]<br>    | <br>[x]<br>      | <br>N/A<br>         | <br>**85%**<br>  |

### 7. Nhận Định Kỹ Thuật, Điểm Nghẽn & Khuyến Nghị Hành Động

- Điểm sáng kiến trúc:
    - Việc áp dụng PostgreSQL `ltree` kết hợp chỉ mục GiST và thuật toán trải phẳng mảng $\mathcal{O}(N)$ giải quyết triệt để vấn đề truy vấn cây phân cấp sâu, loại bỏ hoàn toàn đệ quy gây nghẽn I/O.
    - Khâu xác thực được thiết kế chặt chẽ theo chuẩn OWASP ASVS Level 2+ với cơ chế phòng thủ Token Reuse Detection và Mutex Lock chống bão yêu cầu ở tầng Client.
    - Cơ chế bỏ phiếu nguyên tử qua Redis Lua tách biệt với ghi đĩa quan hệ qua buffer `fillfactor = 70` giúp tối ưu thông lượng thao tác ghi cực lớn.

- Các điểm nghẽn kỹ thuật cần hoàn thiện ngay:
    1. *Đồng bộ dữ liệu bầu chọn:* Cần triển khai chính thức Background Worker chạy định kỳ 5 giây để flush dồn từ khóa Redis `dirty:votes` về bảng `thread_counters` của PostgreSQL.
    2. *Hạ tầng thời gian thực cho Chat:* Bảng `chat_requests`, `chat_channels`, `chat_messages` đã có thiết kế DDL nhưng cần hoàn tất cổng gateway SSE/WebSocket để kích hoạt tính năng nhắn tin tức thời.
    3. *Tích hợp giao diện cây bình luận:* Gắn trực tiếp `@acad/tree-virtualizer` vào giao diện trang chi tiết bài viết `/threads/[slug]` trên client Next.js để hoàn tất luồng hiển thị bình luận.
    4. *Kiểm thử tải diện rộng (k6):* Cần thực thi kịch bản stress test mô phỏng tải 5,000 RPS vào các endpoint nóng (`/healthz`, `/threads?sort=hot`, `/vote`) để thẩm định ngưỡng độ trễ $P_{95} < 50\text{ms}$ trước khi bước vào giai đoạn phát hành chính thức.