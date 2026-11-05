# Overview

Một nền tảng Mạng xã hội & Diễn đàn cộng đồng hiện đại xây dựng trên React cần giải quyết đồng thời hai bài toán then chốt: **tối ưu hóa SEO** cho nội dung thảo luận công khai để kéo traffic tự nhiên và **đảm bảo trải nghiệm thời gian thực (real-time)** mượt mà để giữ chân người dùng.

---

#### 1. Định vị mô hình & Kiến trúc Frontend

Một diễn đàn/cộng đồng hiện đại thường lai giữa mô hình dạng luồng của Reddit/Discourse và bảng tin tương tác nhanh của Twitter/X.

| Tiêu chí | Tiếp cận SPA thuần (Vite + React) | Tiếp cận Hybrid (Next.js SSR/ISR) | Đề xuất lựa chọn |
| --- | --- | --- | --- |
| **SEO Indexing** | Kém; crawler khó lập chỉ mục nội dung động | Xuất sắc; render sẵn HTML cho bot tìm kiếm | **Next.js (App Router)** |
| **Tốc độ tải đầu (FCP)** | Phụ thuộc kích thước JS bundle tải về | Rất nhanh nhờ HTML tĩnh/Server Components | **Next.js** |
| **Quản trị trạng thái** | Phù hợp app nội bộ, trang dashboard | Kết hợp RSC (fetch dữ liệu) và Client State | **Next.js** |
| **Phù hợp sản phẩm** | Mạng xã hội kín, SaaS dashboard | Diễn đàn mở, cộng đồng thảo luận công khai | **Next.js** |

##### Cấu trúc Frontend React khuyến nghị

- **Server State & Caching:** **TanStack Query (React Query)** để quản lý dữ liệu bất đồng bộ, tự động revalidate dữ liệu bài viết, xử lý phân trang và Infinite Scroll.
- **Client UI State:** **Zustand** cho các trạng thái nhẹ, cục bộ: trạng thái mở modal, draft nội dung chưa gửi, cài đặt giao diện (dark/light mode).
- **Hiển thị danh sách lớn (Virtualization):** `@tanstack/react-virtual` để xử lý bảng tin (Feed) hoặc các luồng thảo luận có hàng nghìn bình luận mà không làm tràn bộ nhớ DOM.
- **Trình soạn thảo văn bản (Rich Text Editor):** **Tiptap** hoặc **Lexical** (headless, nhẹ, hỗ trợ markdown, mention `@`, upload ảnh kéo thả, chèn link preview).

---

#### 2. Các phân hệ chức năng cốt lõi

##### Hệ thống Tài khoản & Phân quyền (RBAC)

- **Ma trận quyền hạn:** Khách (chỉ đọc) $\rightarrow$ Thành viên đã xác thực (đăng bài, bình luận, vote) $\rightarrow$ Moderator (kiểm duyệt bài, khóa thread, cảnh cáo) $\rightarrow$ Admin (cấu hình hệ thống).
- **Xác thực:** OAuth2 (Google, GitHub), Magic Link, kết hợp JWT lưu trữ trong `httpOnly Cookie` để phòng ngừa XSS.

##### Động cơ Bảng tin & Luồng thảo luận

- **Thuật toán Feed:**
    - *Mới nhất (Latest):* Sắp xếp theo timestamp thuần túy.
    - *Thịnh hành (Hot/Trending):* Thuật toán suy giảm theo thời gian dựa trên điểm số tương tác (tương tự thuật toán của Hacker News hoặc Reddit).

- **Cấu trúc bình luận lồng nhau (Nested/Threaded Comments):** Hỗ trợ trả lời theo cấp bậc (Reply to reply). Áp dụng mô hình **Materialized Path** hoặc **Closure Table** ở database để truy vấn cây bình luận nhanh chóng.
- **Optimistic UI Updates:** Khi người dùng click Upvote, Thích hoặc Lưu bài, giao diện React cập nhật số liệu ngay lập tức trên UI trước khi API trả về kết quả; tự động rollback nếu request thất bại.

##### Tương tác thời gian thực & Thông báo

- **WebSocket / Server-Sent Events (SSE):**
    - SSE dùng cho: Thông báo khi có người nhắc tên, nhận thưởng, số lượt vote tăng.
    - WebSocket dùng cho: Trò chuyện trực tiếp (Direct Message) hoặc phòng thảo luận trực tiếp (Live Thread).

##### Hệ thống Danh tiếng & Kiểm duyệt

- **Gamification:** Điểm tín nhiệm (Karma/Reputation), huy hiệu đóng góp (Badges), danh hiệu phân cấp theo hoạt động thực tế.
- **Kiểm duyệt tự động & Báo cáo:** Tích hợp bộ lọc từ khóa cấm, rate limit tần suất đăng bài (chống spam), cơ chế gắn cờ (Flag/Report) đẩy vào hàng đợi chờ Moderator xử lý.

---

#### 3. Ngăn xếp công nghệ đề xuất (Tech Stack)

```text
[Client: Next.js + React + TailwindCSS]
       │
       ├─ (Static / SSR Pages) ──> Cloudflare CDN / Vercel Edge
       │
       ├─ (Client Fetching) ────> RESTful / GraphQL API (Node.js / Go)
       │                              │
       ├─ (Realtime Socket) ────> WebSocket Server / Redis PubSub
       │                              │
       └─ (Media Upload) ───────> Direct Upload qua Presigned URL ──> S3 / Cloudflare R2
                                      │
                                      ▼
                   [Database: PostgreSQL (Dữ liệu chính) + Redis (Cache/Session)]
                                      │
                                      ▼
                   [Search Engine: Meilisearch / Elasticsearch]
```

---

- **Frontend:** Next.js, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query.
- **Backend:** Node.js (NestJS) hoặc Go (Gin/Fiber) để tối ưu hiệu năng I/O đồng thời.
- **Cơ sở dữ liệu:**
    - PostgreSQL: Lưu trữ User, Thread, Comment, Phân quyền.
    - Redis: Lưu Cache bài viết hot, phiên đăng nhập, Rate Limiting, Pub/Sub cho tin nhắn.
    - Meilisearch: Tìm kiếm toàn văn (Full-text search) bài viết và chủ đề với độ trễ thấp.

---

#### 4. Các thách thức kỹ thuật lớn & Phương án xử lý

- **Bài toán Scale Bảng tin (Feed Fan-out):**
    - *Fan-out on Write (Push):* Bài viết mới được ghi trực tiếp vào feed của mọi người theo dõi. Tốt khi người dùng có ít follower.
    - *Fan-out on Read (Pull):* Khi người dùng mở app, hệ thống mới query bài viết từ những người họ theo dõi. Tiết kiệm lưu trữ, phù hợp với các tài khoản có hàng trăm nghìn follower.
    - *Giải pháp:* Sử dụng mô hình Hybrid. Người dùng thông thường dùng Push, tài khoản có lượng follow lớn (KOLs) dùng Pull.

- **Tải tệp đa phương tiện:** Không bao giờ upload ảnh/video qua API server chính. Frontend React gọi API xin **Presigned URL**, sau đó upload trực tiếp từ trình duyệt lên Cloudflare R2 hoặc AWS S3 để tránh nghẽn băng thông server.
- **SEO cho Diễn đàn hàng triệu trang:** Áp dụng **Incremental Static Regeneration (ISR)** của Next.js. Các bài viết cũ được cache tĩnh dạng HTML; khi có bình luận mới, trang tự động revalidate ngầm trong background mà không cần rebuild toàn bộ ứng dụng.

---

# 1. ĐỊNH VỊ MÔ HÌNH & KIẾN TRÚC FRONTEND

---

#### 1.1. Định vị mô hình nền tảng

Nền tảng kết hợp giữa **Diễn đàn cấu trúc sâu (Reddit/Discourse)** và **Bảng tin tương tác nhanh (X/Bluesky)**. Đặc thù của mô hình này đòi hỏi hệ thống phải giải quyết hai yêu cầu đối nghịch:

1. **Public Threads:** Cần chỉ mục SEO tuyệt đối, First Contentful Paint (FCP) dưới 1s để giữ chân traffic tự nhiên từ công cụ tìm kiếm.
2. **User Feeds & Interactions:** Cần tương tác thời gian thực, cập nhật dữ liệu liên tục không giật lag (Zero-lag UI updates).

##### Chiến lược Rendering tối ưu: Hybrid Rendering với React Server Components (RSC)

Không dùng SPA thuần (Vite CSR) vì phá hủy SEO và tăng kích thước JS bundle tải ban đầu. Không dùng SSR truyền thống vì gây quá tải CPU của server khi lượng truy cập tăng vọt.

Giải pháp thông minh nhất là **RSC kết hợp Partial Prerendering (PPR)**:

```text
[Request từ Trình duyệt]
                                  │
                                  ▼
                     [Cloudflare / Edge Network]
                                  │
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
       [Static Shell (HTML/CSS)]      [Dynamic Streamed Chunks]
       - Khung layout, navigation     - Feed cá nhân hóa
       - Nội dung bài viết (Cache)    - Số liệu vote, avatar user
       - Meta tags / SEO Schema       - Bình luận mới nhất
                   │                             │
                   └──────────────┬──────────────┘
                                  ▼
                      [Trình duyệt Hydrate]
              (Chỉ nạp JS cho các đảo tương tác)
```

---

- **Trang bài viết (Thread Detail):** Áp dụng **Incremental Static Regeneration (ISR)** với thời gian revalidate theo tầng (bài viết cũ revalidate sau 12h, bài viết mới hoặc bài hot revalidate mỗi 60s). Bot tìm kiếm luôn nhận được file HTML tĩnh hoàn chỉnh từ CDN.
- **Bảng tin cá nhân (User Feed):** Dynamic SSR kết hợp Suspense Streaming. Trả về ngay lập tức bộ khung xương (Skeleton UI) từ Edge, sau đó stream luồng bài viết xuống trình duyệt.

---

#### 1.2. Tech Stack tuyển chọn & Cơ sở kỹ thuật

Bảng công nghệ được tối ưu để giảm thiểu runtime overhead, triệt tiêu JavaScript thừa và tăng tốc độ phát triển:

| Phân hệ | Công nghệ lựa chọn | Lý do kỹ thuật & Điểm vượt trội |
| --- | --- | --- |
| **Core Framework** | **Next.js (App Router)** | Hỗ trợ RSC bản địa, tối ưu SEO, hỗ trợ Server Actions xử lý form submit không cần API route trung gian, tích hợp sẵn Image/Font optimization. |
| **Server State** | **TanStack Query v5** | Quản lý cache dữ liệu từ API, xử lý deduplication (chống gọi trùng API), hỗ trợ phân trang vô tận (`useInfiniteQuery`), tự động invalidate cache khi dữ liệu thay đổi. |
| **Client UI State** | **Zustand** | Dung lượng siêu nhẹ (~1KB), không boilerplate, không re-render diện rộng như React Context, lưu trạng thái Modal, Sidebar, Draft bài viết vào LocalStorage cực gọn. |
| **URL State Manager** | **nuqs** | Đồng bộ trực tiếp bộ lọc (filter, tab, sort, trang) lên URL Search Params dưới dạng type-safe. Đảm bảo người dùng copy link gửi đi đâu cũng hiển thị đúng trạng thái. |
| **Styling Engine** | **Tailwind CSS v4** | Biên dịch zero-runtime, build cực nhanh, sinh CSS siêu nhỏ nhờ cơ chế loại bỏ class thừa (JIT). |
| **UI Primitive** | **Radix UI + shadcn/ui** | Headless UI, chuẩn Accessibility (a11y), quản lý focus trap trên bàn phím chuẩn xác; mã nguồn nằm trực tiếp trong project, dễ tùy biến sâu mà không phụ thuộc thư viện ngoài. |
| **Rich Text Editor** | **Tiptap (ProseMirror core)** | Headless, kiến trúc module hóa. Dễ dàng nhúng code syntax highlighting, mention `@user`, render Markdown thời gian thực, chèn thẻ nhúng (embed cards). |
| **DOM Virtualization** | **@tanstack/react-virtual** | Render ảo hóa danh sách hàng nghìn bài viết và comment lồng nhau, chỉ giữ lại trong DOM các phần tử hiển thị trên màn hình, chặn tràn RAM trình duyệt. |
| **Validation** | **Zod** | Validate schema dữ liệu ở cả 2 đầu: Client form và Server Action/API, dùng chung 1 source of truth cho TypeScript types. |

---

#### 1.3. Kiến trúc thư mục: Feature-Sliced Design (FSD) tinh gọn

Thay vì gom nhóm theo loại tệp (components, hooks, pages), áp dụng kiến trúc theo tính năng (Domain-driven) để code dễ bảo trì khi mở rộng:

```plaintext
src/
├── app/                          # Next.js App Router (Routing, Layouts, API handlers)
│   ├── (auth)/                   # Route group: đăng nhập, đăng ký
│   ├── (community)/              # Route group: feed, threads, categories
│   │   ├── [category]/
│   │   │   └── [slug]/page.tsx   # Trang chi tiết bài viết (ISR)
│   │   └── page.tsx              # Bảng tin chính (Streamed SSR)
│   └── api/                      # Webhook & Next.js endpoints
│
├── features/                     # Các module nghiệp vụ khép kín
│   ├── auth/                     # Session, login modal, logic phân quyền
│   ├── feed/                     # Infinite list, feed filter, feed sorting
│   ├── thread/                   # Thread creation, detail view, markdown render
│   │   ├── components/           # Component riêng của thread (ThreadCard, VoteControl)
│   │   ├── hooks/                # useVote, useThreadDetail, useBookmark
│   │   ├── services/             # API queries, mutations
│   │   └── types/                # Types/Interfaces liên quan đến Thread
│   ├── comments/                 # Cây bình luận đa tầng (Nested tree), comment box
│   └── notifications/            # Popover thông báo, realtime badge
│
├── components/ui/                # Atomic UI components dùng chung (Button, Dialog, Dropdown)
├── lib/                          # Cấu hình chung (fetch client, websocket instance, redis)
└── stores/                       # Global UI store (Zustand: theme, sidebarState)
```

