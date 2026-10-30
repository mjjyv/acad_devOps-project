**Export Date:** 9/25/2026, 10:12:27 AM

---

## CHECKLIST: Khảo sát & Định vị sản phẩm (Discovery & Product Definition)

Khảo sát & Định vị sản phẩm (Discovery & Product Definition) là giai đoạn "trả lời câu hỏi: Làm cái gì và làm cho ai?" trước khi viết code. Nếu bỏ qua bước này, dự án dễ rơi vào cảnh làm tính năng không ai dùng, thiết kế giao diện xong phải đập đi làm lại hoặc quá tải thời gian phát triển.

---

### 1. Xác định phạm vi MVP, mục tiêu kinh doanh và đối tượng mục tiêu

Mục đích của bước này là giữ cho sản phẩm tinh gọn nhất có thể để ra mắt sớm.

- **MVP (Minimum Viable Product - Sản phẩm khả dụng tối thiểu):** Tập hợp các tính năng nhỏ nhất đủ để giải quyết vấn đề cốt lõi của người dùng. Không nhồi nhét mọi ý tưởng vào phiên bản đầu tiên; những gì chưa cấp thiết sẽ chuyển sang các bản cập nhật sau.
- **Mục tiêu kinh doanh (Business Goals & Metrics):** Định nghĩa thước đo thành công rõ ràng bằng con số thay vì cảm tính. Dự án sử dụng:
    - *North Star Metric (Chỉ số định hướng):* Thước đo giá trị cốt lõi, ví dụ số lượng thảo luận chất lượng hàng tuần (các bài có trên 5 bình luận).
    - *OKRs cụ thể:* Tỉ lệ người dùng quay lại sau 4 tuần ($W_4 \ge 25\%$), tỉ lệ người tự tạo bài viết ($\ge 8\%$), và tốc độ Google lập chỉ mục bài viết (80% trong 48h).

- **Chân dung người dùng (User Personas):** Phân chia rõ từng nhóm người sử dụng để thiết kế tính năng phù hợp:
    - *The Lurker (Người đọc thầm lặng - chiếm ~80%):* Không đăng bài, chỉ tìm kiếm từ Google và đọc; cần trang tải cực nhanh, cuộn mượt.
    - *The Contributor (Người hay viết/thảo luận - chiếm ~15%):* Cần trình soạn thảo tiện lợi, lưu nháp tự động và thông báo khi có người trả lời.
    - *The Moderator (Quản trị viên - chiếm ~5%):* Cần công cụ dọn dẹp rác, duyệt báo cáo vi phạm nhanh chóng.

---

### 2. Hoàn thiện tài liệu PRD, Sơ đồ luồng (User Flow) và Ma trận phân quyền

Đây là bộ hồ sơ chuyển giao từ ý tưởng thành logic kỹ thuật để đội ngũ kỹ thuật có thể triển khai chính xác.

#### Tài liệu Đặc tả Yêu cầu Sản phẩm (PRD - Product Requirement Document)

Bản kế hoạch chi tiết trả lời cho câu hỏi: Hệ thống có những chức năng gì và vận hành theo quy tắc nào?

- **Tính năng chức năng (Functional Requirements):** Danh sách tính năng phân loại theo mức độ ưu tiên (MoSCoW: Bắt buộc làm ngay, Nên làm, Có thể để sau) như đăng nhập, đăng bài, bình luận, bình chọn.
- **Yêu cầu phi chức năng (Non-Functional Requirements):** Tiêu chuẩn kỹ thuật nền tảng như tốc độ hiển thị giao diện (dưới 1.2s), khả năng chịu tải (chịu được 5.000 lượt truy cập/giây), tính sẵn sàng của hệ thống (99.9% uptime) và chuẩn bảo mật.
- **Quy tắc nghiệp vụ (Business Rules):** Các công thức tính toán logic ngầm, chẳng hạn: thuật toán tính bài viết thịnh hành (giảm dần độ hot theo thời gian), thang điểm cộng/trừ uy tín (Karma) khi đăng bài hoặc bị báo cáo.

