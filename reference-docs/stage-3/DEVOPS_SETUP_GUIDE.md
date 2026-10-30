# HƯỚNG DẪN VẬN HÀNH NỀN TẢNG DEVOPS & MÔI TRƯỜNG PHÁT TRIỂN (GIAI ĐOẠN 3)

Tài liệu hướng dẫn chi tiết quy trình thiết lập môi trường nội bộ, tự động hóa kiểm định chất lượng và đóng gói triển khai đám mây cho dự án **Acad Community Platform**.

---

## 1. KHỞI ĐỘNG MÔI TRƯỜNG CỤC BỘ QUA DOCKER COMPOSE

Môi trường phát triển nội bộ được điều phối tập trung qua tệp `deploy/docker/docker-compose.dev.yml` gồm 4 dịch vụ:
1. **`infra-db`:** PostgreSQL 16 Alpine (Port `5432`).
2. **`infra-cache`:** Redis 7 Alpine (Port `6379`).
3. **`core-api`:** Backend API Gateway (Port `8080`).
4. **`web-client`:** Frontend Next.js 15 (Port `3000`).

### Lệnh khởi chạy:
```bash
# Khởi động toàn bộ các dịch vụ dưới dạng tiến trình nền (detached mode)
docker compose -f deploy/docker/docker-compose.dev.yml up -d
```

### Kiểm tra trạng thái sức khỏe:
```bash
# Xem trạng thái các container và healthcheck probes
docker compose -f deploy/docker/docker-compose.dev.yml ps
```

### Tự động nạp CSDL ban đầu:
- Thư mục `deploy/docker/init-db.sql` được gắn tự động vào `/docker-entrypoint-initdb.d/` của PostgreSQL.
- Khi container khởi tạo lần đầu tiên, toàn bộ extensions (`uuid-ossp`, `pgcrypto`, `ltree`, `pg_trgm`) và các bảng danh tính, không gian, bài viết, cây bình luận `ltree` và bộ đếm sẽ được tạo sẵn sàng 100%.

---

## 2. QUY TRÌNH KIỂM THỬ & KIỂM ĐỊNH MÃ NGUỒN CỤC BỘ

Trước khi tạo Pull Request, lập trình viên chạy tuần tự các cổng kiểm tra:

```bash
# 1. Cài đặt các gói phụ thuộc
pnpm install

# 2. Kiểm định tính toàn vẹn kiểu dữ liệu toàn Monorepo
pnpm run typecheck

# 3. Chạy toàn bộ bộ kiểm thử tự động (Unit & Integration Tests)
pnpm test
```

---

## 3. ĐÓNG GÓI CONTAINER SẢN XUẤT SIÊU NHẸ (MULTI-STAGE DOCKER)

Dự án áp dụng kỹ thuật **Multi-stage Docker Build** để triệt tiêu toàn bộ rác biên dịch, source files và `devDependencies`:

### Đóng gói Backend API (`< 100MB`):
```bash
docker build -f deploy/docker/Dockerfile.api.prod -t acad-api:prod .
```
- Sử dụng base image `node:24-alpine`.
- Chạy dưới quyền tài khoản phi quản trị `appuser` (non-root) để bảo vệ container.

### Đóng gói Frontend Next.js (`< 150MB` thay vì 1.5GB):
```bash
docker build -f deploy/docker/Dockerfile.web.prod -t acad-web:prod .
```
- Kích hoạt tính năng `output: "standalone"` trong `next.config.mjs`.
- Image chỉ chứa đúng các file cần thiết chạy Node.js server độc lập cùng thư mục `.next/static`.

---

## 4. QUY TRÌNH CI/CD TỰ ĐỘNG HÓA QUA GITHUB ACTIONS

Tệp `.github/workflows/ci.yml` thiết lập 4 cổng kiểm soát tự động trên mỗi Pull Request vào nhánh `main` và `develop`:

```text
[Pull Request tạo mới / Cập nhật commit]
                    │
                    ▼
     [Cổng 1: Lint & Code Formatting]
                    │
                    ▼
     [Cổng 2: TypeScript & OpenAPI Integrity]
                    │
                    ▼
     [Cổng 3: Automated Test Suites (33+ tests PASS)]
                    │
                    ▼
     [Cổng 4: Dockerfiles Syntax Verification]
                    │
                    ▼
          [MERGE ĐƯỢC CHẤP THUẬN]
```

---

## 5. TRIỂN KHAI ĐÁM MÂY (RENDER BLUEPRINT) & CHỐNG NGỦ ĐÔNG

### Triển khai bằng Infrastructure-as-Code:
1. Đăng nhập vào Render Dashboard.
2. Chọn **Blueprints** $\rightarrow$ **New Blueprint Instance**.
3. Trỏ tới kho lưu trữ Git và chọn file `deploy/render/render.yaml`.
4. Render sẽ tự động dựng đồng thời cả 2 dịch vụ `acad-web-client` và `acad-core-api`.

### Khắc phục hiện tượng Ngủ đông (Spin-down Mitigation):
- Các Web Service miễn phí trên Render sẽ tự động ngủ đông sau 15 phút không nhận request, gây độ trễ khởi động lại (Cold Start) 50-90 giây.
- **Giải pháp:** Sử dụng công cụ giám sát miễn phí (UptimeRobot, Cron-job.org) hoặc chạy kịch bản nền:
  ```bash
  # Gửi HTTP ping mỗi 10 phút (600 giây) vào endpoint /healthz
  ./deploy/scripts/keep-alive.sh https://acad-core-api.onrender.com/healthz https://acad-web-client.onrender.com/ 600
  ```
