Listed directory docs
Viewed acad_devOps-project-docs-checklist.md:1-200
Searched for "GIAI ĐOẠN"
Searched for "^### "
Viewed acad_devOps-project-docs-checklist.md:1430-2050
Viewed acad_devOps-project-docs-checklist-note.md:1-150
Viewed acad_devOps-project-docs-checklist-note.md:151-318
Viewed acad_devOps-project-docs.md:1-150
Searched for "^#+ "
Viewed acad_devOps-project-docs.md:810-1237
Viewed acad_devOps-project-docs-checklist.md:300-400
Searched for "^#### [0-9]"

Dưới đây là kết quả nhận diện toàn bộ tài liệu trong thư mục [docs](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs), phân tích tổng quan nội dung và câu trả lời chi tiết cho câu hỏi về **CHECKLIST**.

---

### I. Nhận diện các tài liệu trong thư mục `docs`

Thư mục [docs](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs) bao gồm **3 tệp tài liệu Markdown** chuyên sâu:

1. **[acad_devOps-project-docs.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs.md)** *(Dung lượng: ~102 KB, 1.237 dòng)*
   - **Vai trò:** Tài liệu kiến trúc hệ thống tổng quan & phân tích kỹ thuật chuyên sâu (System Architecture & Technical Deep Dive).
   - **Mục đích:** Đặt nền móng lý thuyết, định vị mô hình sản phẩm, lựa chọn ngăn xếp công nghệ (Tech Stack) và phân tích các bài toán đánh đổi kiến trúc (Architectural Trade-offs) khi mở rộng quy mô.

2. **[acad_devOps-project-docs-checklist.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs-checklist.md)** *(Dung lượng: ~90 KB, 2.050 dòng)*
   - **Vai trò:** Bản đặc tả kỹ thuật chi tiết theo định dạng máy/AI Agent có thể thực thi (Machine/Agent-executable Technical Specification).
   - **Mục đích:** Quy chuẩn hóa toàn bộ luồng xử lý bằng sơ đồ DAG, cấu hình YAML, lược đồ cơ sở dữ liệu PostgreSQL 16 DDL, Redis Keyspace, khế ước API/SSE và thuật toán lõi.

3. **[acad_devOps-project-docs-checklist-note.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs-checklist-note.md)** *(Dung lượng: ~27 KB, 318 dòng)*
   - **Vai trò:** Tài liệu ghi chú giải thích nghiệp vụ và cẩm nang điều phối công việc với AI Agent (Implementation Notes & AI Agent Guide).
   - **Mục đích:** Giải thích trực quan mục đích "tại sao phải làm" của từng đầu việc, đồng thời cung cấp các gợi ý phân rã tác vụ (Task Breakdown) kèm Prompt mẫu để giao việc cho AI Agent.

---

### II. Phân tích tổng quan tài liệu dự án

Hệ thống được thiết kế là một nền tảng **Mạng xã hội & Diễn đàn cộng đồng hiện đại**, kết hợp giữa mô hình thảo luận sâu theo luồng (tương tự Reddit/Discourse) và bảng tin tương tác thời gian thực (tương tự Twitter/X).