#### Sơ đồ luồng người dùng (User Journey / User Flows)

Bản vẽ từng bước thao tác của người dùng từ điểm bắt đầu đến điểm kết thúc, giúp lập trình viên lường trước mọi tình huống và màn hình hiển thị.

- *Ví dụ Luồng chuyển đổi:* Người dùng bấm link từ Google $\rightarrow$ xem bài viết $\rightarrow$ bấm Thích/Bình luận $\rightarrow$ hệ thống bật cửa sổ đăng nhập $\rightarrow$ đăng nhập xong tự động thực hiện lại thao tác thích/bình luận dở dang mà không bắt tải lại trang.
- *Ví dụ Luồng kiểm duyệt:* Người dùng báo cáo bài vi phạm $\rightarrow$ nếu đủ số lượt báo cáo, bài tự động chuyển vào hàng đợi kiểm duyệt để Quản trị viên đưa ra quyết định (bỏ qua, khóa bình luận hoặc xóa bài và trừ điểm tác giả).

#### Ma trận phân quyền (RBAC & ABAC Matrix)

Bảng quy định ai được phép làm gì và trong điều kiện nào, kết hợp giữa chức danh cố định và điều kiện động:

- **Theo vai trò (RBAC):** Phân chia cấp bậc rõ ràng gồm Khách vãng lai, Thành viên thường, Quản trị viên từng nhóm (Space Mod), Quản trị viên hệ thống (Admin).
- **Theo điều kiện động (ABAC):** Ràng buộc theo thuộc tính thực tế để hạn chế gian lận. Ví dụ:
    - Tài khoản mới tạo dưới 7 ngày bị giới hạn tối đa 2 bài viết/ngày và 1 bình luận mỗi 60 giây để chống spam bot.
    - Chỉ tài khoản đạt từ 500 điểm uy tín trở lên mới được mở khóa tính năng bỏ phiếu trừ (Downvote).
    - Tác giả chỉ được chỉnh sửa bài viết của mình trong vòng 24 giờ kể từ khi đăng.

Hoàn thiện checklist này giúp định hình sản phẩm cụ thể, bảo đảm thiết kế UI/UX và kiến trúc cơ sở dữ liệu ở bước tiếp theo bám sát mục tiêu thực tế.

---

## CHECKLIST: Thiết kế UI/UX & Kiến trúc hệ thống (Design & Architecture)

Giai đoạn **Thiết kế UI/UX & Kiến trúc hệ thống (Design & Architecture)** là bước chuyển hóa các yêu cầu từ PRD thành bản thiết kế trực quan và khung kỹ thuật hoàn chỉnh trước khi viết code sản phẩm.

---

### I. Giai đoạn này gồm những việc nào?

Theo tài liệu kiến trúc, giai đoạn này được chia làm 2 mảng lớn:

#### 1. Thiết kế UI/UX & Máy trạng thái giao diện (Design System & Frontend Architecture)

- **Xây dựng Design Tokens & Layout:** Quy chuẩn hóa bảng màu (Light/Dark mode), hệ thống typography, khoảng cách lưới (Grid/Gutters) và khung hiển thị (Top Navbar, Left Sidebar, Center Feed, Right Context).
- **Định nghĩa ranh giới Server - Client (RSC Boundaries):** Xác định rõ thành phần nào render phía server (RSC - tĩnh, 0KB JS, tối ưu SEO) và thành phần nào chạy phía client (Client Component - tương tác, modal, gõ phím).
- **Thiết kế máy trạng thái UI (Statecharts):** Xử lý trước các hành vi giao diện phức tạp:
    - *Optimistic UI cho Voting:* Click Upvote/Downvote đổi màu và tăng số ngay lập tức, gọi API ngầm, rollback nếu lỗi mạng.
    - *Thu gọn nhánh bình luận (Comment Collapsing):* Ẩn các nút con dựa theo đường dẫn, cập nhật chiều cao dòng ảo.