---

#### 1.4. Thiết kế các luồng xử lý kỹ thuật quan trọng

##### Cơ chế Optimistic UI (Vote & Bookmark)

Người dùng diễn đàn vote bài liên tục. Tuyệt đối không để UI chờ phản hồi mạng từ server.

```text
[User click Upvote]
       │
       ├──> (1) Zustand/React Query ghi nhận ngay:
       │        - Tăng số điểm hiển thị +1
       │        - Đổi màu nút Upvote sang trạng thái Active
       │
       ├──> (2) Bắn request API ngầm xuống Server
       │
       ├─── Tùy theo phản hồi:
       │        ├── Success ──> Cập nhật lại ID dữ liệu chính thức, giữ nguyên UI
       │        └── Error   ──> Tự động Rollback lại số điểm cũ và hiển thị thông báo lỗi
```

---

##### Ranh giới Client - Server Components (RSC Boundaries)

Quy tắc tối ưu hóa bundle: **Mặc định toàn bộ là Server Component, chỉ đẩy Client Component xuống các nút lá tương tác thấp nhất.**

```text
[ThreadDetailPage - Server Component] (0 KB JS bundle)
  │
  ├──> [ThreadMetadata - Server Component] (SEO Tags, Breadcrumbs)
  ├──> [ThreadContent - Server Component] (Render HTML tĩnh từ Markdown/Tiptap)
  │
  ├──> [VoteActions - Client Component] (Bắt sự kiện click, chạy Optimistic Update)
  │
  ├──> [AuthorBadge - Server Component] (Avatar, Rep points tĩnh)
  │
  └──> [CommentSection - Server Component] (Fetch trước cây comment tầng 1)
        │
        ├──> [CommentItem - Server Component]
        └──> [ReplyEditor - Client Component] (Chỉ tải JS trình soạn thảo khi bấm Reply)
```

---

##### Xử lý Cây bình luận đa cấp (Nested Comments) với Virtualization

Diễn đàn dễ sập hiệu năng nếu render toàn bộ các comment lồng nhau (Tree Recursion) cùng lúc vào DOM:

- **Flattening:** Khi client nhận cây comment đệ quy từ backend, client dùng thuật toán trải phẳng (flatten) thành một mảng tuyến tính kèm thuộc tính `depth` (độ sâu thụt lề).
- **Virtual Render:** Đưa mảng đã trải phẳng qua `@tanstack/react-virtual`. Trình duyệt chỉ tốn tài nguyên render từ 15-20 comment nằm trong viewport. Khi người dùng click "Thu gọn nhánh" (Collapse Thread), chỉ cần filter loại bỏ các comment con khỏi mảng hiển thị.

---

# Phần 1: Mở rộng phạm vi phân tích (Brainstorming & Discovery)

1.0 QUẢN TRỊ BỘ NHỚ ĐỆM & ĐỒNG BỘ DỮ LIỆU ĐA TẦNG (CACHE & DATA FRESHNESS)

- 1.1 Xung đột đồng bộ giữa Server Cache (Next.js Data Cache/CDN) và Client Cache (TanStack Query)
    - 1.1.1 Hiện tượng "Ghost UI": Người dùng sửa hoặc xóa bài viết, Server Action kích hoạt `revalidateTag()`, nhưng Client Cache của TanStack Query vẫn giữ dữ liệu cũ do chưa khớp `staleTime` và `queryKey`.
    - 1.1.2 Chiến lược đồng bộ: Buộc Server Action trả về payload cập nhật trực tiếp để gọi `queryClient.setQueryData()` ngay tại client, tránh phụ thuộc vào việc fetch lại toàn bộ danh sách.

- 1.2 Hiệu ứng dồn tải bộ đệm (Cache Stampede / Thundering Herd)
    - 1.2.1 Rủi ro: Một bài viết thảo luận bất ngờ viral, hàng chục nghìn request ùa vào đúng thời điểm thời hạn ISR (Revalidate) chạm mốc 0, khiến hệ thống kích hoạt hàng nghìn tiến trình render SSR nền cùng lúc.
    - 1.2.2 Giải pháp: Cấu hình `stale-while-revalidate` cứng ở tầng CDN/Edge; kích hoạt cơ chế khóa phân tán (Distributed Lock qua Redis) ở Backend để chỉ cho phép 1 worker thực hiện re-render trang tĩnh tại một thời điểm.

- 1.3 Rò rỉ tài nguyên bộ nhớ Client Cache (Memory Footprint)
    - 1.3.1 Người dùng cuộn bảng tin (Infinite Scroll) liên tục qua hàng trăm bài viết khiến dữ liệu DOM ảo và TanStack Query cache phình to dần trong RAM trình duyệt trên thiết bị di động.
    - 1.3.2 Cấu hình bắt buộc: Thiết lập `gcTime` (Garbage Collection Time) nghiêm ngặt; giới hạn `maxPages` trong `useInfiniteQuery` để tự động loại bỏ các trang dữ liệu cũ ở đầu danh sách khi người dùng cuộn quá sâu.

2.0 XỬ LÝ TRẠNG THÁI HIỂN THỊ, HYDRATION & ĐUA DỮ LIỆU (CONCURRENCY & HYDRATION)

- 2.1 Lỗi lệch đồng bộ cấu trúc (Hydration Mismatch)
    - 2.1.1 Sai lệch định dạng thời gian: Timestamp tương đối ("5 phút trước", "vừa xong") render trên server khác múi giờ và thời gian chạy tại trình duyệt người dùng.
    - 2.1.2 Xử lý: Render timestamp chuẩn ISO tĩnh trên Server; chỉ chuyển đổi sang định dạng thời gian động bằng hook ở Client sau khi component đã mount hoàn toàn, hoặc sử dụng thuộc tính `suppressHydrationWarning` có kiểm soát.
    - 2.1.3 Lệch trạng thái xác thực: SSR trả về giao diện trạng thái Khách (chưa đăng nhập), nhưng Client Hydration phát hiện Cookie/Session đã đăng nhập, gây giật giao diện (Flash of Unauthenticated Content).

- 2.2 Xử lý tranh chấp điều kiện (Race Conditions) trong Optimistic Updates
    - 2.2.1 Thao tác bấm liên tục: Người dùng spam nút Upvote/Downvote/Hủy vote với tần suất cao hơn độ trễ mạng (Network Latency), khiến các request API trả về sai thứ tự, làm sai lệch trạng thái cuối cùng của UI.
    - 2.2.2 Giải pháp: Sử dụng AbortController để hủy bỏ (cancel) request mutation đang chạy trước đó trong TanStack Query (`queryClient.cancelQueries()`) trước khi gán optimistic state mới.

- 2.3 Bảo toàn dữ liệu bản nháp (Draft Preservation & State Persistence)
    - 2.3.1 Người dùng đang soạn thảo bài viết/bình luận dài nhưng vô tình ấn Back, reload trang hoặc chuyển tab.
    - 2.3.2 Bắt buộc: Tự động lưu nội dung biên tập vào IndexedDB/LocalStorage theo cơ chế debounce (1-2s); chặn chuyển trang nội bộ bằng cảnh báo Navigation Guard khi form có trạng thái `isDirty`.

3.0 TỐI ƯU HÓA HIỆU NĂNG GIAO DIỆN (DOM PERFORMANCE & CORE WEB VITALS)

- 3.1 Thách thức đo lường chiều cao động trong Virtualization (@tanstack/react-virtual)
    - 3.1.1 Các bài viết và bình luận không có kích thước cố định; chúng chứa ảnh tải chậm, video nhúng, trích dẫn (blockquotes), hoặc khối code mở rộng.
    - 3.1.2 Giải pháp: Không set kích thước ước lượng cứng; phải kích hoạt `measureElement` kết hợp `ResizeObserver` để tính toán lại layout ngay khi ảnh/embed bên trong phần tử hoàn tất việc render.

- 3.2 Cơ chế nhảy liên kết sâu (Deep Linking) và phục hồi vị trí cuộn (Scroll Restoration)
    - 3.2.1 Khi người dùng truy cập trực tiếp qua URL chứa neo định danh bình luận (`[example.com/thread/slug#comment-890](https://example.com/thread/slug#comment-890)`), nếu danh sách bình luận đang áp dụng ảo hóa (virtualized), phần tử mục tiêu chưa tồn tại trong DOM thực tế.
    - 3.2.2 Kiến trúc xử lý: Backend phải trả về metadata vị trí trang (index/page) của comment; Client khởi tạo virtualizer tại đúng vị trí offset tính toán được trước khi hiển thị khung hình đầu tiên.

- 3.3 Tối ưu chỉ số tương tác (Interaction to Next Paint - INP)
    - 3.3.1 Thao tác mở hộp soạn thảo Tiptap, chuyển tab bộ lọc, hoặc bung nhánh bình luận hàng nghìn node gây nghẽn Main Thread của trình duyệt.
    - 3.3.2 Giải pháp:
        - Bao bọc các cập nhật giao diện nặng bằng `useTransition()` để ưu tiên xử lý phản hồi gõ phím/click của người dùng trước.
        - Tách nhỏ (Code-splitting) toàn bộ trình soạn thảo Tiptap và thư viện highlight code (Shiki/Prism) bằng `next/dynamic` (Lazy Loading), không bundle chung vào First Load JS.

- 3.4 Ổn định bố cục tránh giật khung hình (Cumulative Layout Shift - CLS)
    - 3.4.1 Bảng tin chèn xen kẽ quảng cáo (In-feed Ads), banner sự kiện, hoặc thẻ xem trước liên kết (Open Graph preview) tải bất đồng bộ gây đẩy dồn nội dung văn bản xuống dưới.
    - 3.4.2 Giải pháp: Khởi tạo khung chứa (Container) với tỉ lệ khung hình (Aspect Ratio) hoặc chiều cao tối thiểu (`min-height`) cố định bằng Skeleton UI trước khi tài nguyên nhúng nạp xong.

4.0 BẢO MẬT GIAO DIỆN & PHÒNG CHỐNG LẠM DỤNG (FRONTEND SECURITY & ABUSE PREVENTION)

- 4.1 Khử độc nội dung phong phú (Rich Text / HTML Sanitization)
    - 4.1.1 Trình soạn thảo Tiptap xuất định dạng HTML/JSON; nguy cơ cao dính lỗ hổng Stored XSS thông qua việc chèn mã độc vào thẻ `<a>`, `<img>`, thuộc tính `onload`, `javascript:`, hoặc các thẻ iframe nhúng.
    - 4.1.2 Bắt buộc: Sanitization 2 lớp. Lớp 1 tại Backend trước khi lưu DB; Lớp 2 tại Frontend trước khi dùng `dangerouslySetInnerHTML` bằng thư viện `DOMPurify` (kèm danh sách whitelist domain cho phép nhúng iframe).

- 4.2 Thiết lập chính sách bảo mật nội dung (Content Security Policy - CSP)
    - 4.2.1 Diễn đàn cho phép người dùng nhúng link từ bên thứ 3 (YouTube, X, CodePen, Loom).
    - 4.2.2 Cấu hình header CSP nghiêm ngặt: Chỉ định danh các nguồn `frame-src`, `img-src`, `connect-src` cụ thể; áp dụng Nonce-based CSP cho các script nội bộ trong Next.js để chặn tiêm mã script tùy ý.

- 4.3 Phòng ngừa tấn công Client-side Denial of Service (ReDoS & Infinite Loop)
    - 4.3.1 Các regex render Markdown (ví dụ: autolink, code block parser, mention parser) có thể bị khai thác bởi các chuỗi văn bản độc hại khiến trình duyệt của toàn bộ người xem bài viết bị treo hoàn toàn (100% CPU).
    - 4.3.2 Giải pháp: Sử dụng parser chuẩn dạng State-machine (như AST parser của Tiptap/Remark) thay vì dùng RegExp tùy tiện để xử lý chuỗi văn bản thô.

5.0 ĐỘ BỀN HỆ THỐNG & TRẢI NGHIỆM KHI MẤT KẾT NỐI (FAULT TOLERANCE & RESILIENCY)

- 5.1 Phân lập lỗi giao diện theo vùng (Granular Error Boundaries)
    - 5.1.1 Tránh trường hợp chỉ vì 1 comment hoặc 1 thẻ nhúng bị lỗi render/crash JS mà làm sập trắng (White Screen) toàn bộ trang chi tiết bài viết.
    - 5.1.2 Thiết lập: Đặt `ErrorBoundary` bao bọc từng cụm riêng biệt: Hộp soạn thảo, Danh sách bài liên quan, Từng nhánh bình luận đơn lẻ, Khối hiển thị widget người dùng.

- 5.2 Xử lý mất kết nối mạng và rớt WebSocket (Network Flapping & Reconnection)
    - 5.2.1 Trạng thái người dùng chuyển mạng (từ Wi-Fi sang 4G) hoặc mất mạng tạm thời: Các thao tác tương tác bị gián đoạn; kết nối realtime bị đứt âm thầm.
    - 5.2.2 Kiến trúc xử lý:
        - Bổ sung thanh trạng thái Offline Indicator cục bộ.
        - Cấu hình Exponential Backoff cho thuật toán tái kết nối WebSocket/SSE.
        - Thiết lập hàng đợi Offline Mutation Queue: Khi mất mạng, lưu tạm các thao tác (Bookmark, Vote) vào hàng đợi client; tự động flush và gửi tuần tự lên server ngay khi bắt được sự kiện `window.addEventListener('online')`.

