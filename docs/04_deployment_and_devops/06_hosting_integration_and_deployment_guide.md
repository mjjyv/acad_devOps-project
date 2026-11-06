# Cẩm Nang Nhận Diện Hosting, Kế Hoạch Tích Hợp & Quy Trình Triển Khai Chi Tiết

> **Mã tài liệu:** `DEVOPS-HOSTING-INTEGRATION-PLAYBOOK`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Thời điểm lập:** 2026-11-06T08:30:00+07:00  
> **Phiên bản:** 2.0.0 (Production-Ready)

---

## 1. NHẬN DIỆN & PHÂN TÍCH HẠ TẦNG HOSTING CỦA DỰ ÁN

Hiện tại, hệ thống sở hữu **2 nền tảng hạ tầng song song**, sẵn sàng cho việc kết hợp linh hoạt:

```
[Khách hàng / Trình duyệt]
           │
           ▼
[Hostinger Domain] ──► [Cloudflare Edge: DNS + WAF + SSL Miễn Phí]
                                   │
       ┌───────────────────────────┴───────────────────────────┐
       ▼ (Cloudflare Tunnel - Đang ACTIVE)                      ▼ (Render CNAME Routing)
[Hạ Tầng 1: Debian Laptop Homelab]                    [Hạ Tầng 2: Cloud PaaS Render]
├── Next.js Web Client (Port 3000)                    ├── acad-web-client.onrender.com
├── Core API Gateway (Port 10000)                     ├── acad-core-api.onrender.com
└── PostgreSQL 16 & Redis 7 (Local / Supabase)        └── Supabase Postgres & Upstash Redis
```

### So Sánh 2 Phương Án Hạ Tầng

| Tiêu Chí | Hạ Tầng 1: Debian Laptop (Homelab) | Hạ Tầng 2: Render Cloud (PaaS) |
| :--- | :--- | :--- |
| **Chi phí hạ tầng** | **0 VNĐ** (Tận dụng phần cứng sẵn có) | **0 VNĐ** (Free Tier) |
| **Tài nguyên (RAM/CPU)** | **Cao** (8GB - 16GB RAM, đa nhân thực) | **Thấp** (512MB RAM, 0.1 CPU chia sẻ) |
| **Hiện tượng ngủ đông (Cold Start)** | **Không có** (Phản hồi tức thì < 20ms) | **Có** (Ngủ sau 15p, khởi động lại mất 40-50s) |
| **Độ ổn định 24/7** | Phụ thuộc nguồn điện & Wi-Fi nhà bạn | Đạt SLA 99.9% của datacenter Singapore |
| **Tính riêng tư CSDL** | CSDL lưu trực tiếp trên ổ SSD của máy | CSDL lưu trên Cloud (Supabase/Neon) |
| **Trạng thái hiện tại** | Daemon `cloudflared` **đã cài đặt & ACTIVE** | Đã triển khai **LIVE & HEALTHY 200 OK** |

> [!TIP]
> **Khuyến nghị kiến trúc (Hybrid Model):**
> 1. Dùng **Tên miền Hostinger + Cloudflare Tunnel** trỏ về **Debian Laptop** làm môi trường phục vụ chính: Tốc độ tối đa, không bị giới hạn 512MB RAM, xử lý tức thì không có độ trễ ngủ đông.
> 2. Giữ **Render Cloud** làm bản dự phòng (Staging / Failover Fallback) chạy song song từ cùng một kho mã nguồn GitHub.

---

## 2. KẾ HOẠCH TÍCH HỢP TỔNG THỂ (INTEGRATION BLUEPRINT)

### 2.1. Phân Bổ Tên Miền (Subdomain Mapping)
Giả sử tên miền bạn sở hữu tại Hostinger là `yourdomain.com`:

1. **`yourdomain.com`** (hoặc `app.yourdomain.com`):
   - Đích đến: Frontend Web Client (Next.js 15 Brutalist UI).
   - Địa chỉ nội bộ: `http://localhost:3000`.
2. **`api.yourdomain.com`**:
   - Đích đến: Backend API Gateway (Express, Auth, Spaces, Feeds, Chat, Admin).
   - Địa chỉ nội bộ: `http://localhost:10000`.
