# Quy Chuẩn Khế Ước Giao Tiếp Dữ Liệu API (API Contracts Specification)

> **Mã tài liệu:** `STD-API-CONTRACTS`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Tệp đặc tả gốc:** [`packages/contracts/openapi.yaml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/openapi.yaml), [`packages/contracts/openapi-auth.yaml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/openapi-auth.yaml)  
> **Tiêu chuẩn:** OpenAPI Specification 3.1.0, RESTful HTTP Protocol, RFC 7807

---

## 1. NGUYÊN TẮC THIẾT KẾ ENDPOINT RESTFUL

- **Tiền tố phiên bản:** Mọi endpoint bắt buộc có tiền tố `/api/v1/`.
- **Cấu trúc tài nguyên REST:** Sử dụng danh từ số nhiều cho tài nguyên (e.g., `/threads`, `/comments`, `/users`, `/spaces`, `/chat/channels`).
- **Quy tắc phương thức HTTP:**
  - `GET`: Truy vấn thông tin (An toàn, Idempotent, cho phép đệm cache).
  - `POST`: Tạo mới tài nguyên hoặc kích hoạt tác vụ trạng thái (Đăng ký, Đăng bài, Vote, Tham gia Space).
  - `PATCH`: Cập nhật một phần dữ liệu của tài nguyên (Đổi role, Pin bài viết, Lock bình luận).
  - `PUT`: Cập nhật toàn bộ hoặc tải tệp trực tiếp qua presigned URL.
  - `DELETE`: Xóa tài nguyên hoặc thu hồi phiên làm việc.

---

## 2. QUY CHUẨN ĐỊNH DẠNG DỮ LIỆU ĐÁP ỨNG & MÃ LỖI (RFC 7807)

### 2.1. Phản Hồi Thành Công (Standard Success Response)
```json
{
  "user": {
    "id": "e8a1562b-9876-4d2a-bc91-231a4c856710",
    "username": "alex_devops",
    "email": "alex@acad.community",
    "role": "USER",
    "status": "ACTIVE",
    "karmaScore": 120,
    "threadsCount": 15
  },
  "sessionId": "b47c01a2-1111-2222-3333-444455556666"
}
```

### 2.2. Phản Hồi Báo Lỗi Tiêu Chuẩn (RFC 7807 Problem Details)
```json
{
  "type": "https://acad.community/errors/unauthorized",
  "title": "Xác thực không thành công",
  "status": 401,
  "detail": "Access Token đã hết hạn hoặc chữ ký không hợp lệ",
  "code": "EXPIRED_ACCESS_TOKEN",
  "instance": "/api/v1/threads"
}
```

---

## 3. PHÂN TRANG THEO CON TRỎ (CURSOR-BASED PAGINATION)

Đối với các danh sách dữ liệu động có tần suất cập nhật cao (Bảng tin Feed, Luồng bài viết), hệ thống **tuyệt đối không sử dụng `offset/limit`** vì gây trôi dữ liệu khi có bài viết mới xuất hiện ở đầu bảng tin.

Hệ thống mã hóa con trỏ Base64 tổng hợp từ bộ ba giá trị:
$$\text{Cursor} = \text{base64}(\text{sort\_score} : \text{timestamp} : \text{item\_id})$$

```json
{
  "items": [...],
  "pagination": {
    "nextCursor": "ZXlKaGJHY2lPaUpTVXpVeE5pSXNJblI1Y0NJN...",
    "hasMore": true,
    "limit": 20
  }
}
```
Client gửi con trỏ tiếp theo qua query param: `GET /api/v1/threads?cursor=ZXlKa...&limit=20`.
