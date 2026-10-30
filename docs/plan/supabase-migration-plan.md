# Kế Hoạch Chuyển Đổi Hệ Cơ Sở Dữ Liệu Sang Supabase Managed PostgreSQL

> **Trạng thái:** Sẵn sàng triển khai  
> **Mục tiêu:** Chuyển đổi toàn diện cơ sở dữ liệu từ Render Managed PostgreSQL (hết hạn / suspended) sang Supabase Managed PostgreSQL, đảm bảo tính liên tục của hệ thống, bảo mật SSL/TLS, và tối ưu hóa kết nối connection pooling.

---

## 1. Bối Cảnh & Nguyên Nhân Chuyển Đổi

### 1.1. Hiện Trạng Render Free Database
Dịch vụ Render Free PostgreSQL (`dpg-yyy-a.singapore-postgres.render.com`) đã chính thức bị hết hạn và chuyển sang trạng thái **suspended** sau chu kỳ 30 ngày dùng thử miễn phí:
```text
Render: Free database expired
"database has expired. Upgrade to a paid instance to resume database."
Database has expired. The database and all underlying data will be deleted in 9 days unless you upgrade to a paid compute plan.
Status: suspended
PostgreSQL Version: 16 (Render Free)
Region: Singapore (Southeast Asia)
```
- Render chặn toàn bộ kết nối TCP đến endpoint cũ (`ECONNREFUSED` / `Connection terminated unexpectedly`).
- Backend API (`acad-core-api.onrender.com`) khi khởi động không thể kết nối tới DB cũ, dẫn đến kích hoạt cơ chế tự phục hồi `InMemoryUserRepository` để duy trì uptime API.

### 1.2. Quyết Định Kiến Trúc: Bỏ Hẳn DB Render, Chuyển Sang Supabase
- **Loại bỏ hoàn toàn** database Render cũ, không gia hạn gói trả phí trên Render.
- **Lựa chọn Supabase Managed PostgreSQL:**
  - 500MB storage miễn phí vĩnh viễn, tài nguyên compute ổn định.
  - Tích hợp sẵn Connection Pooler (Supavisor) hỗ trợ hàng nghìn kết nối đồng thời.
  - Hỗ trợ đầy đủ các PostgreSQL Extensions nâng cao theo kiến trúc monorepo: `uuid-ossp`, `pgcrypto`, `ltree`, `pg_trgm`.
  - Hỗ trợ SSL/TLS bắt buộc với chứng chỉ Let's Encrypt / DigiCert.

---

## 2. Thông Số Kết Nối Supabase

Dựa trên cấu hình cung cấp tại [docs/supabase.md](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/supabase.md):

| Tham số | Giá trị |
| :--- | :--- |
| **Supabase Project URL** | `https://asdasdasdasdasdasd.supabase.co` |
| **Project Ref** | `asdasdasdasdasdasd` |
| **Region** | Singapore (`ap-southeast-1`) |
| **Direct Connection String (Port 5432)** | `postgresql://postgres:[YOUR-PASSWORD]@db.asdasdasdasdasdasd.supabase.co:5432/postgres` |
| **Pooler Connection String (Port 6543 - Transaction Mode)** | `postgresql://postgres.asdasdasdasdasdasd:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| **Pooler Connection String (Port 5432 - Session Mode)** | `postgresql://postgres.asdasdasdasdasdasd:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres` |

> [!IMPORTANT]
> Khi sử dụng với Node.js `pg` driver và Knex/Kysely trong container Render Web Service:
> - Sử dụng **Direct Connection (5432)** hoặc **Session Mode Pooler (5432)** khi chạy migration và khởi tạo extension.
> - Cấu hình SSL bắt buộc: `ssl: { rejectUnauthorized: false }` đã được tích hợp tự động trong mã nguồn repository (`sanitizePostgresConfig`).

---

## 3. Các Bước Triển Khai Chuyển Đổi (Step-by-Step)

```mermaid
flowchart TD
    A["1. Chuẩn bị Supabase Project<br/>(Kích hoạt Extensions)"] --> B["2. Chạy Database Migrations<br/>(000001 & 000002)"]
    B --> C["3. Kiểm thử kết nối & DDL trên Debian 13<br/>(psql / Node script)"]
    C --> D["4. Cập nhật Render Environment Variables<br/>(DATABASE_URL trên acad-core-api)"]
    D --> E["5. Trigger Deploy & Xác minh Healthz<br/>(Kiểm tra log PostgreSQL kết nối thành công)"]
    E --> F["6. Xóa bỏ service DB Render cũ<br/>(Cleanup infrastructure)"]
```

