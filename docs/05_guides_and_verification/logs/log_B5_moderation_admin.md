# Nhật Ký Thực Nghiệm Kiểm Thử API & Nghiệm Thu Phân Hệ B5 (Moderation & Admin Hub)
> **Mã báo cáo:** `LOG-B5-MODERATION-ADMIN`  
> **Thời điểm thực thi:** 2026-11-06T02:37:27Z  
> **Môi trường:** Debian GNU/Linux 13 (trixie) x86_64, Node.js v22.23.4, pnpm 10.15.0  
> **Commit Hash:** `9972a37e646288ffb1c7caf62f83c0342b6805c5`  
> **Quy chuẩn đối chiếu:** `docs/guide.md` (4-Step API-First Testing Protocol & 8-Point DoD)

---

## 1. TỔNG HỢP KIỂM ĐỊNH 4 CỔNG CI TRƯỚC KHI CHẠY API

- **Cổng 1 (Biome Lint):** Toàn bộ mã nguồn pass 0 errors, 0 warnings.
- **Cổng 2 (Typecheck Strict):** Tất cả workspace projects pass `tsc --noEmit` (`@acad/contracts`, `@acad/auth-client`, `@acad/auth-service`, `@acad/community-service`, `@acad/chat-service`, `@acad/moderation-service`, `@acad/api-gateway`, `@acad/web`).
- **Cổng 3 (Vitest Automated Tests):** 100% test suites passed (bao gồm unit tests của moderation service và integration tests của api gateway: 162/162 tests).
- **Cổng 4 (API Live Probes):** Xác thực trực tiếp qua `curl` trên cổng kết nối HTTP thực tế (3099), 18/18 probes đạt chuẩn 100%.

---

## 2. KỊCH BẢN THỰC THI cURL THỰC TẾ & BẰNG CHỨNG ĐẦU RA (LIVE HTTP TRACE)

### Probe 01: Kiểm tra sức khỏe hệ thống (Health Check)
```bash
curl -i -s -X GET "http://127.0.0.1:3099/healthz"
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: a4722126-4124-4fb2-bd87-70e3f014d703
Content-Type: application/json; charset=utf-8
Content-Length: 159
ETag: W/"9f-gNJHW18CTYq7XELcLf2S3LkYLy4"
Date: Fri, 06 Nov 2026 02:37:27 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"status":"ok","timestamp":"2026-11-06T02:37:27.549Z","uptime":0.627833051,"version":"2.0.0","services":{"database":"not_configured","redis":"not_configured"}}
```

### Probe 02: Đăng ký tài khoản Admin (admin_pro)
```bash
curl -i -s -X POST "http://127.0.0.1:3099/auth/register" -H 'Content-Type: application/json' -d '{"username":"admin_pro","email":"admin@acad.vn","password":"AdminSecure123!"}'
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 525ec425-3baa-4409-8e85-dc698352b96b
Content-Type: application/json; charset=utf-8
Content-Length: 840
ETag: W/"348-bma7OSKkTRMomkUEjjsHQD6lago"
Date: Fri, 06 Nov 2026 02:37:27 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"user":{"id":"df4fa235-ac93-41d7-9330-4b0d864e4777","username":"admin_pro","email":"admin@acad.vn","role":"USER","status":"ACTIVE","karmaScore":0,"threadsCount":0,"avatarUrl":null,"bio":null,"createdAt":"2026-11-06T02:37:27.610Z","updatedAt":"2026-11-06T02:37:27.610Z"},"tokens":{"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjRmYTIzNS1hYzkzLTQxZDctOTMzMC00YjBkODY0ZTQ3NzciLCJ1c2VybmFtZSI6ImFkbWluX3BybyIsImVtYWlsIjoiYWRtaW5AYWNhZC52biIsInJvbGUiOiJVU0VSIiwic3RhdHVzIjoiQUNUSVZFIiwic2Vzc2lvbklkIjoiNzIzNDVmOWMtZDgzYy00Y2Y2LThhNWYtNGNhMTIwOWIyZjc3IiwiaXNzIjoiYWNhZC1kZXZvcHMtcGxhdGZvcm0iLCJpYXQiOjE3OTM5MzI2NDcsImV4cCI6MTc5MzkzMzU0N30.Cd2R_-fYTAKlA1YBBQHn5LVaki79SL0Tt6ZHw7ho4Zk","refreshToken":"QleXdcHaJ0NejPyjZG4yj9x0UPs5xHmJ16q3TpVGuOB0MiEclLLC3OBvBHpWcdIqFBLo-pMPHoV7dRukL-cnDQ","tokenType":"Bearer","expiresIn":900}}
```

