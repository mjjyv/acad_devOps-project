# Hướng Dẫn Kiểm Thử Chức Năng Backend (Backend Verification Guide)

> **Mục tiêu:** Hướng dẫn kiểm thử toàn diện các chức năng Backend đã phát triển (Auth Subsystem, Token Rotation, Session Management, RBAC, Healthz) trên môi trường **Debian GNU/Linux 13 (trixie) x86_64** sử dụng Shell `bash` và lệnh `curl`.

---

## 1. Yêu Cầu Môi Trường & Công Cụ Chuẩn Bị (Debian 13)

Trên terminal của bạn (`xfce4-terminal` hoặc terminal mặc định), kiểm tra và cài đặt các công cụ cần thiết:
```bash
# Kiểm tra phiên bản hệ điều hành và shell
cat /etc/os-release
echo $SHELL

# Cài đặt curl và jq để định dạng JSON đẹp mắt
sudo apt-get update && sudo apt-get install -y curl jq
```

Biến môi trường mục tiêu kiểm thử:
```bash
# Chọn kiểm thử trên Local hoặc Cloud (Render)
export API_URL="https://acad-core-api.onrender.com"
# export API_URL="http://localhost:4000" # Nếu đang chạy Docker Compose cục bộ

# Khởi tạo file lưu trữ cookie phiên làm việc
export COOKIE_JAR="/tmp/acad_cookies.txt"
rm -f "$COOKIE_JAR"
```

---

## 2. Kịch Bản Kiểm Thử Từng Bước (Step-by-Step Test Scenarios)

### Kịch Bản 1: Kiểm Tra Trạng Thái Sống Của API (Healthcheck Probe)
Xác minh dịch vụ backend đang trực tuyến, đo lường thời gian phản hồi:
```bash
curl -s -i "$API_URL/healthz"
```
**Kết quả kỳ vọng (HTTP 200 OK):**
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
```
```json
{
  "status": "healthy",
  "timestamp": "2026-10-30T...",
  "uptime": 123.45,
  "database": "connected"
}
```

---

### Kịch Bản 2: Đăng Ký Tài Khoản Mới (User Registration)
Tạo tài khoản người dùng mới để kiểm tra mã hóa mật khẩu Argon2id và tạo user profile:
```bash
# Sinh email ngẫu nhiên để tránh trùng lặp
RANDOM_ID=$(date +%s)
TEST_EMAIL="dev_${RANDOM_ID}@acad.internal"
TEST_PASS="P@ssw0rdSecure2026!"

curl -s -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_JAR" \
  -d '{
    "email": "'"$TEST_EMAIL"'",
    "password": "'"$TEST_PASS"'",
    "name": "DevOps Engineer"
  }' | jq .
```
**Kết quả kỳ vọng (HTTP 201 Created):**
```json
{
  "user": {
    "id": "e4b3c2a1-...",
    "email": "dev_1730263600@acad.internal",
    "name": "DevOps Engineer",
    "role": "user",
    "status": "active"
  },
  "tokens": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "7f8b9c...",
    "expiresIn": 900
  }
}
```
*Lưu ý:* Hai cookie HttpOnly `access_token` và `refresh_token` sẽ tự động được ghi nhận vào file `$COOKIE_JAR`.

---

### Kịch Bản 3: Đăng Nhập & Cấp Phát Phiên Mới (User Login)
Kiểm tra xác thực mật khẩu, kiểm tra chống brute-force và cấp token mới:
```bash
LOGIN_RESP=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_JAR" \
  -d '{
    "email": "'"$TEST_EMAIL"'",
    "password": "'"$TEST_PASS"'"
  }')

echo "$LOGIN_RESP" | jq .

# Trích xuất Access Token để dùng cho các request tiếp theo
ACCESS_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.tokens.accessToken // empty')
REFRESH_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.tokens.refreshToken // empty')
echo "Access Token trích xuất: ${ACCESS_TOKEN:0:30}..."
```
**Kết quả kỳ vọng (HTTP 200 OK):** Trả về đầy đủ thông tin user và cặp token. Cookie jar nhận cặp cookie mới.

---

### Kịch Bản 4: Xoay Vòng Token An Toàn (Token Rotation & 30s Grace Period)
Gửi Refresh Token để lấy Access Token mới. Theo kiến trúc an toàn, Token cũ sẽ được cấp thời gian ân hạn 30 giây:
```bash
echo "==> Lần Refresh 1: Đổi Token hợp lệ"
REFRESH_RESP_1=$(curl -s -X POST "$API_URL/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -b "$COOKIE_JAR" \
  -c "$COOKIE_JAR" \
  -d '{
    "refreshToken": "'"$REFRESH_TOKEN"'"
  }')

echo "$REFRESH_RESP_1" | jq .
NEW_REFRESH_TOKEN=$(echo "$REFRESH_RESP_1" | jq -r '.tokens.refreshToken')

echo "==> Lần Refresh 2: Thử dùng lại Refresh Token CŨ ngay lập tức (trong vòng 30s Grace Period)"
curl -s -X POST "$API_URL/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'"$REFRESH_TOKEN"'"
  }' | jq .
```
**Kết quả kỳ vọng:**
- Lần 1: **HTTP 200 OK**, trả về `accessToken` và `refreshToken` mới.
- Lần 2 (trong 30s): **HTTP 200 OK**, hệ thống kích hoạt cơ chế Grace Period, tái cấp token hợp lệ mà không khóa tài khoản.

---

### Kịch Bản 5: Kiểm Tra Cơ Chế Phát Hiện Xâm Nhập (Token Reuse Detection)
Nếu token cũ bị gửi lại **sau khi hết 30s Grace Period**, hệ thống nhận diện đây là hành vi đánh cắp token và lập tức hủy bỏ toàn bộ phiên làm việc của user:
```bash
echo "Chờ 31 giây để vượt qua Grace Period..."
sleep 31