- **Chuẩn hóa URL State Schema:** Quy định rõ các bộ lọc (`sort=hot|new|top`, `cursor`, `focus_comment`) trên URL để hỗ trợ deep-linking.

#### 2. Kiến trúc hệ thống & Hạ tầng dữ liệu (Backend & System Architecture)

- **Sơ đồ cấu trúc mạng (Topology Nodes):** Phân định vai trò giữa Edge Proxy (Cloudflare WAF), Web Runner (Next.js), Core API (Go), Realtime Hub (SSE Engine), Worker (Asynq).
- **Thiết kế mô hình cơ sở dữ liệu (PostgreSQL Schema):**
    - Dùng extension `ltree` để quản lý cây bình luận lồng nhau.
    - Tách riêng bảng `thread_counters` khỏi bảng `threads` chính để chịu tải ghi tần suất cao cho vote/view.
    - Thiết kế các bảng: `users`, `spaces`, `space_memberships`, `comments`, `votes`, `media_assets`, `moderation_reports`.

- **Chiến lược Bộ nhớ đệm (Redis Topology):**
    - *Cụm Ephemeral:* Lưu bảng tin cá nhân hóa (`feed:user:{id}`), trending space, bộ đếm vote tạm thời và rate limit.
    - *Cụm Persistent:* Lưu hash refresh token, stream sự kiện thông báo và con trỏ đọc.

- **Khế ước giao tiếp API & Realtime (API Contracts):**
    - API bảng tin phân trang theo con trỏ (`cursor-based pagination`).
    - API cây bình luận trải phẳng (flattened tree).
    - Kênh Server-Sent Events (SSE) để bắn sự kiện thống kê vote, comment mới và thông báo gom cụm.

- **Chỉ mục tìm kiếm (Meilisearch Spec):** Cấu hình thuộc tính tìm kiếm, thuộc tính lọc, quy tắc xếp hạng (ranking rules) và CDC Worker đồng bộ dữ liệu sang Meilisearch.

---

### II. Bắt đầu với AI Agent ra sao? (Đây chỉ tham khảo)

Vì tài liệu đã được chuẩn hóa dưới dạng đặc tả kỹ thuật (YAML, DAG, SQL DDL), AI Agent có thể đọc hiểu và thực thi rất chuẩn xác. Bạn nên triển khai theo quy trình phân tách tác vụ (task breakdown) từng bước như sau:

#### Bước 1: Giao Agent khởi tạo Khung CSDL & Migration (Source of Truth)

Cơ sở dữ liệu là xương sống, cần có trước để sinh kiểu dữ liệu (Types).

- **Nhiệm vụ cho Agent:** Đọc mục *2.4 (PostgreSQL 16 DDL Specification)*.
- **Prompt mẫu:**

    > "Hãy đọc kỹ mục 2.4 trong tài liệu kiến trúc. Tạo các file migration SQL hoàn chỉnh (bật các extension `ltree`, `uuid-ossp`, `pg_trgm`, tạo ENUMs, bảng `users`, `threads`, `thread_counters`, `comments` kèm đầy đủ constraints và indexes). Đảm bảo tuân thủ chính xác cú pháp PostgreSQL 16."

#### Bước 2: Giao Agent xây dựng OpenAPI / API Contracts

- **Nhiệm vụ cho Agent:** Đọc mục *2.6 (RESTful API & Realtime Contracts)* để dựng file đặc tả interface chung giữa Frontend và Backend.
- **Prompt mẫu:**

    > "Dựa vào mục 2.6, hãy viết file `packages/contracts/openapi.yaml` định nghĩa đầy đủ endpoint `GET /api/v1/feed` (phân trang bằng con trỏ Base64) và `GET /api/v1/threads/{id}/comments` kèm schemas request/response chuẩn xác."