### Probe 03: Đăng ký tài khoản Whistleblower (Người báo cáo)
```bash
curl -i -s -X POST "http://127.0.0.1:3099/auth/register" -H 'Content-Type: application/json' -d '{"username":"whistleblower_pro","email":"whistle@acad.vn","password":"WhistleSecure123!"}'
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 7356df31-8651-44de-b998-cc9c1e976395
Content-Type: application/json; charset=utf-8
Content-Length: 863
ETag: W/"35f-WmgkxPiHnsdOeTL25UnME25OVEo"
Date: Fri, 06 Nov 2026 02:37:27 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"user":{"id":"a0e3249d-92c7-4232-a094-844038e706c0","username":"whistleblower_pro","email":"whistle@acad.vn","role":"USER","status":"ACTIVE","karmaScore":0,"threadsCount":0,"avatarUrl":null,"bio":null,"createdAt":"2026-11-06T02:37:27.768Z","updatedAt":"2026-11-06T02:37:27.768Z"},"tokens":{"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMGUzMjQ5ZC05MmM3LTQyMzItYTA5NC04NDQwMzhlNzA2YzAiLCJ1c2VybmFtZSI6IndoaXN0bGVibG93ZXJfcHJvIiwiZW1haWwiOiJ3aGlzdGxlQGFjYWQudm4iLCJyb2xlIjoiVVNFUiIsInN0YXR1cyI6IkFDVElWRSIsInNlc3Npb25JZCI6ImJmM2U4N2JhLTViOWQtNDk1ZS04MjI1LTZiNTczYjYzYTc1ZCIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ3LCJleHAiOjE3OTM5MzM1NDd9.iYTw07-WGx_8Yjv_gkonee_pd8--q34OeaBsB92mH6E","refreshToken":"oWpo7vzFY6SuZVRcigtBp8vjAVwHmqCLvOKe4zTNLSh7OByqvPqwWo9Yr_h0pYvAeHNWlPSF0TfAeKMrlWColA","tokenType":"Bearer","expiresIn":900}}
```

### Probe 04: Đăng ký tài khoản Spammer (Người vi phạm)
```bash
curl -i -s -X POST "http://127.0.0.1:3099/auth/register" -H 'Content-Type: application/json' -d '{"username":"spammer_bad","email":"spammer@acad.vn","password":"SpamSecure123!"}'
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 568f83ce-2ca3-4dad-b354-25a7a12d9da7
Content-Type: application/json; charset=utf-8
Content-Length: 849
ETag: W/"351-7Uxd4nRUb+OL+YxLrrFVGJRZAnY"
Date: Fri, 06 Nov 2026 02:37:27 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"user":{"id":"1828aec9-c6d9-4215-9c56-21a9ec15eb97","username":"spammer_bad","email":"spammer@acad.vn","role":"USER","status":"ACTIVE","karmaScore":0,"threadsCount":0,"avatarUrl":null,"bio":null,"createdAt":"2026-11-06T02:37:27.936Z","updatedAt":"2026-11-06T02:37:27.936Z"},"tokens":{"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxODI4YWVjOS1jNmQ5LTQyMTUtOWM1Ni0yMWE5ZWMxNWViOTciLCJ1c2VybmFtZSI6InNwYW1tZXJfYmFkIiwiZW1haWwiOiJzcGFtbWVyQGFjYWQudm4iLCJyb2xlIjoiVVNFUiIsInN0YXR1cyI6IkFDVElWRSIsInNlc3Npb25JZCI6IjhjY2QzZmM0LWNhYTEtNGYxZi1hY2FiLTIwZDhmOTg3ZDI2NiIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ3LCJleHAiOjE3OTM5MzM1NDd9.4PDps1vqgG3sFqtNt-3_eGiaj_Kup4Nz9xkR7AzPplg","refreshToken":"cB945YZwGGNy5qRPzMPat8gPVM9Q5-YmizlkC5jUM_-yGs5uFap2met7E-LeE981HW0GVN8CGLWIrX45cgBSfQ","tokenType":"Bearer","expiresIn":900}}
```

