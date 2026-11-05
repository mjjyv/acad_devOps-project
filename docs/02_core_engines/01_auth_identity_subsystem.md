# Phân Tích Chuyên Sâu: Phân Hệ Định Danh & An Ninh (Auth Subsystem)

> **Mã tài liệu:** `CORE-AUTH-ENGINE`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Mã nguồn triển khai:** [`services/auth`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth), [`packages/auth-client`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/auth-client)  
> **Tiêu chuẩn an ninh:** Zero-Trust Identity, OWASP ASVS Level 2+, RFC 6749

---

## 1. TIÊU CHUẨN MẬT MÃ (CRYPTOGRAPHY STANDARDS)

### 1.1. Băm Mật Khẩu (Password Hashing với Argon2id)
- Thuật toán đạt giải Password Hashing Competition (PHC) với cấu hình kháng tấn công phần cứng GPU/ASIC:
  - `memoryCost`: 65,536 KB (yêu cầu 64MB RAM vật lý trên mỗi phép tính băm).
  - `timeCost`: 3 iterations.
  - `parallelism`: 4 threads.
- Cơ chế tự động tương thích và chuyển đổi ngược với `scrypt` hoặc `bcrypt` để đảm bảo hệ thống không bị gián đoạn khi nâng cấp.
- Chống tấn công dò thời gian (Timing Attack) thông qua hàm `crypto.timingSafeEqual` khi so khớp chuỗi băm.

### 1.2. Chiến Lược Ký Số Token (Dual Token Strategy)
- **Access Token:** Ký số theo chuẩn **HMAC-SHA256 (HS256)** với khóa bí mật `JWT_SECRET` tối thiểu 256 bits entropy. Thời gian sống ngắn: **15 phút (900 giây)**.
- **Refresh Token:** Chuỗi nhị phân ngẫu nhiên bảo mật cao **64 bytes** sinh từ bộ sinh số ngẫu nhiên mật mã (CSPRNG), mã hóa dạng URL-safe Base64 (86 ký tự). Thời gian sống dài: **7 ngày (604,800 giây)**.

---

## 2. GIAO THỨC XOAY VÒNG TOKEN (TOKEN ROTATION & 30S GRACE PERIOD)

- **Nguyên lý RFC 6749:** Mỗi khi Access Token hết hạn, client gửi Refresh Token lên endpoint `/api/v1/auth/refresh`. Hệ thống lập tức thu hồi token cũ và cấp phát một cặp Access/Refresh Token hoàn toàn mới.
- **Cửa Sổ An Toàn 30 Giây (30s Grace Period):**
  - Khi mở nhiều tab trình duyệt, các tab sẽ gửi đồng thời cùng 1 refresh token cũ trong khoảng vài mili-giây.
  - Hệ thống lưu trữ `previous_token_hash` trong đúng 30 giây. Mọi yêu cầu hợp lệ đến trong cửa sổ này đều được cấp lại Access Token mới mà không phá hủy phiên làm việc.
- **Phát Hiện Xâm Nhập (Token Reuse Attack Detection):**
  - Nếu token cũ bị dùng lại sau 30 giây, hệ thống nhận diện đây là hành vi đánh cắp phiên (Session Hijacking) hoặc Replay Attack.
  - Biện pháp phòng vệ tức thì: Thu hồi toàn bộ gia đình phiên làm việc (`is_revoked = TRUE` trên PostgreSQL và xóa toàn bộ key `session:{userId}:*` trên Redis), buộc kẻ tấn công và nạn nhân phải đăng nhập lại từ đầu.

---

## 3. CLIENT INTERCEPTOR MUTEX LOCK (CHỐNG THUNDERING HERD)

Triển khai tại [`packages/auth-client/src/interceptor.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/auth-client/src/interceptor.ts):
- Khi nhiều API đồng thời nhận lỗi HTTP 401, chỉ có request đầu tiên được cấp quyền gọi API refresh token (`MUTEX_ACQUIRED`).
- Các request đến sau sẽ được chuyển vào hàng đợi `subscriberQueue` ở trạng thái chờ (Pending Promise).
- Sau khi có Access Token mới, Mutex Lock mở ra và phân phát token mới cho toàn bộ các request đang chờ, loại bỏ hoàn toàn hiện tượng bão yêu cầu (Thundering Herd).
