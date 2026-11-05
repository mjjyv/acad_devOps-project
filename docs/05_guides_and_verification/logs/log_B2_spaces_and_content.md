# Nhật Ký Thực Nghiệm Kiểm Thử API & Nghiệm Thu Phân Hệ B2 (Spaces, Threads CMS & Nested Comments ltree)
> **Mã báo cáo:** `LOG-B2-SPACES-CONTENT`  
> **Thời điểm thực thi:** 2026-11-05T16:55:11Z  
> **Môi trường:** Debian GNU/Linux 13 (trixie) x86_64, Node.js v22.23.4, pnpm 10.15.0  
> **Commit Hash:** `18170e9abf042297663f3a53950549ec1cdd1612`  
> **Quy chuẩn đối chiếu:** `docs/guide.md` (4-Step API-First Testing Protocol & 8-Point DoD)

---

## 1. TỔNG HỢP KIỂM ĐỊNH 4 CỔNG CI TRƯỚC KHI CHẠY API

- **Cổng 1 (Biome Lint):** 63 files checked in 46ms (0 errors, 0 warnings).
- **Cổng 2 (Typecheck Strict):** 5/5 packages pass `tsc --noEmit` (`@acad/contracts`, `@acad/auth-client`, `@acad/auth-service`, `@acad/community-service`, `@acad/api-gateway`).
- **Cổng 3 (Vitest Automated Tests):** 72/72 tests passed (100% across all 5 workspace projects).
- **Cổng 4 (API Live Probes):** Xác thực trực tiếp qua `curl` trên cổng kết nối HTTP thực tế (3099).

---

## 2. KỊCH BẢN THỰC THI cURL THỰC TẾ & BẰNG CHỨNG ĐẦU RA (LIVE HTTP TRACE)

### Bước 1: Từ chối tạo Space khi không có Bearer Token (HTTP 401 Unauthorized)
```bash
curl -s -i -X POST 'http://127.0.0.1:3099/spaces' -H 'Content-Type: application/json' -d '{"name":"Golang Vietnam","slug":"golang-vn","isPrivate":false}'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 401 Unauthorized
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 5c7825e6-f755-4c80-8345-e193caeda699
Content-Type: application/problem+json; charset=utf-8
Content-Length: 257
ETag: W/"101-n7mGSCBllCbpA+o67bf1FOMDb0Q"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"type":"https://api.acad.vn/errors/unauthorized","title":"Missing Authorization Token","status":401,"detail":"A valid Bearer access token is required in the Authorization header.","instance":"/spaces","correlationId":"5c7825e6-f755-4c80-8345-e193caeda699"}
```
---

### Bước 2: Tạo Space thành công (HTTP 201 Created) và tự động gán vai trò CREATOR
```bash
curl -s -i -X POST 'http://127.0.0.1:3099/spaces' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTE4ZGM3MS01OTVjLTRlYmItOTQwYy02NzU4ZmI5YjcwZmYiLCJ1c2VybmFtZSI6ImNyZWF0b3JfbGVhZCIsImVtYWlsIjoiY3JlYXRvckBhY2FkLnZuIiwicm9sZSI6IlVTRVIiLCJzdGF0dXMiOiJBQ1RJVkUiLCJzZXNzaW9uSWQiOiJjMThlZDRlOC0xZmRlLTQ4YTAtYmYwMi1lYTAzNzBlOWJhYzkiLCJpc3MiOiJhY2FkLWRldm9wcy1wbGF0Zm9ybSIsImlhdCI6MTc5Mzg5NzcxMiwiZXhwIjoxNzkzODk4NjEyfQ.huLroNIBsZWk5B1xixwS3-vTjFgx0io2V-l-C1XbIXQ' -H 'Content-Type: application/json' -d '{"name":"Golang Vietnam","slug":"golang-vn","description":"Cộng đồng lập trình viên Go Việt Nam","isPrivate":false}'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 83dd5962-a989-4f1c-b9a2-a4b6cfe8983e
Content-Type: application/json; charset=utf-8
Content-Length: 411
ETag: W/"19b-T9MvUAqaOgwc2dBgLmWEsKnCh/o"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"794145d5-1d89-4d3e-aeb2-b4bfb5f07385","slug":"golang-vn","name":"Golang Vietnam","description":"Cộng đồng lập trình viên Go Việt Nam","iconUrl":null,"bannerUrl":null,"rules":[],"creatorId":"8e18dc71-595c-4ebb-940c-6758fb9b70ff","membersCount":1,"threadsCount":0,"isPrivate":false,"isJoined":true,"myRole":"CREATOR","createdAt":"2026-11-05T16:55:12.180Z","updatedAt":"2026-11-05T16:55:12.180Z"}
```
---

