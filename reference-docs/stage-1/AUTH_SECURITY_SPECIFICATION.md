# ĐẶC TẢ KỸ THUẬT BẢO MẬT & PHÂN HỆ AUTH (AUTH SUBSYSTEM SPEC)
**Phân hệ:** Identity, Authentication & Authorization Engine  
**Mức độ bảo mật:** Doanh nghiệp (Enterprise-Grade Security)  
**Tiêu chuẩn tuân thủ:** OWASP Top 10, NIST SP 800-63B, RFC 6749 (OAuth 2.0), RFC 7519 (JWT)  

---

## 1. MÔ HÌNH MỐI ĐE DỌA & BIỆN PHÁP PHÒNG THỦ (THREAT MODELING)

```text
┌─────────────────────────┬───────────────────────────────────┬───────────────────────────────────────────┐
│ Tấn công mục tiêu       │ Kịch bản khai thác                │ Cơ chế phòng vệ chuyên biệt               │
├─────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Cross-Site Scripting    │ Mã độc JavaScript trong browser   │ Toàn bộ token lưu trong `httpOnly`        │
│ (XSS)                   │ cố gắng trộm token trong memory.  │ Cookies, CSP Nonce-based, triệt tiêu      │
│                         │                                   │ lưu trữ token ở `localStorage`.           │
├─────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Cross-Site Request      │ Trang web giả mạo ép trình duyệt  │ `SameSite=Strict` cho Refresh endpoint,   │
│ Forgery (CSRF)          │ gửi cookie xác thực ngầm.         │ `SameSite=Lax` cho Access Cookie, kiểm tra│
│                         │                                   │ Origin / Sec-Fetch-Site headers.          │
├─────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Token Theft / Replay    │ Kẻ tấn công đánh cắp Refresh      │ Token Rotation Protocol: Tự động vô hiệu  │
│ (Chiếm đoạt phiên)      │ Token và cố gắng tạo session mới. │ hóa toàn bộ Session Family khi phát hiện  │
│                         │                                   │ Refresh Token cũ bị tái sử dụng.          │
├─────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Network Glitch Race     │ Mạng lag khiến Client gửi 2 lần   │ 30-giây Grace Period: Lưu vết token vừa   │
│ Condition               │ refresh request trong vài mili-giây│ xoay vòng, cấp lại token hiện hành mà     │
│                         │ làm đứt gãy phiên hợp lệ.         │ không kích hoạt báo động giả.             │
├─────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Timing Attacks          │ Đo thời gian xử lý so khớp băm    │ Sử dụng `crypto.timingSafeEqual` để       │
│                         │ mật khẩu hoặc so sánh chữ ký.     │ so sánh chuỗi theo thời gian hằng số O(1).│
├─────────────────────────┼───────────────────────────────────┼───────────────────────────────────────────┤
│ Brute-force &           │ Dùng từ điển tấn công dò mật khẩu │ Rate-limiting phân tầng qua IP & Username:│
│ Credential Stuffing     │ hoặc thử refresh token liên tục.  │ Tối đa 5 lần thử/phút, khóa tạm thời.     │
└─────────────────────────┴───────────────────────────────────┴───────────────────────────────────────────┘
```

---

## 2. TIÊU CHUẨN MẬT MÃ (CRYPTOGRAPHIC STANDARDS)

### 2.1. Băm Mật khẩu với Argon2id
Hệ thống sử dụng **Argon2id** (thuật toán chiến thắng cuộc thi Password Hashing Competition, kết hợp ưu điểm chống side-channel của Argon2i và chống bẻ khóa bằng GPU/ASIC của Argon2d):
- **Độ dài Salt:** Tối thiểu 16 bytes ngẫu nhiên bảo mật (CSPRNG).
- **Bộ nhớ (Memory Cost - $m$):** $64\text{MB}$ ($65536\text{ KiB}$).
- **Số vòng lặp (Time Cost - $t$):** 3 iterations.
- **Mức độ song song (Parallelism - $p$):** 2 threads.
- **Độ dài Hash sinh ra:** 32 bytes (256 bits).
- **Fallback chuẩn mực:** `bcrypt` với work factor cost = 12 khi môi trường không hỗ trợ binary native của Argon2.