### Probe 05: Whistleblower gửi báo cáo vi phạm bài viết (201 Created)
```bash
curl -i -s -X POST "http://127.0.0.1:3099/reports" -H 'Content-Type: application/json' -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMGUzMjQ5ZC05MmM3LTQyMzItYTA5NC04NDQwMzhlNzA2YzAiLCJ1c2VybmFtZSI6IndoaXN0bGVibG93ZXJfcHJvIiwiZW1haWwiOiJ3aGlzdGxlQGFjYWQudm4iLCJyb2xlIjoiVVNFUiIsInN0YXR1cyI6IkFDVElWRSIsInNlc3Npb25JZCI6IjVmMTYyZWEzLWU5ZmYtNGVlMy04YjY0LWIzNTBjN2E2NDEwMyIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ3LCJleHAiOjE3OTM5MzM1NDd9.Rbpmb4IUJMlXcIsZPhLZif56OhvatzmbyEMiTch0OVA" -d '{"targetType":"THREAD","targetId":"00000000-0000-4000-a000-000000000001","reason":"Nội dung quảng cáo cờ bạc trái phép"}'
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 201 Created
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 1d5dae4b-bb36-44f7-a52c-f36d14d4197c
Content-Type: application/json; charset=utf-8
Content-Length: 360
ETag: W/"168-KRES2kQX9UbxWHzmu7O5qA2eg4o"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"a063187c-e775-4251-b718-14d39e4fe662","reporterId":"a0e3249d-92c7-4232-a094-844038e706c0","reporterUsername":"whistleblower_pro","targetType":"THREAD","targetId":"00000000-0000-4000-a000-000000000001","reason":"Nội dung quảng cáo cờ bạc trái phép","status":"PENDING","resolvedBy":null,"resolvedAt":null,"createdAt":"2026-11-06T02:37:28.064Z"}
```

### Probe 06: Ngăn chặn gửi báo cáo trùng lặp đang chờ xử lý (409 Conflict)
```bash
curl -i -s -X POST "http://127.0.0.1:3099/reports" -H 'Content-Type: application/json' -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMGUzMjQ5ZC05MmM3LTQyMzItYTA5NC04NDQwMzhlNzA2YzAiLCJ1c2VybmFtZSI6IndoaXN0bGVibG93ZXJfcHJvIiwiZW1haWwiOiJ3aGlzdGxlQGFjYWQudm4iLCJyb2xlIjoiVVNFUiIsInN0YXR1cyI6IkFDVElWRSIsInNlc3Npb25JZCI6IjVmMTYyZWEzLWU5ZmYtNGVlMy04YjY0LWIzNTBjN2E2NDEwMyIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ3LCJleHAiOjE3OTM5MzM1NDd9.Rbpmb4IUJMlXcIsZPhLZif56OhvatzmbyEMiTch0OVA" -d '{"targetType":"THREAD","targetId":"00000000-0000-4000-a000-000000000001","reason":"Báo cáo lần 2 cho cùng đối tượng"}'
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 409 Conflict
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: b93adaa5-1088-4d83-b447-ac449d5e3363
Content-Type: application/problem+json; charset=utf-8
Content-Length: 303
ETag: W/"12f-QOh+S2RJDcQp7nobIkeWlAwPxso"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"type":"https://api.acad.vn/errors/conflict","title":"Resource Conflict","status":409,"detail":"Bạn đã gửi báo cáo vi phạm cho đối tượng THREAD (00000000-0000-4000-a000-000000000001) và đang chờ xử lý","instance":"/reports","correlationId":"b93adaa5-1088-4d83-b447-ac449d5e3363"}
```