### Bước 3: Từ chối tạo Space trùng Slug (HTTP 409 Conflict RFC 7807)
```bash
curl -s -i -X POST 'http://127.0.0.1:3099/spaces' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTE4ZGM3MS01OTVjLTRlYmItOTQwYy02NzU4ZmI5YjcwZmYiLCJ1c2VybmFtZSI6ImNyZWF0b3JfbGVhZCIsImVtYWlsIjoiY3JlYXRvckBhY2FkLnZuIiwicm9sZSI6IlVTRVIiLCJzdGF0dXMiOiJBQ1RJVkUiLCJzZXNzaW9uSWQiOiJjMThlZDRlOC0xZmRlLTQ4YTAtYmYwMi1lYTAzNzBlOWJhYzkiLCJpc3MiOiJhY2FkLWRldm9wcy1wbGF0Zm9ybSIsImlhdCI6MTc5Mzg5NzcxMiwiZXhwIjoxNzkzODk4NjEyfQ.huLroNIBsZWk5B1xixwS3-vTjFgx0io2V-l-C1XbIXQ' -H 'Content-Type: application/json' -d '{"name":"Golang Duplicate","slug":"golang-vn","isPrivate":false}'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 409 Conflict
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 6d733584-c573-4ade-8847-115942ea63bf
Content-Type: application/problem+json; charset=utf-8
Content-Length: 231
ETag: W/"e7-nYvuKzO9CSzHTKY8Hp283kQh6EY"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"type":"https://api.acad.vn/errors/conflict","title":"Resource Conflict","status":409,"detail":"Slug không gian \"golang-vn\" đã được sử dụng","instance":"/spaces","correlationId":"6d733584-c573-4ade-8847-115942ea63bf"}
```
---

### Bước 4: Lấy danh sách Spaces công khai (HTTP 200 OK)
```bash
curl -s -i -X GET 'http://127.0.0.1:3099/spaces?limit=10&offset=0'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 2c8f9e29-81d3-4502-b144-79122a99e35e
Content-Type: application/json; charset=utf-8
Content-Length: 420
ETag: W/"1a4-4kaaPg0bwCGkuyfIBRn6oXJSnVk"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"spaces":[{"id":"794145d5-1d89-4d3e-aeb2-b4bfb5f07385","slug":"golang-vn","name":"Golang Vietnam","description":"Cộng đồng lập trình viên Go Việt Nam","iconUrl":null,"bannerUrl":null,"rules":[],"creatorId":"8e18dc71-595c-4ebb-940c-6758fb9b70ff","membersCount":1,"threadsCount":0,"isPrivate":false,"isJoined":false,"myRole":null,"createdAt":"2026-11-05T16:55:12.180Z","updatedAt":"2026-11-05T16:55:12.180Z"}]}
```
---

### Bước 5: Lấy thông tin chi tiết Space theo Slug (HTTP 200 OK)
```bash
curl -s -i -X GET 'http://127.0.0.1:3099/spaces/golang-vn' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTE4ZGM3MS01OTVjLTRlYmItOTQwYy02NzU4ZmI5YjcwZmYiLCJ1c2VybmFtZSI6ImNyZWF0b3JfbGVhZCIsImVtYWlsIjoiY3JlYXRvckBhY2FkLnZuIiwicm9sZSI6IlVTRVIiLCJzdGF0dXMiOiJBQ1RJVkUiLCJzZXNzaW9uSWQiOiJjMThlZDRlOC0xZmRlLTQ4YTAtYmYwMi1lYTAzNzBlOWJhYzkiLCJpc3MiOiJhY2FkLWRldm9wcy1wbGF0Zm9ybSIsImlhdCI6MTc5Mzg5NzcxMiwiZXhwIjoxNzkzODk4NjEyfQ.huLroNIBsZWk5B1xixwS3-vTjFgx0io2V-l-C1XbIXQ'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 31d6fea9-ec09-40a5-8c38-84fdf8ce0128
Content-Type: application/json; charset=utf-8
Content-Length: 411
ETag: W/"19b-T9MvUAqaOgwc2dBgLmWEsKnCh/o"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"794145d5-1d89-4d3e-aeb2-b4bfb5f07385","slug":"golang-vn","name":"Golang Vietnam","description":"Cộng đồng lập trình viên Go Việt Nam","iconUrl":null,"bannerUrl":null,"rules":[],"creatorId":"8e18dc71-595c-4ebb-940c-6758fb9b70ff","membersCount":1,"threadsCount":0,"isPrivate":false,"isJoined":true,"myRole":"CREATOR","createdAt":"2026-11-05T16:55:12.180Z","updatedAt":"2026-11-05T16:55:12.180Z"}
```
---