### Bước 1: Kích Hoạt PostgreSQL Extensions Trên Supabase
Đăng nhập vào Supabase Dashboard -> **SQL Editor** và thực thi câu lệnh kích hoạt các extensions:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Bước 2: Thực Thi DDL Migrations
Sử dụng công cụ `psql` trên Debian 13 hoặc Supabase SQL Editor để áp dụng lần lượt 2 bản migration có sẵn trong repo:

1. **Migration 000001 - Auth & Users Schema:**
   - File: [deploy/migrations/000001_init_schema.up.sql](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/000001_init_schema.up.sql)
   - Nội dung: Tạo bảng `users`, `user_credentials`, `user_profiles`, `user_roles`, `user_sessions`, indexes, trigger `update_updated_at_column`.

2. **Migration 000002 - Community & Nested Comments Schema:**
   - File: [deploy/migrations/000002_community_schema.up.sql](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/000002_community_schema.up.sql)
   - Nội dung: Tạo bảng `communities`, `community_memberships`, `posts`, `post_votes`, `comments`, `comment_votes`, `thread_counters`, indexes GIST trên `ltree_path`, trigger tự động sinh mã `ltree_path` Base36.

### Bước 3: Cấu Hình Biến Môi Trường Trên Render Cloud
1. Truy cập [Render Dashboard](https://dashboard.render.com).
2. Chọn Web Service `acad-core-api`.
3. Vào tab **Environment** -> Cập nhật key `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR_SUPABASE_PASSWORD]@db.asdasdasdasdasdasd.supabase.co:5432/postgres
   ```
4. Đảm bảo các biến bổ trợ được thiết lập:
   ```env
   NODE_ENV=production
   PORT=4000
   JWT_ACCESS_SECRET=your-secure-access-secret-32-chars-min
   JWT_REFRESH_SECRET=your-secure-refresh-secret-32-chars-min
   CLIENT_ORIGIN=https://acad-web-client.onrender.com
   ```

### Bước 4: Tự Động Xử Lý SSL Trong Mã Nguồn (Đã Thực Hiện)
Mã nguồn tại [services/auth/src/repository/postgres-user-repository.ts](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/repository/postgres-user-repository.ts) đã được nâng cấp hàm `sanitizePostgresConfig`:
- Tự động nhận diện host `.supabase.co` hoặc `pooler.supabase.com`.
- Bật cờ `ssl: { rejectUnauthorized: false }` tương thích chứng chỉ đám mây.
- Hỗ trợ fallback sang bộ nhớ đệm an toàn nếu mạng chập chờn, tự kết nối lại khi có kết nối mạng.

### Bước 5: Triển Khai Kiểm Thử Xác Minh (Verification)
Chạy script kiểm tra trực tiếp từ Debian 13:
```bash
# Test kết nối psql trực tiếp
psql "postgresql://postgres:[YOUR-PASSWORD]@db.asdasdasdasdasdasd.supabase.co:5432/postgres" -c "\dt"

# Kiểm tra probe health endpoint của API trên Render
curl -s -w "\nHTTP Status: %{http_code}\n" https://acad-core-api.onrender.com/healthz
```

### Bước 6: Xóa Bỏ Hoàn Toàn Database Render Cũ
1. Truy cập Render Dashboard -> Danh sách Databases.
2. Tìm database `acad_devops_db01` (trạng thái Suspended).
3. Vào **Settings** -> Cuộn xuống vùng Danger Zone -> Chọn **Delete Database**.
4. Gỡ bỏ biến `DATABASE_URL` trỏ vào `dpg-yyy-a.singapore-postgres.render.com`.

---

## 4. Kế Hoạch Dự Phòng (Rollback & Contingency Plan)

1. **Nếu kết nối Supabase bị ngắt đột ngột:**
   - Hệ thống Core API tự động chuyển sang `InMemoryUserRepository` mà không làm sập tiến trình Node.js (Zero downtime).
   - Log cảnh báo `[PostgresUserRepository] Connection lost. Fallback to InMemory mode` sẽ được ghi lại.
2. **Nếu gặp lỗi connection limit (Max connections reached):**
   - Đổi `DATABASE_URL` sang cổng **6543** (Supavisor Transaction Pooler).
   - Bổ sung tham số `?pgbouncer=true` vào connection string.
3. **Backup & Snapshot:**
   - Supabase tự động sao lưu hàng ngày (Daily backups).
   - Có thể chủ động export schema bằng lệnh `pg_dump`:
     ```bash
     pg_dump "postgresql://postgres:[PASSWORD]@db.asdasdasdasdasdasd.supabase.co:5432/postgres" --schema-only > deploy/migrations/supabase_backup_schema.sql
     ```
