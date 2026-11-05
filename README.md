# Acad DevOps Fullstack Monorepo

[![CI Pipeline](https://github.com/mjjyv/acad_devOps-project/actions/workflows/ci.yml/badge.svg)](https://github.com/mjjyv/acad_devOps-project/actions)
[![Vitest Status](https://img.shields.io/badge/Vitest-59%2F59%20Passed%20(100%25)-success)](https://vitest.dev/)
[![TypeScript Strict](https://img.shields.io/badge/TypeScript-5.9%20Strict-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20(ltree%20%2B%20HOT)-336791)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7.0%20(Lua%20Atomic)-DC382D)](https://redis.io/)
[![Cloud Deployment](https://img.shields.io/badge/Render-Live%20Production-46E3B7)](https://render.com)
[![OS Target](https://img.shields.io/badge/OS%20Verified-Debian%2013%20(trixie)-D70A53)](https://www.debian.org/)

Hệ thống diễn đàn và mạng xã hội thảo luận chuyên sâu (High-throughput Discussion Engine) xây dựng trên nền tảng **Monorepo**, áp dụng các kiến trúc phân tầng chịu tải cao, thuật toán ảo hóa cây bình luận vô hạn cấp $O(N)$, cơ chế bảo mật xác thực nhiều lớp (Token Rotation kèm 30s Grace Period & Token Reuse Detection), và hệ thống bỏ phiếu nguyên tử qua Redis Lua.

---

## 🌐 Trực Quan & Hệ Thống Đang Hoạt Động (Live Production Endpoints)

| Dịch vụ | Môi trường | Địa chỉ URL | Trạng thái |
| :--- | :---: | :--- | :---: |
| **Web Client (Frontend)** | Render Cloud | [https://acad-web-client.onrender.com](https://acad-web-client.onrender.com) | Hoạt động (200 OK) |
| **Core API (Backend)** | Render Cloud | [https://acad-core-api.onrender.com](https://acad-core-api.onrender.com) | Hoạt động (200 OK) |
| **Healthcheck Probe** | Render Cloud | [https://acad-core-api.onrender.com/healthz](https://acad-core-api.onrender.com/healthz) | Hoạt động (200 OK) |
| **Source Code Repository** | GitHub | [git@github.com:mjjyv/acad_devOps-project.git](https://github.com/mjjyv/acad_devOps-project) | Nhánh `main` |

---

## 🏗️ Kiến Trúc Hệ Thống Monorepo (Workspace Topology)

```text
acad_devOps_project/
├── apps/
│   ├── web/                    # Next.js 15 (App Router, RSC, PPR, Tailwind CSS)
│   └── api/                    # API Gateway & Core Fastify Service
├── services/
│   ├── auth/                   # Identity, Argon2id, JWT Rotation, Redis Sessions
│   └── community/              # Communities, Posts, Comments (ltree), Redis Voting Lua
├── packages/
│   ├── contracts/              # OpenAPI 3.1 Schemas, Zod Validators, Shared Types
│   ├── auth-client/            # Browser Interceptor with Mutex Lock (anti-thundering-herd)
│   ├── tree-virtualizer/       # Thuật toán O(N) trải phẳng & ảo hóa cây bình luận
│   └── ui-tokens/              # Minimalist Editorial UI design system tokens
├── deploy/
│   ├── docker/                 # Dockerfile Multi-stage Alpine (< 100MB) & docker-compose
│   ├── migrations/             # DDL SQL (000001_init, 000002_community ltree)
│   ├── render/                 # Render Blueprint Infrastructure-as-Code (render.yaml)
│   └── scripts/                # Keep-alive scripts chống Render ngủ đông
├── docs/                       # Hệ thống tài liệu kỹ thuật toàn diện 100%
├── archive/                    # Thư mục lưu trữ snapshot mã nguồn & tài liệu tham chiếu cũ
├── AGENT.md                    # Chỉ dẫn vận hành bắt buộc dành cho AI Agent
└── README.md                   # Hồ sơ kỹ thuật tổng thể dự án
```

---

## ⚡ Điểm Sáng Kỹ Thuật Cốt Lõi (Key Engineering Highlights)

### 1. Phân Hệ Xác Thực & Quản Lý Phiên (High-Security Auth)
- **Argon2id Hash:** Băm mật khẩu kháng GPU/ASIC với Salt 16 bytes ngẫu nhiên và hằng số thời gian an toàn.
- **Giao Thức Token Rotation Với Cửa Sổ Ân Hạn 30 Giây (Grace Period):**
  - Cấp phát cặp `Access Token` (15 phút, JWT HS256) và `Refresh Token` (7 ngày, CSPRNG hex 64 bytes).
  - Cho phép các tab trình duyệt cùng gửi refresh token cũ trong vòng 30 giây mà không bị khóa (giải quyết triệt để lỗi bất đồng bộ mạng).
- **Phát Hiện Xâm Nhập (Token Reuse Detection):**
  - Nếu refresh token cũ bị dùng lại sau 30 giây, hệ thống nhận diện đây là hành vi đánh cắp và ngay lập tức thu hồi toàn bộ gia đình phiên làm việc (`session family`).
- **Client Interceptor Mutex Lock:** Ngăn chặn hiện tượng *Thundering Herd* khi hàng loạt API đồng thời nhận lỗi 401.

### 2. Thuật Toán Cây Bình Luận Ảo Hóa Vô Hạn Cấp (Tree Virtualization)
- **PostgreSQL `ltree` Base36:** Mã hóa phân cấp 4 ký tự mỗi tầng (Ví dụ: `0001.000a.0003`). Hỗ trợ truy vấn toàn bộ cây con qua chỉ mục GiST trong $O(1)$.
- **Ngưỡng Độ Sâu Cấp 8 (Capped Depth 8):** Tự động chuyển đổi các tầng sâu hơn thành Flat Reply kèm `@mention` để giữ nguyên trải nghiệm giao diện người dùng.
- **Thuật Toán Trải Phẳng Tuyến Tính $\mathcal{O}(N)$:** Gói `@acad/tree-virtualizer` xử lý trải phẳng cây và ẩn/hiện nhánh con tức thì mà không bị đệ quy tràn stack.

### 3. Hệ Thống Đánh Giá & Điểm Số Nguyên Tử (Atomic Lua Voting)
- **Redis Lua Script:** Thực thi nguyên tử tính điểm Upvote/Downvote $\mathcal{O}(1)$, chống race condition khi hàng nghìn người cùng vote một bài viết.
- **Thuật Toán Hacker News Gravity Decay:** $Score = \frac{P - 1}{(T + 2)^{1.8}}$ liên tục đẩy các bài thảo luận giá trị và mới nhất lên đầu bảng.
- **Tối Ưu HOT Updates:** Bảng `votes` trong PostgreSQL cấu hình `fillfactor = 70` triệt tiêu chi phí cập nhật index đắt đỏ.

---

## 🚀 Hướng Dẫn Cài Đặt Nhanh (Debian 13 trixie x86_64)

> Dự án đã được tối ưu hóa và xác minh 100% trên **Debian GNU/Linux 13 (trixie)** (Kernel 6.12, bash 5.2).

### 1. Yêu Cầu Tiên Quyết
```bash
# Cài đặt các công cụ cơ bản
sudo apt update && sudo apt install -y build-essential curl git jq postgresql-client
```

### 2. Cài Đặt Node.js & PNPM
Khuyến nghị sử dụng Node.js 20+ và PNPM 9:
```bash
# Cài đặt pnpm
npm install -g pnpm@9
```

### 3. Clone & Cài Đặt Thư Viện
```bash
git clone git@github.com:mjjyv/acad_devOps-project.git
cd acad_devOps_project
pnpm install
```

### 4. Khởi Chạy Hạ Tầng Local Bằng Docker Compose
```bash
docker compose -f deploy/docker/docker-compose.dev.yml up -d infra-db infra-cache
```

### 5. Chạy Kiểm Thử Tự Động (Vitest & Typecheck)
```bash
# Chạy toàn bộ 59/59 test suites
node ./packages/tree-virtualizer/node_modules/vitest/vitest.mjs run

# Chạy kiểm tra TypeScript Strict mode trên cả 8 workspace
for dir in packages/contracts packages/ui-tokens packages/tree-virtualizer packages/auth-client services/auth services/community apps/api apps/web; do
  ./node_modules/.bin/tsc --project $dir/tsconfig.json --noEmit
done
```

### 6. Khởi Chạy Môi Trường Phát Triển Cục Bộ
```bash
pnpm dev
```
- Frontend Web Client: `http://localhost:3000`
- Backend Core API: `http://localhost:4000`

---

## 🗄️ Chiến Lược Cơ Sở Dữ Liệu: Chuyển Sang Supabase Managed DB

Hệ thống đã loại bỏ hoàn toàn cơ sở dữ liệu Render PostgreSQL cũ (đã hết hạn dùng thử/suspended) và chuyển sang **Supabase Managed PostgreSQL**:
- **Connection String:**
  ```env
  DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.asdasdasdasdasdasd.supabase.co:5432/postgres
  ```
- **Tự động nhận diện SSL:** Driver PostgreSQL tự động bật cấu hình `{ rejectUnauthorized: false }` khi kết nối tới Supabase host (`.supabase.co` hoặc `pooler.supabase.com`).
- **Cơ chế Fail-Fast & Connection Retry:** Xử lý mất kết nối CSDL theo nguyên tắc Fail-Fast 503 RFC 7807 + Exponential Backoff Connection Pooler Retry, loại bỏ hoàn toàn các cơ chế in-memory mock trong môi trường sản xuất nhằm bảo đảm tính toàn vẹn dữ liệu tuyệt đối.
- Chi tiết quy trình chuyển đổi: xem tại [`docs/04_deployment_and_devops/04_supabase_database_migration.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/04_deployment_and_devops/04_supabase_database_migration.md).

---

## 📖 Hệ Thống Tài Liệu Kỹ Thuật (Documentation Portal)

Tài liệu dự án được tổ chức khoa học trong thư mục [`docs/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/README.md):

| Thư mục | Nội dung chính |
| :--- | :--- |
| **[`docs/00_overview/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/00_overview/01_product_vision_and_prd.md)** | [Product Vision & PRD](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/00_overview/01_product_vision_and_prd.md), [System Topology](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/00_overview/02_system_topology.md), [Reddit Spec Mapping](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/00_overview/03_reddit_functional_specification.md) |
| **[`docs/01_architecture_and_data/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/01_architecture_and_data/01_database_schema_postgres.md)** | [Postgres Schema](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/01_architecture_and_data/01_database_schema_postgres.md), [Redis Keyspace](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/01_architecture_and_data/02_redis_keyspace_and_caching.md), [Data Flows DAG](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/01_architecture_and_data/03_data_flows_dag.md), [Frontend State](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/01_architecture_and_data/04_frontend_state_architecture.md) |
| **[`docs/02_core_engines/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/02_core_engines/01_auth_identity_subsystem.md)** | [Auth Subsystem](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/02_core_engines/01_auth_identity_subsystem.md), [Spaces & CMS](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/02_core_engines/02_spaces_and_content_engine.md), [Ltree Comments](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/02_core_engines/03_nested_comments_ltree.md), [Lua Voting](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/02_core_engines/04_atomic_voting_and_reputation.md), [Feed Aggregator](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/02_core_engines/05_feed_aggregation_and_discovery.md), [Reddit Realtime Chat](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/02_core_engines/06_realtime_chat_engine.md), [Admin Hub](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/02_core_engines/07_moderation_and_admin_hub.md) |
| **[`docs/03_standards_and_contracts/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/03_standards_and_contracts/01_api_contracts_openapi.md)** | [API Contracts](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/03_standards_and_contracts/01_api_contracts_openapi.md), [Code Quality](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/03_standards_and_contracts/02_code_quality_and_testing.md), [Git & CI Gates](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/03_standards_and_contracts/03_git_workflow_and_ci_gates.md), [Brutalist Tokens](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/03_standards_and_contracts/04_minimalist_brutalist_tokens.md) |
| **[`docs/04_deployment_and_devops/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/04_deployment_and_devops/01_debian13_developer_setup.md)** | [Debian 13 Setup](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/04_deployment_and_devops/01_debian13_developer_setup.md), [Docker Multi-stage](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/04_deployment_and_devops/02_docker_containerization.md), [Render Cloud IaC](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/04_deployment_and_devops/03_cloud_infrastructure_render.md), [Supabase Migration](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/04_deployment_and_devops/04_supabase_database_migration.md) |
| **[`docs/05_guides_and_verification/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/05_guides_and_verification/01_backend_testing_curl_guide.md)** | [Backend cURL Testing](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/05_guides_and_verification/01_backend_testing_curl_guide.md), [Admin & Search Testing](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/05_guides_and_verification/02_admin_and_search_testing.md), [Test Logs Registry](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/05_guides_and_verification/03_test_logs_registry.md) |
| **[`docs/06_roadmap_and_kpis/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/06_roadmap_and_kpis/01_backend_first_roadmap.md)** | [Backend-First Roadmap](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/06_roadmap_and_kpis/01_backend_first_roadmap.md), [Modules Matrix](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/06_roadmap_and_kpis/02_modules_matrix_checklist.md), [Progress Checklist](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/06_roadmap_and_kpis/03_progress_checklist.md) |

---

## 🤖 Chỉ Dẫn Vận Hành AI Agent

Mọi hoạt động phát triển, kiểm thử, cập nhật tài liệu và triển khai của Agent tuân theo quy chuẩn tại **[`AGENT.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/AGENT.md)**.
