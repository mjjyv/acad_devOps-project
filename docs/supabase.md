Render: Free database expired
"database has expired. Upgrade to a paid instance to resume database.""
- Database has expired. The database and all underlying data will be deleted in 9 days unless you upgrade to a paid compute plan.

Created: a month ago
Status: suspended
PostgreSQL Version: 18
Region: Singapore (Southeast Asia)


OLD postgresql:
Internal:
postgresql://acad_devops_db01_user:xxx@dpg-yyy-a/acad_devops_db01
External:
postgresql://acad_devops_db01_user:xxx@dpg-yyy-a.singapore-postgres.render.com/acad_devops_db01


PROJECT URL:
https://asdasdasdasdasdasd.supabase.co

publishable key:
sb_publishable_xxx_xxx

direct connection string:
postgresql://postgres:[YOUR-PASSWORD]@db.asdasdasdasdasdasd.supabase.co:5432/postgres

cli setup commands:
supabase login
supabase init
supabase link --project-ref asdasdasdasdasdasd

Mình **không xem trực tiếp được dashboard Render/Supabase của bạn**, nên chỉ có thể đánh giá dựa trên thông tin bạn đã cung cấp:

## Tình trạng hiện tại có thể tóm gọn

| Hạng mục | Trạng thái |
|---|---|
| Database Render cũ (`acad_devOps-db01`) | **Suspended / hết hạn Free**, không restart được, có thể xóa |
| Database Supabase | **Healthy**, API Gateway trả `200 OK` |
| Schema Supabase | **Chưa có migration** — `LAST MIGRATION: No migrations` |
| Backend API trên Render | **Chưa xác nhận** — cần xem Logs của Web Service |
| Kết nối API → Supabase | **Chưa kết luận được**, phụ thuộc `DATABASE_URL` và logs |

## Điều chắc chắn

- Hạ tầng Supabase **đang sống bình thường**.
- Database Supabase hiện **là database trống**, chưa có bảng `users`, `spaces`, `threads`… nếu bạn chưa chạy migration.
- Nếu API kết nối vào lúc này mà chưa chạy DDL, khả năng cao sẽ lỗi dạng:
  ```text
  relation "users" does not exist
  ```

## Điều cần kiểm tra ngay

Vào **Render Dashboard → Web Service API → Logs**, tìm các dấu hiệu:

- ✅ Kết nối thành công:
  ```text
  Server running on port ...
  Database connected
  ```
- ❌ Lỗi IPv6 / Direct Connection:
  ```text
  getaddrinfo ENOTFOUND db.xxxxxx.supabase.co
  connect ETIMEDOUT
  ```
  → Nếu gặp lỗi này, đổi `DATABASE_URL` sang **Pooler IPv4**:
  ```text
  postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
  ```

- ❌ Lỗi chưa có bảng:
  ```text
  relation "users" does not exist
  ```
  → Cần chạy migration DDL trong **Supabase SQL Editor**.

## Kết luận ngắn

> **Supabase đang khỏe, nhưng backend API chưa được xác nhận kết nối thành công và database chưa có schema.**


# Hướng dẫn khắc phục lỗi Render PostgreSQL Free hết hạn và chuyển sang Supabase

## 1. Tóm tắt sự cố

Database PostgreSQL trên Render đang ở trạng thái:

```text
Free database expired
Your database has expired. Upgrade to a paid instance to resume your database.
Created: a month ago
Status: suspended
PostgreSQL Version: 18
Region: Singapore (Southeast Asia)
```

Nguyên nhân là chính sách vòng đời của Render: **PostgreSQL gói Free chỉ hoạt động trong 30 ngày**. Khi hết hạn, Render ngắt toàn bộ kết nối mạng, chuyển database sang trạng thái `suspended` và bắt đầu đếm ngược thời gian xóa vĩnh viễn dữ liệu.

Trong trạng thái này:

- **Không thể bấm `Restart Database`** vì database đã bị khóa do hết hạn gói Free.
- Muốn mở lại database cũ, bắt buộc phải nâng cấp lên gói trả phí.
- Nếu đã chuyển `DATABASE_URL` sang một database mới như Supabase, database cũ trên Render không còn ảnh hưởng đến ứng dụng. Có thể bấm **Delete Database** để dọn dashboard.

---

## 2. Xử lý dữ liệu hiện tại

Có 2 luồng xử lý tùy theo mức độ quan trọng của dữ liệu.

### Luồng A — Dữ liệu quan trọng, bắt buộc giữ lại