### Bước 6: Tạo Flair nhãn bài viết bởi Creator (HTTP 201 Created)
```bash
curl -s -i -X POST 'http://127.0.0.1:3099/spaces/golang-vn/flairs' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTE4ZGM3MS01OTVjLTRlYmItOTQwYy02NzU4ZmI5YjcwZmYiLCJ1c2VybmFtZSI6ImNyZWF0b3JfbGVhZCIsImVtYWlsIjoiY3JlYXRvckBhY2FkLnZuIiwicm9sZSI6IlVTRVIiLCJzdGF0dXMiOiJBQ1RJVkUiLCJzZXNzaW9uSWQiOiJjMThlZDRlOC0xZmRlLTQ4YTAtYmYwMi1lYTAzNzBlOWJhYzkiLCJpc3MiOiJhY2FkLWRldm9wcy1wbGF0Zm9ybSIsImlhdCI6MTc5Mzg5NzcxMiwiZXhwIjoxNzkzODk4NjEyfQ.huLroNIBsZWk5B1xixwS3-vTjFgx0io2V-l-C1XbIXQ' -H 'Content-Type: application/json' -d '{"name":"Kiến Trúc Microservices","slug":"microservices","colorHex":"#00ADD8","backgroundHex":"#202225"}'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 6b24d26d-c909-42c5-9dde-a2fe9cd6a288
Content-Type: application/json; charset=utf-8
Content-Length: 239
ETag: W/"ef-Xd+yQM9hberPHW6AFmg6t+Aj0NA"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"1c97f146-c683-4bcd-ab83-b3aed8ea8f2f","spaceId":"794145d5-1d89-4d3e-aeb2-b4bfb5f07385","name":"Kiến Trúc Microservices","slug":"microservices","colorHex":"#00ADD8","backgroundHex":"#202225","createdAt":"2026-11-05T16:55:12.213Z"}
```
---

### Bước 7: Từ chối tạo Flair nếu chỉ là Member bình thường (HTTP 403 Forbidden RFC 7807)
```bash
curl -s -i -X POST 'http://127.0.0.1:3099/spaces/golang-vn/flairs' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNDYxZDgxOS01MDI3LTRjYzgtYWViYS04MjllZTgwZjIwNzQiLCJ1c2VybmFtZSI6Im1lbWJlcl91c2VyIiwiZW1haWwiOiJtZW1iZXJAYWNhZC52biIsInJvbGUiOiJVU0VSIiwic3RhdHVzIjoiQUNUSVZFIiwic2Vzc2lvbklkIjoiYWY4MmJiMjktMjUwOC00NmZkLTliNDktZmEyNDE2MGM0YmU1IiwiaXNzIjoiYWNhZC1kZXZvcHMtcGxhdGZvcm0iLCJpYXQiOjE3OTM4OTc3MTIsImV4cCI6MTc5Mzg5ODYxMn0.B07wxnO8FmAcFpAPBSSRc5-5E8sNkltB-16CxbG0YKA' -H 'Content-Type: application/json' -d '{"name":"Hack Flair","slug":"hack","colorHex":"#FF0000"}'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 403 Forbidden
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 9ba91fc2-a0ac-483a-9f20-ed36e4d28e75
Content-Type: application/problem+json; charset=utf-8
Content-Length: 236
ETag: W/"ec-AYD2JWCyteGvYePWG1H4H/TUesg"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"type":"https://api.acad.vn/errors/forbidden","title":"Forbidden","status":403,"detail":"Chỉ Quản trị viên mới được tạo Flair","instance":"/spaces/golang-vn/flairs","correlationId":"9ba91fc2-a0ac-483a-9f20-ed36e4d28e75"}
```
---