#### 1. Ngăn xếp công nghệ cốt lõi (Tech Stack)
* **Frontend:** **Next.js (App Router)** với kiến trúc **React Server Components (RSC)** kết hợp **Incremental Static Regeneration (ISR)** giúp tối ưu hóa SEO tối đa cho Googlebot và giảm thời gian First Contentful Paint (FCP < 1.2s). Quản trị trạng thái qua **TanStack Query** (Server cache) và **Zustand** (Client UI state). Trình soạn thảo văn bản **Tiptap** và ảo hóa DOM với `@tanstack/react-virtual`.
* **Backend:** Microservices/Modular Monolith viết bằng **Go (Gin/Fiber)** để xử lý đồng thời cao và độ trễ thấp. Xử lý tác vụ nền và hàng đợi qua **Asynq / BullMQ**.
* **Lưu trữ & Dữ liệu:**
  * **PostgreSQL 16:** Lưu trữ thực thể chính, sử dụng extension `ltree` cho cây bình luận lồng nhau đa tầng, cô lập bảng `thread_counters` để tránh phình bảng (Table Bloat do MVCC).
  * **Redis 7 (Tách biệt 2 cụm):** Cụm *Volatile Cache* (chạy `allkeys-lru` cho timeline, rate limit, vote buffer) và cụm *Persistent State* (bật AOF cho hàng đợi session, refresh token rotation).
  * **Cloudflare R2 / S3:** Lưu trữ đa phương tiện với luồng tải trực tiếp (Zero-Hop Direct Upload qua Presigned URL).
  * **Meilisearch:** Động cơ tìm kiếm toàn văn độ trễ thấp.
* **DevOps & Hạ tầng:** Đóng gói Monorepo qua Docker multi-stage build, CI/CD tự động bằng GitHub Actions (Linting $\rightarrow$ Type Check $\rightarrow$ Test $\rightarrow$ Deploy), triển khai đám mây (Render / Hetzner / K3s), và hệ thống quan sát tập trung (Prometheus, Grafana, Loki, Sentry).

#### 2. Các giải pháp kỹ thuật nổi bật
* **Kiến trúc phân phối Feed lai (Hybrid Fan-out):** Người dùng thông thường dùng cơ chế *Fan-out on Write* (Push vào Redis timeline của follower); người nổi tiếng/KOLs dùng *Fan-out on Read* (Pull). Khi đọc, thuật toán **K-Way Dynamic Feed Merger** kết hợp các luồng bằng Min-Heap trên RAM.
* **Bộ đệm ghi chậm tương tác (Write-Behind Buffering):** Thao tác Upvote/Downvote xử lý tức thì bằng **Redis Lua Script** $\mathcal{O}(1)$, sau đó gom cụm xả dồn (Batch Flush) xuống PostgreSQL mỗi 5 giây, triệt tiêu nguy cơ tắc nghẽn khóa dòng (Row-level Lock Saturation).
* **Cây bình luận đa tầng ảo hóa:** Backend sinh chuỗi `ltree` dạng Base36; Frontend dùng thuật toán trải phẳng cây thành mảng 1 chiều chỉ render 15–20 DOM node trong viewport, hỗ trợ thu gọn nhánh cha và deep-link mượt mà.
* **Phòng ngừa bão tái kết nối (Reconnection Storm):** Kênh Server-Sent Events (SSE) sử dụng thuật toán chờ ngẫu nhiên *Exponential Backoff with Full Jitter* và khôi phục sự kiện bị lỡ qua `Last-Event-ID` đọc từ Redis Streams.

---

### III. CHECKLIST có bao nhiêu giai đoạn?