### 2.2. JWT Access Token (Mã định danh truy cập ngắn hạn)
- **Thuật toán ký:** `HS256` (HMAC sử dụng SHA-256 với secret key tối thiểu 256 bits) hoặc `RS256/EdDSA` khi tách cụm Auth Service riêng.
- **Thời hạn sống (TTL):** Đúng 15 phút (900 giây).
- **Cấu trúc Payload (Claims):**
  ```json
  {
    "iss": "acad-community-auth",
    "sub": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "username": "coder_pro",
    "role": "USER",
    "status": "ACTIVE",
    "karma_score": 520,
    "account_age_days": 18,
    "token_version": 1,
    "space_permissions": [
      { "space_id": "a1b2c3d4-0000-0000-0000-000000000001", "role": "SPACE_MOD" }
    ],
    "iat": 1790295000,
    "exp": 1790295900
  }
  ```

### 2.3. Refresh Token (Mã gia hạn phiên dài hạn)
- **Bản chất:** Chuỗi nhị phân ngẫu nhiên bảo mật cao (CSPRNG) có độ dài **64 bytes** (được mã hóa URL-safe Base64 thành chuỗi 88 ký tự).
- **Nguyên tắc lưu trữ:** Không bao giờ lưu bản rõ (plain-text) của Refresh Token vào Database hoặc Redis. Mọi thao tác lưu và so khớp đều thực hiện trên giá trị băm **`SHA256(RefreshToken)`**.
- **Thời hạn sống (TTL):** 7 ngày (604.800 giây).

---

## 3. GIAO THỨC XOAY VÒNG TOKEN (TOKEN ROTATION PROTOCOL & STATE MACHINE)

```text
                                [ CLIENT YÊU CẦU REFRESH ]
                                             │
                                             ▼
                             [ Trích xuất Cookie Refresh Token ]
                                             │
                                             ▼
                          [ Tính hash: SHA256(Raw_Refresh_Token) ]
                                             │
                                             ▼
                        [ Đọc Session từ Redis theo Session ID / Key ]
                                             │
                         ┌───────────────────┴───────────────────┐
                         ▼                                       ▼
                  [ Session KHÔNG TỒN TẠI ]               [ Session TỒN TẠI ]
                         │                                       │
                         ▼                                       ▼
                 Trả về HTTP 401                         [ So sánh Hash ]
                                            ┌────────────────────┼────────────────────┐
                                            ▼                    ▼                    ▼
                                  [ Khớp Current Hash ] [ Khớp Previous Hash ] [ KHÔNG KHỚP ]
                                            │             (Trong 30s Grace)           │
                                            ▼                    │                    ▼
                                  [ Xoay vòng thành công ]       ▼         [ PHÁT HIỆN TÁI SỬ DỤNG ]
                                  - Sinh (AT_mới, RT_mới)  Trả lại cặp token  - Báo động đỏ an ninh!
                                  - prev_hash = curr_hash  hiện hành không     - XÓA TOÀN BỘ SESSIONS
                                  - curr_hash = Hash(mới)  xoay vòng thêm.     thuộc Family ID!
                                  - grace_until = NOW+30s                      - Ghi vết Audit Log
                                            │                                  - Trả về HTTP 403
                                            ▼
                                  [ Trả Set-Cookie mới ]
```

### 3.1. Cơ chế Grace Period 30 giây (Giải quyết nghẽn mạng song song)
- Khi một ứng dụng web mở nhiều tabs cùng lúc, hoặc trên kết nối mạng di động chập chờn, client có thể phát sinh 2 yêu cầu refresh gần như đồng thời (cách nhau vài chục mili-giây).
- Khi Request A đến trước: Server xoay vòng token, gán `previous_token_hash = SHA256(RT1)` và thiết lập `grace_period_expires_at = NOW() + 30s`.
- Khi Request B (vẫn mang RT1) đến sau đó 500ms: Hệ thống kiểm tra thấy RT1 khớp với `previous_token_hash` VÀ thời gian hiện tại vẫn nằm trong cửa sổ 30s. Hệ thống cấp lại token hiện hành của Request A mà **không coi đây là tấn công**.

