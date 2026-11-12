# Bảng Đối Chiếu Tiến Độ & Tình Trạng Thực Tế (Progress Checklist v2.1)

> **Mã tài liệu:** `ROADMAP-PROGRESS-CHECKLIST`  
> **Dự án:** Acad DevOps Fullstack Monorepo (**SYNAPSE Engine**)  
> **Tiêu chuẩn nghiệm thu bắt buộc:** [`.agents/skills/real-user-e2e-verification/SKILL.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/.agents/skills/real-user-e2e-verification/SKILL.md)

---

## 1. TỔNG QUAN TIẾN ĐỘ THỰC TẾ (KHÔNG LÀM ĐẸP BÁO CÁO)

| Luồng Phát Triển | Mục Tiêu Kỹ Thuật | Trạng Thái Thực Thi |
| :--- | :--- | :--- |
| **Giai đoạn A: Tài liệu & Sơ đồ SAD** | Chuẩn hóa 6 giai đoạn Framework & 37 sơ đồ Mermaid cho 7 module + Skill E2E | ✅ Hoàn tất toàn bộ mô tả, ERD, Class, Activity, Sequence, State Machine |
| **Giai đoạn B: Database `000007` & Seeds Thật** | Thêm `spaces.topic`, Trigram user search, trigger soft-delete `is_deleted`, hàm `reconcile_platform_counters()`, 0% số ảo | ✅ Đã migrate `000007`, chạy seed thật 100% khớp PostgreSQL ↔ Redis (8/8 bài viết) và pass QA/Integration |
| **Giai đoạn C: Backend API & Frontend UX** | API `users/search`, `spaces?topic=`, Sent Requests, `/explore`, `Home`/`Popular` tách bạch, Chat Create DM theo username | ✅ Đã triển khai & xác minh API/UI end-to-end với hai tài khoản trắng mới (`fresh_a`, `fresh_b`) |
| **Giai đoạn D: Nghiệm Thu Trình Duyệt (Playwright)** | Bộ test trình duyệt thật đóng vai 2 tài khoản trắng mới (`fresh_a`, `fresh_b`) theo Skill `real-user-e2e-verification` | ✅ Đã chạy Playwright Chromium Headless (`tests/e2e/real-user-e2e.spec.ts`), sửa 4 lỗi phát sinh thực tế & pass đối soát SQL/Redis (`0` sai lệch) |

---

## 2. CÁC BƯỚC KẾ TIẾP (THEO KẾ HOẠCH HOÀN THIỆN SAD FRAMEWORK & DB)

1. **Hoàn thiện Tài liệu & Sơ đồ từng Module** theo [`SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/SYSTEM%20ANALYSIS%20%26%20DESIGN%20LIFECYCLE%20FRAMEWORK.md).
2. **Suy xuất & Triển khai Migration `000007` + Seeds sạch (Zero Simulated Data)**: Xóa hoàn toàn dữ liệu counter bơm ảo, đồng bộ counter chuẩn 100% với vote/comment/membership thật, thêm cột/index/trigger còn thiếu.
3. **Cập nhật API + UI (`Explore`, `Home/Popular`, `Chat Username Search & Direct DM`, `Recent Posts`)**.
4. **Chạy nghiệm thu khép kín theo Skill `real-user-e2e-verification`** bằng tài khoản trắng mới trên trình duyệt thật (Playwright) + đối soát SQL Postgres/Redis.