---

# 2. CÁC PHÂN HỆ CHỨC NĂNG CỐT LÕI

---

#### 2.1. Phân hệ Tài khoản, Xác thực & Quản trị Danh tính (Identity & Access Management)

Hệ thống quản lý định danh người dùng cần cân bằng giữa việc đăng ký thuận tiện (low-friction onboarding) và khả năng ngăn chặn tài khoản ảo (sybil attack).

```text
[Client] ──(Credentials / OAuth)──> [Next.js Auth Handler]
                                            │
               ┌────────────────────────────┴────────────────────────────┐
               ▼                                                         ▼
     [Session Storage]                                         [Token Strategy]
 - httpOnly Secure Cookie                                   - Access Token (Short-lived: 15m)
 - SameSite=Lax                                             - Refresh Token (Long-lived: 7d)
 - Không truy cập qua JS (Chống XSS)                         - Lưu Refresh Token trong Redis Hash (Xoay vòng token)
```

---

##### Phương thức xác thực & Quản lý phiên

- **Đăng nhập đa kênh:** OAuth 2.0 / OIDC (Google, GitHub, Apple), Magic Link qua Email (passwordless), và xác thực sinh trắc học Passkeys (WebAuthn/FIDO2).
- **Quản trị phiên (Session Management):**
    - Lưu `access_token` trong bộ nhớ ứng dụng (Memory) hoặc `httpOnly`, `Secure`, `SameSite=Lax` cookie.
    - `refresh_token` lưu trong cơ sở dữ liệu/Redis theo cơ chế **Token Rotation** (mỗi lần refresh sẽ hủy token cũ và phát hành cặp token mới; nếu phát hiện token cũ tái sử dụng, lập tức vô hiệu hóa toàn bộ phiên của tài khoản đó).
    - Hỗ trợ đăng xuất từ xa (Revoke all active sessions) thông qua việc xóa session key trong Redis.

##### Ma trận phân quyền kép: RBAC kết hợp ABAC

Cộng đồng có tính chất phân cấp theo từng không gian con (Sub-community / Channel / Category). Quyền hạn của một người dùng là tổ hợp giữa **Quyền toàn cục (Global Role)** và **Quyền theo ngữ cảnh (Contextual/Space Role)**:

| Cấp bậc quyền | Phạm vi | Hành vi được phép | Điều kiện biên (ABAC) |
| --- | --- | --- | --- |
| **Guest** | Toàn hệ thống | Xem bài viết, đọc bình luận, tìm kiếm công khai | Không có quyền tương tác ghi |
| **Member** | Toàn hệ thống | Tạo bài viết, bình luận, vote, bookmark, sửa bài của chính mình | Giới hạn theo điểm uy tín (Karma) và tuổi tài khoản |
| **Space Moderator** | Kênh / Danh mục cụ thể | Ghim bài, khóa luồng bình luận, ẩn bài vi phạm, cảnh cáo thành viên | Chỉ có hiệu lực trong phạm vi Space được chỉ định |
| **Global Moderator** | Toàn hệ thống | Duyệt hàng đợi vi phạm (Mod Queue), ban IP, xử lý khiếu nại | Không can thiệp vào cấu hình hệ thống cốt lõi |
| **Super Admin** | Toàn hệ thống | Toàn quyền cấu hình hệ thống, quản lý database, cấp quyền Mod | Bắt buộc bật xác thực 2 lớp (MFA/TOTP) |

---

#### 2.2. Phân hệ Quản lý Nội dung (CMS) & Soạn thảo Đa phương tiện

##### Động cơ soạn thảo (Rich Text Engine)

Sử dụng kiến trúc headless **Tiptap (nền tảng ProseMirror)**, lưu trữ dữ liệu dưới dạng JSON-based Abstract Syntax Tree (AST) thay vì lưu chuỗi HTML thô nhằm tránh lỗ hổng bảo mật và dễ dàng render đa nền tảng (Web, Mobile App).

- **Định dạng & Tiện ích mở rộng:**
    - Hỗ trợ định dạng văn bản chuẩn Markdown shortcuts (ví dụ gõ `#` tự biến thành Heading).
    - Khối mã nguồn (Code Block) với cơ chế tự động phát hiện ngôn ngữ và tô màu cú pháp (Syntax Highlighting) qua thư viện tĩnh.
    - Đề cập thành viên (`@username`) và gắn thẻ chủ đề (`#tag`) với popover tìm kiếm dữ liệu theo thời gian thực (Debounced search).
    - Hộp thăm dò ý kiến (Interactive Polls) đính kèm trong bài viết với thời hạn biểu quyết.
    - Tự động quét đường dẫn (URL) và nạp thẻ xem trước Open Graph (link preview card gồm Title, Thumbnail, Description).

##### Quy trình tải lên tệp đa phương tiện không qua Backend (Zero-Hop Media Pipeline)

Tránh để API Server chính phải chịu tải I/O khi người dùng tải ảnh/video dung lượng lớn:

```text
[Client: Tiptap Editor]
       │
       ├─── 1. Gửi metadata file (name, size, mime) ───> [API Server]
       │                                                       │
       │                                                       ▼
       │<── 2. Trả về Presigned URL + File Key (UUID) ── [Tạo URL có chữ ký bảo mật]
       │
       ├─── 3. Upload nhị phân trực tiếp (PUT) ────────> [Storage: S3 / Cloudflare R2]
       │                                                       │
       │                                                       ▼
       └─── 4. Render ảnh với Blurhash tạm thời ───────> [Event Worker: Nén WebP & Tạo Thumbnails]
```

---

- **Client-side Pre-processing:** Nén ảnh trực tiếp trên trình duyệt bằng Canvas API trước khi upload để tiết kiệm băng thông (giảm 70-80% dung lượng mà không suy hao chất lượng mắt thường nhận biết).
- **Placeholders:** Tính toán chuỗi **Blurhash** tại client để làm ảnh nền mờ (skeleton) trong lúc chờ ảnh gốc tải về, triệt tiêu hiện tượng giật giao diện (CLS).

---

#### 2.3. Phân hệ Bảng tin, Luồng thảo luận & Bình luận lồng nhau

##### Thuật toán xếp hạng Bảng tin (Feed Ranking)

Hệ thống cung cấp 3 bộ lọc bảng tin cốt lõi:

- **Mới nhất (Latest):** Sắp xếp theo dòng thời gian thuần túy ($created\_at$ giảm dần).
- **Hàng đầu (Top):** Sắp xếp theo tổng số điểm tương tác thực trong một khung thời gian xác định (24h qua, tuần này, tháng này, toàn thời gian):

    $$
    \text{Score}_{\text{Top}} = \text{Upvotes} - \text{Downvotes}
    $$

- **Thịnh hành (Hot / Trending):** Áp dụng biến thể từ thuật toán suy giảm thời gian (Gravity Decay Algorithm). Điểm số của bài viết sẽ giảm dần theo thời gian thực để nhường chỗ cho các bài thảo luận mới nổi:

    $$
    \text{Score}_{\text{Hot}} = \frac{U - D}{(T + 2)^G}
    $$

    *Trong đó:*

    - $U$: Tổng số Upvote, $D$: Tổng số Downvote.
    - $T$: Khoảng thời gian từ lúc đăng bài đến hiện tại (tính bằng giờ).
    - $G$: Trọng số suy giảm (Gravity parameter, mặc định đặt $G = 1.8$).

##### Kiến trúc Bình luận lồng nhau đa tầng (Nested/Threaded Comments)

Xử lý cấu trúc thảo luận dạng cây (Tree structure) với khả năng mở rộng không giới hạn cấp độ trả lời (replies to replies).

```text
Thread Root
 ├── Comment A (depth: 0, path: "0001")
 │    ├── Comment A.1 (depth: 1, path: "0001.0001")
 │    │    └── Comment A.1.1 (depth: 2, path: "0001.0001.0001")
 │    └── Comment A.2 (depth: 1, path: "0001.0002")
 └── Comment B (depth: 0, path: "0002")
```

---

- **Mô hình Dữ liệu: Materialized Path:** Mỗi bản ghi bình luận lưu trữ một chuỗi `path` (ví dụ: `0001.0002.0005`).
    - *Ưu điểm:* Truy vấn toàn bộ một nhánh bình luận chỉ bằng 1 câu lệnh SQL duy nhất (`WHERE path LIKE '0001.0002%' ORDER BY path ASC`) thay vì dùng truy vấn đệ quy CTE (Common Table Expressions) gây chậm database.

- **Cơ chế tải dữ liệu lười (Lazy-loading Branches):**
    - Tầng sâu $\le 3$: Render sẵn dữ liệu cùng trang.
    - Tầng sâu $> 3$: Cắt nhánh và hiển thị nút "Xem thêm 12 câu trả lời..." (`Load More Replies`), gọi API riêng lẻ khi người dùng chủ động tương tác.

- **Thao tác thu gọn nhánh (Thread Collapsing):** Khi người dùng bấm vào đường kẻ phân cấp bên trái (Indent guide line), toàn bộ nhánh con lập tức bị ẩn khỏi DOM ảo, trạng thái đóng/mở được lưu tạm thời trong memory client.

---

#### 2.4. Phân hệ Tương tác, Gamification & Điểm tín nhiệm (Reputation Engine)

##### Cơ chế Tương tác (Voting Engine)

- **Xử lý bất đồng bộ & Khử trùng lặp (Deduplication):** Sử dụng Redis Sets để lưu vết trạng thái `has_voted` của user trên từng bài viết.
- **Bảo vệ chống thao túng phiếu bầu (Vote Manipulation Detection):**
    - Hạn chế số lượt vote trên mỗi dải IP/User trong 1 phút qua Redis Rate Limiting.
    - Vô hiệu hóa tính điểm khi phát hiện 2 tài khoản thường xuyên tương hỗ vote chéo cho nhau từ cùng một fingerprint thiết bị.

##### Hệ thống Danh tiếng & Thưởng phạt (Reputation & Badges)

Để kích thích chất lượng nội dung và sàng lọc spam, hệ thống sử dụng cơ chế cấp bậc dựa trên hành vi thực tế:

```text
[Hành động người dùng] ──> [Event Bus] ──> [Reputation Worker] ──> [Cập nhật Karma]
                                                                          │
                                                                          ▼
                                                         [Kiểm tra điều kiện mở khóa Badges]
```

---

- **Quy tắc tính điểm (Karma System):**
    - Bài viết được Upvote: $+10$ điểm | Bị Downvote: $-2$ điểm.
    - Bình luận được Upvote: $+5$ điểm | Bị Downvote: $-1$ điểm.
    - Bài viết bị Report và xóa bởi Mod: $-50$ điểm.

- **Phân cấp mở khóa tính năng (Privilege Ladder):**
    - $0 - 49$ điểm: Tài khoản mới, bị giới hạn tần suất đăng bài (1 bài/10 phút), link ngoài phải chịu thuộc tính `rel="nofollow ugc"`.
    - $50 - 499$ điểm: Xóa bỏ hạn chế thời gian, được phép tạo bình luận kèm ảnh/code.
    - $500 - 1.999$ điểm: Mở quyền Downvote bài viết khác, được phép tạo kênh thảo luận con (Sub-community).
    - $\ge 2.000$ điểm: Nhận đặc quyền kiểm duyệt sơ cấp (Vote đóng thread trùng lặp, vote mở lại thread).

---

#### 2.5. Phân hệ Thông báo & Đồng bộ Thời gian thực (Real-time Pipeline)

##### Phân luồng kênh truyền dữ liệu (Dual-channel Delivery)

| Phân hệ | Giao thức | Lý do lựa chọn |
| --- | --- | --- |
| **Thông báo hệ thống** (Mention, Upvote, Reply) | **Server-Sent Events (SSE)** | Kết nối 1 chiều (Server $\rightarrow$ Client), nhẹ hơn WebSocket, tự động kết nối lại (auto-reconnect), vượt qua firewall/proxy dễ dàng. |
| **Phòng chat & Live Discussion** | **WebSocket (Socket.io/WS)** | Đòi hỏi giao tiếp 2 chiều toàn phần (Full-duplex), độ trễ dưới 50ms cho việc gõ phím và nhắn tin trực tiếp. |
| **Thông báo ngoại tuyến** | **Web Push API** | Sử dụng Service Worker gửi thông báo trực tiếp lên OS của thiết bị ngay cả khi người dùng đã đóng tab trình duyệt. |

##### Cơ chế Gom cụm Thông báo (Notification Batching & Aggregation)

Tránh gây phiền toái (Notification fatigue) khi một bài viết trở nên viral.

Thay vì bắn 50 thông báo riêng rẽ khi có 50 người upvote bài viết, hệ thống đẩy sự kiện vào hàng đợi trễ (Delay Queue qua Redis/BullMQ) trong khoảng thời gian cửa sổ trượt (Sliding window: 5 phút):

- *Sự kiện đơn lẻ:* "Nguyễn Văn A đã thích bài viết của bạn."
- *Sự kiện gom nhóm:* "Nguyễn Văn A, Trần Văn B và 48 người khác đã thích bài viết của bạn."

---

#### 2.6. Phân hệ Kiểm duyệt, An toàn & Phòng chống Lạm dụng (Trust & Safety)

##### Hệ thống phòng thủ 3 lớp (Three-Tier Defense Architecture)

```text
[Request Tạo Nội Dung]
        │
        ├─── [Lớp 1: Khử tĩnh & Rate Limiting] ──> Chặn Spam bot, Check Blacklist Từ khóa
        │
        ├─── [Lớp 2: Kiểm duyệt AI/NLP tự động] ──> Quét Toxic, Hate Speech, NSFW Image
        │
        └─── [Lớp 3: Hàng đợi Moderation Queue] ──> Đánh dấu cờ (Flag) chờ con người xử lý
```

