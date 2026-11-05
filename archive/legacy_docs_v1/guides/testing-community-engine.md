# Hướng Dẫn Kiểm Thử: Phân Hệ Cộng Đồng Thực Tế (Core Community Engine)

Tài liệu này hướng dẫn chi tiết quy trình kiểm thử phân hệ Cộng đồng (Spaces, Threads, Cây bình luận đa tầng Ltree, và Bỏ phiếu Upvote/Downvote) dành cho lập trình viên và kiểm thử viên, cả thông qua RESTful API (cURL) và Giao diện Web Client Brutalist Dark Mode.

---

## 1. Kiểm Thử Thông Qua RESTful API (Backend CLI / cURL)

Bạn có thể chạy các lệnh cURL này trực tiếp trên terminal của Debian hoặc kiểm thử trên môi trường Render (`https://acad-core-api.onrender.com`) hoặc Local (`http://localhost:8080`).

### 1.1. Lấy danh sách Không gian thảo luận (Spaces)
```bash
curl -X GET "https://acad-core-api.onrender.com/api/v1/spaces" \
  -H "Accept: application/json"
```
**Kỳ vọng:** Trả về mã HTTP 200 kèm mảng các không gian `devops-engineering`, `security-devsecops`, `system-architecture` với số lượng thành viên và bài viết.

---

### 1.2. Đăng ký & Đăng nhập để lấy Access Token
```bash
# Đăng ký tài khoản kiểm thử
curl -X POST "https://acad-core-api.onrender.com/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tester_pro",
    "email": "tester_pro@acad.internal",
    "password": "Password123!",
    "deviceFingerprint": "cli_tester_macbook"
  }'
```
Sao chép chuỗi `accessToken` nhận được và lưu vào biến môi trường:
```bash
export TOKEN="<ACCESS_TOKEN_CUA_BAN>"
```

---

### 1.3. Lấy Bảng Tin Cộng Đồng (Feed)
```bash
# Lọc bài viết thịnh hành
curl -X GET "https://acad-core-api.onrender.com/api/v1/threads?sort=hot&limit=10" \
  -H "Accept: application/json"

# Lọc bài viết mới nhất theo không gian cụ thể
curl -X GET "https://acad-core-api.onrender.com/api/v1/threads?spaceSlug=devops-engineering&sort=new" \
  -H "Accept: application/json"
```

---

### 1.4. Đăng Bài Viết Mới (Create Thread)
```bash
# Giả sử spaceId của devops-engineering là: 22222222-2222-2222-2222-222222222221
curl -X POST "https://acad-core-api.onrender.com/api/v1/threads" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "spaceId": "22222222-2222-2222-2222-222222222221",
    "title": "Kinh nghiệm triển khai Kubernetes Ingress Nginx kết hợp Cert-Manager",
    "contentAst": {
      "type": "doc",
      "content": [
        {
          "type": "paragraph",
          "text": "Tự động cấp phát chứng chỉ SSL/TLS miễn phí qua Let'\''s Encrypt ACME Challenge trong cụm K8s nội bộ."
        },
        {
          "type": "codeBlock",
          "attrs": { "language": "yaml" },
          "text": "apiVersion: cert-manager.io/v1\nkind: ClusterIssuer\nmetadata:\n  name: letsencrypt-prod\nspec:\n  acme:\n    server: https://acme-v02.api.letsencrypt.org/directory"
        }
      ]
    }
  }'
```
Lưu lại `id` và `slug` của bài viết vừa tạo:
```bash
export THREAD_ID="<ID_BAI_VIET>"
export THREAD_SLUG="<SLUG_BAI_VIET>"
```

---

### 1.5. Bỏ phiếu Tán thành / Phản đối (Upvote / Downvote)
```bash
# Tán thành (+1)
curl -X POST "https://acad-core-api.onrender.com/api/v1/threads/$THREAD_ID/vote" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"direction": 1}'

# Bấm lại lần nữa (+1) sẽ tự động Hủy vote (Unvote) theo cơ chế máy trạng thái Atomic Lua
```

