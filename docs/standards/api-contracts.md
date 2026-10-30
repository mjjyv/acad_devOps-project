# Quy Chuẩn Khế Ước Giao Tiếp Dữ Liệu API (API Contracts Specification)

**Tệp định nghĩa gốc:** [`packages/contracts/openapi.yaml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/openapi.yaml), [`packages/contracts/openapi-auth.yaml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/openapi-auth.yaml)  
**Tiêu chuẩn:** OpenAPI Specification 3.1.0, RESTful HTTP Protocol  

---

## 1. NGUYÊN TẮC THIẾT KẾ ENDPOINT

- **Tiền tố phiên bản:** Mọi endpoint nghiệp vụ bắt buộc có tiền tố `/api/v1/`.
- **Cấu trúc tài nguyên REST:** Sử dụng danh từ số nhiều cho tài nguyên (e.g., `/threads`, `/comments`, `/users`, `/spaces`).
- **Phương thức HTTP (Methods):**
  - `GET`: Truy vấn thông tin (Idempotent & Safe).
  - `POST`: Tạo mới tài nguyên hoặc kích hoạt tác vụ nghiệp vụ có trạng thái.
  - `PATCH`: Cập nhật một phần dữ liệu của tài nguyên.
  - `PUT`: Cập nhật toàn bộ hoặc upload trực tiếp.
  - `DELETE`: Xóa tài nguyên hoặc thu hồi quyền.

---

## 2. QUY CHUẨN ĐỊNH DẠNG DỮ LIỆU ĐÁP ỨNG (RESPONSE FORMATS)

### 2.1. Phản Hồi Thành Công (Standard Success Response)
```json
{
  "user": {
    "id": "e8a1562b-9876-4d2a-bc91-231a4c856710",
    "username": "alex_devops",
    "email": "alex@acad.community",
    "role": "USER",
    "status": "ACTIVE",
    "karmaScore": 120
  },
  "sessionId": "b47c01a2-1111-2222-3333-444455556666"
}
```

### 2.2. Phản Hồi Báo Lỗi Tiêu Chuẩn (Standard Error Response)
Mọi phản hồi lỗi bắt buộc trả về mã lỗi HTTP tương ứng kèm thông điệp rõ ràng:
```json
{
  "error": "Tên đăng nhập hoặc mật khẩu không chính xác",
  "code": "INVALID_CREDENTIALS",
  "details": null
}
```

### 2.3. Mã Trạng Thái HTTP (Status Codes Convention)
- `200 OK`: Truy vấn hoặc cập nhật thành công.
- `201 Created`: Tạo mới tài nguyên thành công (Đăng ký, Đăng bài, Tạo phiên).
- `204 No Content`: Xử lý thành công không cần dữ liệu trả về (Pre-flight OPTIONS).
- `400 Bad Request`: Dữ liệu gửi lên sai định dạng hoặc vi phạm ràng buộc Zod Schema.
- `401 Unauthorized`: Chưa đăng nhập hoặc Access Token hết hạn / không hợp lệ.
- `403 Forbidden`: Bị từ chối quyền truy cập (ABAC/RBAC) hoặc phát hiện tấn công tái sử dụng Token.
- `404 Not Found`: Tài nguyên không tồn tại.
- `429 Too Many Requests`: Vượt quá hạn mức tần suất gọi API (Rate limit exceeded).
- `500 Internal Server Error`: Sự cố máy chủ nội bộ.

---

## 3. PHÂN TRANG THEO CON TRỎ (CURSOR-BASED PAGINATION)

Đối với các danh sách dữ liệu động có tần suất cập nhật cao (Bảng tin Feed, Luồng bài viết), hệ thống **tuyệt đối không sử dụng `offset/limit`** vì gây trôi dữ liệu khi có bài viết mới xuất hiện ở đầu bảng tin.

Hệ thống mã hóa con trỏ Base64 tổng hợp từ bộ ba giá trị:
$$\text{Cursor} = \text{base64}(\text{sort\_score} : \text{timestamp} : \text{item\_id})$$

```json
{
  "items": [...],
  "pageInfo": {
    "hasNextPage": true,
    "nextCursor": "MTQ4LjAwMDA6MTcyNzI0OTIwMDAwMDplOGExNTYyYi05ODc2LTRkMmEtYmM5MS0yMzFhNGM4NTY3MTA="
  }
}
```
Client gửi lại con trỏ này qua Query Param: `GET /api/v1/feed?cursor=MTQ4...&limit=20`.