---

1. **Lớp 1 - Kiểm soát tần suất & Dấu hiệu bất thường (Rate Limiting & Heuristics):**
    - Thuật toán **Token Bucket** (Redis): Giới hạn mỗi người dùng không thể tạo quá 3 bài viết/giờ hoặc 20 bình luận/giờ.
    - Chặn đường link nằm trong danh sách đen toàn cầu (Global Phishing/Malware Domain Blacklist).

2. **Lớp 2 - Phân tích ngữ nghĩa tự động (Automated Text/Image Analysis):**
    - Sử dụng webhook kết nối với các mô hình kiểm duyệt (như OpenAI Moderation API hoặc Perspective API) để chấm điểm độ độc hại (Toxicity score) theo thang điểm từ $0.0$ đến $1.0$.
    - Tự động làm mờ (Blur) ảnh nghi vấn chứa nội dung nhạy cảm/NSFW và gắn cảnh báo trước khi cho phép người khác click để xem.

3. **Lớp 3 - Không gian làm việc của Moderator (Mod Queue Dashboard):**
    - Giao diện phân loại báo cáo vi phạm theo mức độ khẩn cấp (dựa trên số lượng report từ cộng đồng).
    - Các hành động nhanh một chạm: Phê duyệt (Dismiss), Ẩn nội dung (Soft Delete), Khóa luồng (Lock Thread), Phạt cấm phát ngôn tạm thời (Mute User: 24h, 7 ngày).

4. **Cơ chế Cấm ngầm (Shadowbanning):**
    - Áp dụng riêng cho các tài khoản chuyên phát tán spam hoặc bot tự động.
    - Khi bị shadowban, người dùng vẫn đăng bài và bình luận bình thường trên giao diện của chính họ, nhưng toàn bộ nội dung này hoàn toàn vô hình đối với tất cả những người dùng khác trong hệ thống. Điều này ngăn chặn việc bot phát hiện nó đã bị khóa để tự tạo tài khoản mới.

---

# Phần 2: Mở rộng phạm vi phân tích (Brainstorming & Discovery) 

1.0 QUẢN TRỊ ĐỊNH DANH, QUYỀN RIÊNG TƯ & VÒNG ĐỜI TÀI KHOẢN (IAM & ACCOUNT LIFECYCLE)

- 1.1 Xử lý phân rã dữ liệu khi xóa tài khoản (The "Right to be Forgotten" & Tree Integrity)
    - 1.1.1 Bài toán phá vỡ cấu trúc thảo luận: Khi người dùng thực hiện xóa vĩnh viễn tài khoản (GDPR compliance), nếu xóa cứng (Hard Delete) bản ghi User, các khóa ngoại (`user_id`) trong bảng Comment và Thread sẽ bị mồ côi (orphaned) hoặc làm sập cấu trúc cây bình luận nếu dùng `ON DELETE CASCADE`.
    - 1.1.2 Chiến lược Tombstone & Ẩn danh hóa (Anonymization):
        - Chuyển `user_id` của toàn bộ bài viết/bình luận sang một tài khoản hệ thống đại diện (`[deleted_user]`).
        - Thay thế nội dung văn bản thành `"Nội dung đã bị xóa bởi tác giả"` nhưng bắt buộc giữ lại node bản ghi và trường `path` để bảo toàn cây phân cấp cho các bình luận con tiếp tục thảo luận.
        - Xóa toàn bộ metadata định danh cá nhân (PII): IP đăng nhập, thiết bị, avatar, bio, liên kết mạng xã hội trong vòng lưu trữ 30 ngày.

- 1.2 Quản trị không gian con (Sub-community / Spaces / Channels Lifecycle)
    - 1.2.1 Kịch bản không gian bị bỏ rơi (Abandoned Communities): Trưởng nhóm (Owner/Top Mod) xóa tài khoản hoặc không hoạt động trên 6 tháng. Cần thuật toán tự động kích hoạt tiến trình chuyển giao quyền lực (Succession Protocol) dựa trên thâm niên và điểm Karma cho Moderator kế cận.
    - 1.2.2 Cơ chế phân quyền phân tán (Federated Governance): Thiết lập hạn mức (Quotas) cho từng Space để ngăn chặn một Moderator lạm quyền tạo hàng loạt webhook, bot tự động hoặc xuất khẩu toàn bộ danh sách thành viên ra ngoài.

- 1.3 Phòng vệ chiếm quyền tài khoản (Account Takeover - ATO) và Đăng nhập bất thường
    - 1.3.1 Phát hiện di chuyển bất khả thi (Impossible Travel Detection): So sánh khoảng cách địa lý và timestamp giữa 2 phiên đăng nhập liên tiếp; tự động hủy phiên và yêu cầu xác thực OTP/Passkey nếu khoảng cách di chuyển vượt quá tốc độ bay thương mại.
    - 1.3.2 Thu hồi phiên tập trung (Global Session Invalidation): Kỹ thuật dùng `token_version` hoặc trường `revocation_timestamp` lưu trên bảng User/Redis. Mỗi khi đổi mật khẩu hoặc phát hiện xâm nhập, chỉ cần tăng giá trị này lên $+1$ để vô hiệu hóa ngay lập tức toàn bộ JWT còn hiệu lực trên mọi thiết bị mà không cần chờ hết hạn `access_token`.

---

2.0 QUẢN TRỊ NỘI DUNG, LỊCH SỬ CHỈNH SỬA & VÒNG ĐỜI TỆP ĐA PHƯƠNG TIỆN (CONTENT & MEDIA LIFECYCLE)

- 2.1 Xử lý tệp mồ côi và rò rỉ chi phí lưu trữ (Orphaned Media Cleanup)
    - 2.1.1 Nguyên nhân: Người dùng kéo thả 10 bức ảnh vào trình soạn thảo Tiptap (Presigned URL đẩy thẳng lên S3/R2 thành công), nhưng sau đó tắt trình duyệt, hủy bỏ việc đăng bài. Các file ảnh này nằm vĩnh viễn trên Storage gây tốn chi phí.
    - 2.1.2 Quy trình dọn dẹp hai giai đoạn (Two-Phase Commit for Media):
        - Đặt trạng thái ban đầu của file khi upload là `status: UNCONFIRMED` kèm thời gian sống (TTL 24 giờ) qua S3 Lifecycle Rule.
        - Chỉ khi người dùng bấm Submit bài viết chính thức, Backend mới chuyển trạng thái file sang `status: ATTACHED` và gắn `thread_id`.
        - Định kỳ chạy Cronjob/Worker quét và xóa các object chưa được xác nhận sau 24h.

- 2.2 Vấn đề "Treo đầu dê bán thịt chó" qua lịch sử chỉnh sửa (Edit Bait-and-Switch)
    - 2.2.1 Nguy cơ lừa đảo: Kẻ gian đăng một bài chia sẻ kiến thức hữu ích để nhận hàng nghìn upvote và lên Top Trending, sau đó chỉnh sửa toàn bộ bài viết thành link lừa đảo (phishing), mã độc hoặc nội dung cờ bạc.
    - 2.2.2 Cơ chế kiểm soát:
        - Bắt buộc lưu trữ lịch sử chỉnh sửa hoàn chỉnh (Diff History) công khai cho cộng đồng kiểm tra.
        - Giới hạn thời gian cho phép chỉnh sửa nội dung bài viết (ví dụ: chỉ cho sửa trong vòng 24 giờ đầu sau khi đăng).
        - Ngưỡng kích hoạt kiểm duyệt lại (Re-moderation Trigger): Nếu bài viết đã đạt trên 500 upvote mà có hành vi chỉnh sửa link hoặc thay đổi quá 30% độ dài văn bản (Levenshtein Distance), bài viết lập tức bị đưa vào hàng đợi kiểm duyệt (Mod Queue) và tạm gỡ khỏi Top Trending.

- 2.3 Phân giải và bộ nhớ đệm thẻ xem trước liên kết (Link Preview & Open Graph Engine)
    - 2.3.1 Tấn công SSRF (Server-Side Request Forgery): Kẻ tấn công đăng link nội bộ (ví dụ: `[http://169.254.169.254](http://169.254.169.254)` hoặc `http://localhost:6379`) để máy chủ fetch dữ liệu metadata, làm lộ thông tin hạ tầng đám mây.
    - 2.3.2 Giải pháp phòng thủ: Triển khai Worker phân giải link trong một môi trường mạng cô lập (Sandbox/VPC riêng), dùng danh sách chặn IP riêng tư (Private IP Ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) và cấu hình Timeout tối đa 3 giây kèm giới hạn kích thước HTML tải về dưới 1MB.

---

3.0 ĐỘNG CƠ BẢNG TIN, CÂY BÌNH LUẬN & BÀI TOÁN TẢI DỮ LIỆU ĐỘNG (FEED & THREAD DEEP ARCHITECTURE)

- 3.1 Sai lệch phân trang trong Bảng tin biến động nhanh (Pagination Drift)
    - 3.1.1 Khuyết tật của Offset Pagination (`LIMIT ... OFFSET ...`): Khi người dùng đang cuộn ở trang 2, có 5 bài viết mới được đăng ở trang 1, khiến toàn bộ danh sách bị đẩy lùi, người dùng bị trùng lặp dữ liệu (Duplicate entries) hoặc bỏ sót bài khi chuyển sang trang 3.
    - 3.1.2 Bắt buộc chuyển đổi sang Phân trang theo con trỏ (Cursor-based Pagination):
        - Sử dụng con trỏ tổng hợp (Composite Cursor) mã hóa dạng Base64: `(score, created_at, id)`.
        - Câu lệnh SQL sử dụng phép so sánh tuple: `WHERE (score, created_at, id) < ($last_score, $last_created_at, $last_id) ORDER BY score DESC, created_at DESC, id DESC LIMIT 20`.

- 3.2 Bài toán khởi động lạnh bảng tin (Cold Start Problem)
    - 3.2.1 Thách thức: Người dùng mới tạo tài khoản, chưa theo dõi bất kỳ ai, chưa tham gia Space nào. Thuật toán Fan-out cá nhân hóa trả về kết quả rỗng.
    - 3.2.2 Chiến lược lấp đầy:
        - Áp dụng thuật toán Multi-Armed Bandit (Explore/Exploit): 70% nội dung hiển thị là các chủ đề có điểm gắn kết cao nhất toàn sàn (Global Hot Topics), 30% là các nội dung ngẫu nhiên thuộc các danh mục khác nhau để thăm dò hành vi click của người dùng mới.

- 3.3 Chi phí tái cấu trúc đường dẫn cây bình luận (Materialized Path Mutations)
    - 3.3.1 Điểm yếu của Materialized Path: Rất tối ưu khi đọc (`SELECT ... WHERE path LIKE '0001.%'`), nhưng cực kỳ tốn kém khi một bình luận cha chứa 500 bình luận con bị xóa hoặc di chuyển sang nhánh khác (Move Subtree), dẫn đến việc phải chạy UPDATE hàng loạt chuỗi path trên DB.
    - 3.3.2 Giải pháp: Cấm tuyệt đối tính năng di chuyển nhánh bình luận (Move thread branch). Thiết lập độ sâu tối đa (ví dụ: tối đa 8 cấp thụt lề); từ cấp thứ 9 trở đi, bắt buộc quy đổi thành flat comment kèm thẻ mention `@username` để tránh tràn kích thước chuỗi indexing của trường `path`.

---

4.0 KINH TẾ DANH TIẾNG, CÂN BẰNG TƯƠNG TÁC & BẢO VỆ PHIẾU BẦU (GAMIFICATION, INTEGRITY & CONCURRENCY)

- 4.1 Điểm nghẽn tranh chấp ghi khi số lượt Vote tăng vọt (Write Lock Contention)
    - 4.1.1 Vấn đề: Một bài viết viral nhận được 5.000 lượt vote/phút. Nếu mỗi request vote đều chạy lệnh `UPDATE threads SET upvotes = upvotes + 1 WHERE id = ...`, cơ sở dữ liệu quan hệ (PostgreSQL) sẽ bị tắc nghẽn hàng đợi khóa dòng (Row-level Lock Contention).
    - 4.1.2 Kiến trúc ghi đệm bất đồng bộ (Write-Behind Cache Buffer):
        - Đẩy toàn bộ thao tác vote vào Redis bằng lệnh nguyên tử: `HINCRBY thread:votes:{id} upvotes 1`.
        - Trả về phản hồi thành công ngay lập tức cho Client.
        - Chạy Worker nền gom nhóm (Batch Flush) mỗi 5-10 giây để đồng bộ số lượng vote tích lũy từ Redis về bảng chính trong PostgreSQL bằng 1 transaction duy nhất.

- 4.2 Kỹ thuật làm mờ số liệu chống Bot phân tích thuật toán (Vote Fuzzing)
    - 4.2.1 Thủ thuật của Spambot: Bot tự động upvote để kiểm tra xem thuật toán chống gian lận của hệ thống đã phát hiện ra tài khoản bot hay chưa (nếu số vote tăng lập tức $\rightarrow$ bot an toàn; nếu không tăng $\rightarrow$ bot đã bị shadowban).
    - 4.2.2 Cơ chế Vote Fuzzing (tương tự kỹ thuật Reddit):
        - Tuyệt đối không hiển thị con số chính xác tuyệt đối trên giao diện công khai khi số vote còn nhỏ.
        - Hệ thống tự động cộng hoặc trừ một giá trị ngẫu nhiên nhỏ (từ $-3$ đến $+3$) trong mỗi lần hiển thị trang. Điều này khiến kẻ tạo bot không thể đo lường chính xác tác động của các tài khoản gian lận.