#### Bước 3: Giao Agent dựng Logic Core Backend & Worker (Go)

- **Nhiệm vụ cho Agent:** Triển khai các hàm nghiệp vụ chịu tải cao dựa trên DAG flow.
- **Prompt mẫu:**

    > "Dựa vào flow tại mục 2.3.2 và logic ở mục 4.4, hãy viết Lua script cho Redis để xử lý Vote nguyên tử (`execute_vote.lua`) và dựng module Go xử lý batch sync (định kỳ gom dirty keys ghi dồn vào bảng `thread_counters`)."

#### Bước 4: Giao Agent dựng Frontend UI Primitives & State Machines (Next.js)

- **Nhiệm vụ cho Agent:** Thiết lập Design Tokens và các máy trạng thái UI.
- **Prompt mẫu:**

    > "Dựa vào mục 2.1.1 và 2.1.3, hãy cấu hình file Tailwind CSS tokens, đồng thời viết component `VoteAction.tsx` bằng React + Zustand/TanStack Query thể hiện đúng Statechart: có Optimistic Update, rollback khi lỗi và xử lý dedup vote."

Bằng cách đi từ **Schema DB $\rightarrow$ API Contract $\rightarrow$ Backend Worker/Lua $\rightarrow$ Frontend Component**, bạn sẽ giữ cho hệ thống luôn đồng nhất và Agent không bị hallucinate (bịa đặt logic).

---

## CHECKLIST: Thiết lập nền tảng & Môi trường phát triển (Foundation & DevOps Setup)

Giai đoạn **Thiết lập nền tảng & Môi trường phát triển (Foundation & DevOps Setup)** là bước dựng khung sườn kỹ thuật, công cụ làm việc và luồng tự động hóa nhằm đảm bảo cả nhóm (hoặc bạn và Agent) phát triển dự án trên cùng một môi trường đồng nhất, tránh lỗi "chạy được trên máy tôi nhưng lỗi trên máy người khác".

---

### I. Giai đoạn này gồm những việc nào?

Theo tài liệu kỹ thuật, giai đoạn này bao gồm 5 mảng công việc chính:

#### 1. Khởi tạo cấu trúc Repo Monorepo & Quy chuẩn Code

- **Kiến trúc Monorepo:** Gom cả Frontend (`apps/web` - Next.js) và Backend (`apps/api` - Go) cùng thư mục hợp đồng dữ liệu dùng chung (`packages/contracts`) vào một Git repository duy nhất. Điều này giúp đồng bộ API Schema giữa Client và Server ngay lập tức.
- **Thiết lập chuẩn hóa mã nguồn:** Cấu hình linter và formatter (Biome/ESLint cho Frontend, `golangci-lint` cho Backend).
- **Quy chuẩn Git & Commit:** Áp dụng mô hình Trunk-based rút gọn, khóa push trực tiếp vào `main`/`develop` (buộc phải qua Pull Request có review) và chuẩn hóa thông điệp commit theo Semantic Commits (`feat:`, `fix:`, `chore:`, `refactor:`).

#### 2. Thiết lập Môi trường phát triển cục bộ qua Docker Compose

Dựng toàn bộ hệ thống chỉ với một câu lệnh mà không cần cài đặt rải rác từng phần mềm lên máy cá nhân:

- **`infra-db` (PostgreSQL 16):** Chạy image Alpine, cấu hình volume lưu trữ bền vững và tự động chạy script khởi tạo extension (`ltree`, `uuid-ossp`).
- **`infra-cache` (Redis 7):** Cấu hình giới hạn RAM và tắt cơ chế AOF tạm thời để tối ưu hiệu năng chạy local.
- **`core-api` (Go Dev Container):** Mount thư mục mã nguồn và cài công cụ Hot-Reload (Air) để tự biên dịch lại mỗi khi sửa code.
- **`web-client` (Next.js Dev Container):** Thiết lập bảo vệ thư mục `node_modules` bên trong container khỏi bị ghi đè bởi máy host.