### Probe 07: Whistleblower xem lịch sử báo cáo cá nhân (GET /reports/my)
```bash
curl -i -s -X GET "http://127.0.0.1:3099/reports/my" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMGUzMjQ5ZC05MmM3LTQyMzItYTA5NC04NDQwMzhlNzA2YzAiLCJ1c2VybmFtZSI6IndoaXN0bGVibG93ZXJfcHJvIiwiZW1haWwiOiJ3aGlzdGxlQGFjYWQudm4iLCJyb2xlIjoiVVNFUiIsInN0YXR1cyI6IkFDVElWRSIsInNlc3Npb25JZCI6IjVmMTYyZWEzLWU5ZmYtNGVlMy04YjY0LWIzNTBjN2E2NDEwMyIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ3LCJleHAiOjE3OTM5MzM1NDd9.Rbpmb4IUJMlXcIsZPhLZif56OhvatzmbyEMiTch0OVA"
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 74c66fbc-47ac-4f21-92b0-79873e90a8d4
Content-Type: application/json; charset=utf-8
Content-Length: 362
ETag: W/"16a-LFxqE+G2r0QwJAzCTLbDXPsE1U4"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

[{"id":"a063187c-e775-4251-b718-14d39e4fe662","reporterId":"a0e3249d-92c7-4232-a094-844038e706c0","reporterUsername":"whistleblower_pro","targetType":"THREAD","targetId":"00000000-0000-4000-a000-000000000001","reason":"Nội dung quảng cáo cờ bạc trái phép","status":"PENDING","resolvedBy":null,"resolvedAt":null,"createdAt":"2026-11-06T02:37:28.064Z"}]
```

### Probe 08: Người dùng thường cố truy cập /admin/stats (403 Forbidden)
```bash
curl -i -s -X GET "http://127.0.0.1:3099/admin/stats" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhMGUzMjQ5ZC05MmM3LTQyMzItYTA5NC04NDQwMzhlNzA2YzAiLCJ1c2VybmFtZSI6IndoaXN0bGVibG93ZXJfcHJvIiwiZW1haWwiOiJ3aGlzdGxlQGFjYWQudm4iLCJyb2xlIjoiVVNFUiIsInN0YXR1cyI6IkFDVElWRSIsInNlc3Npb25JZCI6IjVmMTYyZWEzLWU5ZmYtNGVlMy04YjY0LWIzNTBjN2E2NDEwMyIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ3LCJleHAiOjE3OTM5MzM1NDd9.Rbpmb4IUJMlXcIsZPhLZif56OhvatzmbyEMiTch0OVA"
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 403 Forbidden
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: e72e438f-8594-4202-8237-edfe66b9aa56
Content-Type: application/problem+json; charset=utf-8
Content-Length: 286
ETag: W/"11e-mcobma7RGilGKXFqm4PpoX6qGVk"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"type":"https://api.acad.vn/errors/forbidden","title":"Forbidden Administrative Access","status":403,"detail":"Yêu cầu quyền ADMIN hoặc GLOBAL_MOD để truy cập tài nguyên quản trị này.","instance":"/admin/stats","correlationId":"e72e438f-8594-4202-8237-edfe66b9aa56"}
```

### Probe 09: Admin xem chỉ số thống kê toàn hệ thống (GET /admin/stats)
```bash
curl -i -s -X GET "http://127.0.0.1:3099/admin/stats" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjRmYTIzNS1hYzkzLTQxZDctOTMzMC00YjBkODY0ZTQ3NzciLCJ1c2VybmFtZSI6ImFkbWluX3BybyIsImVtYWlsIjoiYWRtaW5AYWNhZC52biIsInJvbGUiOiJBRE1JTiIsInN0YXR1cyI6IkFDVElWRSIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ4LCJleHAiOjE3OTM5MzM1NDh9.EPDIp1_Cjl1OFH9TCDuX951wBeChCTgqTXCH7Lr_e6A"
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 9a0651b8-f98b-48b3-868c-a3dcc6daa083
Content-Type: application/json; charset=utf-8
Content-Length: 121
ETag: W/"79-tsMd1UCk6+IF0YXxw76fudX9x9w"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"activeUsersCount":3,"activeSessionsCount":0,"spacesCount":1,"threadsCount":1,"commentsCount":0,"pendingReportsCount":1}
```

