Viewed page.tsx:1-9
Viewed PRD_STAGE_1_DISCOVERY.md:1-50

Dựa trên nghiên cứu toàn diện từ bộ tài liệu **`docs/`** (bao gồm [PRD](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-1/PRD_STAGE_1_DISCOVERY.md), [Bảo mật & RBAC](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-1/AUTH_SECURITY_SPECIFICATION.md), [Thiết kế UI/UX](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-2/UI_UX_DESIGN_SPECIFICATION.md), [DevOps Setup](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/stage-3/DEVOPS_SETUP_GUIDE.md) và các bản kế hoạch), dự án **Acad Community Platform** là một hệ thống **Monorepo** kết hợp giữa Frontend (Next.js 15), Backend API Gateway (Node.js 24), CSDL PostgreSQL 16 (với extension cây phân cấp `ltree`) và Redis 7.

Dưới đây là hướng dẫn chi tiết cách **khởi chạy dự án** và **cách xem, kiểm tra từng thành phần** trên máy của bạn.

---

## PHẦN 1: HƯỚNG DẪN CHẠY DỰ ÁN

Bạn có thể chọn 1 trong 2 cách sau tùy theo nhu cầu:

### CÁCH 1: Chạy trọn gói qua Docker Compose (Khuyên dùng - Nhanh nhất)
*Phù hợp để demo, kiểm thử tích hợp toàn bộ hệ sinh thái mà không cần cài đặt database hay cấu hình môi trường.*

Chỉ cần mở Terminal tại thư mục gốc của dự án và chạy:

```bash
# 1. Khởi chạy đồng thời 4 dịch vụ (Database, Redis, API, Next.js Web)
docker compose -f deploy/docker/docker-compose.dev.yml up -d

# 2. Xem trạng thái các container (tất cả phải ở trạng thái Up / healthy)
docker compose -f deploy/docker/docker-compose.dev.yml ps
```

> **Khi muốn dừng dự án:**
> ```bash
> docker compose -f deploy/docker/docker-compose.dev.yml down
> ```

---

### CÁCH 2: Chạy trực tiếp trên máy Host qua `pnpm` (Dành cho Lập trình viên)
*Phù hợp khi bạn muốn viết code trực tiếp, tận dụng Hot-Reload nhanh nhất.*

**Bước 1:** Dùng Docker để bật 2 dịch vụ hạ tầng nền tảng (PostgreSQL & Redis):
```bash
docker compose -f deploy/docker/docker-compose.dev.yml up -d infra-db infra-cache
```

**Bước 2:** Cài đặt toàn bộ thư viện dependencies:
```bash
pnpm install
```

**Bước 3:** Mở 2 tab terminal riêng biệt để chạy Backend và Frontend:
* **Tab 1 (Khởi động Backend API):**
  ```bash
  pnpm --filter @acad/api run dev
  ```
* **Tab 2 (Khởi động Frontend Next.js Web):**
  ```bash
  pnpm --filter @acad/web run dev
  ```

---

## PHẦN 2: HƯỚNG DẪN XEM & KIỂM TRA DỰ ÁN

Sau khi dự án đã khởi chạy, bạn có thể xem và kiểm tra từng lớp của hệ thống như sau:

### 1. Xem Giao diện Người dùng (Frontend Next.js 15)
* **Địa chỉ truy cập trên trình duyệt:** [http://localhost:3000](http://localhost:3000)
* **Nội dung hiển thị:** Trang chủ của **Acad Community & Social Platform** (App Router với Server Component).

---

### 2. Xem và Kiểm tra Backend API Gateway
* **Xem thông tin API:** Mở trình duyệt hoặc dùng `curl`:
  ```bash
  curl http://localhost:8080/
  ```
  *Kết quả trả về:*
  ```json
  {"name":"Acad Community API Gateway","documentation":"/api/v1/openapi.yaml","status":"running"}
  ```
* **Kiểm tra Healthcheck Probe (Docker & Render Keep-Alive):**
  ```bash
  curl http://localhost:8080/healthz
  ```
  *Kết quả trả về HTTP 200:*
  ```json
  {"status":"ok","service":"acad-community-api","version":"1.0.0","uptime":...,"timestamp":"..."}
  ```

---

### 3. Xem Cơ sở dữ liệu PostgreSQL & Schemas Phân cấp `ltree`
Database `acad_community_dev` đã được nạp sẵn toàn bộ bảng thông qua file [init-db.sql](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/docker/init-db.sql).

Để xem trực tiếp bên trong CSDL:
```bash
# Đăng nhập trực tiếp vào PostgreSQL bên trong container
docker exec -it acad-postgres-dev psql -U postgres -d acad_community_dev
```

Khi ở trong dấu nhắc lệnh `acad_community_dev=#`:
1. **Kiểm tra các extensions đặc thù:**
   ```sql
   \dx
   ```
   *(Bạn sẽ thấy: `ltree` dùng cho cây bình luận lồng nhau, `uuid-ossp`, `pgcrypto`, `pg_trgm`)*
2. **Xem danh sách toàn bộ các bảng trong hệ thống:**
   ```sql
   \dt
   ```
   *(Sẽ hiển thị: `users`, `sessions`, `spaces`, `threads`, `thread_counters`, `comments`, `votes`, `media_assets`, `moderation_reports`)*
3. **Thoát psql:** gõ `\q` và Enter.

---

### 4. Xem Bộ nhớ đệm & Phiên Redis 7
```bash
# Kiểm tra kết nối Redis
docker exec -it acad-redis-dev redis-cli ping
# Kết quả trả về: PONG

# Xem thông số bộ nhớ RAM
docker exec -it acad-redis-dev redis-cli INFO memory
```

---

### 5. Chạy & Xem Toàn Bộ Bộ Kiểm Thử Tự Động (Automated Test Suites)
Theo tài liệu kiến trúc, hệ thống có **37 test cases** bảo vệ các luồng nghiệp vụ cốt lõi:

* **Kiểm tra toàn vẹn kiểu dữ liệu (TypeScript Typecheck):**
  ```bash
  pnpm run typecheck
  ```
  *(Biên dịch song song 8 dự án workspace, xác nhận **0 lỗi**)*

* **Chạy 9 bộ test suites bằng Vitest:**
  ```bash
  pnpm test
  ```
  *Bạn sẽ thấy kết quả PASS 100% cho các thuật toán trọng điểm:*
  - `healthz.test.ts`: Kiểm tra probe Docker/Render
  - `token-rotation.test.ts`: Kiểm thử phát hiện kẻ gian đánh cắp Refresh Token
  - `rbac-abac.test.ts`: Kiểm tra quyền hạn Karma $\ge 500$, giới hạn bài viết tài khoản mới $< 7$ ngày
  - `client-interceptor.test.ts`: Chứng minh Mutex Lock xử lý 5 request lỗi 401 song song chỉ gọi refresh **đúng 1 lần duy nhất**
  - `flatten-tree.test.ts`: Thuật toán trải phẳng cây bình luận lồng nhau $\mathcal{O}(N)$
  - `lua-vote.test.ts`: Script Lua bình chọn nguyên tử trên Redis

---

## BẢNG TỔNG HỢP CỔNG VÀ ĐỊA CHỈ TRUY CẬP

| Dịch vụ | Địa chỉ kết nối | Mô tả |
| :--- | :--- | :--- |
| **Web Frontend** | `http://localhost:3000` | Giao diện Next.js 15 |
| **API Gateway** | `http://localhost:8080` | Endpoint RESTful API |
| **Health Probe** | `http://localhost:8080/healthz` | Endpoint kiểm tra sức khỏe |
| **PostgreSQL 16** | `localhost:5432` | User: `postgres` / Pass: `postgres_secret_password` / DB: `acad_community_dev` |
| **Redis 7** | `localhost:6379` | In-memory Cache & Sessions |