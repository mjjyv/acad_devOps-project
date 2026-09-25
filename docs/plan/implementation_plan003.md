# Kế hoạch Chi tiết Triển khai Giai đoạn 3: Thiết lập Nền tảng & Môi trường Phát triển (Foundation & DevOps Setup)

## Tổng quan & Bối cảnh

Sau khi đã hoàn thành trọn vẹn **Giai đoạn 1** (Khảo sát, PRD, Ma trận RBAC/ABAC, Lõi Auth Token Rotation) và **Giai đoạn 2** (Lược đồ CSDL PostgreSQL 16 mở rộng với `ltree` & `thread_counters`, Hợp đồng API OpenAPI 3.1 & SSE, Động cơ Redis Lua Voting và Design Tokens/Tree Virtualizer) với **33/33 tests PASS 100%**, dự án chuyển sang **Giai đoạn 3**.

Mục tiêu của Giai đoạn 3 là dựng khung sườn kỹ thuật, công cụ và luồng tự động hóa DevOps nhằm đảm bảo toàn bộ nhóm và AI Agent phát triển trên một môi trường đồng nhất (loại bỏ hoàn toàn lỗi *"chạy được trên máy tôi nhưng lỗi trên máy khác"*), tự động hóa kiểm định chất lượng (CI/CD Gates) và đóng gói container siêu nhẹ sẵn sàng triển khai đám mây (Render / Cloud).

---

## User Review Required

> [!IMPORTANT]
> **Quy chuẩn Cấu trúc Monorepo & Framework Ứng dụng**:
> - Khởi tạo khung ứng dụng Frontend **`apps/web`** (Next.js 15 App Router, RSC, Tailwind CSS) kết nối trực tiếp với `@acad/ui-tokens` và `@acad/contracts`.
> - Khởi tạo khung ứng dụng Backend API **`apps/api`** kết nối các dịch vụ `@acad/auth-service` và `@acad/community-service` để chạy HTTP Server phục vụ các endpoint từ `openapi.yaml`.

> [!NOTE]
> **Giải pháp DevOps Cốt lõi**:
> 1. **Docker Compose Cục bộ (`docker-compose.dev.yml`):** Dựng cụm 4 dịch vụ (`infra-db` PostgreSQL 16 Alpine, `infra-cache` Redis 7 Alpine, `core-api`, `web-client`) chỉ với 1 câu lệnh `docker compose up`, tự động nạp các script migration SQL và bật extensions `ltree`, `uuid-ossp`, `pgcrypto`, `pg_trgm`.
> 2. **Multi-stage Docker Build:** Đóng gói image sản xuất tối ưu dung lượng: Backend image < 100MB (dùng runner tối giản) và Frontend image < 150MB (tận dụng tính năng `output: "standalone"` của Next.js).
> 3. **4 Cổng Tự động hóa CI/CD (GitHub Actions):** Tự động kích hoạt khi có Pull Request: Cổng 1 (Linting) $\rightarrow$ Cổng 2 (Type Integrity & OpenAPI) $\rightarrow$ Cổng 3 (Unit & Integration Tests) $\rightarrow$ Cổng 4 (Dry-run Container Build).
> 4. **Render Cloud Blueprint (IaC):** Tệp cấu hình `render.yaml` khai báo hạ tầng đám mây dạng mã nguồn kèm giải pháp chống ngủ đông (Spin-down Mitigation) qua endpoint kiểm tra sức khỏe `/healthz`.

---

## Proposed Changes

Kế hoạch triển khai Giai đoạn 3 được chia làm 5 phân hệ cụ thể:

```
[Phân hệ 1: Cấu trúc Monorepo & Scaffold Apps] ──> [Phân hệ 2: Môi trường Local Docker Compose]
                     │                                              │
                     ▼                                              ▼
[Phân hệ 3: Multi-stage Production Dockerfiles] ──> [Phân hệ 4: CI/CD GitHub Actions & Render IaC]
```

---

### Phân hệ 1: Cấu trúc Monorepo & Khởi tạo Khung Ứng Dụng (Apps Scaffold)

#### [NEW] [apps/web/package.json](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/package.json)
- Khởi tạo package `@acad/web` cho ứng dụng Frontend Next.js:
  - Dependencies: `@acad/contracts`, `@acad/ui-tokens`, `@acad/auth-client`, `@acad/tree-virtualizer`.

#### [NEW] [apps/web/next.config.mjs](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/next.config.mjs)
- Cấu hình Next.js với tính năng `output: "standalone"` phục vụ đóng gói Docker container siêu nhẹ.

#### [NEW] [apps/api/package.json](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/package.json)
- Khởi tạo package `@acad/api` cho ứng dụng Backend Server:
  - Dependencies: `@acad/contracts`, `@acad/auth-service`, `@acad/community-service`.

#### [NEW] [apps/api/src/server.ts](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/server.ts)
- Khởi tạo máy chủ HTTP API tích hợp endpoint kiểm tra sức khỏe hệ thống `/healthz` (Healthcheck probe cho Docker & Render).