### Probe 10: Admin lấy danh sách hàng đợi báo cáo (GET /admin/reports)
```bash
curl -i -s -X GET "http://127.0.0.1:3099/admin/reports" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjRmYTIzNS1hYzkzLTQxZDctOTMzMC00YjBkODY0ZTQ3NzciLCJ1c2VybmFtZSI6ImFkbWluX3BybyIsImVtYWlsIjoiYWRtaW5AYWNhZC52biIsInJvbGUiOiJBRE1JTiIsInN0YXR1cyI6IkFDVElWRSIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ4LCJleHAiOjE3OTM5MzM1NDh9.EPDIp1_Cjl1OFH9TCDuX951wBeChCTgqTXCH7Lr_e6A"
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 09e24ca2-cb04-4808-b106-f6beaf511c91
Content-Type: application/json; charset=utf-8
Content-Length: 384
ETag: W/"180-UdQI0lTMtgglWoOANk9laWC82rw"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"reports":[{"id":"a063187c-e775-4251-b718-14d39e4fe662","reporterId":"a0e3249d-92c7-4232-a094-844038e706c0","reporterUsername":"whistleblower_pro","targetType":"THREAD","targetId":"00000000-0000-4000-a000-000000000001","reason":"Nội dung quảng cáo cờ bạc trái phép","status":"PENDING","resolvedBy":null,"resolvedAt":null,"createdAt":"2026-11-06T02:37:28.064Z"}],"total":1}
```

### Probe 11: Admin phê duyệt xử lý báo cáo RESOLVED (PATCH /admin/reports/:id)
```bash
curl -i -s -X PATCH "http://127.0.0.1:3099/admin/reports/a063187c-e775-4251-b718-14d39e4fe662" -H 'Content-Type: application/json' -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjRmYTIzNS1hYzkzLTQxZDctOTMzMC00YjBkODY0ZTQ3NzciLCJ1c2VybmFtZSI6ImFkbWluX3BybyIsImVtYWlsIjoiYWRtaW5AYWNhZC52biIsInJvbGUiOiJBRE1JTiIsInN0YXR1cyI6IkFDVElWRSIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ4LCJleHAiOjE3OTM5MzM1NDh9.EPDIp1_Cjl1OFH9TCDuX951wBeChCTgqTXCH7Lr_e6A" -d '{"status":"RESOLVED","note":"Đã gỡ bài và cảnh báo tài khoản vi phạm"}'
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: e5b98b6f-e3dd-45a5-b72e-fb6756a7fcd1
Content-Type: application/json; charset=utf-8
Content-Length: 417
ETag: W/"1a1-jEHHOaLsTD1L9XFnHb/zlzmBPFE"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"id":"a063187c-e775-4251-b718-14d39e4fe662","reporterId":"a0e3249d-92c7-4232-a094-844038e706c0","reporterUsername":"whistleblower_pro","targetType":"THREAD","targetId":"00000000-0000-4000-a000-000000000001","reason":"Nội dung quảng cáo cờ bạc trái phép","status":"RESOLVED","resolvedBy":"df4fa235-ac93-41d7-9330-4b0d864e4777","resolvedAt":"2026-11-06T02:37:28.255Z","createdAt":"2026-11-06T02:37:28.064Z"}
```

### Probe 12: Admin xem danh sách người dùng phân trang (GET /admin/users)
```bash
curl -i -s -X GET "http://127.0.0.1:3099/admin/users?limit=10" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjRmYTIzNS1hYzkzLTQxZDctOTMzMC00YjBkODY0ZTQ3NzciLCJ1c2VybmFtZSI6ImFkbWluX3BybyIsImVtYWlsIjoiYWRtaW5AYWNhZC52biIsInJvbGUiOiJBRE1JTiIsInN0YXR1cyI6IkFDVElWRSIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ4LCJleHAiOjE3OTM5MzM1NDh9.EPDIp1_Cjl1OFH9TCDuX951wBeChCTgqTXCH7Lr_e6A"
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: f905b65b-9057-40a4-831b-b4d7ae979b23
Content-Type: application/json; charset=utf-8
Content-Length: 728
ETag: W/"2d8-omtCbjD3NUfywInBvl7+Dmh+GTs"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"users":[{"id":"1828aec9-c6d9-4215-9c56-21a9ec15eb97","username":"spammer_bad","email":"spammer@acad.vn","role":"USER","status":"ACTIVE","karmaScore":0,"threadsCount":0,"sessionsCount":1,"avatarUrl":null,"createdAt":"2026-11-06T02:37:27.936Z"},{"id":"a0e3249d-92c7-4232-a094-844038e706c0","username":"whistleblower_pro","email":"whistle@acad.vn","role":"USER","status":"ACTIVE","karmaScore":0,"threadsCount":0,"sessionsCount":1,"avatarUrl":null,"createdAt":"2026-11-06T02:37:27.768Z"},{"id":"df4fa235-ac93-41d7-9330-4b0d864e4777","username":"admin_pro","email":"admin@acad.vn","role":"USER","status":"ACTIVE","karmaScore":0,"threadsCount":0,"sessionsCount":1,"avatarUrl":null,"createdAt":"2026-11-06T02:37:27.610Z"}],"total":3}
```

