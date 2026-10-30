# Phân Tích Chuyên Sâu: Phân Hệ Định Danh & An Ninh (Auth Subsystem)

**Mã nguồn triển khai:** [`services/auth`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth), [`packages/auth-client`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/auth-client), [`apps/api/src/routes/auth-router.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/auth-router.ts)  
**Tiêu chuẩn an ninh:** Zero-Trust Identity, OWASP ASVS Level 2+, RFC 6749 (OAuth 2.0 Token Rotation)  

---

## 1. TIÊU CHUẨN MẬT MÃ (CRYPTOGRAPHY STANDARDS)

### 1.1. Băm Mật Khẩu (Password Hashing)
- Sử dụng thuật toán **Argon2id** (chuẩn đạt giải Password Hashing Competition - PHC):
  - `memoryCost`: 65,536 KB (64 MB RAM bắt buộc trên mỗi phép băm).
  - `timeCost`: 3 iterations.
  - `parallelism`: 4 threads.
- Cơ chế tự động tương thích và chuyển đổi ngược với `scrypt` hoặc `bcrypt` để đảm bảo hệ thống không bị gián đoạn khi nâng cấp.
- Chống tấn công dò thời gian (Timing Attack) thông qua hàm `crypto.timingSafeEqual` khi so khớp chuỗi băm.

### 1.2. Chiến Lược Ký Số Token (JWT Signing)
- **Access Token:** Ký số theo chuẩn **HMAC-SHA256 (HS256)** với khóa bí mật `JWT_SECRET` ngẫu nhiên tối thiểu 32 ký tự (256 bits entropy). Thời gian sống ngắn: **15 phút (900 giây)**.
- **Refresh Token:** Chuỗi nhị phân ngẫu nhiên bảo mật cao **64 bytes** sinh từ bộ sinh số ngẫu nhiên mật mã (CSPRNG), mã hóa dạng URL-safe Base64 (86 ký tự). Thời gian sống dài: **7 ngày (604,800 giây)**.

---

## 2. GIAO THỨC XOAY VÒNG REFRESH TOKEN (TOKEN ROTATION PROTOCOL)

Nhằm phòng chống triệt để rủi ro đánh cắp token (Token Theft) và phát lại phiên (Replay Attack), hệ thống triển khai giao thức xoay vòng theo chuẩn RFC 6749 kết hợp 3 lớp bảo vệ:

```mermaid
flowchart TD
    Request["Request /api/v1/auth/refresh (Kèm Refresh Token)"] --> HashToken["SHA-256(Incoming Token)"]
    HashToken --> MatchCurrent{"Khớp current_token_hash trong Redis?"}
    
    MatchCurrent -->|ĐÚNG| RotateSuccess["1. Sinh cặp Tokens mới<br/>2. previous_token_hash = current_token_hash<br/>3. grace_period_expires_at = NOW() + 30s<br/>4. current_token_hash = NewHash<br/>5. Trả về cặp Token mới"]
    
    MatchCurrent -->|SAI| MatchGrace{"Khớp previous_token_hash VÀ<br/>NOW() < grace_period_expires_at?"}
    
    MatchGrace -->|ĐÚNG (30s Grace Period)| ReissueAccess["Cấp lại Access Token mới<br/>(Không tạo Refresh Token mới để tránh phân nhánh phiên)"]
    
    MatchGrace -->|SAI (Token Reuse Attack Detected)| TriggerDefense["BÁO ĐỘNG TẤN CÔNG!<br/>1. Xóa toàn bộ cụm phiên: DEL session:{userId}:*<br/>2. Đánh dấu is_revoked = TRUE trong PostgreSQL<br/>3. Ghi log kiểm toán: TOKEN_REUSE_DETECTED<br/>4. Trả về HTTP 403 Forbidden"]
```

### Chi tiết Cửa Sổ An Toàn Grace Period 30 Giây
Trong môi trường mạng di động 4G/5G hoặc khi người dùng mở nhiều tab trình duyệt cùng lúc:
- Các tab sẽ đồng loạt gửi yêu cầu `/refresh` với cùng một Refresh Token cũ trong khoảng vài mili-giây.
- Nếu không có Grace Period, yêu cầu của tab đầu tiên thành công sẽ lập tức biến token cũ thành "bị đánh cắp", khiến các tab còn lại bị hệ thống hủy phiên vô cớ!
- **Giải pháp của hệ thống:** Lưu token vừa bị thay thế vào `previous_token_hash` trong đúng 30 giây. Bất kỳ request hợp lệ nào đến trong khoảng thời gian này đều được chấp nhận và cấp lại Access Token mới an toàn.

---

## 3. CHIẾN LƯỢC BẢO VỆ COOKIE KÉP (DOUBLE HTTPONLY COOKIE)

Không bao giờ lưu trữ Token trong `localStorage` hay `sessionStorage` vì nguy cơ bị rò rỉ 100% khi ứng dụng bị tấn công XSS.

| Thuộc Tính Cookie | `acad_access_token` | `acad_refresh_token` | Mục Đích An Ninh |
| :--- | :--- | :--- | :--- |
| **HttpOnly** | `true` | `true` | Chặn hoàn toàn mã độc JavaScript của bên thứ 3 đọc trộm token. |
| **Secure** | `true` (Production) | `true` (Production) | Chỉ truyền qua giao thức mã hóa HTTPS. |
| **SameSite** | `Lax` (Local) / `None` (Cross-domain Render) | `Strict` (Local) / `None` (Cross-domain Render) | Chống tấn công giả mạo yêu cầu chéo trang (Cross-Site Request Forgery - CSRF). |
| **Path** | `/` | `/api/v1/auth/refresh` | Giới hạn chỉ có endpoint refresh mới được phép đọc Refresh Token. |
| **Max-Age** | 900 giây (15 phút) | 604,800 giây (7 ngày) | Tự động hết hạn khi không sử dụng. |

> [!NOTE]
> Trên môi trường Render Cloud, do Frontend (`acad-web-client.onrender.com`) và Backend (`acad-core-api.onrender.com`) là 2 subdomain khác nhau, hệ thống tự động kích hoạt **Dual Token Strategy**: Vừa set Cookie `SameSite=None; Secure`, vừa trả token trong JSON response body để Client SDK (`packages/auth-client`) tự động lưu dự phòng và gửi qua Authorization header khi trình duyệt (như Safari ITP) chặn cookie bên thứ 3.

---

## 4. MA TRẬN PHÂN QUYỀN KÉP (HYBRID RBAC + ABAC)

Phân quyền kết hợp giữa vai trò chức danh tĩnh (**RBAC**) và điều kiện thuộc tính động (**ABAC**):

```typescript
// Triển khai thực tế tại services/auth/src/policy/rbac-abac-engine.ts
export class RbacAbacEngine {
  public static canEditPost(user: UserContext, post: PostContext): boolean {
    // 1. Quản trị viên luôn có quyền
    if (user.role === 'ADMIN' || user.role === 'GLOBAL_MOD') return true;
    
    // 2. Space Mod chỉ có quyền trong Space mình quản lý
    if (user.role === 'SPACE_MOD' && post.spaceId === user.spaceId) return true;
    
    // 3. Tác giả sở hữu bài viết (ABAC Rule: Khóa sau 24h)
    if (post.authorId === user.id) {
      const hoursSinceCreation = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
      return hoursSinceCreation <= 24; // Chỉ được sửa trong 24 giờ đầu
    }
    
    return false;
  }

  public static canDownvote(user: UserContext): boolean {
    // ABAC Rule: Chỉ người dùng có Karma >= 500 mới được phép downvote
    return user.role === 'ADMIN' || (user.karmaScore >= 500 && user.accountAgeDays >= 7);
  }
}
```

---

## 5. CƠ CHẾ GIỚI HẠN TẦN SUẤT GỌI API (RATE LIMITING)

Áp dụng thuật toán cửa sổ trượt (Sliding Window Counter) trên Redis thông qua middleware [`AuthRateLimiter`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/middleware/rate-limiter.ts):
- Đăng nhập thất bại quá 10 lần trong 15 phút $\rightarrow$ Khóa IP tạm thời, trả về HTTP 429 kèm header `Retry-After`.
- Đăng ký tài khoản mới: Tối đa 5 lượt/giờ trên mỗi địa chỉ IP để ngăn chặn Spam Bot tạo tài khoản ảo hàng loạt.