#### 3. Tối ưu hóa Container Image khi đóng gói (Docker Build)

- **Backend Image:** Dùng Multi-stage build với Alpine hoặc Scratch, triệt tiêu symbol tables (`-ldflags="-s -w"`) để kích thước image cuối cùng dưới 30MB.
- **Frontend Image:** Dùng Multi-stage build kết hợp tính năng `output: "standalone"` của Next.js để giảm dung lượng container từ hàng gigabyte xuống dưới 150MB.

#### 4. Xây dựng Pipeline CI/CD tự động (GitHub Actions)

Thiết lập các cổng kiểm tra tự động chạy mỗi khi tạo Pull Request vào nhánh `develop` hoặc `main`:

- **Cổng 1 (Linting):** Tự động quét lỗi format và style code.
- **Cổng 2 (Type Integrity):** Chạy `tsc --noEmit` để bắt lỗi sai kiểu TypeScript và kiểm tra tính hợp lệ của file `openapi.yaml`.
- **Cổng 3 (Automated Tests):** Chạy unit test phía Web (Vitest) và kiểm tra race condition phía Go (`go test -race`).
- **Cổng 4 (Continuous Deployment):** Tự động kích hoạt Webhook triển khai khi code được merge vào nhánh `main`.

#### 5. Thiết kế Hạ tầng Triển khai Đám mây (Render Architecture)

- Triển khai mô hình dịch vụ miễn phí (Free Tier) với Next.js và Go Docker trên Render, kết hợp cơ sở dữ liệu bên ngoài (Supabase/Neon cho PostgreSQL và Upstash cho Serverless Redis).
- **Xử lý cơ chế ngủ đông (Spin-down Mitigation):** Cấu hình công cụ giám sát định kỳ (UptimeRobot) gửi ping mỗi 10 phút vào `/healthz` và `/` để tránh container bị dừng hoạt động trong lúc demo.

---

### II. Bắt đầu với AI Agent ra sao? (Đây chỉ tham khảo)

Nên chia việc cho Agent theo trình tự từ **Khung thư mục $\rightarrow$ File điều phối Docker $\rightarrow$ Cấu hình CI/CD $\rightarrow$ File triển khai đám mây**.

#### Bước 1: Giao Agent khởi tạo cây thư mục Monorepo & Cấu hình Linter

- **Mục tiêu:** Tạo đúng cấu trúc thư mục và các file cấu hình chuẩn.
- **Prompt mẫu:**

    > "Đọc mục 3.1 trong tài liệu. Hãy tạo cấu trúc thư mục Monorepo gồm `apps/web`, `apps/api`, `deploy/docker`, `packages/contracts` và `.github/workflows`. Viết cấu hình Biome cho Web, cấu hình `.golangci.yml` cho API và một file `.env.example` chứa toàn bộ biến môi trường mẫu cần thiết."

#### Bước 2: Giao Agent viết `docker-compose.dev.yml` và Dockerfile

- **Mục tiêu:** Đảm bảo có thể chạy được `docker compose up` ở local mà không gặp lỗi thiếu extension hay xung đột network.
- **Prompt mẫu:**

    > "Đọc kỹ mục

    3.3. Hãy viết file `deploy/docker/docker-compose.dev.yml` định nghĩa 4 service (`infra-db`, `infra-cache`, `core-api`, `web-client`) kèm volume và healthcheck. Đồng thời viết file script SQL tự động bật extension `ltree` và `uuid-ossp` cho PostgreSQL khi container khởi động lần đầu."

#### Bước 3: Giao Agent viết Dockerfile Multi-stage tối ưu