- 4.3 Phát hiện vòng tròn bình chọn chéo (Sybil Rings & Vote Brigading)
    - 4.3.1 Kịch bản: Một nhóm 20 tài khoản lập hội nhóm kín để liên tục upvote chéo tất cả bài viết của nhau nhằm cày điểm Karma giả tạo để mở khóa đặc quyền.
    - 4.3.2 Phát hiện qua đồ thị tương tác (Graph Analysis): Phân tích mạng lưới tương tác hai chiều; nếu mật độ tương tác giữa một nhóm nút (Cluster) vượt quá 85% tương quan khép kín mà không có tương tác phát tán ra cộng đồng ngoài, thuật toán sẽ gắn cờ "Collusive Behavior" và vô hiệu hóa trọng số tính điểm Karma giữa các tài khoản này.

---

5.0 HẠ TẦNG THỜI GIAN THỰC, ĐỒNG BỘ ĐA THIẾT BỊ & CHỐNG NGHẼN KẾT NỐI (REAL-TIME SCALING)

- 5.1 Cơn bão kết nối lại làm sập máy chủ (Reconnection Storms / Thundering Herd)
    - 5.1.1 Nguy cơ: Sự cố mạng ngắn hạn hoặc khởi động lại cụm WebSocket/SSE server khiến 50.000 trình duyệt cùng lúc thực hiện bắt tay lại (Handshake) và gọi API lấy lại toàn bộ danh sách thông báo chưa đọc.
    - 5.1.2 Kiến trúc phòng thủ:
        - Bắt buộc cài đặt thuật toán **Exponential Backoff kết hợp Jitter (độ trễ ngẫu nhiên)** ở phía client React: Thời gian chờ thử lại $= \min(\text{cap}, \text{base} \times 2^{\text{attempt}}) \pm \text{random\_jitter}$.
        - Khởi tạo cổng kiểm soát lưu lượng (Admission Control / Rate Limiting) tại tầng Reverse Proxy (NGINX/Envoy) cho các endpoint kết nối socket.

- 5.2 Đồng bộ trạng thái đã đọc trên đa thiết bị (Multi-Device Read-State Sync)
    - 5.2.1 Trải nghiệm đứt gãy: Người dùng đọc hết thông báo trên điện thoại, nhưng khi mở máy tính làm việc, icon chuông vẫn hiển thị con số `99+` thông báo chưa đọc do cơ chế cache cục bộ không nhận được tín hiệu.
    - 5.2.2 Kiến trúc đồng bộ con trỏ đọc (Read Watermark Architecture):
        - Không lưu trạng thái `is_read` dạng boolean trên từng dòng thông báo (gây phình to DB).
        - Lưu một trường duy nhất `last_read_notification_id` (dạng con trỏ thời gian hoặc UUID có tính thứ tự) trên bảng User.
        - Mọi thông báo có `id <= last_read_notification_id` tự động được coi là đã đọc. Khi người dùng mở xem trên một thiết bị, gửi một sự kiện WebSocket nhẹ đồng bộ `watermark` mới này tới toàn bộ các phiên client còn lại.

---

6.0 QUẢN TRỊ CỘNG ĐỒNG NÂNG CAO, PHÁP LÝ & CƠ CHẾ KHẨN CẤP (GOVERNANCE & EMERGENCY)

- 6.1 Cơ chế kiểm soát khủng hoảng (Emergency Lockdown & Slow Mode)
    - 6.1.1 Khi xảy ra tranh cãi độc hại hoặc bị tấn công dồn dập (Brigading/Raiding) vào một chủ đề nhạy cảm:
    - 6.1.2 Công cụ can thiệp tức thời dành cho Moderator:
        - Chế độ "Chậm" (Slow Mode): Ép buộc khoảng cách giữa 2 lần bình luận của 1 thành viên trong thread tối thiểu là 5 phút.
        - Chế độ "Đóng băng" (Thread Freezing): Vẫn cho phép đọc nhưng khóa hoàn toàn tính năng bình luận và vote.
        - Thiết lập rào cản Karma động (Dynamic Karma Gate): Chỉ những thành viên có tuổi đời trên 30 ngày và điểm Karma trong Space đó lớn hơn 100 mới được quyền gửi bài thảo luận.

- 6.2 Luồng xử lý kháng cáo ẩn danh hai chiều (Anonymous Appeals Workflow)
    - 6.2.1 Bảo vệ Moderator khỏi bị trả thù cá nhân: Khi một người dùng bị cấm (Banned), họ thường có xu hướng tìm thông tin cá nhân của Moderator đã ban mình để quấy rối (Doxxing).
    - 6.2.2 Luồng kỹ thuật: Toàn bộ trao đổi giữa người vi phạm và ban quản trị trong hệ thống vé kháng cáo (Appeals Ticket) phải được ẩn danh hóa. Moderator phản hồi dưới danh nghĩa chung của tổ chức (`[Space Mod Team]`), hệ thống che giấu toàn bộ danh tính của cá nhân thực hiện thao tác xử phạt.

- 6.3 Lưu trữ bằng chứng pháp lý đối với nội dung vi phạm (Audit Trail & Legal Hold)
    - 6.3.1 Mâu thuẫn pháp lý: Khi phát hiện nội dung vi phạm nghiêm trọng (lừa đảo, đe dọa bạo lực), Moderator cần xóa ngay khỏi giao diện để tránh lan truyền, nhưng cơ quan pháp luật có thể yêu cầu trích xuất dữ liệu gốc kèm địa chỉ IP và dấu vết thiết bị.
    - 6.3.2 Kiến trúc lưu trữ bất biến (Immutable Audit Log):
        - Khi một nội dung bị xóa bởi Moderator, toàn bộ dữ liệu thô (Raw Payload) cùng metadata liên quan được chuyển vào một vùng lưu trữ chỉ ghi (Append-only Table / WORM Storage: Write Once, Read Many).
        - Dữ liệu này không thể bị sửa hoặc xóa bởi bất kỳ ai (kể cả Super Admin) trong thời hạn bảo lưu bắt buộc (thường từ 1 đến 2 năm tùy quy định pháp lý sở tại).

---

# 3. NGĂN XẾP CÔNG NGHỆ ĐỀ XUẤT (TECH STACK)

---

#### 3.1. Ma trận công nghệ tổng thể

Hệ thống được thiết kế theo mô hình **Tối ưu hóa Chi phí - Băng thông (Zero-Egress Cost)** và **I/O Đồng thời cao (High-Concurrency)**:

```text
[Trình duyệt / Thiết bị Di động]
               │
               ▼
   [Cloudflare Edge Network] ──(DDoS, WAF, DNS, CDN Cache)
               │
       ┌───────┴───────────────────────────────────────┐
       ▼                                               ▼
[Frontend: Next.js (App Router)]               [Media: Cloudflare R2]
(RSC, SSR, Edge Caching)                       (Zero Egress Fee, S3 Compatible)
       │
       ├─── (REST API / GraphQL) ──┐
       │                           │
       └─── (SSE / WebSocket) ─────┼──┐
                                   │  │
                                   ▼  ▼
                     [Core Backend: Go (Fiber / Gin)]
                     (Gọn nhẹ, Non-blocking I/O, Concurrency cao)
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
[PostgreSQL 16+]            [Redis Cluster 7+]          [Meilisearch]
(ACID, Relational, JSONB)   (Cache, Pub/Sub, ZSET)      (Instant Search <50ms)
       │                           │
       └─────────────┬─────────────┘
                     ▼
          [Async Worker: Asynq / BullMQ]
          (Notification, Karma, Moderation, Media Cleanup)
```

---

| Tầng kiến trúc | Công nghệ lựa chọn | Giải pháp thay thế cân nhắc | Lý do chọn công nghệ ưu tiên |
| --- | --- | --- | --- |
| **Frontend Framework** | **Next.js 15+ (App Router)** | Remix / Vite SPA | Tận dụng React Server Components (RSC) giảm 0 KB bundle cho trang đọc; tối ưu hóa SEO với Incremental Static Regeneration (ISR). |
| **Styling & UI Kit** | **Tailwind CSS v4 + shadcn/ui** | Chakra UI / MUI | Zero runtime CSS; mã nguồn component nằm trong dự án dễ tùy biến sâu; chuẩn a11y không phụ thuộc gói npm nặng. |
| **Core API Backend** | **Go (Fiber / Gin)** | Node.js (NestJS) / Python | Tiêu thụ RAM cực thấp (~30MB/service so với ~300MB của Node.js); Goroutines xử lý hàng trăm nghìn kết nối đồng thời và polling/websocket mượt mà. |
| **Relational Database** | **PostgreSQL 16+** | MySQL / MongoDB | Hỗ trợ kiểu dữ liệu `JSONB` linh hoạt; hỗ trợ indexing GiST/GIN mạnh mẽ; xử lý giao dịch ACID chuẩn xác cho hệ thống điểm Karma và phiếu bầu. |
| **In-Memory & Cache** | **Redis 7+** | KeyDB / Memcached | Cấu trúc dữ liệu đa dạng (ZSET cho bảng xếp hạng trending, Hashes cho session, Streams cho hàng đợi); tích hợp sẵn Pub/Sub. |
| **Search Engine** | **Meilisearch** | Elasticsearch / Typesense | Cấu hình zero-maintenance; tiêu tốn ít RAM hơn Elasticsearch (vốn cần 4–8GB JVM); hỗ trợ typo-tolerance và tìm kiếm tức thì theo tiền tố (prefix search). |
| **Object Storage** | **Cloudflare R2** | AWS S3 | Tương thích hoàn toàn S3 API nhưng **miễn phí 100% cước băng thông tải ra (Egress Fees)** — tối ưu sống còn cho nền tảng mạng xã hội nhiều hình ảnh. |
| **Background Jobs** | **Asynq (Go) / BullMQ (Node)** | Celery / RabbitMQ | Tận dụng hạ tầng Redis sẵn có mà không cần dựng thêm cụm RabbitMQ/Kafka phức tạp ở giai đoạn đầu; hỗ trợ delay queue, retry backoff và priority. |

---

#### 3.2. Chi tiết tầng Frontend (Client & Edge Runtime)

Tầng Frontend chịu trách nhiệm hiển thị giao diện với First Contentful Paint (FCP) dưới 0.8s và đảm bảo tính nhất quán của trạng thái tương tác.

##### Ngăn xếp chi tiết

- **Runtime Core:** **React 19** trên **Next.js (App Router)**, viết bằng **TypeScript** ở chế độ `strict: true`.
- **Quản trị Dữ liệu từ Server (Server State):** **TanStack Query v5**.
    - Quản lý bộ nhớ đệm client, deduplication các request trùng lặp.
    - Hỗ trợ API `useInfiniteQuery` tích hợp sẵn con trỏ `cursor` để xử lý Infinite Scroll.
    - Xử lý cơ chế `optimistic updates` và `rollback` khi mạng chập chờn.

- **Quản trị Trạng thái Cục bộ (Client UI State):** **Zustand**.
    - Lưu trữ các trạng thái giao diện: bật/tắt drawer mobile, popover thông báo, draft nội dung chưa gửi.
    - Tích hợp middleware `persist` tự động đồng bộ xuống `localStorage`.

- **Trình soạn thảo văn bản (Editor):** **Tiptap (ProseMirror Toolkit)**.
    - Tải lười (Lazy load) qua `next/dynamic` để không làm phình First Load JS.
    - Cấu hình Extension tùy chỉnh: `@mention`, Code Block Lowlight, Task List, Auto-embed YouTube/X.

- **Ảo hóa danh sách (Virtualization):** **@tanstack/react-virtual**.
    - Xử lý DOM cho cây bình luận và Bảng tin (Feed) dài hàng nghìn phần tử với chiều cao động (dynamic item height).

---

#### 3.3. Chi tiết tầng Backend & Giao thức Mạng (API & Realtime)

Thay vì microservices phân mảnh quá sớm gây phức tạp khâu vận hành, đề xuất áp dụng **Modular Monolith bằng Go**, phân tách rõ ràng ranh giới nghiệp vụ (domain boundaries) qua Go modules.

##### Cấu trúc dịch vụ Backend

- **Web Framework:** **Go Fiber** (dựa trên `fasthttp`) hoặc **Gin**. Fiber cung cấp cú pháp tương tự Express (dễ tiếp cận) nhưng đạt hiệu năng hàng trăm nghìn request/giây trên một máy chủ đơn lẻ.
- **ORM & Database Driver:** **sqlc** hoặc **GORM**.
    - *Khuyến nghị:* **sqlc** (viết SQL thuần, tự sinh ra Go code an toàn kiểu dữ liệu). Tránh các hạn chế về hiệu năng và các câu truy vấn ẩn (N+1 queries) của các ORM truyền thống.

- **Giao thức truyền thông API:**
    - **RESTful JSON API:** Dùng cho toàn bộ các thao tác CRUD cơ bản, tuân thủ chuẩn JSON:API hoặc OpenAPI Spec 3.0 để sinh tự động Client SDK cho Frontend bằng `openapi-typescript`.
    - **Server-Sent Events (SSE):** Dùng để đẩy thông báo hệ thống (Notification Feed), số lượng vote thay đổi, và số người đang online trong một bài viết.
    - **WebSocket (Gorilla WebSocket / Fiber WebSocket):** Dành riêng cho kênh trò chuyện trực tiếp (Direct Message) và phòng thảo luận trực tiếp (Live Thread/Chat room).

---

#### 3.4. Chi tiết tầng Lưu trữ, Dữ liệu & Bộ nhớ đệm (Persistence & Cache)

Hệ sinh thái lưu trữ được phân tầng để phục vụ các mục đích truy vấn đặc thù:

```text
[PostgreSQL 16+]              [Redis 7+]                    [Meilisearch]
(Source of Truth)             (Transient State & Caching)   (Read-Only Search View)
 ├── users                     ├── user:session:{token}      ├── index: threads
 ├── spaces / channels         ├── thread:votes:{id}         │    ├── title
 ├── threads                   ├── feed:trending (ZSET)      │    ├── content_text
 ├── comments (path ltree)     ├── ratelimit:{ip}:{action}   │    └── tags
 └── reputation_logs           └── notifications:stream      └── index: users
```

---

##### PostgreSQL 16+ (Hệ quản trị CSDL Quan hệ)

- **Khai thác tiện ích mở rộng (Extensions):**
    - `ltree`: Tối ưu hóa cấu trúc đường dẫn cây cho bình luận lồng nhau (Materialized Path). Cho phép đánh chỉ mục B-tree trên cấu trúc phân cấp, tăng tốc độ truy vấn cây con lên gấp nhiều lần so với kiểu chuỗi text thông thường.
    - `pg_trgm`: Hỗ trợ tìm kiếm mờ (fuzzy search) cho username và tag cơ bản ngay trên DB chính.

- **Phân vùng bảng (Table Partitioning):**
    - Thực hiện phân vùng theo thời gian (Partition by Range trên trường `created_at`) cho các bảng dữ liệu khổng lồ: `notifications`, `reputation_logs`, `votes`.

##### Redis 7+ (Bộ nhớ đệm & Đồng bộ phân tán)

- **Xếp hạng Hot Topics (Sorted Sets):**
    - Sử dụng cấu trúc `ZSET` với `score` là điểm nóng tính theo thuật toán suy giảm thời gian. Truy vấn Top 50 bài viết thịnh hành chỉ mất độ phức tạp thời gian $\mathcal{O}(\log(N) + M)$.

- **Bộ đếm nguyên tử (Atomic Counters):**
    - Gom lượt view và vote bằng `HINCRBY` để giải tỏa áp lực khóa dòng (Row-level lock) của PostgreSQL.

- **Khóa phân tán (Distributed Locks):**
    - Sử dụng Redlock để bảo vệ các thao tác nhạy cảm: chuyển giao quyền quản trị Space, xử lý nhận thưởng/huy hiệu.

##### Meilisearch (Động cơ Tìm kiếm Toàn văn)

- Cơ chế đồng bộ: Khi một bài viết được tạo/sửa trên PostgreSQL, một event bất đồng bộ được đẩy qua hàng đợi để cập nhật sang Meilisearch.
- Tính năng: Chấp nhận gõ sai chính tả (Typo tolerance), tìm kiếm tức thì khi đang gõ (Search-as-you-type), lọc theo danh mục (`filter: space_id = 'tech' AND is_locked = false`).

---

#### 3.5. Hạ tầng Tệp đa phương tiện & Mạng phân phối (Media & CDN)

Hạ tầng xử lý file được thiết kế theo nguyên tắc: **Máy chủ ứng dụng không bao giờ chạm vào dòng dữ liệu nhị phân (Binary Stream) của file.**

```text
[Client] ──1. Request Presigned URL──> [Go API Server]
   │                                         │ (Sinh URL có chữ ký HMAC, TTL: 5m)
   │<──2. Trả về Upload Endpoint URL────────┘
   │
   ├──3. Upload ảnh trực tiếp (HTTP PUT)──> [Cloudflare R2 Bucket]
                                                    │
                                                    ▼ (Kích hoạt R2 Event Notification)
                                            [Worker: Sharp Service]
                                            - Quét mã độc / magic bytes
                                            - Nén định dạng WebP/AVIF
                                            - Sinh các kích thước: thumb, medium, raw
```

---

- **Xử lý ảnh On-the-fly:** Kết hợp Cloudflare Image Resizing hoặc dựng một cụm service micro nhỏ bằng **Sharp (Node.js)** hoặc **bimg (libvips trên Go)** nằm sau CDN. Ảnh tải lên chỉ lưu file gốc, các biến thể kích thước (kèm watermark nếu cần) được sinh tự động và cache tĩnh tại tầng Edge CDN trong lần gọi đầu tiên.

---

#### 3.6. Tầng Hạ tầng, Vận hành & Giám sát (DevOps & Observability)

##### Môi trường triển khai (Deployment Architecture)

- **Containerization:** Toàn bộ dịch vụ Backend, Worker, Search Engine được đóng gói qua **Docker Multi-stage Build** (Go binary cuối cùng chạy trên image `scratch` hoặc `alpine` chỉ nặng ~15-25MB).
- **Điều phối & Hạ tầng (Orchestration):**
    - *Giai đoạn đầu / Tầm trung:* Triển khai trên **Hetzner Cloud / AWS EC2** quản lý qua **Docker Swarm** hoặc cụm **Nomad / K3s (Lightweight Kubernetes)** để tiết kiệm tối đa chi phí quản trị cụm.
    - *Frontend:* Đặt trên **Vercel** (thuận tiện cho Next.js) hoặc tự host bằng **Node.js standalone container** đặt sau Nginx/Cloudflare để làm chủ hoàn toàn đường truyền và không bị giới hạn thời gian chạy Serverless Function.

##### Hệ thống Giám sát & Đo kiểm (Observability Stack)

- **Thu thập Số liệu (Metrics):** **Prometheus** định kỳ cào số liệu từ các endpoint `/metrics` của Go API, Redis exporter và PostgreSQL exporter.
- **Trực quan hóa (Dashboard):** **Grafana** hiển thị biểu đồ: Tỉ lệ lỗi HTTP 5xx, độ trễ API P95/P99, số kết nối WebSocket active, dung lượng hàng đợi Worker.
- **Ghi nhật ký (Logging):** **Vector** gom log từ Docker containers $\rightarrow$ đẩy về cụm **Grafana Loki** (nhẹ hơn ELK stack rất nhiều).
- **Theo dõi lỗi (Error Tracking):** **Sentry** tích hợp ở cả 2 đầu: Bắt unhandled exceptions tại React Client và gom panic/stack-trace tại Go Backend.

---

# Phần 3: Mở rộng phạm vi phân tích (Brainstorming & Discovery)

1.0 KIẾN TRÚC RUNTIME, TỰ HOST & CẠM BẪY TÍCH HỢP (FRONTEND & GATEWAY RUNTIME)

- 1.1 Cạm bẫy tự lưu trữ Next.js trên cụm đa máy chủ (Next.js Multi-Pod Self-Hosting)
    - 1.1.1 Hiện tượng phân mảnh bộ nhớ đệm (Cache Drift): Khi triển khai Next.js bằng Docker container trên cụm Kubernetes/Nomad, cơ chế Incremental Static Regeneration (ISR) và Data Cache mặc định lưu trên ổ đĩa cục bộ (Local File System) của từng Pod. Khi một bài viết được revalidate, chỉ Pod nhận request cập nhật HTML mới, các Pod còn lại tiếp tục trả về dữ liệu cũ, khiến người dùng F5 nhận được 2 phiên bản giao diện khác nhau.
    - 1.1.2 Bắt buộc tích hợp Custom Cache Handler: Phải cấu hình `@neshca/cache-handler` trỏ thẳng về cụm Redis tập trung để toàn bộ các bản sao Next.js dùng chung một kho lưu trữ ISR tĩnh và Tags Revalidation.

- 1.2 Điểm nghẽn đệm proxy đối với truyền dữ liệu trực tiếp (SSE / Streaming Buffering)
    - 1.2.1 Vấn đề đọng gói tin: NGINX, Cloudflare Proxy hoặc các Ingress Controller mặc định bật cơ chế đệm phản hồi (Response Buffering) để nén dữ liệu (Gzip/Brotli). Điều này khiến các sự kiện Server-Sent Events (SSE) hoặc các luồng React Server Components (RSC) Streaming bị giữ lại thành khối lớn thay vì đẩy tức thì (chunk-by-chunk) về trình duyệt.
    - 1.2.2 Cấu hình bắt buộc: Bổ sung header `X-Accel-Buffering: no` và `Content-Encoding: none` trên toàn bộ các route phục vụ stream; cấu hình tắt proxy buffering cho các path realtime tại API Gateway.

- 1.3 Giới hạn giao thức của fasthttp trên Go Fiber
    - 1.3.1 Fiber xây dựng trên engine `fasthttp` nhằm tối ưu tốc độ và cấp phát bộ nhớ (Zero Memory Allocation), nhưng không tuân thủ hoàn toàn chuẩn `net/http` của Go chuẩn.
    - 1.3.2 Rủi ro tích hợp: Không hỗ trợ native HTTP/2 Server Push, hạn chế khi xử lý gRPC chung port, và xung đột với một số middleware chuẩn của hệ sinh thái Go (vốn viết cho `http.Handler`). Cần đánh giá kỹ nếu hệ thống yêu cầu HTTP/3 hoặc gRPC streaming hai chiều; phương án an toàn thay thế là Gin hoặc Echo (dựa trên `net/http` chuẩn).

---

2.0 ĐỘNG CƠ BACKEND GO, ĐỒNG THỜI & QUẢN TRỊ KẾT NỐI (GO RUNTIME & RESOURCE SATURATION)

- 2.1 Cạn kiệt kết nối cơ sở dữ liệu quan hệ (Database Connection Exhaustion)
    - 2.1.1 Bài toán: Go có khả năng mở hàng chục nghìn Goroutines phục vụ request đồng thời trong tích tắc. Nếu mỗi Goroutine mở hoặc chiếm giữ một kết nối từ pool `sql.DB`, hàng đợi kết nối của PostgreSQL (`max_connections`, thường mặc định là 100-200) sẽ sập lập tức với lỗi `sorry, too many clients already`.
    - 2.1.2 Bắt buộc chèn lớp Connection Pooling trung gian: Triển khai **PgBouncer** hoặc **Supavisor** chạy ở chế độ `Transaction Pooling`. Giới hạn `SetMaxOpenConns` tại mỗi instance Go ở mức thấp (20–30 kết nối) và sử dụng PgBouncer để gom hàng nghìn phiên ứng dụng vào một số lượng kết nối thực tế nhỏ hơn tới PostgreSQL.

- 2.2 Xung đột giữa Prepared Statements và Connection Pooler
    - 2.2.1 Khi sử dụng thư viện `sqlc` ở chế độ Prepared Statements (`db.Prepare()`), câu lệnh SQL được lưu cache trên một kết nối vật lý cụ thể của PostgreSQL.
    - 2.2.2 Rủi ro: Trong mô hình PgBouncer chạy Transaction Pooling, mỗi câu query trong cùng một ứng dụng có thể bị điều hướng sang một kết nối vật lý khác nhau, gây lỗi nghiêm trọng `prepared statement "..." does not exist`. Phải cấu hình `sqlc` chạy ở chế độ Query thông thường hoặc cấu hình PgBouncer tương thích với Named Prepared Statements.

- 2.3 Rò rỉ tiểu trình ngầm (Goroutine Leaks)
    - 2.3.1 Xảy ra khi xử lý các kết nối WebSocket hoặc hàng đợi Worker nền: Goroutine bị treo vô hạn do đọc/ghi vào unbuffered channel mà không có receiver, hoặc thực hiện gọi HTTP ra ngoài (gọi Open Graph scraper, gọi Moderation API) mà thiếu thiết lập `http.Client.Timeout`.
    - 2.3.2 Bắt buộc: Truyền `context.Context` có gán `context.WithTimeout()` hoặc `context.WithCancel()` xuyên suốt mọi tầng logic từ Controller $\rightarrow$ Service $\rightarrow$ Repository; tích hợp `pprof` endpoint được bảo vệ để soi goroutine stack trace theo chu kỳ.

---

3.0 GIỚI HẠN DỮ LIỆU & LƯU TRỮ PHÂN CẤP (POSTGRESQL SCALE & LTREE DEEP DIVE)

- 3.1 Ngưỡng tới hạn và suy hao hiệu năng của tiện ích `ltree`
    - 3.1.1 Giới hạn vật lý: Một nhãn (label) trong `ltree` bị giới hạn tối đa 256 bytes và một đường dẫn đầy đủ không được vượt quá 65.535 nhãn.
    - 3.1.2 Suy thoái chỉ mục GiST (GiST Index Degradation): Khi dữ liệu bình luận vượt qua ngưỡng hàng chục triệu bản ghi, chỉ mục GiST trên trường `path` bắt đầu phình to và tốc độ ghi mới (INSERT comment) giảm mạnh do chi phí tái cân bằng cây chỉ mục. Phải định kỳ thực hiện `REINDEX INDEX CONCURRENTLY` hoặc kết hợp phân vùng dữ liệu (Partitioning) theo `thread_id` hoặc theo năm.

- 3.2 Hiện tượng phình bảng do cập nhật điểm số tần suất cao (Table Bloat & MVCC)
    - 3.2.1 PostgreSQL sử dụng mô hình MVCC: Mỗi lệnh `UPDATE` trên bảng `threads` (để cập nhật số vote, view, số comment) không ghi đè dữ liệu mà tạo ra một dòng mới (Tuple) và đánh dấu dòng cũ là "Dead Tuple".
    - 3.2.2 Hệ quả: Tần suất vote cao khiến bảng phình to nhanh chóng (Table Bloat), làm chậm toàn bộ các truy vấn quét bảng (Sequential Scans) và vắt kiệt I/O đĩa cứng để chạy tiến trình ngầm `autovacuum`.
    - 3.2.3 Giải pháp kỹ thuật: Tuyệt đối không lưu các chỉ số biến động liên tục này trực tiếp trên bảng `threads`. Cô lập chúng sang bảng riêng biệt tỉ lệ 1-1 (`thread_counters`) có bật chế độ fillfactor thấp (`WITH (fillfactor = 70)`) để kích hoạt cơ chế HOT (Heap-Only Tuples), giảm thiểu việc cập nhật chỉ mục.