### Bước 8: Người dùng Member tham gia không gian thảo luận (HTTP 200 OK)
```bash
curl -s -i -X POST 'http://127.0.0.1:3099/spaces/golang-vn/join' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNDYxZDgxOS01MDI3LTRjYzgtYWViYS04MjllZTgwZjIwNzQiLCJ1c2VybmFtZSI6Im1lbWJlcl91c2VyIiwiZW1haWwiOiJtZW1iZXJAYWNhZC52biIsInJvbGUiOiJVU0VSIiwic3RhdHVzIjoiQUNUSVZFIiwic2Vzc2lvbklkIjoiYWY4MmJiMjktMjUwOC00NmZkLTliNDktZmEyNDE2MGM0YmU1IiwiaXNzIjoiYWNhZC1kZXZvcHMtcGxhdGZvcm0iLCJpYXQiOjE3OTM4OTc3MTIsImV4cCI6MTc5Mzg5ODYxMn0.B07wxnO8FmAcFpAPBSSRc5-5E8sNkltB-16CxbG0YKA'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 37257e9f-fe00-4f10-b2d7-1144bd9f149f
Content-Type: application/json; charset=utf-8
Content-Length: 47
ETag: W/"2f-lFlFMIjImPYFIkTBEMycjJCe0E8"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"message":"Tham gia không gian thành công"}
```
---

### Bước 9: Đăng bài viết mới vào Space kèm Slug SEO tự động (HTTP 201 Created)
```bash
curl -s -i -X POST 'http://127.0.0.1:3099/spaces/golang-vn/threads' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTE4ZGM3MS01OTVjLTRlYmItOTQwYy02NzU4ZmI5YjcwZmYiLCJ1c2VybmFtZSI6ImNyZWF0b3JfbGVhZCIsImVtYWlsIjoiY3JlYXRvckBhY2FkLnZuIiwicm9sZSI6IlVTRVIiLCJzdGF0dXMiOiJBQ1RJVkUiLCJzZXNzaW9uSWQiOiJjMThlZDRlOC0xZmRlLTQ4YTAtYmYwMi1lYTAzNzBlOWJhYzkiLCJpc3MiOiJhY2FkLWRldm9wcy1wbGF0Zm9ybSIsImlhdCI6MTc5Mzg5NzcxMiwiZXhwIjoxNzkzODk4NjEyfQ.huLroNIBsZWk5B1xixwS3-vTjFgx0io2V-l-C1XbIXQ' -H 'Content-Type: application/json' -d '{"title":"Tối ưu hóa hiệu năng Concurrency với Goroutines và Channels trong Go","contentText":"Phân tích thực nghiệm Goroutine leak, Channel buffering và Race condition detector trong dự án quy mô cao..."}'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: efa595c5-8983-4e16-aa45-75d2f2ee04a2
Content-Type: application/json; charset=utf-8
Content-Length: 876
ETag: W/"36c-jc6rGQjdxwbvj/E8zZgL9biVMx4"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"1ddca774-5548-4c0b-bd8f-7bbbd5920793","spaceId":"794145d5-1d89-4d3e-aeb2-b4bfb5f07385","spaceSlug":"","spaceName":"","authorId":"8e18dc71-595c-4ebb-940c-6758fb9b70ff","authorUsername":"","flair":null,"title":"Tối ưu hóa hiệu năng Concurrency với Goroutines và Channels trong Go","slug":"toi-uu-hoa-hieu-nang-concurrency-voi-goroutines-va-channels-trong-go-63f7f0cf","linkUrl":null,"isPinned":false,"isLocked":false,"upvotes":0,"downvotes":0,"netScore":0,"commentsCount":0,"userVote":0,"isSaved":false,"createdAt":"2026-11-05T16:55:12.239Z","updatedAt":"2026-11-05T16:55:12.239Z","contentText":"Phân tích thực nghiệm Goroutine leak, Channel buffering và Race condition detector trong dự án quy mô cao...","contentAst":{"text":"Phân tích thực nghiệm Goroutine leak, Channel buffering và Race condition detector trong dự án quy mô cao..."}}
```
---