- **Mục tiêu:** Tạo image sản xuất siêu nhẹ theo đúng tiêu chuẩn.
- **Prompt mẫu:**

    > "Hãy viết `apps/api/Dockerfile.prod` dùng multi-stage build với Alpine/Scratch, biên dịch với cờ `-ldflags="-s -w"` sao cho image dưới 30MB. Tiếp tục viết `apps/web/Dockerfile.prod` tận dụng tính năng standalone của Next.js để đóng gói dưới 150MB."

#### Bước 4: Giao Agent tạo Workflow GitHub Actions CI/CD

- **Mục tiêu:** Tự động hóa kiểm tra code trước khi merge.
- **Prompt mẫu:**

    > "Dựa vào sơ đồ DAG ở mục 3.4, hãy viết file `.github/workflows/ci.yml` chạy trên PR vào nhánh `develop` và `main`. File cần bao gồm 3 jobs: linting (Biome + golangci-lint), type check (TypeScript + openapi.yaml) và test (Vitest + go test -race). Tận dụng `actions/cache` để tối ưu thời gian chạy dưới 3 phút."

#### Bước 5: Giao Agent viết cấu hình Blueprint triển khai (Render)

- **Mục tiêu:** Chuẩn hóa cấu hình hạ tầng dạng mã nguồn (IaC).
- **Prompt mẫu:**

    > "Dựa vào mục 3.5, hãy viết file `deploy/render/render.yaml` để khai báo Blueprint triển khai lên Render gồm Frontend Web Service và Backend Docker Web Service, liên kết các biến môi trường theo ma trận quy định."

---

## CHECKLIST: Phát triển tính năng cốt lõi (Core Development & Integration)

Giai đoạn **Phát triển tính năng cốt lõi & Ghép nối hệ thống (Core Development & Integration)** là bước biến các bản vẽ kiến trúc và thiết kế thành mã nguồn thực tế. Trọng tâm ở đây không chỉ là viết giao diện hay API đơn lẻ, mà là xử lý đồng bộ dữ liệu, thuật toán chịu tải và ghép nối hai đầu Client - Server.

---

### I. Giai đoạn này gồm những việc nào?

Theo đặc tả kỹ thuật, giai đoạn này được chia thành 6 phân hệ cốt lõi:

#### 1. Định danh, Quản lý phiên & Xoay vòng Token (Auth Subsystem)

- **Quy trình Token Rotation:** Triển khai cơ chế cấp phát cặp Access Token (sống ngắn: 15 phút, lưu trong `httpOnly Cookie` dạng `Lax`) và Refresh Token (sống dài: 7 ngày, lưu trong `httpOnly Cookie` dạng `Strict`).
- **Phát hiện đánh cắp phiên:** Lưu hash của Refresh Token vào Redis. Nếu phát hiện một Refresh Token cũ bị tái sử dụng, hệ thống lập tức hủy toàn bộ phiên làm việc (Session Family) của tài khoản đó để bảo vệ người dùng.
- **Interceptors xử lý 401 phía Client:** Thiết lập cơ chế Mutex Lock ở Frontend: chỉ cho phép duy nhất một request làm mới token chạy tại một thời điểm, các request khác đưa vào hàng đợi (Subscriber Queue) để gửi lại sau khi có token mới.

#### 2. Trình soạn thảo & Xử lý đa phương tiện Zero-Hop (CMS Pipeline)

- **Tải ảnh trực tiếp lên Storage:** Trình duyệt nén ảnh qua WebP, tính chuỗi Blurhash rồi xin Presigned URL từ Backend để đẩy nhị phân trực tiếp lên Cloudflare R2/S3 (không đi qua máy chủ chính).
- **Kiểm định JSON AST (Tiptap):** Lọc độc hại và kiểm định chặt chẽ cấu trúc JSON Abstract Syntax Tree trước khi lưu vào PostgreSQL, ngăn chặn chèn mã độc HTML/SVG (XSS).
- **Dọn dẹp file mồ côi (Worker Task):** Tác vụ nền quét định kỳ dọn sạch các file ảnh chưa được người dùng bấm xác nhận đăng bài sau 24h.

