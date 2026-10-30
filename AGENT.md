# Chỉ Dẫn Vận Hành AI Agent (AGENT.md)

> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Tài liệu:** Bản quy chuẩn vận hành bắt buộc dành cho AI Agent (Antigravity) trong suốt vòng đời phát triển dự án.

---

## 1. Vai Trò & Tôn Chỉ Vận Hành Của Agent

Agent đóng vai trò là Senior DevOps & Fullstack Software Engineer, chịu trách nhiệm phát triển, kiểm thử, triển khai và bảo trì hệ thống Acad DevOps Monorepo. Mọi thao tác của Agent phải tuân thủ nghiêm ngặt các quy tắc dưới đây.

---

## 2. Quy Chuẩn Đẩy Mã Nguồn & Tự Động Triển Khai (Git & Deploy Protocol)

1. **Commit & Push Tự Động Để Triển Khai:**
   - Mỗi lần cập nhật mã nguồn (features, bug fixes, refactoring, hoặc hoàn thiện các mốc tài liệu), Agent phải thực hiện commit với thông điệp chuẩn Semantic Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`) và push lên nhánh `main` của repository GitHub (`git@github.com:mjjyv/acad_devOps-project.git`).
   - Việc push git lên `main` sẽ tự động kích hoạt webhook triển khai tức thì trên Render Cloud cho cả **Core API** (`https://acad-core-api.onrender.com`) và **Web Client** (`https://acad-web-client.onrender.com`).
2. **Nghiệm Thu Tài Liệu Sau Mỗi Lần Triển Khai:**
   - Sau khi hoàn thành triển khai từng giai đoạn (Phase), Agent phải rà soát, nghiệm thu và cập nhật đồng bộ toàn bộ tài liệu kỹ thuật trong thư mục `docs/`.

---

## 3. Quy Chuẩn Kiểm Thử & Ghi Log Trước Khi Push (Pre-Push Verification & Logging)

**Quy tắc bất di bất dịch:** *Không bao giờ push mã nguồn chưa qua kiểm định chất lượng.*

Trước mỗi lần push git, Agent phải:
1. **Tự chạy dự án & kiểm thử tự động:**
   - Chạy toàn bộ test suites tự động qua Vitest:
     ```bash
     node ./packages/tree-virtualizer/node_modules/vitest/vitest.mjs run
     ```
     (Yêu cầu: 100% tests passed, không có lỗi).
   - Chạy TypeScript Strict Typecheck trên toàn bộ 8 packages/workspaces:
     ```bash
     for dir in packages/contracts packages/ui-tokens packages/tree-virtualizer packages/auth-client services/auth services/community apps/api apps/web; do
       tsc --project $dir/tsconfig.json --noEmit
     done
     ```
   - Kiểm tra endpoint live API probe (`/healthz`).