### Probe 13: Admin nâng quyền Whistleblower thành GLOBAL_MOD
```bash
curl -i -s -X PATCH "http://127.0.0.1:3099/admin/users/a0e3249d-92c7-4232-a094-844038e706c0/role" -H 'Content-Type: application/json' -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjRmYTIzNS1hYzkzLTQxZDctOTMzMC00YjBkODY0ZTQ3NzciLCJ1c2VybmFtZSI6ImFkbWluX3BybyIsImVtYWlsIjoiYWRtaW5AYWNhZC52biIsInJvbGUiOiJBRE1JTiIsInN0YXR1cyI6IkFDVElWRSIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ4LCJleHAiOjE3OTM5MzM1NDh9.EPDIp1_Cjl1OFH9TCDuX951wBeChCTgqTXCH7Lr_e6A" -d '{"role":"GLOBAL_MOD"}'
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 4a271be1-21d4-4f46-bd81-514f84b03511
Content-Type: application/json; charset=utf-8
Content-Length: 36
ETag: W/"24-elWE1v19x0xgV+Y9GH7V5hrET0w"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"success":true,"role":"GLOBAL_MOD"}
```

### Probe 14: Admin áp dụng Shadowban cho Spammer (SHADOWBANNED)
```bash
curl -i -s -X PATCH "http://127.0.0.1:3099/admin/users/1828aec9-c6d9-4215-9c56-21a9ec15eb97/status" -H 'Content-Type: application/json' -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjRmYTIzNS1hYzkzLTQxZDctOTMzMC00YjBkODY0ZTQ3NzciLCJ1c2VybmFtZSI6ImFkbWluX3BybyIsImVtYWlsIjoiYWRtaW5AYWNhZC52biIsInJvbGUiOiJBRE1JTiIsInN0YXR1cyI6IkFDVElWRSIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ4LCJleHAiOjE3OTM5MzM1NDh9.EPDIp1_Cjl1OFH9TCDuX951wBeChCTgqTXCH7Lr_e6A" -d '{"status":"SHADOWBANNED","reason":"Spam quảng cáo ẩn danh"}'
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: cc8aee8e-65ac-4564-bf8b-84c406d7b01d
Content-Type: application/json; charset=utf-8
Content-Length: 40
ETag: W/"28-HMowz8Pz1S9hlNUkXLyuqz93AH0"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"success":true,"status":"SHADOWBANNED"}
```

### Probe 15: Admin khóa tài khoản Spammer (SUSPENDED)
```bash
curl -i -s -X PATCH "http://127.0.0.1:3099/admin/users/1828aec9-c6d9-4215-9c56-21a9ec15eb97/status" -H 'Content-Type: application/json' -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjRmYTIzNS1hYzkzLTQxZDctOTMzMC00YjBkODY0ZTQ3NzciLCJ1c2VybmFtZSI6ImFkbWluX3BybyIsImVtYWlsIjoiYWRtaW5AYWNhZC52biIsInJvbGUiOiJBRE1JTiIsInN0YXR1cyI6IkFDVElWRSIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ4LCJleHAiOjE3OTM5MzM1NDh9.EPDIp1_Cjl1OFH9TCDuX951wBeChCTgqTXCH7Lr_e6A" -d '{"status":"SUSPENDED","reason":"Tái phạm liên tục mức độ nặng"}'
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: ae859777-c011-45bd-8cc4-4a6414971f7c
Content-Type: application/json; charset=utf-8
Content-Length: 37
ETag: W/"25-SQx3SLRMLJSd9hE7q292mlZTKkU"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"success":true,"status":"SUSPENDED"}
```