#### 3. Cây bình luận đa tầng & Ảo hóa hiển thị (Nested Comments & Virtualization)

- **Thuật toán sinh đường dẫn phân cấp (ltree):** Tự động sinh chuỗi Base36 dạng `0001.000a.0003` để lưu vết vị trí bình luận trong cơ sở dữ liệu (tối đa 8 cấp).
- **Trải phẳng cây bình luận (Flattening Algorithm):** Thuật toán phía Client chuyển đổi cấu trúc cây đệ quy thành mảng một chiều phẳng kèm thuộc tính thụt lề `depth` và trạng thái `is_collapsed`.
- **Tích hợp DOM ảo hóa & Điều hướng sâu:** Dùng `@tanstack/react-virtual` để chỉ hiển thị 15-20 bình luận trong khung nhìn, kèm bộ xử lý tự bung nhánh cha và cuộn mượt khi người dùng truy cập liên kết sâu (Deep Link `#comment-id`).

#### 4. Động cơ Bầu chọn & Ghi chậm bất đồng bộ (Write-Behind Voting)

- **Bầu chọn nguyên tử qua Redis Lua:** Dùng script Lua chạy trên Redis với độ phức tạp $\mathcal{O}(1)$ để xử lý các hành động: vote mới, hủy vote, đảo chiều vote mà không làm tắc nghẽn Database.
- **Batch Flush Worker:** Worker chạy định kỳ mỗi 5 giây gom toàn bộ bài viết có biến động điểm từ Redis và xả dồn (Bulk Update) vào bảng `thread_counters` của PostgreSQL trong 1 giao dịch duy nhất.
- **Tính điểm Hot Trending:** Áp dụng thuật toán Gravity Decay để tự động hạ nhiệt bài viết cũ theo thời gian.

#### 5. Động cơ Bảng tin & Hợp nhất truy vấn (Hybrid Feed Aggregator)

- **Kiến trúc Lai (Push/Pull):** Tài khoản thường dùng cơ chế Push (ghi Post ID vào Redis Timeline của follower), tài khoản nổi tiếng (KOLs) dùng cơ chế Pull (chỉ ghi vào trang của tác giả).
- **Thuật toán K-Way Merge:** Khi nạp trang, hệ thống đọc 50 bài từ Redis Inbox kết hợp song song bài từ các KOLs đang theo dõi, trộn theo thứ tự thời gian/điểm số bằng Min-Heap trên RAM.
- **Phân trang bằng con trỏ (Cursor-based):** Mã hóa con trỏ Base64 tổng hợp từ `(score:timestamp:id)` để tránh tình trạng trôi trang hay trùng lặp bài viết.

#### 6. Kênh sự kiện thời gian thực & Gom cụm thông báo (Notification Hub)

- **Luồng Server-Sent Events (SSE):** Duy trì đường truyền đẩy một chiều để gửi cập nhật số lượt vote và bình luận mới theo thời gian thực. Có cơ chế heartbeat ping mỗi 15 giây và bù đắp dữ liệu bị lỡ qua `Last-Event-ID`.
- **Gom cụm thông báo theo cửa sổ trượt (Sliding Window):** Tích lũy các tương tác xảy ra trong vòng 5 phút để gom thành một thông báo tổng hợp (ví dụ: "A, B và 48 người khác đã thích..."), tránh gây phiền toái cho người dùng.

---

### II. Bắt đầu với AI Agent ra sao? (Đây chỉ tham khảo)

Để tránh việc Agent sinh code rời rạc, hãy giao việc tuần tự từ **Hạ tầng xác thực $\rightarrow$ Logic ghi chậm/Bầu chọn $\rightarrow$ Cây bình luận $\rightarrow$ Soạn thảo/Upload $\rightarrow$ Bảng tin & Realtime**.