- 3.3 Bài toán di chuyển dữ liệu lớn sang Cold Storage (Data Tiering)
    - 3.3.1 Sau 1-2 năm, các thông báo cũ, log danh tiếng (Karma audit logs), và các bài thảo luận đã đóng từ lâu chiếm tới 80% dung lượng ổ đĩa SSD đắt đỏ.
    - 3.3.2 Cần thiết lập: Cơ chế Partitioning theo tháng/năm; các partition cũ hơn 12 tháng được detach và nén sang định dạng chỉ đọc (hoặc chuyển vùng lưu trữ sang S3/Parquet phục vụ mục đích phân tích thông qua DuckDB/ClickHouse).

---

4.0 CẤU TRÚC BỘ NHỚ ĐỆM & RỦI RO PHỤ THUỘC REDIS (REDIS TOPOLOGY & QUEUES)

- 4.1 Cạm bẫy dùng chung Redis cho cả Cache và State (Cache vs Queue Collisions)
    - 4.1.1 Sai lầm kiến trúc phổ biến: Sử dụng cùng 1 instance/cụm Redis duy nhất để vừa lưu Cache tạm thời (bài viết trending, HTML fragment), vừa lưu Trạng thái bền vững (Session token, Job queue của BullMQ/Asynq, Rate limit counter).
    - 4.1.2 Hậu quả thảm khốc: Khi lượng truy cập tăng vọt, Cache đẩy dung lượng RAM chạm ngưỡng `maxmemory`. Nếu cấu hình thuật toán thu hồi bộ nhớ `maxmemory-policy: allkeys-lru`, Redis sẽ tự động **xóa luôn các Job đang chờ xử lý trong Queue hoặc xóa phiên đăng nhập của người dùng**. Nếu cấu hình `noeviction`, Redis từ chối mọi thao tác ghi mới, làm tê liệt cả hệ thống hàng đợi.
    - 4.1.3 Nguyên tắc bắt buộc: Tách biệt vật lý thành ít nhất 2 cụm Redis độc lập:
        - *Redis Instance 1 (Volatile Cache):* Chạy `allkeys-lru`, sẵn sàng mất dữ liệu khi đầy RAM.
        - *Redis Instance 2 (Persistent State / Queues):* Bật cơ chế sao lưu AOF (Append Only File) mỗi giây (`appendfsync everysec`), tắt hoàn toàn eviction (`noeviction`).

- 4.2 Giới hạn giao dịch đa khóa trong cụm phân tán (Redis Cluster Cross-Slot Errors)
    - 4.2.1 Khi mở rộng từ Redis đơn sang Redis Cluster (nhiều master nodes), các lệnh liên quan đến nhiều key cùng lúc (MGET, Pipeline, Multi-exec, Lua scripts) sẽ văng lỗi `CROSSSLOT Keys in request don't hash to the same slot` nếu các key này không nằm trên cùng một node vật lý.
    - 4.2.2 Quy chuẩn đặt tên Key: Bắt buộc sử dụng Hash Tags `{...}` cho các dữ liệu phụ thuộc lẫn nhau. Ví dụ: Toàn bộ thông tin liên quan đến thread 123 phải có tiền tố `{thread:123}:votes`, `{thread:123}:metadata` để ép buộc Redis Cluster băm chúng vào cùng một Hash Slot.

---

5.0 GIỚI HẠN VẬN HÀNH TÌM KIẾM & XỬ LÝ ĐA PHƯƠNG TIỆN (MEILISEARCH & MEDIA PIPELINE)

- 5.1 Giới hạn bộ nhớ ảo và tài nguyên của Meilisearch (LMDB Limits)
    - 5.1.1 Meilisearch sử dụng cơ sở dữ liệu nhúng LMDB dựa trên Memory-mapped files (mmap). Khi lượng văn bản và bài viết tăng lên, Meilisearch yêu cầu dung lượng bộ nhớ ảo (Virtual Memory) rất lớn. Nếu máy chủ thiếu RAM hoặc dung lượng swap không đủ, tiến trình Meilisearch sẽ bị hệ điều hành tắt đột ngột (OOM Killer) trong quá trình Re-indexing.
    - 5.1.2 Đánh giá quy mô: Meilisearch hoạt động cực tốt cho tập dữ liệu dưới 10-20 triệu tài liệu. Nếu định hướng diễn đàn đạt quy mô hàng chục triệu bài viết đa ngôn ngữ, cần chuẩn bị sẵn lộ trình di chuyển sang Elasticsearch hoặc Typesense (hỗ trợ phân cụm phân tán High Availability thực sự mà không bị bó hẹp trong một node đơn lẻ).

- 5.2 Rủi ro xử lý ảnh và tấn công tệp nén (Decompression Bomb / Pixel Flood)
    - 5.2.1 Kẻ tấn công tạo một file ảnh kích thước tệp nén chỉ vài KB (ví dụ 10KB) nhưng khi bung ra trong RAM để xử lý (thông qua Sharp/libvips) lại có độ phân giải $50.000 \times 50.000$ pixels.
    - 5.2.2 Hậu quả: Worker xử lý ảnh lập tức tràn bộ nhớ RAM (chiếm hàng GB), làm nghẽn toàn bộ hàng đợi xử lý media của các người dùng bình thường khác.
    - 5.2.3 Lớp kiểm soát: Phải đọc metadata header của ảnh trước khi nạp vào buffer giải nén; từ chối xử lý ngay lập tức nếu tổng số pixels (`width * height`) vượt quá ngưỡng an toàn (ví dụ: giới hạn tối đa 40 Megapixels).

- 5.3 Nguy cơ cạn kiệt hạn ngạch thao tác lưu trữ (Object Storage Operation Limits)
    - 5.3.1 Dù Cloudflare R2 miễn phí băng thông tải ra (Egress Fees), nhưng vẫn áp dụng tính phí hoặc giới hạn tần suất cho **Class A Operations** (các lệnh ghi, liệt kê: PUT, POST, LIST).
    - 5.3.2 Lỗi thiết kế: Nếu hệ thống định kỳ gọi lệnh `s3.ListObjectsV2` để quét tìm ảnh mồ côi (Orphaned images) trên toàn bộ bucket chứa hàng triệu file, chi phí và thời gian thực thi sẽ tăng phi mã. Việc theo dõi file mồ côi bắt buộc phải thực hiện dựa trên cơ sở dữ liệu quan hệ (PostgreSQL metadata), tuyệt đối không dùng thao tác duyệt trực tiếp trên bucket lưu trữ.

---

6.0 CHI PHÍ ẨN, QUAN SÁT HỆ THỐNG & ĐỘ PHỨC TẠP VẬN HÀNH (DEVOPS & OBSERVABILITY)

- 6.1 Bùng nổ số lượng nhãn làm sập hệ thống log (Loki Cardinality Explosion)
    - 6.1.1 Khác với Elasticsearch đánh chỉ mục toàn văn bản, Grafana Loki chỉ đánh chỉ mục trên các nhãn siêu dữ liệu (Labels).
    - 6.1.2 Sai lầm chết người: Gắn các trường có tính biến thiên vô hạn (High Cardinality) như `user_id`, `ip_address`, `thread_id` vào nhãn của dòng log (`labels: { user_id: "12345" }`). Điều này tạo ra hàng triệu Streams trong Loki, vắt kiệt RAM của cụm theo dõi và làm sập toàn bộ dịch vụ giám sát.
    - 6.1.3 Chuẩn mực: Chỉ đánh label cho môi trường tĩnh (`env: prod`, `service: go-api`, `level: error`); toàn bộ thông tin `user_id`, `ip` phải để trong phần thân nội dung của log (Log Message) và sử dụng LogQL để lọc khi cần truy vết.

- 6.2 Độ trễ lưu trữ phân tán cho Database trên cụm K3s (Persistent Storage Latency)
    - 6.2.1 Khi tự dựng cụm K3s/Kubernetes, việc chạy PostgreSQL bên trong Kubernetes yêu cầu một giải pháp lưu trữ phân tán qua mạng (Distributed Storage như Longhorn, Rook-Ceph).
    - 6.2.2 Vấn đề I/O: Lưu trữ phân tán qua mạng tạo ra độ trễ ghi đĩa (I/O Latency) cao hơn gấp 5–10 lần so với việc ghi trực tiếp lên ổ cứng NVMe gắn cục bộ của máy chủ vật lý, biến PostgreSQL thành điểm nghẽn hiệu năng nghiêm trọng nhất của toàn sàn.
    - 6.2.3 Kiến trúc tối ưu: Tách riêng Stateful Services (PostgreSQL, Redis chính) chạy trực tiếp trên các Bare-Metal / Compute instances chuyên biệt gắn ổ NVMe cục bộ; chỉ đưa Stateless Services (Next.js, Go API, Background Workers) lên cụm container K3s.

---

# 4. CÁC THÁCH THỨC KỸ THUẬT LỚN & PHƯƠNG ÁN XỬ LÝ

---

#### 4.1. Bài toán Mở rộng Bảng tin (Feed Fan-out Architecture at Scale)

Khi cộng đồng đạt quy mô hàng trăm nghìn người dùng, việc phân phối bài viết từ người theo dõi (Followers) hoặc các Không gian (Spaces) tới bảng tin cá nhân (Timeline) trở thành điểm nghẽn nghiêm trọng nhất về thông lượng I/O.

```text
[Người dùng tạo Bài viết mới]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
         [Tác giả thông thường]                              [Tác giả nổi tiếng / KOL]
          (Followers < 25.000)                                (Followers ≥ 25.000)
                      │                                               │
                      ▼                                               ▼
          [Fan-out on WRITE (Push)]                        [Fan-out on READ (Pull)]
         - Worker quét danh sách follower                 - Không ghi vào feed follower
         - Đẩy Post ID vào Redis Timeline                 - Lưu bài trực tiếp vào Author Timeline
           của từng follower: `ZADD feed:{uid}`                          │
                      │                                               │
                      └───────────────────────┬───────────────────────┘
                                              ▼
                                 [Người dùng mở Ứng dụng]
                                              │
                                              ▼
                                   [Dynamic Feed Merger]
                   - Lấy 500 bài từ Feed Redis cá nhân (Push)
                   - Query thêm bài từ các KOLs đang theo dõi (Pull)
                   - Hợp nhất và sắp xếp theo Timeline/Score bằng K-Way Merge
```

---

##### Phân tích hai mô hình kinh điển

- **Fan-out on Write (Push):** Bài viết mới được sao chép ID vào hộp thư (Inbox/Timeline) của toàn bộ người theo dõi ngay khi đăng.
    - *Hạn chế:* Gây bùng nổ tài nguyên ghi (Write Amplification). Nếu một tài khoản có 500.000 followers đăng bài, hệ thống phải kích hoạt 500.000 tác vụ ghi vào cơ sở dữ liệu/Redis.

- **Fan-out on Read (Pull):** Không nhân bản dữ liệu khi đăng bài. Khi người dùng mở app, hệ thống mới truy vấn các bài viết mới nhất từ tất cả những người họ đang theo dõi và tổng hợp lại.
    - *Hạn chế:* Gây nghẽn CPU và Database I/O khi người dùng theo dõi hàng trăm tài khoản khác nhau; độ trễ tải trang tăng vọt.

##### Phương án giải quyết: Kiến trúc Lai phân tầng (Hybrid Fan-out)

1. **Phân loại tác giả theo ngưỡng theo dõi (Follower Threshold):**
    - **Tài khoản thường ($< 25.000$ followers):** Áp dụng **Fan-out on Write**. Worker nền chạy lệnh `ZADD feed:{follower_id} <timestamp> <post_id>` vào Redis Sorted Set của từng follower. Giới hạn độ sâu Sorted Set tối đa 800 bài viết gần nhất qua lệnh `ZREMRANGEBYRANK`.
    - **Tài khoản KOLs / Người nổi tiếng ($\ge 25.000$ followers):** Áp dụng **Fan-out on Read**. Bài viết chỉ được ghi 1 lần duy nhất vào `author_feed:{author_id}`.

2. **Kỹ thuật Hợp nhất Động (K-Way Merge at Retrieval):**
    - Khi người dùng tải bảng tin, hệ thống đọc 200 bản ghi từ `feed:{user_id}` (đã chứa sẵn bài từ bạn bè thông thường).
    - Lấy danh sách ID của các KOLs mà người dùng này theo dõi $\rightarrow$ truy vấn song song (Parallel Fetch qua Goroutines) 20 bài mới nhất từ từng `author_feed:{kol_id}`.
    - Chạy thuật toán **K-Way Merge** trên bộ nhớ RAM để trộn các luồng dữ liệu theo thời gian thực trước khi phân trang trả về cho Client.

---

#### 4.2. Tắc nghẽn Khóa dòng khi Tương tác Tăng vọt (High Concurrency & Write Lock Contention)

Khi một chủ đề thảo luận gây sốt (viral), hàng chục nghìn lượt Upvote, Downvote và View đổ về trong một phút.

##### Vấn đề kỹ thuật

Nếu mỗi tương tác đều thực thi câu lệnh SQL trực tiếp:

```sql
UPDATE threads SET upvotes = upvotes + 1, score = ... WHERE id = 'thread_123';
```

---

PostgreSQL sẽ kích hoạt cơ chế khóa cấp dòng (Row-level Exclusive Lock). Hàng nghìn kết nối cạnh tranh cùng một khóa dẫn đến hiện tượng tắc nghẽn hàng đợi (Lock Queue Saturation), kéo theo Connection Pool cạn kiệt và làm tê liệt toàn bộ API.

