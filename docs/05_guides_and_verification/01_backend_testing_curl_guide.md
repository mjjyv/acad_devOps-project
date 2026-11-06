# Cẩm Nang Kiểm Thử Backend Bằng cURL (Backend Verification Guide)

> **Mã tài liệu:** `GUIDE-BACKEND-CURL`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Môi trường:** Debian GNU/Linux 13 (trixie) x86_64, `xfce4-terminal`, `curl`, `jq`

---

## 1. NGUYÊN TẮC KIỂM THỬ API-FIRST & QUY TRÌNH 4 BƯỚC (THEO `docs/guide.md`)

Tuân thủ nghiêm ngặt cẩm nang vận hành [`docs/guide.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/guide.md), mọi kịch bản kiểm thử API bắt buộc đi qua 4 bước:
1. **Khởi chạy môi trường dịch vụ (Service Spin-up):** Đảm bảo API Gateway (`apps/api`) cùng PostgreSQL 16 và Redis 7 đang hoạt động sẵn sàng.
2. **Thực thi lệnh gọi API thực tế:** Sử dụng `curl` với headers chuẩn `Content-Type: application/json` và `Accept: application/json`.
3. **Ghi nhận Log & Kiểm tra đầu ra (Response Verification):**
   - **Happy Path:** Phải nhận mã `200 OK` hoặc `201 Created` với cấu trúc JSON hợp lệ.
   - **Negative Path:** Dữ liệu sai/vi phạm phải nhận mã lỗi `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, hoặc `422 Unprocessable Entity`. Phản hồi lỗi bắt buộc theo định dạng **RFC 7807 Problem Details**.
   - **Quy tắc bất biến:** **Tuyệt đối không được xuất hiện mã lỗi `500 Internal Server Error`**.
4. **Xác thực biến đổi ngầm (Side-Effect Verification):** Sau các lệnh POST/PATCH/DELETE, phải gọi lệnh GET tương ứng hoặc truy vấn trực tiếp CSDL qua `psql` để xác nhận dữ liệu đã được ghi/xóa đúng quy cách.

---

## 2. THIẾT LẬP BIẾN MÔI TRƯỜNG KIỂM THỬ

Mở terminal trên Debian 13 và xuất các biến cấu hình:
```bash
# Chọn kiểm thử trên Cloud hoặc Local
export API_URL="https://acad-core-api.onrender.com"
# export API_URL="http://localhost:8080" # Nếu đang chạy Docker Compose cục bộ

# File lưu cookie phiên làm việc
export COOKIE_JAR="/tmp/acad_test_cookies.txt"
rm -f "$COOKIE_JAR"
```

---

## 3. KỊCH BẢN KIỂM THỬ CHI TIẾT TỪNG BƯỚC (HAPPY PATH & NEGATIVE PATH)

### Bước 1: Kiểm Tra Trạng Thái Sống Của API (Healthcheck Probe)
```bash
curl -s -i "$API_URL/healthz"
```
*Kỳ vọng:* HTTP 200 OK, trả về JSON gồm uptime, trạng thái CSDL auth và community.

---

### Bước 2: Đăng Ký Tài Khoản Mới
```bash
RANDOM_ID=$(date +%s)
curl -s -c "$COOKIE_JAR" -X POST "$API_URL/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tester_'$RANDOM_ID'",
    "email": "test_'$RANDOM_ID'@acad.internal",
    "password": "Password123!",
    "deviceFingerprint": "cli_debian13_tester"
  }' | jq .
```
*Kỳ vọng:* HTTP 201 Created, trả về đối tượng `user` và `sessionId`, lưu cookie vào `$COOKIE_JAR`.

---

### Bước 3: Đăng Nhập Lấy Cặp Tokens Mới
```bash
LOGIN_RES=$(curl -s -c "$COOKIE_JAR" -X POST "$API_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "login": "tester_'$RANDOM_ID'",
    "password": "Password123!",
    "deviceFingerprint": "cli_debian13_tester"
  }')
echo "$LOGIN_RES" | jq .

export ACCESS_TOKEN=$(echo "$LOGIN_RES" | jq -r '.accessToken')
```

---

### Bước 4: Kiểm Thử Giao Thức Xoay Vòng Token (Token Rotation & 30s Grace Period)
```bash
# Thực hiện làm mới token lần đầu (Thành công)
REFRESH_RES=$(curl -s -X POST "$API_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "'$REFRESH_TOKEN'" }')
echo "$REFRESH_RES" | jq .

NEW_REFRESH_TOKEN=$(echo "$REFRESH_RES" | jq -r '.refreshToken')

# Kịch bản Multi-Tab Race: Gửi lại token cũ ($REFRESH_TOKEN) trong vòng 30s Grace Period
# Kỳ vọng: Vẫn nhận được Access Token hợp lệ, không bị thu hồi phiên
curl -s -X POST "$API_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "'$REFRESH_TOKEN'" }' | jq .

# Kịch bản Token Reuse Attack: Nếu gửi lại token cũ sau khi Grace Period 30s kết thúc
# Kỳ vọng: HTTP 401 Unauthorized, title: "Token Reuse Attack Detected", toàn bộ phiên bị thu hồi!
```

---

### Bước 5: Truy Vấn Danh Sách Không Gian (Spaces)
```bash
curl -s -X GET "$API_URL/api/v1/spaces" -H "Accept: application/json" | jq .
```
*Kỳ vọng:* HTTP 200 OK, trả về danh sách các Space kèm `memberCount` và `threadCount`.

---

### Bước 6: Đăng Bài Viết Mới (Create Thread)
```bash
# Giả sử lấy spaceId đầu tiên
SPACE_ID=$(curl -s "$API_URL/api/v1/spaces" | jq -r '.[0].id')

curl -s -X POST "$API_URL/api/v1/threads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "spaceId": "'$SPACE_ID'",
    "title": "Kiểm thử tự động hệ thống diễn đàn Acad DevOps",
    "contentText": "Nội dung bài viết thảo luận về hiệu năng PostgreSQL ltree và Redis Lua.",
    "linkUrl": "https://acad-web-client.onrender.com"
  }' | jq .
```

---

### Bước 7: Thực Hiện Bỏ Phiếu Nguyên Tử Upvote (Redis Lua)
```bash
# Giả sử lấy threadId vừa tạo
THREAD_ID=$(curl -s "$API_URL/api/v1/threads?limit=1" | jq -r '.items[0].id')

curl -s -X POST "$API_URL/api/v1/threads/$THREAD_ID/vote" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{ "direction": 1 }' | jq .
```
*Kỳ vọng:* HTTP 200 OK, trả về `{ "success": true, "direction": 1, "netScore": 1 }`.

---

## 4. KỊCH BẢN THỰC THI KIỂM THỬ TỰ ĐỘNG QUA BASH SCRIPTS

Dự án đã tích hợp sẵn các kịch bản kiểm thử API khép kín (End-to-End Test Runner) trong thư mục `scripts/`:

1. **Kiểm thử Phân hệ B1 (Identity & Auth):**
   ```bash
   chmod +x scripts/verify-api-curl.sh
   ./scripts/verify-api-curl.sh
   # Kết quả tự động ghi vào docs/05_guides_and_verification/logs/log_B1_auth_subsystem.md
   ```

2. **Kiểm thử Phân hệ B2 (Spaces, Threads CMS & Nested Comments `ltree`):**
   ```bash
   chmod +x scripts/verify-community-curl.sh
   ./scripts/verify-community-curl.sh
   # Kết quả tự động ghi vào docs/05_guides_and_verification/logs/log_B2_spaces_and_content.md
   ```

3. **Kiểm thử Phân hệ B3 (Bầu Chọn Nguyên Tử Redis Lua, Xếp Hạng & Bảng Tin):**
   ```bash
   chmod +x scripts/verify-feeds-and-voting-curl.sh
   ./scripts/verify-feeds-and-voting-curl.sh
   # Kết quả tự động ghi vào docs/05_guides_and_verification/logs/log_B3_voting_and_feeds.md
   ```

4. **Kiểm thử Phân hệ B4 (Realtime Chat Subsystem, SSE Gateway & Chat Requests Queue):**
   ```bash
   chmod +x scripts/verify-chat-curl.sh
   ./scripts/verify-chat-curl.sh
   # Kết quả tự động ghi vào docs/05_guides_and_verification/logs/log_B4_realtime_chat.md
   ```

