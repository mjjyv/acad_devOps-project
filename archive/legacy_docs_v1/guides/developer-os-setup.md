# Hướng Dẫn Cấu Hình Môi Trường Phát Triển Cho Debian GNU/Linux 13 (Trixie)

> **Mục tiêu:** Hướng dẫn thiết lập môi trường lập trình tối ưu cho dự án Acad DevOps Monorepo trên hệ điều hành **Debian GNU/Linux 13 (trixie) x86_64** (Kernel 6.12, bash 5.2, xfce4-terminal).

---

## 1. Thông Số Hệ Thống Mục Tiêu

Dựa trên thông số thực tế từ [`reference-docs/os.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/reference-docs/os.md):
- **Hệ điều hành:** Debian GNU/Linux 13 (trixie) x86_64
- **Kernel:** Linux 6.12.111+deb13-amd64
- **Shell:** GNU bash, version 5.2.37(1)-release
- **Môi trường Desktop:** Xfce 4.20 / xfce4-terminal 1.1.4
- **Phần cứng:** Intel Core i3-12100F (8 threads), 16GB RAM, NVIDIA GTX 1050 Ti

---

## 2. Cài Đặt Công Cụ Nền Tảng (Core Development Toolchain)

Mở **xfce4-terminal** và chạy các lệnh dưới đây:

### 2.1. Cập Nhật Hệ Thống & Cài Đặt Tiện Ích Cơ Bản
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl wget git jq ca-certificates gnupg lsb-release
```

### 2.2. Cài Đặt Node.js 20+ (LTS) & Quản Lý Phiên Bản
Khuyến nghị sử dụng **fnm** (Fast Node Manager) viết bằng Rust, tương thích hoàn hảo với bash 5.2:
```bash
# Cài đặt fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Áp dụng fnm vào bash session hiện tại
source ~/.bashrc

# Cài đặt Node.js LTS (Node 22 / 20)
fnm install 20
fnm use 20
fnm default 20

# Kiểm tra phiên bản
node -v   # v20.x.x
npm -v
```

### 2.3. Cài Đặt PNPM (Fast & Disk-efficient Package Manager)
Monorepo Acad DevOps yêu cầu `pnpm` workspace:
```bash
# Kích hoạt corepack hoặc cài trực tiếp pnpm
npm install -g pnpm@9

# Kiểm tra phiên bản
pnpm -v   # 9.x.x
```

### 2.4. Cài Đặt Docker & Docker Compose Trên Debian 13
```bash
# Thêm khóa GPG chính thức của Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Thêm Docker apt repository cho Debian
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài đặt Docker CE và Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Thêm user hiện tại vào group docker để chạy lệnh không cần sudo
sudo usermod -aG docker $USER
newgrp docker

# Kiểm tra docker
docker --version
docker compose version
```

### 2.5. Cài Đặt Tiện Ích Client CSDL (PostgreSQL & Redis)
Cần thiết để debug và chạy các lệnh kiểm thử kết nối Supabase và Redis:
```bash
sudo apt install -y postgresql-client redis-tools
```

---

## 3. Khởi Chạy Dự Án Cục Bộ (Local Monorepo Workflow)

### Bước 1: Clone & Cài Đặt Dependencies
```bash
cd ~/Documents/100_academy/acad_it_devOps/acad_devOps_project

# Cài đặt toàn bộ dependencies của Monorepo
pnpm install
```

### Bước 2: Thiết Lập Biến Môi Trường Cục Bộ
Sao chép file cấu hình mẫu:
```bash
cp .env.example .env.local
```
Chỉnh sửa cấu hình `.env.local` nếu muốn kết nối tới Supabase Cloud hoặc sử dụng Docker Compose cục bộ.

### Bước 3: Khởi Động Hạ Tầng Cục Bộ (Docker Compose)
Khởi chạy container PostgreSQL 16 và Redis 7:
```bash
docker compose -f deploy/docker/docker-compose.dev.yml up -d infra-db infra-cache
```

### Bước 4: Chạy Kiểm Thử Toàn Bộ Dự Án
```bash
# Chạy Vitest trên toàn bộ workspace
pnpm test

# Chạy TypeScript typecheck
pnpm typecheck

# Chạy Biome linting
pnpm lint
```

### Bước 5: Khởi Động Chế Độ Phát Triển (Development Servers)
```bash
# Khởi động đồng thời cả Core API và Web Client
pnpm dev
```
- Core API hoạt động tại: `http://localhost:4000`
- Web Client hoạt động tại: `http://localhost:3000`

---

## 4. Tối Ưu Hóa Hiệu Năng Cho Debian 13 (Pro Tips)

1. **Tăng Inotify File Watcher Limits:**
   Tránh lỗi `ENOSPC: System limit for number of file watchers reached` khi chạy Vite/Next.js trên Monorepo lớn:
   ```bash
   echo "fs.inotify.max_user_watches=524288" | sudo tee -a /etc/sysctl.d/99-antigravity.conf
   sudo sysctl -p /etc/sysctl.d/99-antigravity.conf
   ```

2. **Cấu Hình Git Semantic Commits:**
   Đảm bảo Git commit message tuân thủ quy chuẩn dự án:
   ```bash
   git config --global core.editor "nano" # hoặc vim / code
   git config --global init.defaultBranch main
   ```