#### [NEW] [.env.example](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/.env.example)
- Mẫu cấu hình toàn diện các biến môi trường:
  - Database: `DATABASE_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
  - Cache: `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`.
  - Auth: `JWT_SECRET`, `ACCESS_TOKEN_TTL`, `REFRESH_TOKEN_TTL`.
  - Storage: `CLOUDFLARE_R2_BUCKET`, `R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_ENDPOINT`.
  - Server & Ports: `API_PORT`, `WEB_PORT`, `NODE_ENV`.

#### [NEW] [biome.json](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/biome.json)
- Cấu hình chuẩn hóa mã nguồn (Linter & Formatter) cho toàn bộ Monorepo.

---

### Phân hệ 2: Môi trường Phát triển Cục bộ qua Docker Compose (Local Orchestration)

#### [NEW] [deploy/docker/docker-compose.dev.yml](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/docker-compose.dev.yml)
- Điều phối 4 services:
  - **`infra-db` (PostgreSQL 16 Alpine):** Port `5432:5432`, volume bền vững `pgdata`, healthcheck `pg_isready -U postgres`. Mount thư mục migrations tự động chạy khi khởi tạo.
  - **`infra-cache` (Redis 7 Alpine):** Port `6379:6379`, volume `redisdata`, healthcheck `redis-cli ping`.
  - **`core-api` (Dev API Container):** Port `8080:8080`, mount source code, depends_on `infra-db` & `infra-cache`.
  - **`web-client` (Dev Web Container):** Port `3000:3000`, mount source code, bảo vệ `node_modules` bên trong container.

#### [NEW] [deploy/docker/init-db.sql](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/init-db.sql)
- Script tự động bật các extensions (`uuid-ossp`, `pgcrypto`, `ltree`, `pg_trgm`) và nạp schema từ các file migration ngay khi container khởi động lần đầu tiên.

---

### Phân hệ 3: Đóng gói Container Image Tối ưu (Multi-Stage Dockerfiles)

#### [NEW] [deploy/docker/Dockerfile.api.prod](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/Dockerfile.api.prod)
- Multi-stage build cho Backend:
  - `builder stage`: Cài đặt dependencies, compile TypeScript sang JS tối ưu.
  - `runner stage`: Dùng image Alpine/Slim, chỉ sao chép dist và production node_modules, chạy dưới quyền non-root user (`nodejs`/`appuser`), kích thước < 100MB.

#### [NEW] [deploy/docker/Dockerfile.web.prod](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/Dockerfile.web.prod)
- Multi-stage build cho Frontend Next.js:
  - Tận dụng `output: "standalone"` và thư mục `.next/static`.
  - Loại bỏ hoàn toàn `devDependencies` và source files không cần thiết, giảm kích thước container từ 1.5GB xuống dưới 150MB.

#### [NEW] [.dockerignore](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/.dockerignore)
- Loại trừ `node_modules`, `.git`, `.next`, `dist`, `.env` khỏi context build Docker nhằm tăng tốc build gấp 5 lần.

---

### Phân hệ 4: Pipeline Tự động hóa CI/CD (GitHub Actions Automation Gates)

#### [NEW] [.github/workflows/ci.yml](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/.github/workflows/ci.yml)
- Kích hoạt trên mọi Pull Request vào nhánh `main` và `develop`:
  - **Job 1: `lint-and-format`:** Kiểm tra quy chuẩn mã nguồn với Biome/Linter.
  - **Job 2: `type-integrity`:** Chạy `pnpm run typecheck` xác nhận tính toàn vẹn kiểu dữ liệu toàn Monorepo.
  - **Job 3: `automated-tests`:** Chạy toàn bộ 33+ test suites qua `pnpm test` với cache pnpm store.
  - **Job 4: `docker-dry-run`:** Thử nghiệm build container images để bắt sớm lỗi cấu hình Dockerfile trước khi merge.

---

### Phân hệ 5: Hạ tầng Triển khai Đám mây & Khắc phục Ngủ đông (Render IaC & Docs)

#### [NEW] [deploy/render/render.yaml](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/render/render.yaml)
- Bản Blueprint Infrastructure-as-Code (IaC) khai báo tài nguyên trên Render:
  - Service 1: `web-client` (Next.js Node Web Service).
  - Service 2: `core-api` (Docker Web Service).
  - Khai báo ma trận biến môi trường liên kết giữa Frontend và Backend.

#### [NEW] [deploy/scripts/keep-alive.sh](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/scripts/keep-alive.sh)
- Script gửi HTTP ping định kỳ mỗi 10 phút vào `/healthz` và `/` để ngăn chặn cơ chế ngủ đông (Spin-down) của Render Free Tier trong các buổi demo đồ án.

#### [NEW] [docs/stage-3/DEVOPS_SETUP_GUIDE.md](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-3/DEVOPS_SETUP_GUIDE.md)
- Cẩm nang tài liệu hướng dẫn vận hành chi tiết:
  - Cách khởi động toàn bộ môi trường cục bộ chỉ với `docker compose -f deploy/docker/docker-compose.dev.yml up -d`.
  - Cách chạy kiểm tra tự động trước khi commit theo chuẩn Conventional Commits.
  - Hướng dẫn kết nối cơ sở dữ liệu trên đám mây (Neon/Supabase) và triển khai Blueprint lên Render.

---

## Verification Plan

### Automated Tests
1. **Kiểm tra biên dịch Kiểu dữ liệu toàn Monorepo:**
   ```bash
   pnpm run typecheck
   ```
2. **Chạy toàn bộ Bộ kiểm thử Tự động:**
   ```bash
   pnpm test
   ```
3. **Kiểm tra tính hợp lệ cú pháp của Docker Compose và Render IaC:**
   - Kiểm tra định dạng YAML và các liên kết services.
4. **Kiểm tra Cú pháp GitHub Actions Workflow:**
   - Đảm bảo các action steps, triggers và ma trận jobs không gặp lỗi cú pháp.

### Manual Verification
1. **Kiểm tra Endpoint `/healthz`:**
   - Chạy thử nghiệm server API và gửi HTTP request đến `/healthz` để xác nhận phản hồi `200 OK` `{ status: "ok" }`.
2. **Kiểm tra Cấu hình `.env.example`:**
   - Rà soát tính đầy đủ của toàn bộ các biến môi trường cần thiết cho cả 4 phân hệ.