3. **`db.yourdomain.com` (Tùy chọn quản trị an toàn):**
   - Đích đến: PostgreSQL 16 (Port `5432`).
   - Bảo mật: Cấu hình qua Cloudflare Access TCP, chỉ các kết nối có chứng thực Zero Trust mới được truy cập qua DBeaver/DataGrip.

---

## 3. HƯỚNG DẪN TRIỂN KHAI CHI TIẾT TỪNG BƯỚC (RUNBOOK)

### BƯỚC 1: ỦY QUYỀN DNS TỪ HOSTINGER SANG CLOUDFLARE

1. **Trên Cloudflare Dashboard (`dash.cloudflare.com`):**
   - Nhấn **Add a domain** $\rightarrow$ Nhập tên miền (ví dụ: `yourdomain.com`).
   - Chọn gói **Free** $\rightarrow$ Nhấn **Continue**.
   - Cloudflare sẽ hiển thị 2 địa chỉ Nameservers, ví dụ:
     - `ns1.cloudflare.com`
     - `ns2.cloudflare.com`
2. **Trên Hostinger Control Panel (`hpanel.hostinger.com`):**
   - Vào mục **Domains** $\rightarrow$ Chọn tên miền của bạn $\rightarrow$ Chọn tab **DNS / Nameservers**.
   - Nhấn nút **Change nameservers**.
   - Chọn **Change nameservers** (thay thế thủ công), dán 2 địa chỉ Nameservers của Cloudflare vào $\rightarrow$ Nhấn **Save**.
   - Quay lại Cloudflare bấm **Check nameservers now** (Trạng thái chuyển sang `Active` sau 5–15 phút).

---

### BƯỚC 2: CẤU HÌNH CLOUDFLARE TUNNEL (PUBLIC HOSTNAMES)

> [!NOTE]
> Hệ thống kiểm tra thấy daemon `cloudflared.service` **đã được cài đặt và đang chạy sẵn (Active Running)** trên laptop của bạn!

1. Truy cập **Cloudflare Zero Trust** (`one.dash.cloudflare.com`).
2. Vào **Networks** $\rightarrow$ **Tunnels** $\rightarrow$ Chọn tunnel hiện tại của máy Debian laptop $\rightarrow$ Bấm **Configure**.
3. Chuyển sang tab **Public Hostnames** $\rightarrow$ Thêm 2 bản ghi định tuyến:

#### Bản ghi 1: Dành cho Backend API Gateway
- **Subdomain:** `api`
- **Domain:** `yourdomain.com`
- **Path:** để trống
- **Type:** `HTTP`
- **URL:** `localhost:10000`
- Nhấn **Save hostname**.

#### Bản ghi 2: Dành cho Frontend Web Client
- **Subdomain:** để trống (hoặc `app`)
- **Domain:** `yourdomain.com`
- **Path:** để trống
- **Type:** `HTTP`
- **URL:** `localhost:3000`
- Nhấn **Save hostname**.

---

### BƯỚC 3: CẤU HÌNH VÀ VẬN HÀNH DỊCH VỤ TRÊN DEBIAN

#### 1. Biên dịch toàn bộ Monorepo sẵn sàng cho Production
Tại thư mục dự án trên Debian (`/home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project`):

```bash
# 1. Cài đặt dependencies và liên kết workspace
pnpm install

# 2. Build toàn bộ thư viện, backend services, và frontend web
pnpm run build
```

#### 2. Thiết lập Biến Môi Trường Cục Bộ (.env.production)
Hệ thống sử dụng trực tiếp PostgreSQL 16 và Redis 7 lưu trên ổ cứng cục bộ (`.data/postgres` và `.data/redis`):

```bash
cat << 'EOF' > .env.production
NODE_ENV=production
PORT=10000
API_PORT=10000
WEB_PORT=3000

# CSDL PostgreSQL & Redis Cục Bộ (Rootless Podman, lưu trữ tại .data/)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/acad_dev?sslmode=disable
DATABASE_SSL=false
REDIS_URL=redis://localhost:6379

# Khóa bảo mật ký token JWT (Tối thiểu 32 ký tự)
JWT_SECRET=acad_super_secure_production_secret_key_2026_at_least_32_chars!

# URL Frontend cho phép CORS
CORS_ORIGIN=https://yourdomain.com,https://app.yourdomain.com,http://localhost:3000
EOF
```