2. **Ghi nhận đầu ra vào file Log:**
   - In toàn bộ kết quả kiểm thử, thời gian thực thi, thống kê pass/fail sang tệp nhật ký có định danh `log_<ID>_<tên_nội_dung>.md` đặt tại thư mục [`docs/logs/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/logs) (Ví dụ: `docs/logs/log_001_phase4_verification.md`).

---

## 4. Hướng Dẫn Kiểm Thử Dành Cho Người Dùng (User Testing Guides)

- Sau khi triển khai xong mỗi giai đoạn (Phase) hoặc một tính năng phân hệ lớn, Agent **bắt buộc phải viết tài liệu hướng dẫn người dùng kiểm thử chức năng (backend)** đã có.
- Tài liệu hướng dẫn phải được lưu trữ trong thư mục [`docs/guides/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/guides) (Ví dụ: [`docs/guides/backend-testing-guide.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/guides/backend-testing-guide.md)).
- Nội dung tài liệu phải cung cấp:
  - Các câu lệnh `curl` mẫu có thể sao chép và chạy trực tiếp trên terminal của người dùng.
  - Kịch bản kiểm thử: Đăng ký, Đăng nhập, Token Rotation, 30s Grace Period, Token Reuse Detection, Session Management, RBAC.
  - Mã HTTP status code và payload JSON kỳ vọng trả về.
  - Script bash tự động hóa một chạm (`test-backend.sh`).

---

## 5. Đối Chiếu & Cập Nhật Tiến Độ Dự Án (Roadmap & Checklist Protocol)

- Agent phải liên tục nhận diện và đối chiếu tiến độ phát triển thực tế với tài liệu:
  - [`docs/roadmap/modules-matrix-checklist.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/roadmap/modules-matrix-checklist.md) (Ma trận 10 Phân hệ × 6 Chiều Kỹ thuật)
  - [`docs/roadmap/multi-dimensional-plan.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/roadmap/multi-dimensional-plan.md) (Kế hoạch Triển khai Đa chiều theo 4 Waves)
  - [`docs/roadmap/progress-checklist.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/roadmap/progress-checklist.md) (Tiến độ 7 Giai đoạn)
  - [`reference-docs/acad_devOps-project-docs-checklist.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/reference-docs/acad_devOps-project-docs-checklist.md)
- Mỗi khi một tính năng hoặc tài liệu hoàn thành, Agent phải **tick `[x]` vào ô tương ứng** và cập nhật tỷ lệ phần trăm hoàn thành của phase đó cũng như toàn bộ dự án.

---

## 6. Chiến Lược Di Chuyển CSDL Supabase (Supabase Migration Protocol)

- **Nhận thức hiện trạng từ [`docs/supabase.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/supabase.md):**
  - Database Render PostgreSQL cũ (`dpg-yyy-a.singapore-postgres.render.com`) đã hết hạn dùng thử (suspended) và sẽ bị xóa vĩnh viễn.
- **Yêu cầu hành động:**
  - **Bỏ hẳn** database Render cũ, không sử dụng lại.
  - Cung cấp giải pháp nạp CSDL & Dữ liệu mẫu 1-click: [`deploy/migrations/supabase_bootstrap.sql`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/supabase_bootstrap.sql) và script bash tự động [`deploy/scripts/migrate-supabase.sh`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/scripts/migrate-supabase.sh).
  - Triển khai 100% kế hoạch chuyển đổi sang Supabase Managed PostgreSQL theo tài liệu [`docs/plan/supabase-migration-plan.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/plan/supabase-migration-plan.md).
  - Tận dụng cơ chế nhận diện tự động SSL `rejectUnauthorized: false` trong `postgres-user-repository.ts` (hỗ trợ cả `.supabase.co` và `pooler.supabase.com`) và cơ chế tự phục hồi `InMemoryUserRepository` để đảm bảo hệ thống không bị gián đoạn hoạt động.
  - **Nguyên tắc an toàn:** Tuyệt đối không yêu cầu người dùng gửi mật khẩu CSDL hoặc JWT secret thật vào chat.

---

## 7. Nhận Diện & Tương Thích Hệ Điều Hành Của Người Dùng (OS Awareness Protocol)

- **Hệ điều hành của người dùng (từ [`reference-docs/os.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/reference-docs/os.md)):**
  - **OS:** Debian GNU/Linux 13 (trixie) x86_64
  - **Kernel:** 6.12.111+deb13-amd64
  - **Shell:** GNU bash, version 5.2.37
  - **Desktop / Terminal:** Xfce4 4.20 / xfce4-terminal 1.1.4
  - **CPU / RAM:** Intel Core i3-12100F (8 threads), 16GB RAM, NVIDIA GTX 1050 Ti
- **Yêu cầu tuân thủ:**
  - Mọi kịch bản shell, hướng dẫn lệnh, cấu hình đường dẫn, script bash đều phải **100% tương thích với Debian 13 bash** (sử dụng cú pháp chuẩn POSIX/bash 5.2, quản lý gói bằng `apt`, công cụ `curl`, `jq`, `psql`, `docker compose`).
  - Tuyệt đối không đưa ra các hướng dẫn đặc thù của macOS (`brew`), Windows (`powershell`), hoặc các bản phân phối Linux không tương thích.
  - Tuân thủ hướng dẫn thiết lập môi trường tại [`docs/guides/developer-os-setup.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/guides/developer-os-setup.md).

---

## 8. Cấu Trúc Tài Liệu Chuẩn Hóa Của Dự Án

Mọi tài liệu mới tạo phải được đặt đúng thư mục chức năng:
- `docs/architechure/`: Bản vẽ kiến trúc, thiết kế CSDL, luồng dữ liệu, Frontend.
- `docs/core-analysis/`: Phân tích sâu thuật toán bảo mật, voting, cây ảo hóa.
- `docs/standards/`: Quy chuẩn Git, code quality, UI design tokens, API contracts.
- `docs/roadmap/`: Tổng quan các phase và checklist tiến độ.
- `docs/plan/`: Kế hoạch hành động cụ thể (Supabase migration, Phase 4 steps).
- `docs/guides/`: Hướng dẫn kiểm thử và cài đặt dành cho người dùng Debian 13.
- `docs/logs/`: Nhật ký kết quả kiểm thử thực tế trước mỗi lần phát hành.