Render đã ngắt cổng kết nối bên ngoài của database bị suspended, nên lệnh `pg_dump` từ xa sẽ bị từ chối.

Cách xử lý:

1. Vào dashboard database trên Render.
2. Chuyển sang gói **Starter ($7/tháng)** để database active trở lại.
3. Chạy `pg_dump` để trích xuất toàn bộ dữ liệu ra máy local.
4. Sau khi lấy dữ liệu xong, có thể hủy gói hoặc xóa database. Render sẽ tính phí theo cơ chế pro-rated, thường chỉ tốn vài cent.

### Luồng B — Dữ liệu mock/test, ưu tiên cho đồ án

Bỏ qua database cũ, không cần nạp tiền.

Tận dụng lại các file migration DDL và seed script sẵn có:

```text
000001_create_auth_schema.up.sql
000002_create_community_schema.up.sql
```

Khởi tạo cấu trúc database mới trên Supabase, sau đó chạy seed data nếu có.

---

## 3. Ma trận giải pháp hạ tầng thay thế

| Tiêu chí | Phương án 1: Supabase (khuyên dùng) | Phương án 2: Tái tạo Render Free DB | Phương án 3: Self-hosted VPS/Homelab |
|---|---|---|---|
| **Bản chất** | Managed PostgreSQL Cloud chuyên dụng | Mượn thêm chu kỳ dùng thử 30 ngày | Tự vận hành container PostgreSQL |
| **Chi phí** | 0đ, Free Tier không giới hạn thời gian | 0đ, chỉ sống được 30 ngày tiếp theo | 0đ với Homelab/Oracle Free hoặc tốn phí thuê VPS |
| **Region** | Hỗ trợ Singapore `ap-southeast-1` | Singapore | Tùy chọn máy chủ |
| **Hỗ trợ Extension** | Hỗ trợ `ltree`, `pg_trgm`, `uuid-ossp`, `pgcrypto` | Hỗ trợ | Toàn quyền kiểm soát |
| **Nguy cơ gián đoạn** | Tạm ngưng nếu không có truy vấn trong 7 ngày, gọi API là thức dậy | Bị xóa cứng sau mỗi chu kỳ 30 ngày | Phụ thuộc đường truyền mạng và điện |
| **Phù hợp nhất khi** | Cần môi trường ổn định để chấm điểm, demo, nộp đồ án | Cần sửa lỗi gấp trong vài giờ để nộp bài | Có sẵn homelab/server riêng, muốn kiểm soát hoàn toàn |

---

## 4. Hướng dẫn chuyển sang Supabase

Supabase cung cấp PostgreSQL có sẵn datacenter Singapore, tương thích với các extension của hệ thống và không bị giới hạn 30 ngày.

### Bước 1 — Khởi tạo cơ sở dữ liệu

1. Đăng ký/đăng nhập tại `supabase.com`.
2. Nhấn **New Project**.
3. Thiết lập:
   - **Name:** `acad-community-db`
   - **Database Password:** đặt mật khẩu an toàn và ghi nhớ.
   - **Region:** chọn **Singapore (Southeast Asia)**.
   - **Pricing Plan:** Free.

### Bước 2 — Chạy migration DDL và kích hoạt extension

Truy cập **SQL Editor** trên Supabase Studio.

Chạy kịch bản kích hoạt extension:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

Tiếp tục chạy toàn bộ nội dung:

```text
000001_create_auth_schema.up.sql
000002_create_community_schema.up.sql
```

Sau đó chạy file seed data nếu có.

Kiểm tra lại bằng **Table Editor**: các bảng như `users`, `spaces`, `threads`, `thread_counters`, `comments` phải xuất hiện. Nếu backend kết nối vào database trống, ứng dụng sẽ báo lỗi dạng:

```text
relation "users" does not exist
relation "threads" does not exist
```

### Bước 3 — Lấy chuỗi kết nối

Vào **Project Settings** → **Database** → **Connection string** → chọn tab **URI**.

Các khái niệm cần hiểu:

- **`YOUR-PASSWORD`**: mật khẩu thực tế bạn đã đặt khi tạo project Supabase. Đây là placeholder, phải thay bằng mật khẩu thật.
- **`YOUR-PROJECT-REF` / `PROJECT-REF`**: mã định danh duy nhất khoảng 20 ký tự của project Supabase.

Cách lấy `PROJECT-REF`:

1. Nhìn URL dashboard Supabase:

```text
https://supabase.com/dashboard/project/[project-ref]
```

Chuỗi nằm sau `/project/` chính là Reference ID.

