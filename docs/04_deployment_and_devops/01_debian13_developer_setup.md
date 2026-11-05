# Cấu Hình Môi Trường Phát Triển Cho Debian GNU/Linux 13 (Trixie)

> **Mã tài liệu:** `DEVOPS-DEBIAN13-SETUP`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Hệ điều hành mục tiêu:** Debian GNU/Linux 13 (trixie) x86_64 (Kernel 6.12, bash 5.2)

---

## 1. CẬP NHẬT HỆ THỐNG & CÔNG CỤ TIÊN QUYẾT

Trên terminal của bạn (`xfce4-terminal`), chạy các lệnh sau:
```bash
# 1. Cập nhật chỉ mục gói phần mềm
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt các công cụ biên dịch và tiện ích hệ thống
sudo apt install -y build-essential curl wget git jq ca-certificates gnupg postgresql-client
```

---

## 2. CÀI ĐẶT NODE.JS (ACTIVE LTS) & PNPM 10

Khuyến nghị sử dụng **fnm** (Fast Node Manager) viết bằng Rust, tương thích hoàn hảo với bash 5.2 trên Debian:
```bash
# Cài đặt fnm
curl -fsSL https://fnm.vercel.app/install | bash
source ~/.bashrc

# Cài đặt Node.js 22 LTS
fnm install 22
fnm use 22
fnm default 22

# Kiểm tra phiên bản
node -v   # v22.x.x
npm -v

# Cài đặt PNPM 10
npm install -g pnpm@10.15.0
pnpm -v   # 10.15.0
```

---

## 3. KHỞI TẠO DỰ ÁN & CHẠY LOCAL DOCKER COMPOSE

```bash
# 1. Clone repository
git clone git@github.com:mjjyv/acad_devOps-project.git
cd acad_devOps_project

# 2. Cài đặt thư viện dependencies
pnpm install

# 3. Khởi chạy CSDL PostgreSQL 16 và Redis 7 qua Docker Compose
docker compose -f deploy/docker/docker-compose.dev.yml up -d infra-db infra-cache

# 4. Chạy kiểm thử tự động
node ./packages/tree-virtualizer/node_modules/vitest/vitest.mjs run

# 5. Khởi chạy môi trường phát triển cục bộ
pnpm dev
```
- Frontend Web Client: `http://localhost:3000`
- Backend API Gateway: `http://localhost:8080` (hoặc `4000`)
- Endpoint kiểm tra sức khỏe: `http://localhost:8080/healthz`