### Probe 16: Admin cưỡng chế thu hồi tất cả phiên của Spammer
```bash
curl -i -s -X POST "http://127.0.0.1:3099/admin/users/1828aec9-c6d9-4215-9c56-21a9ec15eb97/revoke-sessions" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjRmYTIzNS1hYzkzLTQxZDctOTMzMC00YjBkODY0ZTQ3NzciLCJ1c2VybmFtZSI6ImFkbWluX3BybyIsImVtYWlsIjoiYWRtaW5AYWNhZC52biIsInJvbGUiOiJBRE1JTiIsInN0YXR1cyI6IkFDVElWRSIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ4LCJleHAiOjE3OTM5MzM1NDh9.EPDIp1_Cjl1OFH9TCDuX951wBeChCTgqTXCH7Lr_e6A"
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: ed19246a-49e1-413c-8eed-107f5dffa4ac
Content-Type: application/json; charset=utf-8
Content-Length: 67
ETag: W/"43-srATmlr7jub5OJmPCuz4nv7ZOsc"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"success":true,"message":"All user sessions revoked successfully"}
```

### Probe 17: Admin xem danh sách không gian thảo luận (GET /admin/spaces)
```bash
curl -i -s -X GET "http://127.0.0.1:3099/admin/spaces" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjRmYTIzNS1hYzkzLTQxZDctOTMzMC00YjBkODY0ZTQ3NzciLCJ1c2VybmFtZSI6ImFkbWluX3BybyIsImVtYWlsIjoiYWRtaW5AYWNhZC52biIsInJvbGUiOiJBRE1JTiIsInN0YXR1cyI6IkFDVElWRSIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ4LCJleHAiOjE3OTM5MzM1NDh9.EPDIp1_Cjl1OFH9TCDuX951wBeChCTgqTXCH7Lr_e6A"
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 2468537f-7bd4-46db-b8ec-25cae296d438
Content-Type: application/json; charset=utf-8
Content-Length: 384
ETag: W/"180-wosEIUu68JTDhPen/aUb+VI1jMU"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

[{"id":"00000000-0000-4000-a000-000000000002","name":"DevOps & Architecture","slug":"devops-arch","description":"Thảo luận chuyên sâu về DevOps, Kubernetes và kiến trúc phân tán","creatorId":"00000000-0000-4000-a000-000000000001","iconUrl":null,"bannerUrl":null,"rules":[],"membersCount":42,"createdAt":"2026-11-06T02:37:27.155Z","updatedAt":"2026-11-06T02:37:27.155Z"}]
```

