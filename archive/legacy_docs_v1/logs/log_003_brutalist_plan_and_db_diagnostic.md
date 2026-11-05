# Log Xác Minh Hệ Thống, Chẩn Đoán Supabase & Kế Hoạch Brutalist UI

- **Mã định danh:** `log_003`
- **Thời điểm thực thi:** 2026-10-30T14:01:30+07:00
- **Môi trường thực thi:** Debian GNU/Linux 13 (trixie) x86_64, Linux Kernel 6.12.111+deb13-amd64
- **Node.js Version:** v26.10.0
- **TypeScript Compiler:** v5.9.3
- **Test Runner:** Vitest v3.2.7
- **Nội dung kiểm định:**
  1. Chẩn đoán nguyên nhân tài khoản đăng ký trên Web Client không xuất hiện trên Supabase: API đang chạy ở chế độ `InMemoryUserRepository` (RAM) do `DATABASE_URL` trên Render chưa được nạp chuỗi Supabase IPv4 Pooler.
  2. Xác minh thuật toán băm mật khẩu Scrypt KDF cho `Admin@Acad2026!` và cập nhật trigger `ON CONFLICT DO UPDATE` trong `supabase_bootstrap.sql`.
  3. Bổ sung thông tin CSDL vào endpoint `/healthz` để người dùng kiểm tra trực tiếp trạng thái kết nối Supabase qua cURL.
  4. Hỗ trợ tự động chuyển đổi `body.email` / `body.username` sang `body.login` trong router API.
  5. Thiết lập kế hoạch chuyển đổi toàn diện giao diện sang Minimalist Brutalism Dark Mode (4 gam màu: `#222831`, `#393E46`, `#948979`, `#DFD0B8`).

---

## 1. Kết Quả Kiểm Thử Vitest Toàn Bộ Monorepo

```text
Test Files  12 passed (12)
Tests       60 passed (60)
Snapshots   0
Failures    0
Duration    3.02s
```

---

## 2. Kết Quả TypeScript Strict Typecheck

```text
==> Typechecking packages/contracts...       [PASSED - 0 errors]
==> Typechecking packages/ui-tokens...       [PASSED - 0 errors]
==> Typechecking packages/tree-virtualizer... [PASSED - 0 errors]
==> Typechecking packages/auth-client...     [PASSED - 0 errors]
==> Typechecking services/auth...            [PASSED - 0 errors]
==> Typechecking services/community...       [PASSED - 0 errors]
==> Typechecking apps/api...                 [PASSED - 0 errors]
==> Typechecking apps/web...                 [PASSED - 0 errors]
==> ALL PACKAGES TYPECHECKED SUCCESSFULLY!
```

---

## 3. Chẩn Đoán & Khắc Phục Hiện Tượng Dữ Liệu Supabase

- **Hiện tượng:** Người dùng đăng ký tài khoản mới trên `https://acad-web-client.onrender.com/register` nhận HTTP 201 Created, nhưng chạy `SELECT * FROM users` trên Supabase không thấy dữ liệu.
- **Nguyên nhân cốt lõi:**
  1. Trên Web Service `acad-core-api.onrender.com`, biến môi trường `DATABASE_URL` chưa được cập nhật chuỗi kết nối Supabase Pooler IPv4 (`aws-0-ap-southeast-1.pooler.supabase.com:6543`), hoặc Render đang trỏ vào DB Render cũ đã hết hạn.
  2. Lớp bảo vệ `PostgresUserRepository` tự động chuyển sang chế độ dự phòng an toàn `InMemoryUserRepository` (lưu trữ trong RAM container) để duy trì uptime API mà không bị sập container.
  3. Do đó, người dùng mới đăng ký được lưu vào RAM của Render container chứ không ghi vào Supabase.
- **Giải pháp xử lý:**
  - Nâng cấp endpoint `/healthz` hiển thị trạng thái CSDL thực tế:
    `"database": {"type": "postgres", "isFallback": false, "target": "supabase"}` vs `"database": {"type": "in_memory_fallback", "isFallback": true}`.
  - Người dùng cập nhật biến `DATABASE_URL` trên Render Dashboard sang chuỗi Pooler Supabase để kết nối trực tiếp.