---

### 1.6. Bình luận Đa Tầng Lồng Nhau (Nested Comments with Ltree)
```bash
# 1. Gửi bình luận gốc (Cấp 0)
curl -X POST "https://acad-core-api.onrender.com/api/v1/threads/$THREAD_ID/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "parentId": null,
    "contentAst": {
      "type": "doc",
      "content": [
        { "type": "paragraph", "text": "Khi cấu hình HTTP01 solver, hãy chú ý mở port 80 cho firewall nhé!" }
      ]
    }
  }'
```
Sao chép `id` của bình luận vừa tạo thành `COMMENT_1_ID`.

```bash
# 2. Gửi bình luận phản hồi lồng nhau (Cấp 1 - con của COMMENT_1_ID)
curl -X POST "https://acad-core-api.onrender.com/api/v1/threads/$THREAD_ID/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "parentId": "<COMMENT_1_ID>",
    "contentAst": {
      "type": "doc",
      "content": [
        { "type": "paragraph", "text": "Chuẩn luôn, hoặc có thể dùng DNS01 solver với Cloudflare API Token để không cần mở port 80." }
      ]
    }
  }'
```

```bash
# 3. Lấy toàn bộ cây bình luận của bài viết
curl -X GET "https://acad-core-api.onrender.com/api/v1/threads/$THREAD_ID/comments" \
  -H "Accept: application/json"
```
**Kỳ vọng:** Bình luận con có `depth = 1` và `path` có định dạng `0001.0001`, tự động xếp sau bình luận cha.

---

## 2. Kiểm Thử Trên Giao Diện Web (Minimalist Brutalism UI)

1. **Truy cập Giao diện Web:**
   - Mở trình duyệt truy cập: `https://acad-web-client.onrender.com` (hoặc `http://localhost:3000`).
   - Giao diện Dark Mode Brutalism sẽ hiển thị với 4 gam màu:
     - Nền Canvas đen than: `#222831`
     - Khối Container & Navbar: `#393E46`
     - Viền dứt khoát không bo tròn: `#948979`
     - Chữ & Nút bấm kem sáng: `#DFD0B8`
2. **Kiểm tra Bảng Tin Cộng Đồng (Feed):**
   - Click chuyển đổi giữa các tab **THỊNH HÀNH**, **MỚI NHẤT**, **ĐIỂM CAO**.
   - Click chọn từng không gian bên cột trái (`s/devops-engineering`, `s/security-devsecops`) để xem bài viết được lọc theo thời gian thực.
3. **Đăng Bài Viết Mới:**
   - Đăng nhập vào tài khoản của bạn.
   - Bấm nút **"+ ĐĂNG BÀI VIẾT"** ở cột trái.
   - Chọn Không gian thảo luận $\rightarrow$ Nhập tiêu đề và nội dung $\rightarrow$ Dán một đoạn code cấu hình YAML hoặc Bash $\rightarrow$ Bấm **XÁC NHẬN ĐĂNG BÀI**.
   - Bài viết lập tức xuất hiện ngay trên đầu bảng tin!
4. **Kiểm tra Tương Tác Giữa Nhiều Người Dùng (Multi-User Community):**
   - Mở thêm một Cửa sổ Ẩn danh (Incognito) hoặc trình duyệt thứ hai.
   - Đăng nhập bằng tài khoản khác.
   - Bạn sẽ nhìn thấy ngay bài viết mà tài khoản thứ nhất vừa đăng!
   - Bấm Upvote (▲) $\rightarrow$ Điểm số tăng ngay lập tức.
   - Bấm vào bài viết $\rightarrow$ Gửi bình luận.
   - Bấm nút **"TRẢ LỜI"** dưới bình luận của người khác $\rightarrow$ Nhập phản hồi con $\rightarrow$ Bình luận con tự động thụt lề có đường gióng thẳng màu `#948979` dứt khoát!