Trong tài liệu [acad_devOps-project-docs-checklist.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs-checklist.md#L4-L36), **CHECKLIST tổng thể bao gồm chính xác 7 GIAI ĐOẠN**:

| Giai đoạn | Tên giai đoạn | Trọng tâm công việc |
| :--- | :--- | :--- |
| **Giai đoạn 1** | **Khảo sát & Định vị sản phẩm**<br>*(Discovery & Product Definition)* | • Xác định phạm vi MVP, mục tiêu kinh doanh (OKRs, North Star Metric).<br>• Phân tích chân dung người dùng (Lurker, Contributor, Moderator).<br>• Lập hồ sơ PRD, User Flows và Ma trận phân quyền RBAC kết hợp ABAC. |
| **Giai đoạn 2** | **Thiết kế UI/UX & Kiến trúc hệ thống**<br>*(Design & Architecture)* | • Xây dựng Design Tokens, Layout DAG, phân chia ranh giới RSC Server - Client.<br>• Thiết kế sơ đồ mạng (Topology), lược đồ PostgreSQL 16 DDL (`ltree`, `thread_counters`).<br>• Thiết kế cấu trúc khóa Redis, đặc tả OpenAPI / Realtime SSE và cấu hình Meilisearch. |
| **Giai đoạn 3** | **Thiết lập nền tảng & Môi trường phát triển**<br>*(Foundation & DevOps Setup)* | • Khởi tạo cấu trúc kho mã nguồn Monorepo, quy chuẩn Git Trunk-based.<br>• Dựng môi trường phát triển cục bộ qua Docker Compose (Postgres, Redis, Go Air, Next.js).<br>• Tối ưu Dockerfile Multi-stage build, xây dựng pipeline CI/CD GitHub Actions và cấu hình triển khai Render Cloud. |
| **Giai đoạn 4** | **Phát triển tính năng cốt lõi**<br>*(Core Development & Integration)* | • Phân hệ Auth: Token Rotation kép, Cookie httpOnly, chống đánh cắp phiên.<br>• Phân hệ CMS: Presigned URL Zero-Hop, kiểm định Tiptap AST.<br>• Phân hệ Nested Comments: Base36 `ltree`, thuật toán trải phẳng cây ảo hóa.<br>• Phân hệ Voting: Redis Lua Script nguyên tử & Worker Batch Flush 5s.<br>• Phân hệ Feed: Thuật toán K-Way Merge & Phân trang con trỏ Base64.<br>• Phân hệ Realtime Hub: Kênh truyền SSE & Gom cụm thông báo Sliding Window. |
| **Giai đoạn 5** | **Kiểm thử chất lượng & Tối ưu hiệu năng**<br>*(QA, Security & Performance)* | • Kiểm thử tự động (Unit Test, Integration Test, E2E) và kiểm thử hồi quy thủ công.<br>• Đánh giá tải (Stress/Load Testing), tối ưu truy vấn DB, cache và Core Web Vitals.<br>• Rà soát bảo mật: Chống XSS, CSRF, Rate Limiting và cấu hình CSP. |
| **Giai đoạn 6** | **Triển khai & Phát hành**<br>*(Deployment & Launch)* | • Thiết lập hạ tầng Production (Cloud servers, Managed DB, CDN, Object Storage, DNS).<br>• Di chuyển dữ liệu (Data Migration) và chạy thử nghiệm giới hạn (Closed Beta / Soft Launch).<br>• Kích hoạt lập chỉ mục SEO (Sitemap phân cấp, Schema markup) và mở phát hành rộng rãi. |
| **Giai đoạn 7** | **Vận hành, Giám sát & Mở rộng**<br>*(Operations & Maintenance)* | • Thiết lập giám sát thời gian thực: Metrics (Prometheus/Grafana), Logs (Loki), Errors (Sentry).<br>• Xây dựng kịch bản sao lưu tự động (Automated Backups) và phương án khôi phục thảm họa (Disaster Recovery).<br>• Thu thập phản hồi người dùng, phân tích chỉ số giữ chân ($W_4$) và lên kế hoạch nâng cấp. |

> [!NOTE]
> **Hiện trạng chi tiết hóa trong bộ tài liệu:**
> - **4 Giai đoạn đầu (Giai đoạn 1 $\rightarrow$ 4)** đã được tài liệu hóa và đặc tả kỹ thuật chi tiết đến từng bảng DDL, cấu hình YAML, kịch bản Lua và thuật toán trong [acad_devOps-project-docs-checklist.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs-checklist.md), kèm hướng dẫn thực thi cho AI Agent trong [acad_devOps-project-docs-checklist-note.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/acad_devOps-project-docs-checklist-note.md).
> - **3 Giai đoạn sau (Giai đoạn 5 $\rightarrow$ 7)** là các giai đoạn tiếp theo trong vòng đời sản phẩm đã được định hình mục tiêu và đầu việc trong danh mục Checklist tổng thể.