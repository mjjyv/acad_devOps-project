# Quy Chuẩn Chất Lượng Mã Nguồn & Kiểm Thử (Code Quality & Testing)

Quy định các tiêu chuẩn về kiểm định kiểu dữ liệu tĩnh (Static Typing), công cụ linting và chiến lược viết kiểm thử tự động trong toàn bộ Monorepo.

---

## 1. TIÊU CHUẨN TYPESCRIPT (TYPE INTEGRITY)

- **Strict Mode:** Kích hoạt `strict: true`, `noImplicitAny: true`, `strictNullChecks: true` trên toàn bộ các tệp `tsconfig.json`.
- **Single Source of Truth:** Không được định nghĩa trùng lặp interface/type ở tầng UI và API. Mọi kiểu dữ liệu dùng chung bắt buộc phải import từ gói [`@acad/contracts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts).
- **Zod Schema Synchronization:** Mọi dữ liệu đi vào hệ thống qua HTTP Body, Query Params hoặc Cookies đều phải đi qua bộ kiểm định Zod Schema trước khi xử lý nghiệp vụ.

---

## 2. QUY CHUẨN LINTING & ĐỊNH DẠNG (BIOME)

Dự án áp dụng [Biome](https://biomejs.dev/) thay thế cho ESLint + Prettier truyền thống nhờ tốc độ xử lý nhanh hơn 20 lần:
- Thụt lề chuẩn: 2 spaces.
- Chiều dài dòng tối đa: 100 ký tự.
- Dấu nháy đơn (`'`) cho chuỗi văn bản thông thường.
- Dấu chấm phẩy (`;`) bắt buộc ở cuối câu lệnh.

---

## 3. CHIẾN LƯỢC KIỂM THỬ (TESTING PYRAMID)

Dự án sử dụng **Vitest** làm khung kiểm thử thống nhất trên toàn bộ các gói:
1. **Unit Tests (Kiểm thử đơn vị):**
   - Tập trung vào các hàm tính toán giải thuật thuần túy: `computeHotScore` (Gravity Decay), `encodeToken` / `generateNextPath` (ltree Base36), `flattenCommentTree` (Tree Virtualizer).
   - Đảm bảo độ bao phủ các trường hợp biên (edge cases), chia cho 0, số âm, độ sâu vượt ngưỡng cấp 8.
2. **Integration Tests (Kiểm thử tích hợp):**
   - Kiểm thử các luồng xác thực: Xoay vòng Refresh Token, Grace Period 30 giây, Phát hiện tấn công tái sử dụng Token, Đăng xuất và thu hồi phiên.
   - Kiểm thử các cổng API HTTP: Các endpoint `/register`, `/login`, `/refresh`, `/admin/users`, `/admin/stats`.
3. **Resilient Fallback Testing:**
   - Mọi kho dữ liệu (như `PostgresUserRepository`) đều phải có bài test chứng minh khả năng tự phục hồi hoặc chuyển sang bộ nhớ đệm dự phòng khi CSDL bên ngoài gặp sự cố mạng hoặc lỗi SSL/TLS.