##### Phương án giải quyết: Ghi đệm Bất đồng bộ (Write-Behind Buffering)

```text
[Client Click Vote] ──> [Go API Server]
                              │
               (Thực thi Lua Script nguyên tử)
                              ▼
                      [Redis Cluster]
               - HINCRBY thread:{id}:stats upvotes 1
               - SADD thread:{id}:voters:{uid} (Chống duplicate vote)
               - Trả về HTTP 200 OK (< 5ms)
                              │
                              ▼ (Mỗi 5 giây)
                   [Batch Sync Worker / Asynq]
               - Quét danh sách các thread có biến động
               - Đọc tổng số điểm tích lũy
               - Ghi gộp (Bulk Update) vào PostgreSQL qua 1 Transaction
```

---

1. **Khử trùng lặp và tính điểm tức thì tại Redis:**
    - Dùng **Redis Lua Script** để đảm bảo tính nguyên tử: Kiểm tra xem `user_id` đã tồn tại trong Set `thread:{id}:voted_users` chưa. Nếu chưa, thêm vào Set và tăng bộ đếm `HINCRBY thread:{id}:counters upvotes 1`.

2. **Đồng bộ hàng loạt xuống Database (Bulk Synchronization):**
    - Định kỳ mỗi $5 - 10$ giây, một Worker chạy ngầm thu gom toàn bộ dữ liệu biến động từ Redis và thực thi câu lệnh cập nhật hàng loạt (Batch UPDATE) bằng cách sử dụng bảng tạm hoặc biểu thức bảng chung (CTE):

```sql
UPDATE threads AS t
SET
    upvotes = t.upvotes + c.new_upvotes,
    score = (t.upvotes + c.new_upvotes - t.downvotes) / POWER(EXTRACT(EPOCH FROM (NOW() - t.created_at))/3600 + 2, 1.8)
FROM (VALUES
    ('thread_1'::uuid, 150),
    ('thread_2'::uuid, 42)
) AS c(thread_id, new_upvotes)
WHERE t.id = c.thread_id;
```

---

1. **Bảo toàn dữ liệu khi có sự cố (Fault Tolerance):**
    - Nếu Redis gặp sự cố trước khi xả dữ liệu, Redis AOF (Append Only File với thiết lập `appendfsync everysec`) đảm bảo độ mất mát dữ liệu không vượt quá 1 giây tương tác.

---

#### 4.3. SEO Hàng triệu Trang & Hiện tượng Bão Đệm (Million-Page SEO & Cache Stampede)

Diễn đàn có hàng triệu luồng thảo luận. Các trang này cần được bot tìm kiếm (Googlebot, Bingbot) cào liên tục, đồng thời phải hiển thị nội dung mới cho người dùng thực.

##### Rủi ro vận hành

- **Cache Stampede (Thundering Herd):** Một bài viết viral hết hạn bộ nhớ đệm ISR (TTL chạm 0). Đúng thời điểm đó, 5.000 requests người dùng cùng 50 crawler ùa vào. Nếu không có cơ chế chặn, máy chủ sẽ kích hoạt đồng thời 5.050 tác vụ render SSR và truy vấn Database cùng lúc, gây sập server.
- **Cạn kiệt ngân sách thu thập dữ liệu (Crawl Budget Exhaustion):** Googlebot bị nghẽn ở các trang rác, trang phân trang vô tận hoặc bài viết quá cũ, làm chậm tốc độ lập chỉ mục các chủ đề mới tạo.

##### Phương án giải quyết

```text
[Request truy cập Trang bài viết]
                                              │
                                              ▼
                                 [Cloudflare / Edge CDN Cache]
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
               [Cache HIT (HTML)]                              [Cache MISS / STALE]
             - Trả về ngay lập tức                           - Trả về HTML cũ (Stale)
             - Latency < 30ms                                - Kích hoạt Background Revalidation
                                                                      │
                                                                      ▼
                                                          [Distributed Lock: Redis]
                                                       (Chỉ duy nhất 1 Worker được render)
                                                                      │
                                                       ┌──────────────┴──────────────┐
                                                       ▼                             ▼
                                                [Instance giữ Lock]          [Các Instance khác]
                                                - Thực thi SSR trang mới     - Tiếp tục trả về
                                                - Lưu HTML mới vào CDN/Cache   bản HTML Stale
                                                - Giải phóng Lock
```

---

1. **Khóa phân tán ngăn chặn Cache Stampede:**
    - Tích hợp tiêu đề HTTP: `stale-while-revalidate=86400, s-maxage=60`.
    - Tại tầng Backend/Next.js Custom Cache Handler: Khi phát hiện trang hết hạn, ứng dụng gọi lệnh `SET lock:revalidate:{thread_id} "locked" NX EX 15`. Chỉ **một tiến trình duy nhất** giành được khóa để chạy SSR kết nối DB; tất cả các request khác đến sau sẽ nhận ngay bản HTML cũ đã lưu trong đệm mà không làm tăng tải hệ thống.

2. **Kiến trúc Phân cấp Sơ đồ trang web (Sitemap Partitioning):**
    - Chia nhỏ Sitemap thành cấu trúc cây: `sitemap-index.xml` trỏ tới các sitemap con chứa tối đa 10.000 URLs mỗi tệp.
    - Phân cấp theo tần suất cập nhật:
        - `sitemap-hot.xml` (Các thread hoạt động trong 24h qua): Re-generate mỗi giờ.
        - `sitemap-recent.xml` (Các thread trong 7 ngày qua): Re-generate mỗi ngày.
        - `sitemap-archive-{year}-{month}.xml` (Các thread cũ hơn): Tạo tĩnh 1 lần duy nhất, không bao giờ render lại trừ khi có chỉnh sửa lớn.

---

#### 4.4. Hiệu năng Cây Bình luận Đa tầng Sâu & Trải phẳng DOM (Deep Nested Comments)

Các bài thảo luận dài có thể chứa hàng chục nghìn bình luận với cấu trúc trả lời lồng nhau phức tạp (replies to replies tới 10-15 tầng).

##### Rủi ro hiệu năng

- **Tràn DOM & Layout Thrashing:** Nếu render đệ quy thông thường bằng React (`<Comment><Comment><Comment/></Comment></Comment>`), cây Virtual DOM sẽ phình to hàng trăm nghìn nodes. Trình duyệt trên thiết bị di động sẽ bị tràn RAM và giật lag khi cuộn trang (Frame drop dưới 30fps).
- **Đo lường sai lệch kích thước:** Các bình luận có chiều cao không đồng đều do chứa ảnh, code block, hoặc blockquote tải bất đồng bộ.

##### Phương án giải quyết: Thuật toán Trải phẳng Cây kết hợp Virtualization

```text
[Dữ liệu dạng Cây từ DB]               [Thuật toán Flattening]               [DOM Ảo hóa Render]
     (Tree Nodes)                           (Client-side)                       (15-20 Nodes)
      Comment A                             Comment A (depth: 0)            ┌───────────────────┐
     ├── Comment A1          ───>           Comment A1 (depth: 1)     ───>  │ Comment A (visible)│
     │    └── Comment A11                   Comment A11 (depth: 2)          │ Comment A1        │
     └── Comment A2                         Comment A2 (depth: 1)           │ Comment A11       │
                                                                            └───────────────────┘
```

---

1. **Thuật toán Trải phẳng mảng có điều kiện (Conditional Tree Flattening):**
    - Dữ liệu cây nhận về từ API được chuyển thành một mảng tuyến tính phẳng (Flat Array) duy nhất trước khi nạp vào Virtualizer:

```typescript
interface FlatComment {
  id: string;
  depth: number;            // Mức độ thụt lề UI (padding-left = depth * 16px)
  isCollapsed: boolean;     // Trạng thái thu gọn nhánh
  totalChildCount: number;  // Số lượng bình luận con nằm dưới
  data: CommentPayload;
}
```

---

- Khi người dùng click "Thu gọn nhánh" (Collapse) tại một node cha, thuật toán lọc bỏ toàn bộ các node con có đường dẫn (path) bắt đầu bằng path của node cha ra khỏi mảng hiển thị. Thao tác này có độ phức tạp thời gian $\mathcal{O}(N)$ cực nhanh, không kích hoạt re-render đệ quy.

1. **Đo lường kích thước động qua ResizeObserver:**
    - Sử dụng `@tanstack/react-virtual` với chế độ `dynamic measurement`.
    - Mỗi phần tử comment được gắn hook theo dõi kích thước thực tế:

```typescript
const rowVirtualizer = useVirtualizer({
  count: flattenedComments.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 120, // Kích thước ước tính ban đầu (px)
  measureElement: (element) => {
    // Đo lường lại ngay khi ảnh hoặc code nhúng tải xong
    return element.getBoundingClientRect().height;
  },
});
```

---

- DOM chỉ duy trì khoảng 15-20 node thực tế nằm trong khung nhìn (Viewport) của người dùng, tiết kiệm 95% bộ nhớ trình duyệt.

---

#### 4.5. Khả năng Chịu tải Kết nối Thời gian thực & Bão Tái kết nối (Real-time Scale & Reconnection Storm)

Hệ thống thông báo đẩy (SSE) và tin nhắn trực tiếp (WebSocket) duy trì hàng trăm nghìn kết nối đồng thời (Persistent Connections).

##### Kịch bản thảm họa: Bão Tái kết nối (Reconnection Storm / Thundering Herd)

Khi cụm máy chủ thời gian thực (Real-time Gateway) khởi động lại sau bản cập nhật hoặc bị gián đoạn mạng trong 30 giây:

- 100.000 client trình duyệt đồng loạt phát hiện mất kết nối.
- Toàn bộ 100.000 client cùng lúc gửi request bắt tay lại (Handshake / Upgrade) và truy vấn lại API `/api/notifications/unread`.
- Lượng truy cập tăng vọt gấp 100 lần bình thường làm sập hệ thống xác thực (Auth/Redis) và Gateway ngay khi vừa khởi động xong.

##### Phương án giải quyết

```text
[Mất kết nối Socket/SSE]
                                              │
                                              ▼
                             [Client: Thuật toán Full Jitter]
                      - Thử lại lần 1: random(0, base)
                      - Thử lại lần n: random(0, min(cap, base * 2^n))
                                              │
                                              ▼
                          [Hạ tầng Gateway: Admission Control]
                   - Rate Limit Handshake (5.000 req/s tại Reverse Proxy)
                   - Từ chối vượt ngưỡng bằng HTTP 429 hoặc Retry-After
                                              │
                                              ▼
                            [Thiết lập lại Kết nối Thành công]
                                              │
                                              ▼
                            [Khôi phục Trạng thái Dữ liệu]
                   - Gửi Header: `Last-Event-ID: evt_98234`
                   - Server chỉ đẩy bù các sự kiện bị bỏ sót qua Redis Stream
```

---

1. **Thuật toán Tái kết nối Lũy thừa có Rung lắc (Exponential Backoff with Full Jitter):**
    - Phía React Client tuyệt đối không gọi `reconnect()` ngay lập tức. Khoảng thời gian chờ ($T_{\text{wait}}$) được tính toán theo công thức ngẫu nhiên:

        $$
        T_{\text{wait}} = \text{Random}\left(0, \, \min\left(M, \, B \times 2^{\text{attempt}}\right)\right)
        $$

        *Trong đó:* $B = 1.5\text{s}$ (thời gian cơ sở), $M = 30\text{s}$ (ngưỡng tối đa). Việc rải đều thời gian kết nối giúp phân tán đỉnh tải (Peak Traffic) thành một đường thoải trong suốt 30 giây.

2. **Tiếp tục luồng dữ liệu thông minh qua `Last-Event-ID`:**
    - Sử dụng cơ chế ghi nhận vị trí của Server-Sent Events (SSE). Client lưu ID của tin nhắn cuối cùng nhận được vào bộ nhớ.
    - Khi kết nối lại, Client gửi kèm header: `Last-Event-ID: msg_uuid`.
    - Server Go đọc dữ liệu từ **Redis Streams** bằng lệnh `XREAD` bắt đầu từ đúng ID đó để đẩy bù các thông báo bị lỡ trong thời gian mất mạng, **loại bỏ hoàn toàn việc Client phải gọi lại API `/api/notifications` để nạp lại từ đầu**.

---

#### 4.6. Bảng tổng kết Đánh đổi Kiến trúc (Architectural Trade-offs)

| Hạng mục | Phương án lựa chọn | Điểm đánh đổi chấp nhận | Lợi ích cốt lõi đạt được |
| --- | --- | --- | --- |
| **Phân phối Feed** | Hybrid Fan-out (Push/Pull) | Logic xử lý phức tạp; tốn dung lượng RAM Redis cho Sorted Sets. | Triệt tiêu hiện tượng lag khi KOL đăng bài; độ trễ tải feed người dùng duy trì dưới 100ms. |
| **Ghi nhận Tương tác** | Write-Behind Buffering qua Redis | Dữ liệu Upvote có độ trễ nhất quán cuối cùng (Eventual Consistency) khoảng 5-10s. | Loại bỏ hoàn toàn tắc nghẽn khóa dòng trên PostgreSQL; chịu được các đợt bùng nổ traffic lớn. |
| **Cây Bình luận** | Flattened Array + Virtualization | Phức tạp trong việc tính toán vị trí cuộn khi nhảy Deep-link. | Trình duyệt chỉ cần giữ 20 phần tử DOM thay vì 10.000 phần tử; cuộn mượt mà 60fps trên mobile. |
| **Truyền tin Thời gian thực** | SSE cho Thông báo, WS cho Chat | Quản lý đồng thời 2 loại giao thức mạng khác nhau ở tầng Gateway. | SSE nhẹ hơn, tự động xử lý kết nối lại và tương thích tốt với hạ tầng HTTP/2 CDN. |