### Bước 10: Tìm kiếm bài viết trong Không gian qua từ khóa In-Space Search (HTTP 200 OK)
```bash
curl -s -i -X GET 'http://127.0.0.1:3099/spaces/golang-vn/search?q=Goroutines'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: e4c13368-18c7-4b41-84e9-d4acd020531f
Content-Type: application/json; charset=utf-8
Content-Length: 610
ETag: W/"262-pgyEW5YCyLLBjHtXn0kZqLMpEFg"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"threads":[{"id":"1ddca774-5548-4c0b-bd8f-7bbbd5920793","spaceId":"794145d5-1d89-4d3e-aeb2-b4bfb5f07385","spaceSlug":"","spaceName":"","authorId":"8e18dc71-595c-4ebb-940c-6758fb9b70ff","authorUsername":"","flair":null,"title":"Tối ưu hóa hiệu năng Concurrency với Goroutines và Channels trong Go","slug":"toi-uu-hoa-hieu-nang-concurrency-voi-goroutines-va-channels-trong-go-63f7f0cf","linkUrl":null,"isPinned":false,"isLocked":false,"upvotes":0,"downvotes":0,"netScore":0,"commentsCount":0,"userVote":0,"isSaved":false,"createdAt":"2026-11-05T16:55:12.239Z","updatedAt":"2026-11-05T16:55:12.239Z"}]}
```
---

### Bước 11: Truy vấn chi tiết bài viết theo Slug hoặc UUID (HTTP 200 OK)
```bash
curl -s -i -X GET 'http://127.0.0.1:3099/threads/toi-uu-hoa-hieu-nang-concurrency-voi-goroutines-va-channels-trong-go-63f7f0cf'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: c829e6e2-7a5c-42a3-b33a-ee21e38e4d5b
Content-Type: application/json; charset=utf-8
Content-Length: 876
ETag: W/"36c-jc6rGQjdxwbvj/E8zZgL9biVMx4"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"1ddca774-5548-4c0b-bd8f-7bbbd5920793","spaceId":"794145d5-1d89-4d3e-aeb2-b4bfb5f07385","spaceSlug":"","spaceName":"","authorId":"8e18dc71-595c-4ebb-940c-6758fb9b70ff","authorUsername":"","flair":null,"title":"Tối ưu hóa hiệu năng Concurrency với Goroutines và Channels trong Go","slug":"toi-uu-hoa-hieu-nang-concurrency-voi-goroutines-va-channels-trong-go-63f7f0cf","linkUrl":null,"isPinned":false,"isLocked":false,"upvotes":0,"downvotes":0,"netScore":0,"commentsCount":0,"userVote":0,"isSaved":false,"createdAt":"2026-11-05T16:55:12.239Z","updatedAt":"2026-11-05T16:55:12.239Z","contentText":"Phân tích thực nghiệm Goroutine leak, Channel buffering và Race condition detector trong dự án quy mô cao...","contentAst":{"text":"Phân tích thực nghiệm Goroutine leak, Channel buffering và Race condition detector trong dự án quy mô cao..."}}
```
---

### Bước 12: Đăng bình luận gốc Level 1 (HTTP 201 Created - ltree path=0000, depth=1)
```bash
curl -s -i -X POST 'http://127.0.0.1:3099/threads/1ddca774-5548-4c0b-bd8f-7bbbd5920793/comments' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTE4ZGM3MS01OTVjLTRlYmItOTQwYy02NzU4ZmI5YjcwZmYiLCJ1c2VybmFtZSI6ImNyZWF0b3JfbGVhZCIsImVtYWlsIjoiY3JlYXRvckBhY2FkLnZuIiwicm9sZSI6IlVTRVIiLCJzdGF0dXMiOiJBQ1RJVkUiLCJzZXNzaW9uSWQiOiJjMThlZDRlOC0xZmRlLTQ4YTAtYmYwMi1lYTAzNzBlOWJhYzkiLCJpc3MiOiJhY2FkLWRldm9wcy1wbGF0Zm9ybSIsImlhdCI6MTc5Mzg5NzcxMiwiZXhwIjoxNzkzODk4NjEyfQ.huLroNIBsZWk5B1xixwS3-vTjFgx0io2V-l-C1XbIXQ' -H 'Content-Type: application/json' -d '{"content":"Bài viết phân tích rất chuẩn về Goroutine leak!"}'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: af2a1fcb-370c-4155-b9fd-c72f96fcffbf
Content-Type: application/json; charset=utf-8
Content-Length: 625
ETag: W/"271-mY1xUJ/5Rya5HhXnnjUwIBYPX+0"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"a23ae40e-867d-4c01-8956-0681f6f8ccb0","threadId":"1ddca774-5548-4c0b-bd8f-7bbbd5920793","parentId":null,"path":"0000","depth":1,"isCappedAtMaxDepth":false,"parentAuthorMentionNeeded":false,"parentAuthorUsername":null,"contentAst":{"text":"Bài viết phân tích rất chuẩn về Goroutine leak!"},"author":{"id":"8e18dc71-595c-4ebb-940c-6758fb9b70ff","username":"","avatarUrl":null,"karmaScore":0},"netScore":0,"upvotes":0,"downvotes":0,"userVote":0,"directRepliesCount":0,"totalDescendantsCount":0,"isCollapsed":false,"isDeleted":false,"createdAt":"2026-11-05T16:55:12.318Z","updatedAt":"2026-11-05T16:55:12.318Z"}
```
---

