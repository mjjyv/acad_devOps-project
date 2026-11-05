# Quy Chuẩn Quản Trị Mã Nguồn & Luồng Git (Git Workflow Standard)

Tài liệu quy định quy trình làm việc với Git, chiến lược phân nhánh và cấu trúc thông điệp commit chuẩn mực cho toàn bộ dự án và các AI Agents.

---

## 1. CHIẾN LƯỢC PHÂN NHÁNH (TRUNK-BASED WORKFLOW)

Dự án áp dụng mô hình **Trunk-based Development tinh gọn**:
- Nhánh chính (**`main`**): Luôn ở trạng thái có thể xuất bản sản phẩm (Production Ready). Bất kỳ commit nào trên `main` đều tự động kích hoạt webhook triển khai lên Render Cloud.
- Nhánh tích hợp (**`develop`**): Nhánh trung chuyển để ghép nối và kiểm định các tính năng mới trước khi đưa vào bản phát hành chính thức.
- Nhánh tính năng (**`feat/...`**, **`fix/...`**, **`chore/...`**): Nhánh ngắn hạn (sống dưới 2 ngày), tách ra từ `develop` hoặc `main` và bắt buộc merge qua Pull Request.

---

## 2. QUY CHUẨN THÔNG ĐIỆP COMMIT (SEMANTIC COMMITS)

Tất cả các commit bắt buộc tuân theo định dạng chuẩn:

```text
<loại>(<phạm vi>): <mô tả ngắn gọn bằng thể mệnh lệnh>

[Nội dung chi tiết giải thích lý do kỹ thuật hoặc bối cảnh]
```

### Bảng Phân Loại (Types)
| Tiền Tố | Ý Nghĩa Kỹ Thuật | Ví Dụ |
| :--- | :--- | :--- |
| **`feat`** | Thêm một tính năng mới hoặc nâng cấp nghiệp vụ | `feat(auth): implement token rotation with 30s grace period` |
| **`fix`** | Khắc phục lỗi phát sinh trong mã nguồn hoặc cấu hình | `fix(auth): resolve SSL/TLS required error on render cloud database` |
| **`chore`** | Các công việc bảo trì, cập nhật dependencies, setup tool | `chore(deps): upgrade vitest to v3.2.7 and pnpm to 10.15` |
| **`docs`** | Thêm mới hoặc chỉnh sửa tài liệu kỹ thuật | `docs(guides): add comprehensive backend testing manual with curl` |
| **`refactor`** | Tối ưu hóa cấu trúc code mà không thay đổi hành vi | `refactor(community): extract gravity decay formula into dedicated engine` |
| **`test`** | Bổ sung hoặc cập nhật các bộ kiểm thử tự động | `test(auth): add unit tests for postgres ssl auto-detection` |

---

## 3. CÁC CỔNG KIỂM ĐỊNH TỰ ĐỘNG TRÊN GITHUB ACTIONS (CI GATES)

Mọi commit và Pull Request vào nhánh `main` hoặc `develop` đều phải vượt qua 4 cổng kiểm định tự động:
1. **Cổng 1 (Lint & Format):** Kiểm tra định dạng code và các lỗi linter bằng Biome.
2. **Cổng 2 (Type Integrity):** Chạy `tsc --noEmit` trên toàn bộ 8 packages và apps, đảm bảo không có bất kỳ lỗi sai kiểu nào.
3. **Cổng 3 (Automated Tests):** Chạy toàn bộ 59+ test suites qua Vitest, tỷ lệ thành công bắt buộc đạt 100%.
4. **Cổng 4 (Docker Build Check):** Xác thực cú pháp file `docker-compose.dev.yml` và kiểm tra khả năng đóng gói container sản xuất.