2. Hoặc vào **Project Settings** → **General** → xem dòng **Reference ID**.

#### Phân biệt Direct Connection và Pooler

Chuỗi Direct Connection có dạng:

```text
postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

Lưu ý: host `db.[PROJECT-REF].supabase.co` thường phân giải bằng IPv6. Container miễn phí trên Render thường chỉ hỗ trợ IPv4, nên có thể gặp lỗi:

```text
getaddrinfo ENOTFOUND db.xxxxxx.supabase.co
connect ETIMEDOUT
```

Vì vậy, khuyên dùng **Pooler IPv4**:

```text
postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
```

Trong đó:

- Cổng `6543` là **Transaction Pooler**, phù hợp với container/cloud.
- Cổng `5432` là **Session Pooler**, dùng khi ORM cần session/prepared statements ổn định.
- User của Pooler có thêm tiền tố project-ref: `postgres.[PROJECT-REF]`.
- Host là `pooler.supabase.com`, không phải `db.[PROJECT-REF].supabase.co`.

Nếu mật khẩu chứa ký tự đặc biệt như `@`, `#`, `:`, `?`, cần URL-encode. Ví dụ `@` thành `%40`.

### Bước 4 — Cập nhật biến môi trường trên Render

Vào `dashboard.render.com` → chọn Web Service Backend (`acad-core-api` hoặc service API tương ứng) → thẻ **Environment**.

Cập nhật tối thiểu:

```bash
DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
```

Nếu backend có đọc các biến rời, cập nhật đồng bộ:

```bash
DB_HOST=aws-0-ap-southeast-1.pooler.supabase.com
DB_PORT=6543
DB_USER=postgres.[YOUR-PROJECT-REF]
DB_PASSWORD=[YOUR-PASSWORD]
DB_NAME=postgres
```

Lưu ý:

- Không dùng `localhost` trên Render.
- File `.env` local Docker không dùng trực tiếp được cho cloud.
- `REDIS_URL=redis://localhost:6379` cũng không hoạt động trên Render. Nếu backend cần Redis, phải dùng Redis cloud như Upstash hoặc dịch vụ tương đương.

Sau khi lưu, Render sẽ tự động trigger build và redeploy.

### Bước 5 — Kiểm tra trạng thái vận hành

1. Vào trang **Web Service** trên Render, không phải trang Database.
2. Mở mục **Logs**.
3. Kiểm tra container API khởi động thành công, không còn lỗi:
   - `ECONNREFUSED`
   - `database suspended`
   - `ENOTFOUND`
   - `ETIMEDOUT`
4. Gửi request kiểm tra `/healthz` hoặc truy cập frontend để xác thực luồng đăng nhập, danh sách spaces và bảng tin.

---

## 5. Giải thích `DATABASE_URL` và các placeholder

`DATABASE_URL` là chuỗi kết nối tổng hợp chứa toàn bộ thông tin cần thiết để backend tìm đến database.

Cấu trúc chuẩn:

```text
postgresql://user:password@host:port/dbname
```

Trong đó:

- `user`: tài khoản database.
- `password`: mật khẩu database.
- `host`: địa chỉ IP/domain của database server.
- `port`: cổng kết nối.
- `dbname`: tên database.