#### Bước 1: Giao Agent xây dựng Module Xác thực & Token Rotation (Go + Client Interceptor)

- **Nhiệm vụ:** Thiết lập lõi đăng nhập và bảo vệ API.
- **Prompt mẫu:**

    > "Đọc kỹ mục 4.1 trong tài liệu. Hãy viết logic xác thực bằng Go: tạo API đăng nhập, cấp phát Access Token trong httpOnly cookie (15m) và Refresh Token (7d). Dựng bảng băm trên Redis để lưu vết Refresh Token theo mô hình Token Rotation, tự động thu hồi toàn bộ session nếu phát hiện token bị dùng lại. Phía Client (Next.js), hãy viết Axios/Fetch Interceptor có cơ chế Mutex Lock cho luồng refresh token."

#### Bước 2: Giao Agent viết Lua Script & Worker Ghi chậm cho Voting

- **Nhiệm vụ:** Hoàn thiện cơ chế tương tác chịu tải cao nhất của diễn đàn.
- **Prompt mẫu:**

    > "Đọc kỹ mục 4.4.1 và

    4.4.2. Hãy viết script Lua `execute_vote.lua` xử lý đầy đủ các nhánh logic: vote mới, đảo chiều và hủy vote trên 2 cấu trúc Redis Hash và Dirty Set. Sau đó, viết một Background Worker bằng Go (sử dụng thư viện Asynq) quét Dirty Set mỗi 5 giây để thực thi bulk update xuống bảng `thread_counters` của PostgreSQL kèm công thức Gravity Decay."

#### Bước 3: Giao Agent xây dựng Cây Bình luận Đa tầng & Thuật toán Trải phẳng

- **Nhiệm vụ:** Xây dựng logic phân cấp comment cả ở phía DB và UI.
- **Prompt mẫu:**

    > "Đọc kỹ mục

    4.3. Viết hàm Backend Go tạo comment mới tự động sinh chuỗi `path` ltree theo chuẩn Base36. Tiếp theo, viết một hook React bằng TypeScript `useFlattenCommentTree` thực hiện chính xác thuật toán tại mục 4.3.2 để biến cây comment đệ quy thành mảng phẳng cho `@tanstack/react-virtual`, có xử lý logic ẩn các comment con khi nhánh cha bị thu gọn."

#### Bước 4: Giao Agent hoàn thiện Pipeline Upload Tệp & Sanitize AST

- **Nhiệm vụ:** Xử lý media tải trực tiếp và kiểm soát nội dung bài viết.
- **Prompt mẫu:**

    > "Đọc kỹ mục

    4.2. Hãy tạo API endpoint sinh S3/R2 Presigned URL cho phép tải file ảnh trực tiếp. Viết middleware hoặc schema validator bằng Zod/Go để kiểm định chặt chẽ cây JSON AST của Tiptap theo các quy tắc nghiêm ngặt trong mục 4.2.2 (giới hạn tags, thuộc tính và khử mã độc)."

#### Bước 5: Giao Agent ghép nối Động cơ Bảng tin (K-Way Merge) & Kênh SSE

- **Nhiệm vụ:** Hoàn thiện trải nghiệm hiển thị bài viết và thông báo theo thời gian thực.
- **Prompt mẫu:**

    > "Dựa vào mục 4.5 và 4.6, hãy viết thuật toán K-Way Merge bằng Go kết hợp dữ liệu giữa Redis Timeline và các bài từ KOLs, xuất kết quả kèm cursor Base64. Cuối cùng, dựng endpoint SSE `/api/v1/realtime/events` quản lý kết nối, gửi heartbeat định kỳ 15s và tích hợp bộ gom cụm thông báo theo cửa sổ trượt 5 phút."