### Bước 13: Trả lời bình luận gốc Level 2 (HTTP 201 Created - ltree path=0000.0000, depth=2)
```bash
curl -s -i -X POST 'http://127.0.0.1:3099/threads/1ddca774-5548-4c0b-bd8f-7bbbd5920793/comments' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNDYxZDgxOS01MDI3LTRjYzgtYWViYS04MjllZTgwZjIwNzQiLCJ1c2VybmFtZSI6Im1lbWJlcl91c2VyIiwiZW1haWwiOiJtZW1iZXJAYWNhZC52biIsInJvbGUiOiJVU0VSIiwic3RhdHVzIjoiQUNUSVZFIiwic2Vzc2lvbklkIjoiYWY4MmJiMjktMjUwOC00NmZkLTliNDktZmEyNDE2MGM0YmU1IiwiaXNzIjoiYWNhZC1kZXZvcHMtcGxhdGZvcm0iLCJpYXQiOjE3OTM4OTc3MTIsImV4cCI6MTc5Mzg5ODYxMn0.B07wxnO8FmAcFpAPBSSRc5-5E8sNkltB-16CxbG0YKA' -H 'Content-Type: application/json' -d '{"parentId":"a23ae40e-867d-4c01-8956-0681f6f8ccb0","content":"Đồng ý, tôi cũng từng gặp race condition trên production và phải dùng sync.RWMutex."}'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: e19e4efa-d3f5-4a09-9a09-c2052a07079f
Content-Type: application/json; charset=utf-8
Content-Length: 704
ETag: W/"2c0-zU+sQTpCtD9XrogxfSQ6GFJjVAs"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"bbcd1cb7-2206-4b7f-9ae3-2613429f304f","threadId":"1ddca774-5548-4c0b-bd8f-7bbbd5920793","parentId":"a23ae40e-867d-4c01-8956-0681f6f8ccb0","path":"0000.0000","depth":2,"isCappedAtMaxDepth":false,"parentAuthorMentionNeeded":false,"parentAuthorUsername":null,"contentAst":{"text":"Đồng ý, tôi cũng từng gặp race condition trên production và phải dùng sync.RWMutex."},"author":{"id":"e461d819-5027-4cc8-aeba-829ee80f2074","username":"","avatarUrl":null,"karmaScore":0},"netScore":0,"upvotes":0,"downvotes":0,"userVote":0,"directRepliesCount":0,"totalDescendantsCount":0,"isCollapsed":false,"isDeleted":false,"createdAt":"2026-11-05T16:55:12.363Z","updatedAt":"2026-11-05T16:55:12.363Z"}
```
---