Thay vì đọc rời rạc `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, nhiều ORM/thư viện driver như `pg`, Prisma, Drizzle, EF Core ưu tiên đọc một biến tổng thể `DATABASE_URL`.

Các placeholder cần thay:

- **`YOUR-PASSWORD`**: mật khẩu thật của tài khoản database.
- **`YOUR-PROJECT-REF`**: Reference ID của project Supabase.
- **`[YOUR-PASSWORD]`**, **`[YOUR-PROJECT-REF]`**: chỉ là ký hiệu trong tài liệu, không phải giá trị thật.

---

## 6. Bảo mật file `.env`

**Nguyên tắc: tuyệt đối không gửi thông tin bí mật thật cho Agent hoặc AI.**

Không nên gửi:

- Mật khẩu database.
- `JWT_SECRET`.
- Cloudflare R2 Keys.
- Chuỗi kết nối production có mật khẩu thật.

Rủi ro:

- Toàn bộ đoạn chat có thể được lưu trong lịch sử hội thoại.
- Lộ khóa có thể dẫn đến xóa database, can thiệp quyền admin hoặc phát sinh chi phí hạ tầng.
- Vô tình commit file `.env` lên GitHub công khai.

Cách làm đúng:

1. Với Agent/AI: chỉ gửi `.env.example` hoặc `.env` đã thay bằng placeholder.

Ví dụ:

```bash
DATABASE_URL=postgresql://postgres.abcdefghijklmnop:YOUR_PASSWORD_HERE@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=super_secret_dummy_key_for_testing_only
```

2. Với máy local: điền thông tin thật vào `.env` cá nhân. Đảm bảo `.gitignore` có dòng:

```text
.env
```

3. Với Render/Cloud Production: không commit `.env`. Copy giá trị thật vào bảng **Environment Variables** trên dashboard Render.

File `.env` mẫu hiện tại chỉ phù hợp cho local Docker Dev. Nếu dùng cho Render Cloud kết nối Supabase, cần thay `localhost` bằng host Supabase và cập nhật cả `REDIS_URL` nếu có.

---

## 7. Xử lý database cũ trên Render

Khi database cũ đã hết hạn:

- Không thể bấm **Restart Database**.
- Nếu đã chuyển `DATABASE_URL` sang Supabase, database cũ không còn ảnh hưởng.
- Có thể bấm **Delete Database** màu đỏ ở cuối trang Render để dọn dẹp.
- Việc kiểm tra hệ thống phải thực hiện ở trang **Web Service** → **Logs**, không phải trang Database.

---

## 8. Các lỗi thường gặp và cách xử lý

| Lỗi | Nguyên nhân | Cách xử lý |
|---|---|---|
| Không bấm được `Restart Database` | Database Render Free đã hết hạn, bị suspended | Không cần restart; chuyển sang Supabase hoặc nâng cấp gói trả phí |
| `getaddrinfo ENOTFOUND db.xxxxxx.supabase.co` | Render không phân giải được IPv6 của Direct Connection | Đổi sang Pooler IPv4 cổng `6543` hoặc Session Pooler `5432` |
| `connect ETIMEDOUT` | Kết nối Direct IPv6 bị chặn/timeout | Dùng chuỗi Pooler của Supabase |
| `relation "users" does not exist` | Database Supabase chưa chạy migration DDL | Chạy `000001`, `000002` và seed data |
| `LAST MIGRATION: No migrations` | Supabase đang là database trống | Chạy SQL migration trong SQL Editor |
| Lỗi xác thực mật khẩu | Mật khẩu chứa ký tự đặc biệt chưa URL-encode | Encode ký tự đặc biệt trong `DATABASE_URL` |
| `ECONNREFUSED localhost:5432` | Backend trên Render vẫn trỏ về localhost | Cập nhật `DATABASE_URL` và các biến DB trên Render |

---

## 9. GitHub trên Supabase có cần không?

**Không cần thiết.**

Phân biệt:

- **GitHub trên Render:** bắt buộc/đã có, Render cần kết nối GitHub để kéo mã nguồn `apps/api`, `apps/web` về build và deploy.
- **GitHub trên Supabase:** là tính năng Database Branching, tự động tạo database phụ khi mở Pull Request. Với đồ án và web deploy thông thường, chỉ dùng Supabase làm database host qua `DATABASE_URL`, nên mục `GITHUB: No repository connected` để trống là bình thường.

Sau khi Supabase báo **Healthy** nhưng `LAST MIGRATION: No migrations`, cần chạy schema DDL như mục 4.2. Không cần chỉnh mục GitHub trên Supabase.

---

## 10. Checklist hoàn tất

- [ ] Xác định dữ liệu cũ cần giữ hay chỉ là mock/test.
- [ ] Tạo project Supabase tại region Singapore.
- [ ] Chạy các extension: `uuid-ossp`, `pgcrypto`, `ltree`, `pg_trgm`.
- [ ] Chạy `000001_create_auth_schema.up.sql`.
- [ ] Chạy `000002_create_community_schema.up.sql`.
- [ ] Chạy seed data nếu có.
- [ ] Kiểm tra Table Editor thấy đủ bảng.
- [ ] Lấy Pooler Connection String cổng `6543` kèm `?sslmode=require`.
- [ ] Cập nhật `DATABASE_URL` và các biến DB liên quan trên Render.
- [ ] Cập nhật Redis cloud nếu backend dùng Redis.
- [ ] Redeploy Web Service.
- [ ] Kiểm tra Logs của Web Service, không còn lỗi kết nối.
- [ ] Kiểm tra `/healthz`, đăng nhập, spaces, threads.
- [ ] Xóa database Render cũ nếu không còn dùng.
- [ ] Không gửi thông tin bí mật thật cho Agent/AI; chỉ dùng placeholder.