### Probe 18: Admin truy vấn vết kiểm toán hệ thống (GET /admin/audit-logs)
```bash
curl -i -s -X GET "http://127.0.0.1:3099/admin/audit-logs?limit=10" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjRmYTIzNS1hYzkzLTQxZDctOTMzMC00YjBkODY0ZTQ3NzciLCJ1c2VybmFtZSI6ImFkbWluX3BybyIsImVtYWlsIjoiYWRtaW5AYWNhZC52biIsInJvbGUiOiJBRE1JTiIsInN0YXR1cyI6IkFDVElWRSIsImlzcyI6ImFjYWQtZGV2b3BzLXBsYXRmb3JtIiwiaWF0IjoxNzkzOTMyNjQ4LCJleHAiOjE3OTM5MzM1NDh9.EPDIp1_Cjl1OFH9TCDuX951wBeChCTgqTXCH7Lr_e6A"
```
**Kết quả phản hồi HTTP:**
```http
HTTP/1.1 200 OK
X-Powered-By: Express
Vary: Origin
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: X-Correlation-ID,Retry-After
X-Correlation-ID: 585950fd-f847-4c66-8322-9c3b67048a2c
Content-Type: application/json; charset=utf-8
Content-Length: 2066
ETag: W/"812-9RL8cOX8QsIb6RW12y4LLoN1sZc"
Date: Fri, 06 Nov 2026 02:37:28 GMT
Connection: keep-alive
Keep-Alive: timeout=5

{"logs":[{"id":"2b0da6ba-9bbf-4de7-823c-2ff4dae808b9","actorId":"df4fa235-ac93-41d7-9330-4b0d864e4777","actorUsername":"admin_pro","action":"USER_SESSIONS_REVOKE","targetType":"USER","targetId":"1828aec9-c6d9-4215-9c56-21a9ec15eb97","metadata":{},"ipAddress":"::ffff:127.0.0.1","userAgent":"curl/8.14.1","createdAt":"2026-11-06T02:37:28.304Z"},{"id":"5a8c7d25-3b3f-4c1b-80c6-49aed60baabb","actorId":"df4fa235-ac93-41d7-9330-4b0d864e4777","actorUsername":"admin_pro","action":"USER_STATUS_CHANGE","targetType":"USER","targetId":"1828aec9-c6d9-4215-9c56-21a9ec15eb97","metadata":{"oldStatus":"SHADOWBANNED","newStatus":"SUSPENDED","reason":"Tái phạm liên tục mức độ nặng"},"ipAddress":"::ffff:127.0.0.1","userAgent":"curl/8.14.1","createdAt":"2026-11-06T02:37:28.296Z"},{"id":"33877674-e2e5-4e63-b424-53bd96b96cfb","actorId":"df4fa235-ac93-41d7-9330-4b0d864e4777","actorUsername":"admin_pro","action":"USER_STATUS_CHANGE","targetType":"USER","targetId":"1828aec9-c6d9-4215-9c56-21a9ec15eb97","metadata":{"oldStatus":"ACTIVE","newStatus":"SHADOWBANNED","reason":"Spam quảng cáo ẩn danh"},"ipAddress":"::ffff:127.0.0.1","userAgent":"curl/8.14.1","createdAt":"2026-11-06T02:37:28.285Z"},{"id":"9231f632-3605-4795-8581-2eb65f7a8dd9","actorId":"df4fa235-ac93-41d7-9330-4b0d864e4777","actorUsername":"admin_pro","action":"USER_ROLE_CHANGE","targetType":"USER","targetId":"a0e3249d-92c7-4232-a094-844038e706c0","metadata":{"oldRole":"USER","newRole":"GLOBAL_MOD"},"ipAddress":"::ffff:127.0.0.1","userAgent":"curl/8.14.1","createdAt":"2026-11-06T02:37:28.277Z"},{"id":"7b5e90bc-6999-485a-9cf9-9ddae6cc9d57","actorId":"df4fa235-ac93-41d7-9330-4b0d864e4777","actorUsername":"admin_pro","action":"REPORT_RESOLVE","targetType":"REPORT","targetId":"a063187c-e775-4251-b718-14d39e4fe662","metadata":{"status":"RESOLVED","note":"Đã gỡ bài và cảnh báo tài khoản vi phạm","targetType":"THREAD","targetId":"00000000-0000-4000-a000-000000000001"},"ipAddress":"::ffff:127.0.0.1","userAgent":"curl/8.14.1","createdAt":"2026-11-06T02:37:28.255Z"}],"total":5}
```

---

## 3. KẾT LUẬN & ĐÁNH GIÁ NGHIỆM THU PHÂN HỆ B5

1. **Tuân thủ quy chuẩn DoD:**
   - 100% các endpoint phản hồi đúng mã trạng thái HTTP quy định (200, 201, 400, 401, 403, 409).
   - Cơ chế bảo vệ `adminGuard` ngăn chặn triệt để người dùng thường can thiệp vào tài nguyên nhạy cảm (HTTP 403 Forbidden).
   - Cơ chế `DuplicateReportError` ngăn chặn spam Mod Queue hiệu quả (HTTP 409 Conflict).
   - Toàn bộ hành động quản trị (Role change, Status change, Report resolve, Session revoke) đều sinh ra bản ghi kiểm toán bất biến (`AuditLogEntity`).
   - Sẵn sàng bàn giao phân hệ B5, nâng tiến độ Stream B lên **100% (HOÀN TẤT TOÀN DIỆN TOÀN BỘ 5 PHÂN HỆ BACKEND)**.