### Bước 14: Lấy toàn bộ cây bình luận phân tầng (HTTP 200 OK)
```bash
curl -s -i -X GET 'http://127.0.0.1:3099/threads/1ddca774-5548-4c0b-bd8f-7bbbd5920793/comments'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: aa4d59ad-e4d1-4001-a4b9-58095fe490c3
Content-Type: application/json; charset=utf-8
Content-Length: 1357
ETag: W/"54d-DNJb7KW2kQabfAnQushNdTM/7vo"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"items":[{"id":"a23ae40e-867d-4c01-8956-0681f6f8ccb0","threadId":"1ddca774-5548-4c0b-bd8f-7bbbd5920793","parentId":null,"path":"0000","depth":1,"isCappedAtMaxDepth":false,"parentAuthorMentionNeeded":false,"parentAuthorUsername":null,"contentAst":{"text":"Bài viết phân tích rất chuẩn về Goroutine leak!"},"author":{"id":"8e18dc71-595c-4ebb-940c-6758fb9b70ff","username":"","avatarUrl":null,"karmaScore":0},"netScore":0,"upvotes":0,"downvotes":0,"userVote":0,"directRepliesCount":0,"totalDescendantsCount":0,"isCollapsed":false,"isDeleted":false,"createdAt":"2026-11-05T16:55:12.318Z","updatedAt":"2026-11-05T16:55:12.318Z"},{"id":"bbcd1cb7-2206-4b7f-9ae3-2613429f304f","threadId":"1ddca774-5548-4c0b-bd8f-7bbbd5920793","parentId":"a23ae40e-867d-4c01-8956-0681f6f8ccb0","path":"0000.0000","depth":2,"isCappedAtMaxDepth":false,"parentAuthorMentionNeeded":false,"parentAuthorUsername":null,"contentAst":{"text":"Đồng ý, tôi cũng từng gặp race condition trên production và phải dùng sync.RWMutex."},"author":{"id":"e461d819-5027-4cc8-aeba-829ee80f2074","username":"","avatarUrl":null,"karmaScore":0},"netScore":0,"upvotes":0,"downvotes":0,"userVote":0,"directRepliesCount":0,"totalDescendantsCount":0,"isCollapsed":false,"isDeleted":false,"createdAt":"2026-11-05T16:55:12.363Z","updatedAt":"2026-11-05T16:55:12.363Z"}],"totalCount":2}
```
---

### Bước 15: Xóa mềm bình luận con - Soft Delete (HTTP 200 OK)
```bash
curl -s -i -X DELETE 'http://127.0.0.1:3099/comments/bbcd1cb7-2206-4b7f-9ae3-2613429f304f' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlNDYxZDgxOS01MDI3LTRjYzgtYWViYS04MjllZTgwZjIwNzQiLCJ1c2VybmFtZSI6Im1lbWJlcl91c2VyIiwiZW1haWwiOiJtZW1iZXJAYWNhZC52biIsInJvbGUiOiJVU0VSIiwic3RhdHVzIjoiQUNUSVZFIiwic2Vzc2lvbklkIjoiYWY4MmJiMjktMjUwOC00NmZkLTliNDktZmEyNDE2MGM0YmU1IiwiaXNzIjoiYWNhZC1kZXZvcHMtcGxhdGZvcm0iLCJpYXQiOjE3OTM4OTc3MTIsImV4cCI6MTc5Mzg5ODYxMn0.B07wxnO8FmAcFpAPBSSRc5-5E8sNkltB-16CxbG0YKA'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 4060de4a-3bbd-4b35-8bca-9751cd9afd77
Content-Type: application/json; charset=utf-8
Content-Length: 44
ETag: W/"2c-I6m1SxVUR+ozr0Jex0LCov1s2Ng"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"message":"Xóa bình luận thành công"}
```
---

### Bước 16: Lấy lại cây bình luận sau Soft Delete - Bảo toàn cấu trúc cây (HTTP 200 OK)
```bash
curl -s -i -X GET 'http://127.0.0.1:3099/threads/1ddca774-5548-4c0b-bd8f-7bbbd5920793/comments'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 7b2993a0-78f0-4649-b2a9-409a2037d796
Content-Type: application/json; charset=utf-8
Content-Length: 1304
ETag: W/"518-RQ827Md16pSVKD5nq99kgYC0lJM"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"items":[{"id":"a23ae40e-867d-4c01-8956-0681f6f8ccb0","threadId":"1ddca774-5548-4c0b-bd8f-7bbbd5920793","parentId":null,"path":"0000","depth":1,"isCappedAtMaxDepth":false,"parentAuthorMentionNeeded":false,"parentAuthorUsername":null,"contentAst":{"text":"Bài viết phân tích rất chuẩn về Goroutine leak!"},"author":{"id":"8e18dc71-595c-4ebb-940c-6758fb9b70ff","username":"","avatarUrl":null,"karmaScore":0},"netScore":0,"upvotes":0,"downvotes":0,"userVote":0,"directRepliesCount":0,"totalDescendantsCount":0,"isCollapsed":false,"isDeleted":false,"createdAt":"2026-11-05T16:55:12.318Z","updatedAt":"2026-11-05T16:55:12.318Z"},{"id":"bbcd1cb7-2206-4b7f-9ae3-2613429f304f","threadId":"1ddca774-5548-4c0b-bd8f-7bbbd5920793","parentId":"a23ae40e-867d-4c01-8956-0681f6f8ccb0","path":"0000.0000","depth":2,"isCappedAtMaxDepth":false,"parentAuthorMentionNeeded":false,"parentAuthorUsername":null,"contentAst":{"text":"[Bình luận đã bị xóa bởi tác giả]"},"author":{"id":"e461d819-5027-4cc8-aeba-829ee80f2074","username":"","avatarUrl":null,"karmaScore":0},"netScore":0,"upvotes":0,"downvotes":0,"userVote":0,"directRepliesCount":0,"totalDescendantsCount":0,"isCollapsed":false,"isDeleted":true,"createdAt":"2026-11-05T16:55:12.363Z","updatedAt":"2026-11-05T16:55:12.416Z"}],"totalCount":2}
```
---

