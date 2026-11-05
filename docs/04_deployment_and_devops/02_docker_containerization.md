# Đóng Gói Docker Container & Multi-Stage Builds (Docker Containerization)

> **Mã tài liệu:** `DEVOPS-DOCKER-CONTAINERS`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Tập tin cấu hình:** [`deploy/docker/Dockerfile.api.prod`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/Dockerfile.api.prod), [`deploy/docker/Dockerfile.web.prod`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/Dockerfile.web.prod), [`deploy/docker/docker-compose.dev.yml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/docker-compose.dev.yml)

---

## 1. DOCKERFILE MULTI-STAGE CHO BACKEND API (KÍCH THƯỚC < 100MB)

- **Stage 1 (Builder):** Sử dụng `node:24-alpine`, kích hoạt corepack pnpm 10.15.0, copy `pnpm-lock.yaml` và các tệp `package.json`, biên dịch TypeScript sang JavaScript trong thư mục `dist/`.
- **Stage 2 (Runner):** Chỉ copy các gói thư viện đã build và dependencies sản xuất.
  - Tạo tài khoản hệ thống không có quyền root (`appuser`, UID 1001) để phòng ngừa nguy cơ leo thang đặc quyền (Privilege Escalation).
  - Khai báo chỉ thị kiểm tra sức khỏe `HEALTHCHECK` định kỳ 10s qua wget `/healthz`.
  - Kích thước image hoàn thiện: **~85MB**.

---

## 2. DOCKERFILE MULTI-STAGE CHO FRONTEND NEXT.JS (KÍCH THƯỚC < 150MB)

- Tận dụng tính năng **Next.js Standalone Build** (`output: 'standalone'` trong `next.config.mjs`).
- Thay vì đóng gói toàn bộ thư mục `node_modules` nặng hơn 1.5GB, Next.js tự động truy vết và chỉ trích xuất đúng các tệp phụ thuộc tối thiểu cần thiết để máy chủ chạy độc lập.
- Khởi chạy dưới quyền non-root `nextjs:nodejs` (UID 1001).
- Kích thước image hoàn thiện: **~135MB**.

---

## 3. ĐIỀU PHỐI MÔI TRƯỜNG PHÁT TRIỂN CỤC BỘ (DOCKER COMPOSE DEV)

Tệp `deploy/docker/docker-compose.dev.yml` khởi tạo 4 dịch vụ độc lập kết nối qua mạng nội bộ `acad-internal-net`:
1. `infra-db`: PostgreSQL 16 Alpine, tự động nạp [`deploy/docker/init-db.sql`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/init-db.sql) để tạo extensions và tables.
2. `infra-cache`: Redis 7 Alpine, chạy chế độ in-memory siêu tốc.
3. `core-api`: Gắn kết mã nguồn thời gian thực (Hot-reload) qua volume.
4. `web-client`: Giao diện Next.js chạy tại cổng 3000.
