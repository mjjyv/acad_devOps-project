# Hạ Tầng Đám Mây Render Cloud & Cơ Chế Giữ Ấm (Cloud Infrastructure & Keep-Alive)

> **Mã tài liệu:** `DEVOPS-RENDER-CLOUD`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Cấu hình:** [`deploy/render/render.yaml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/render/render.yaml), [`deploy/scripts/keep-alive.sh`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/scripts/keep-alive.sh)

---

## 1. BẢN THIẾT KẾ HẠ TẦNG (RENDER BLUEPRINT INFRASTRUCTURE-AS-CODE)

Dự án khai báo toàn bộ dịch vụ đám mây thông qua tệp IaC `render.yaml`:
- **Web Service 1 (`acad-web-client`):**
  - Môi trường: Node.js (Region Singapore)
  - Build Command: `pnpm install --frozen-lockfile && pnpm run build:libs && pnpm --filter @acad/web run build`
  - Start Command: `pnpm --filter @acad/web exec next start -p $PORT -H 0.0.0.0`
  - Biến môi trường: `NEXT_PUBLIC_API_URL=https://acad-core-api.onrender.com`
- **Web Service 2 (`acad-core-api`):**
  - Môi trường: Docker Web Service (Region Singapore)
  - Dockerfile Path: `deploy/docker/Dockerfile.api.prod`
  - Healthcheck Path: `/healthz`
  - Biến môi trường: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`.

---

## 2. CƠ CHẾ DUY TRÌ HOẠT ĐỘNG CHỐNG NGỦ ĐÔNG (SPIN-DOWN MITIGATION)

- **Vấn đề trên Render Free Tier:** Dịch vụ miễn phí tự động rơi vào trạng thái ngủ đông (Spin-down) sau 15 phút không nhận được lưu lượng truy cập, khiến lần truy cập tiếp theo bị trễ từ 40 đến 50 giây (Cold Start).
- **Giải pháp:** Sử dụng script nền [`deploy/scripts/keep-alive.sh`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/scripts/keep-alive.sh) gửi yêu cầu HTTP định kỳ mỗi 10 phút (600 giây) vào endpoint `/healthz`:
  ```bash
  ./deploy/scripts/keep-alive.sh https://acad-core-api.onrender.com/healthz https://acad-web-client.onrender.com 600
  ```
- Script ghi nhận mã trạng thái phản hồi HTTP (200 OK) và duy trì máy chủ luôn ở trạng thái sẵn sàng phục vụ tức thì.