#### 3. Quản trị Dịch vụ bằng Systemd User (Không cần mật khẩu sudo)
Các dịch vụ nền được quản lý độc lập bằng Systemd User Units trong `~/.config/systemd/user/`:
- `acad-api.service`: Vận hành Backend API Gateway tại `http://localhost:10000`.
- `acad-web.service`: Vận hành Next.js 15 Web Client tại `http://localhost:3000`.
- Podman Rootless: Tự động quản lý 2 container `acad-postgres` (Port 5432) và `acad-redis` (Port 6379).

Bộ kịch bản quản trị 1 chạm `./scripts/manage-homelab.sh`:
```bash
./scripts/manage-homelab.sh start    # Bật toàn bộ Postgres, Redis, API Gateway và Web
./scripts/manage-homelab.sh stop     # Dừng toàn bộ các dịch vụ
./scripts/manage-homelab.sh restart  # Khởi động lại toàn bộ
./scripts/manage-homelab.sh test     # Kiểm tra sức khỏe 4 phân hệ (Postgres, Redis, API, Web)
./scripts/manage-homelab.sh status   # Xem trạng thái Systemd, Podman và Cloudflare Tunnel
```
EOF

# Kích hoạt và khởi chạy dịch vụ
sudo systemctl daemon-reload
sudo systemctl enable --now acad-api.service
sudo systemctl status acad-api.service
```

#### 4. Đóng gói Frontend Web Client thành Systemd Service
Tương tự cho Next.js 15:

```bash
sudo tee /etc/systemd/system/acad-web.service << EOF
[Unit]
Description=Acad DevOps Platform - Next.js Web Client
After=network.target

[Service]
Type=simple
User=debv
WorkingDirectory=/home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web
ExecStart=/home/debv/.local/bin/pnpm exec next start -p 3000 -H 0.0.0.0
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=NEXT_PUBLIC_API_URL=https://api.yourdomain.com

[Install]
WantedBy=multi-user.target
EOF

# Kích hoạt và khởi chạy dịch vụ
sudo systemctl daemon-reload
sudo systemctl enable --now acad-web.service
sudo systemctl status acad-web.service
```

---

### BƯỚC 4: TINH CHỈNH LAPTOP DEBIAN VẬN HÀNH BỀN BỈ 24/7

Để laptop hoạt động liên tục như một máy chủ vật lý mà không bị tắt màn hình hay ngắt mạng:

1. **Chống tự động Sleep khi gập nắp máy:**
   ```bash
   sudo sed -i 's/#HandleLidSwitch=suspend/HandleLidSwitch=ignore/' /etc/systemd/logind.conf
   sudo sed -i 's/#HandleLidSwitchExternalPower=suspend/HandleLidSwitchExternalPower=ignore/' /etc/systemd/logind.conf
   sudo systemctl restart systemd-logind
   ```

2. **Cố định IP cục bộ (Static DHCP):**
   - Đăng nhập vào Router Wi-Fi gia đình $\rightarrow$ Tìm mục DHCP Reservation $\rightarrow$ Gán địa chỉ MAC của laptop với một IP tĩnh (ví dụ: `192.168.1.150`).

3. **Bảo vệ pin laptop:**
   - Cắm sạc liên tục. Nếu laptop là dòng ThinkPad, Asus, Dell, hoặc Lenovo có tính năng Battery Threshold (giới hạn sạc tối đa 60% hoặc 80%), hãy bật lên để bảo vệ tuổi thọ pin khi cắm sạc dài hạn.

---

### BƯỚC 5: KIỂM THỬ XÁC THỰC TOÀN DIỆN (VERIFICATION PROTOCOL)

Sau khi hoàn tất, mở terminal trên máy hoặc điện thoại (dùng 4G/5G) để kiểm tra:

```bash
# 1. Kiểm tra DNS và chứng chỉ SSL HTTPS qua tên miền
curl -I https://api.yourdomain.com/healthz

# 2. Kiểm tra dữ liệu JSON sức khỏe hệ thống
curl -s https://api.yourdomain.com/healthz | jq .

# 3. Kiểm tra Web Client
curl -I https://yourdomain.com
```
