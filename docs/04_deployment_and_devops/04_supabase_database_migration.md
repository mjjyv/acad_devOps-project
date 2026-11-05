# Hướng Dẫn Di Chuyển & Nạp CSDL Supabase (Supabase Database Migration)

> **Mã tài liệu:** `DEVOPS-SUPABASE-MIGRATION`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Kịch bản tự động:** [`deploy/scripts/migrate-supabase.sh`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/scripts/migrate-supabase.sh), [`deploy/migrations/supabase_bootstrap.sql`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/supabase_bootstrap.sql)

---

## 1. BỐI CẢNH & NGUYÊN TẮC THIẾT LẬP KẾT NỐI

- **Loại bỏ CSDL Render cũ:** CSDL Render cũ đã bị suspended và xóa vĩnh viễn. Dự án chuyển hẳn sang **Supabase Managed PostgreSQL** (vùng Singapore `ap-southeast-1`).
- **Phân biệt 2 dạng kết nối Supabase:**
  - **Direct Connection (Cổng 5432):** `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` (thường phân giải qua IPv6, có thể timeout trên các mạng chỉ có IPv4).
  - **Supavisor Pooler Connection (Cổng 6543 hoặc 5432 - Khuyến nghị):**
    - Chế độ Session Mode (5432): Dành cho Migration và khởi tạo tiện ích mở rộng.
    - Chế độ Transaction Mode (6543): `postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` (Hỗ trợ hàng nghìn kết nối đồng thời từ Render).

---

## 2. NẠP CSDL 1-CLICK BẰNG SCRIPT BASH (DEBIAN 13)

Trên máy Debian 13, đảm bảo đã cài `postgresql-client`, chạy script nạp toàn bộ DDL và dữ liệu mẫu:
```bash
# Cấp quyền thực thi
chmod +x deploy/scripts/migrate-supabase.sh

# Chạy script
./deploy/scripts/migrate-supabase.sh
```
Script sẽ nhắc bạn nhập `DATABASE_URL` (ẩn ký tự để bảo vệ an toàn), tự động phát hiện cảnh báo IPv6, kết nối tới Supabase qua SSL và thực thi tệp [`supabase_bootstrap.sql`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/supabase_bootstrap.sql).

---

## 3. CẤU HÌNH SSL & CƠ CHẾ CHỐNG ĐỨT GÃY (RESILIENT CONNECTION POOLING)

Trong kiến trúc kết nối CSDL PostgreSQL Supabase (`services/auth` và `services/community`):
- Hệ thống tự động kiểm tra hostname: nếu thuộc `.supabase.co`, `pooler.supabase.com` hoặc `.render.com`, driver `pg` tự động kích hoạt cấu hình `{ ssl: { rejectUnauthorized: false } }`.
- **Nguyên tắc Không sử dụng In-Memory Mock trong Production:** Trong kiến trúc tái thiết sạch (v2.0 Clean Rebuild), hệ thống loại bỏ hoàn toàn các cơ chế dự phòng giả lập mảng RAM (`InMemoryUserRepository`) trong môi trường production nhằm triệt tiêu nguy cơ phân mảnh dữ liệu (Split-Brain) và mất mát giao dịch.
- **Cơ chế Fail-Fast & Connection Retry:**
  - Khi CSDL gặp sự cố ngắt kết nối đột ngột, API Gateway trả về mã lỗi HTTP `503 Service Unavailable` tuân thủ chuẩn RFC 7807 kèm header `Retry-After: 5`.
  - Tiến trình Node.js tự động kích hoạt cơ chế kết nối lại có thời gian chờ lũy tiến (Exponential Backoff Connection Retry: 1s, 2s, 4s, 8s, tối đa 30s) tới Supavisor Connection Pooler để tái lập kết nối ngay khi CSDL khả dụng trở lại.