echo "==> Gửi lại Refresh Token cũ sau khi hết Grace Period:"
curl -s -i -X POST "$API_URL/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "'"$REFRESH_TOKEN"'"
  }'
```
**Kết quả kỳ vọng (HTTP 401 Unauthorized):**
```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Security Alert: Refresh token reuse detected. All sessions revoked."
}
```

---

### Kịch Bản 6: Quản Lý Danh Sách Phiên Đang Hoạt Động (Session Management)
Đăng nhập lại để tạo session mới, sau đó kiểm tra danh sách phiên:
```bash
# Đăng nhập lại
LOGIN_NEW=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -c "$COOKIE_JAR" \
  -d '{
    "email": "'"$TEST_EMAIL"'",
    "password": "'"$TEST_PASS"'"
  }')
ACCESS_TOKEN=$(echo "$LOGIN_NEW" | jq -r '.tokens.accessToken')

# Lấy danh sách session
curl -s -X GET "$API_URL/api/v1/auth/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -b "$COOKIE_JAR" | jq .
```
**Kết quả kỳ vọng (HTTP 200 OK):** Mảng chứa các session kèm User-Agent, IP, thời điểm đăng nhập, cờ `isCurrent: true`.

---

### Kịch Bản 7: Đăng Xuất An Toàn (Logout)
Hủy phiên làm việc trên server và xóa sạch cookie trên client:
```bash
curl -s -i -X POST "$API_URL/api/v1/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -b "$COOKIE_JAR" \
  -c "$COOKIE_JAR"
```
**Kết quả kỳ vọng (HTTP 200 OK):**
Header trả về xóa cookie: `Set-Cookie: access_token=; Max-Age=0...` và `refresh_token=; Max-Age=0...`.

---

### Kịch Bản 8: Kiểm Tra Phân Quyền Quản Trị (RBAC & Admin Stats)
Thử truy cập endpoint Admin với tài khoản người dùng thường:
```bash
curl -s -i -X GET "$API_URL/api/v1/auth/admin/stats" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```
**Kết quả kỳ vọng (HTTP 403 Forbidden):**
```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Access denied: Required role 'admin' not satisfied."
}
```

---

## 3. Script Kiểm Thử Tự Động Toàn Diện (All-in-One Automated Test Script)

Lưu đoạn mã sau thành tệp `test-backend.sh` trên máy Debian 13 và cấp quyền thực thi:
```bash
cat << 'EOF' > test-backend.sh
#!/usr/bin/env bash
set -eo pipefail

API_URL="${API_URL:-https://acad-core-api.onrender.com}"
echo "=================================================="
echo "ACAD BACKEND VERIFICATION SUITE"
echo "Target API: $API_URL"
echo "OS: $(uname -s) $(uname -r) ($(uname -m))"
echo "=================================================="

# 1. Healthcheck
echo -n "[1/5] Checking Healthz Probe... "
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/healthz")
if [ "$HEALTH_CODE" -eq 200 ]; then
  echo "PASSED (HTTP 200)"
else
  echo "FAILED (HTTP $HEALTH_CODE)"
  exit 1
fi

# 2. Registration
RANDOM_USER="test_$(date +%s)@acad.internal"
echo -n "[2/5] Testing User Registration ($RANDOM_USER)... "
REG_RESP=$(curl -s -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$RANDOM_USER"'","password":"Password123!","name":"Test User"}')
REG_TOKEN=$(echo "$REG_RESP" | jq -r '.tokens.accessToken // empty')
if [ -n "$REG_TOKEN" ]; then
  echo "PASSED (Token generated)"
else
  echo "FAILED: $REG_RESP"
  exit 1
fi

# 3. Login
echo -n "[3/5] Testing User Login... "
LOGIN_RESP=$(curl -s -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'"$RANDOM_USER"'","password":"Password123!"}')
LOGIN_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.tokens.accessToken // empty')
REFRESH_TOKEN=$(echo "$LOGIN_RESP" | jq -r '.tokens.refreshToken // empty')
if [ -n "$LOGIN_TOKEN" ] && [ -n "$REFRESH_TOKEN" ]; then
  echo "PASSED"
else
  echo "FAILED: $LOGIN_RESP"
  exit 1
fi

# 4. Token Refresh with Grace Period
echo -n "[4/5] Testing Token Refresh... "
REF_RESP=$(curl -s -X POST "$API_URL/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"'"$REFRESH_TOKEN"'"}')
NEW_TOKEN=$(echo "$REF_RESP" | jq -r '.tokens.accessToken // empty')
if [ -n "$NEW_TOKEN" ]; then
  echo "PASSED"
else
  echo "FAILED: $REF_RESP"
  exit 1
fi

# 5. RBAC Protection Check
echo -n "[5/5] Testing RBAC Protection (Expect 403 on Admin Route)... "
FORBIDDEN_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/api/v1/auth/admin/stats" \
  -H "Authorization: Bearer $NEW_TOKEN")
if [ "$FORBIDDEN_CODE" -eq 403 ]; then
  echo "PASSED (HTTP 403 Forbidden as expected)"
else
  echo "FAILED (Unexpected HTTP $FORBIDDEN_CODE)"
  exit 1
fi

echo "=================================================="
echo "ALL BACKEND TESTS PASSED SUCCESSFULLY!"
echo "=================================================="
EOF

chmod +x test-backend.sh
./test-backend.sh
```
