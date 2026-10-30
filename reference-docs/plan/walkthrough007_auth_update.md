# Walkthrough: Khắc Phục Triệt Để Lỗi ERR_NAME_NOT_RESOLVED & Hoàn Thiện Xác Thực Render Cloud

Giải quyết dứt điểm lỗi `Failed to load resource: net::ERR_NAME_NOT_RESOLVED` khi người dùng thực hiện đăng ký (`/register`), đăng nhập (`/login`) và làm mới token (`/refresh`) trên `https://acad-web-client.onrender.com`.

---

## 1. Phân Tích Nguyên Nhân Gốc Rễ

### Hiện tượng
Trình duyệt ghi nhận:
```
POST https://acad-core-api/api/v1/auth/register net::ERR_NAME_NOT_RESOLVED
POST https://acad-core-api/api/v1/auth/login net::ERR_NAME_NOT_RESOLVED
POST https://acad-core-api/api/v1/auth/refresh net::ERR_NAME_NOT_RESOLVED
```

### Nguyên nhân
1. **Render Private Hostname**:
   - Trong `deploy/render/render.yaml`, biến môi trường được cấu hình:
     ```yaml
     - key: NEXT_PUBLIC_API_URL
       fromService:
         type: web
         name: acad-core-api
         property: host
     ```
   - Trong kiến trúc mạng của Render, `property: host` trả về **private internal hostname** của dịch vụ (chuỗi trần `acad-core-api`), chỉ có thể phân giải được trong mạng nội bộ của Render giữa các container.
   - Khi Next.js build ứng dụng web, chuỗi `acad-core-api` được inlines vào mã nguồn JavaScript phía client (`layout-*.js`, `page-*.js`).
   - Khi trình duyệt của người dùng (chạy trên internet) thực hiện fetch tới `https://acad-core-api/api/v1/auth/...`, hệ thống DNS công cộng không thể tìm thấy domain `acad-core-api` và lập tức báo lỗi `ERR_NAME_NOT_RESOLVED`.
2. **Cơ chế Cross-Site Cookie trên Render**:
   - Web client (`acad-web-client.onrender.com`) và API (`acad-core-api.onrender.com`) là 2 origin khác nhau.
   - Nếu cookie cấu hình `SameSite=Strict`, trình duyệt sẽ chặn không gửi cookie trong các request cross-site fetch.

---

## 2. Các Giải Pháp Kỹ Thuật Đã Triển Khai

### A. Chuẩn Hóa Endpoint Phía Client ([`auth-client.ts`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/auth-client.ts))
- Nâng cấp hàm `getApiBaseUrl()` với cơ chế tự phát hiện thông minh:
  - Nếu đang chạy trên trình duyệt tại domain `*.onrender.com`: tự động nhận diện và trỏ trực tiếp về endpoint công khai `https://acad-core-api.onrender.com`.
  - Nếu chuỗi cấu hình là hostname nội bộ Render `acad-core-api`: tự động bổ sung đuôi `.onrender.com` và protocol `https://`.
  - Nếu ở môi trường local development: giữ nguyên `http://localhost:8080`.

### B. Cấu Hình Tường Minh Trong Render Blueprint ([`render.yaml`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/render/render.yaml))
- Khai báo tường minh URL công khai:
  ```yaml
  - key: NEXT_PUBLIC_API_URL
    value: https://acad-core-api.onrender.com
  ```
- Đảm bảo trình biên dịch Next.js nhúng chính xác URL công khai vào bundle lúc build.

### C. Hỗ Trợ Cơ Chế Dual Token (Cross-Origin Fallback)
- **Backend API ([`auth-router.ts`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/routes/auth-router.ts) & [`auth-controller.ts`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/handlers/auth-controller.ts))**:
  - Trả về `refreshToken` trong response body của cả 3 luồng: `/register`, `/login` và `/refresh`, bên cạnh việc set HttpOnly Cookie.
  - Khi môi trường là Production, cookie tự động thiết lập `SameSite=None; Secure` và `Path=/` để hỗ trợ cross-subdomain giữa 2 service Render.
  - Thêm phương thức `PATCH` vào header `Access-Control-Allow-Methods` trong [`server.ts`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api/src/server.ts).
- **Client SDK ([`auth-client.ts`](file:///home/vvx/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web/src/lib/auth-client.ts))**:
  - Tự động lưu `refreshToken` vào `localStorage` làm kênh dự phòng.
  - Khi gọi endpoint `/refresh`, gửi kèm token trong body nếu cookie bị chặn bởi chính sách bảo mật trình duyệt (Safari ITP / Chrome third-party cookie restrictions).

---

## 3. Kết Quả Kiểm Định Chất Lượng Mã Nguồn

| Hạng Mục | Kết Quả | Chi Tiết |
| :--- | :---: | :--- |
| **Monorepo Tests** | **52 / 52 PASS (100%)** | `tree-virtualizer` (3/3), `community-service` (11/11), `auth-service` (19/19), `apps/api` (19/19) |
| **TypeScript Typecheck** | **PASS (100%)** | Toàn bộ 8 package đạt chuẩn TypeScript (`tsc --noEmit`) |
| **Next.js Production Build** | **PASS (100%)** | Biên dịch thành công 15/15 static & SSG routes |