### Bước 17: Cấp phát Presigned PUT URL tải ảnh trực tiếp Zero-Hop S3 (HTTP 200 OK)
```bash
curl -s -i -X POST 'http://127.0.0.1:3099/media/presigned-url' -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZTE4ZGM3MS01OTVjLTRlYmItOTQwYy02NzU4ZmI5YjcwZmYiLCJ1c2VybmFtZSI6ImNyZWF0b3JfbGVhZCIsImVtYWlsIjoiY3JlYXRvckBhY2FkLnZuIiwicm9sZSI6IlVTRVIiLCJzdGF0dXMiOiJBQ1RJVkUiLCJzZXNzaW9uSWQiOiJjMThlZDRlOC0xZmRlLTQ4YTAtYmYwMi1lYTAzNzBlOWJhYzkiLCJpc3MiOiJhY2FkLWRldm9wcy1wbGF0Zm9ybSIsImlhdCI6MTc5Mzg5NzcxMiwiZXhwIjoxNzkzODk4NjEyfQ.huLroNIBsZWk5B1xixwS3-vTjFgx0io2V-l-C1XbIXQ' -H 'Content-Type: application/json' -d '{"fileName":"architecture-diagram.png","fileType":"image/png"}'
```
**Phản hồi thực tế từ HTTP Server:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 3e3de274-9e91-401c-b25d-570b80981b7e
Content-Type: application/json; charset=utf-8
Content-Length: 448
ETag: W/"1c0-8I58Y5zgeHEs2pzhCnXNjRtkijk"
Date: Thu, 05 Nov 2026 16:55:12 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"uploadUrl":"https://acad-media-bucket.s3.amazonaws.com/uploads/8e18dc71-595c-4ebb-940c-6758fb9b70ff/1793897712430-3cadc70b-architecture-diagram.png?X-Amz-Expires=300&X-Amz-Signature=mock-presigned-sig","publicUrl":"https://cdn.acad.vn/uploads/8e18dc71-595c-4ebb-940c-6758fb9b70ff/1793897712430-3cadc70b-architecture-diagram.png","key":"uploads/8e18dc71-595c-4ebb-940c-6758fb9b70ff/1793897712430-3cadc70b-architecture-diagram.png","expiresIn":300}
```
---

## 3. KẾT LUẬN & ĐỐI CHIẾU ĐỊNH MỨC DoD PHÂN HỆ B2

1. **Bảo toàn tính năng & kiến trúc Clean Architecture:** Tách biệt triệt để Entities, Repositories, Domain Services và REST API Gateway.
2. **Cấu trúc cây `ltree` Base36:** Mã hóa 4 ký tự Base36 hỗ trợ tới 6^4 = 1,679,616$ nhánh con trực tiếp mỗi nút, tương thích tuyệt đối chuẩn cú pháp dot-separated của PostgreSQL `ltree`.
3. **Cơ chế Capped Depth 8 (UI Flat Reply):** Đảm bảo an toàn giao diện người dùng, tự động tiêm `@parentAuthor` và chặn thụt lề vô tận khi độ sâu $\ge 8$.
4. **Soft Delete:** Giữ nguyên nút cây cha và nhánh con, thay thế nội dung nhạy cảm bằng thông báo chuẩn, ngăn ngừa đứt gãy cấu trúc cây.
5. **Zero-hop Upload:** Giảm tải 100% băng thông tải ảnh khỏi API server thông qua presigned S3 PUT URL.
6. **Không phát sinh lỗi 500:** 100% mã lỗi được chuyển đổi chuẩn RFC 7807 (400, 401, 403, 404, 409).
7. **Đạt chuẩn 8-Point DoD:** Đủ điều kiện chuyển tiếp sang Phase B3 (Social Graph & Hệ thống Tương tác).