### 3.2. Cơ chế Thu hồi Toàn bộ Session Family (Automatic Family Invalidation)
- Nếu một Refresh Token được gửi lên nhưng:
  - Khác với `current_token_hash`, VÀ
  - Khác với `previous_token_hash` (hoặc đã quá 30 giây Grace Period),
- Điều này chứng minh rằng một token đã từng được xoay vòng trong quá khứ đang bị kẻ thứ ba sử dụng lại (dấu hiệu rò rỉ hoặc bị đánh cắp).
- **Hành động phản ứng:** Hệ thống lập tức xóa sạch mọi phiên làm việc thuộc cùng một `family_id` (và toàn bộ phiên của `user_id` đó), buộc tất cả các thiết bị phải đăng nhập lại từ đầu.

---

## 4. CHÍNH SÁCH BẢO MẬT COOKIE (COOKIE SECURITY ATTRIBUTES)

| Tên Cookie | Thuộc tính `HttpOnly` | Thuộc tính `Secure` | Thuộc tính `SameSite` | Thuộc tính `Path` | Thời gian sống (Max-Age) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `access_token` | `true` | `true` (HTTPS) | `Lax` | `/` | 900 giây (15 phút) |
| `refresh_token` | `true` | `true` (HTTPS) | `Strict` | `/api/v1/auth/refresh` | 604.800 giây (7 ngày) |

- **Path Scoping cho Refresh Token:** Bằng cách chỉ định `Path=/api/v1/auth/refresh`, trình duyệt sẽ **tuyệt đối không bao giờ gửi Refresh Cookie** trong các request thông thường (như tải ảnh, đọc bài viết hay gọi API dữ liệu), giảm thiểu 99% bề mặt phơi nhiễm cookie.

---

## 5. THIẾT KẾ ĐỘNG CƠ PHÂN QUYỀN (RBAC + ABAC POLICY EVALUATOR)

```typescript
// Interface ngữ cảnh đánh giá thuộc tính động (ABAC Context)
export interface ABACSubject {
  userId: string;
  role: 'GUEST' | 'USER' | 'SPACE_MOD' | 'GLOBAL_MOD' | 'ADMIN';
  accountAgeDays: number;
  karmaScore: number;
  isShadowbanned: boolean;
  spaceRoles: Map<string, string>; // spaceId -> role
}

export interface ABACResource {
  type: 'POST' | 'COMMENT' | 'SPACE' | 'USER_PROFILE' | 'SYSTEM_LOGS';
  id: string;
  authorId?: string;
  spaceId?: string;
  createdAt?: Date;
  isLocked?: boolean;
}

export type ActionType = 
  | 'post:create'
  | 'post:edit'
  | 'post:delete'
  | 'post:pin'
  | 'comment:create'
  | 'vote:up'
  | 'vote:down'
  | 'space:create'
  | 'space:moderate'
  | 'system:view_logs';
```

### Các điều kiện đánh giá (Evaluation Invariants):
1. **Admin Override:** Quyền `ADMIN` tự động vượt qua mọi rào cản ABAC (ngoại trừ các ràng buộc logic nghiệp vụ như bài viết đã bị xóa vật lý).
2. **Quyền Tác giả & Khóa 24h:**
   $$\text{CanEditPost} = (\text{Subject.userId} == \text{Resource.authorId}) \land (\text{NOW}() - \text{Resource.createdAt} \le 24\text{ hours})$$
3. **Mở khóa Downvote:**
   $$\text{CanDownvote} = (\text{Subject.karmaScore} \ge 500) \land (\text{Subject.role} \ne \text{'GUEST'})$$
4. **Hạn mức Thành viên Mới:**
   $$\text{IsRestrictedNewbie} = (\text{Subject.accountAgeDays} < 7) \land (\text{Subject.role} == \text{'USER'})$$
