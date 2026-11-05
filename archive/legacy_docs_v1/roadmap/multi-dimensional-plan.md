# Kế Hoạch Triển Khai Đa Chiều Toàn Hệ Thống (Multi-Dimensional Implementation Plan)

> **Mục tiêu:** Thoát ly khỏi mô hình SDLC đơn tuyến tuần tự (waterfall), thiết lập kế hoạch triển khai song song theo đồ thị phụ thuộc phân hệ (Module DAG), phân bổ theo 4 làn sóng ưu tiên (Waves), hoàn tất bàn giao cơ sở dữ liệu Supabase và tích hợp các tính năng cốt lõi.

---

## 1. Đồ Thị Phụ Thuộc Đa Chiều Giữa Các Phân Hệ (Module Dependency DAG)

```mermaid
flowchart TD
    subgraph Foundation ["HẠ TẦNG NỀN TẢNG & CSDL (Wave 1)"]
        M10["M10: DevOps, CI/CD & Multi-Cloud"] --> DB["Supabase Managed PostgreSQL<br/>(Bootstrap & Seed Data)"]
        DB --> M1["M1: Auth & Identity Subsystem"]
        M1 --> M2["M2: Session & Security Shield<br/>(Redis & Interceptor)"]
    end

    subgraph CoreDomain ["MIỀN NGHIỆP VỤ CỘNG ĐỒNG (Wave 2)"]
        M2 --> M3["M3: Spaces & Community Subsystem"]
        M3 --> M4["M4: Threads & Content CMS Engine"]
        M4 --> M5["M5: Nested Comments Engine<br/>(Base36 ltree + Virtualizer)"]
        M4 --> M6["M6: Atomic Lua Voting & Reputation"]
    end

    subgraph AdvancedCMS ["MỞ RỘNG ĐA PHƯƠNG TIỆN (Wave 3)"]
        M4 --> M7["M7: Zero-Hop Media Pipeline<br/>(Cloudflare R2 Presigned URLs)"]
        M7 --> M9["M9: Frontend Web Client UI<br/>(Tiptap + Virtualized Tree)"]
        M5 --> M9
        M6 --> M9
    end

    subgraph Operations ["QUẢN TRỊ & GIÁM SÁT (Wave 4)"]
        M1 --> M8["M8: Admin & Moderation Hub"]
        M4 --> M8
        M9 --> M10
        M8 --> M10
    end
```

---

## 2. Kế Hoạch Triển Khai Theo 4 Làn Sóng (Wave-Based Implementation Roadmap)

### 🌊 LÀN SÓNG 1: HOÀN TẤT BÀN GIAO CSDL SUPABASE & AUTH SHIELD (ƯU TIÊN P0)
*Mục tiêu:* Đưa cơ sở dữ liệu mới trên Supabase vào hoạt động chính thức, dập tắt rủi ro mất dữ liệu do DB Render cũ bị suspended, đảm bảo API kết nối ổn định và có sẵn dữ liệu mẫu bàn giao.

| Nhiệm vụ kỹ thuật | Trạng thái | Tệp mã nguồn / Kịch bản liên quan |
| :--- | :---: | :--- |
| 1.1. Xây dựng bản migration và seed mẫu đồng bộ duy nhất | **HOÀN THÀNH** | [`deploy/migrations/supabase_bootstrap.sql`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/supabase_bootstrap.sql) |
| 1.2. Tạo script chạy migration tự động một chạm trên Debian 13 | **HOÀN THÀNH** | [`deploy/scripts/migrate-supabase.sh`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/scripts/migrate-supabase.sh) |
| 1.3. Nâng cấp nhận diện SSL tự động cho host Supabase IPv4 Pooler | **HOÀN THÀNH** | [`services/auth/src/repository/postgres-user-repository.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/src/repository/postgres-user-repository.ts) |
| 1.4. Bộ kiểm thử tự động SSL & InMemory Fallback | **HOÀN THÀNH** | [`services/auth/tests/postgres-config.test.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth/tests/postgres-config.test.ts) (8/8 pass) |
| 1.5. Nạp schema & seed lên Supabase Studio SQL Editor | **SẴN SÀNG** | Người dùng chạy lệnh bash hoặc dán file `supabase_bootstrap.sql` |
| 1.6. Cập nhật `DATABASE_URL` Pooler trên Render Cloud Web Service | **SẴN SÀNG** | Cập nhật trên Render Dashboard: `aws-0-ap-southeast-1.pooler.supabase.com:6543` |

---

### 🌊 LÀN SÓNG 2: ĐỘNG CƠ CÂY BÌNH LUẬN ẢO HÓA & ATOMIC VOTING REALTIME (ƯU TIÊN P0)
*Mục tiêu:* Kết nối thuật toán trải phẳng $O(N)$ cây bình luận lên giao diện người dùng Next.js 15 và thiết lập Server-Sent Events (SSE) phát sóng biến động điểm số voting trực tiếp.

| Nhiệm vụ kỹ thuật | Trạng thái | Tệp mã nguồn / Kịch bản liên quan |
| :--- | :---: | :--- |
| 2.1. Thuật toán trải phẳng $O(N)$ và Base36 ltree generator | **HOÀN THÀNH** | [`packages/tree-virtualizer`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/tree-virtualizer) & [`ltree-path-generator.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/comments/ltree-path-generator.ts) |
| 2.2. Kịch bản Redis Lua `execute_vote.lua` nguyên tử | **HOÀN THÀNH** | [`deploy/redis/execute_vote.lua`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/redis/execute_vote.lua) |
| 2.3. Tạo Component `CommentVirtualizedTree.tsx` tích hợp `@tanstack/react-virtual` | **KẾ HOẠCH** | `apps/web/src/components/comments/CommentVirtualizedTree.tsx` |
| 2.4. Xây dựng Endpoint SSE `GET /api/v1/threads/:id/stream` | **KẾ HOẠCH** | `services/community/src/routes/realtime-routes.ts` |
| 2.5. Hook `useThreadRealtimeVotes` cập nhật điểm số không cần F5 | **KẾ HOẠCH** | `apps/web/src/hooks/useThreadRealtimeVotes.ts` |

---

### 🌊 LÀN SÓNG 3: TRÌNH SOẠN THẢO CMS TIPTAP & ĐƯỜNG ỐNG ẢNH ZERO-HOP R2 (ƯU TIÊN P1)
*Mục tiêu:* Cho phép người dùng soạn thảo bài viết phong phú kèm hình ảnh được tải trực tiếp lên Cloudflare R2 / AWS S3 qua Presigned URL, giải phóng hoàn toàn tải trọng cho API server.

| Nhiệm vụ kỹ thuật | Trạng thái | Tệp mã nguồn / Kịch bản liên quan |
| :--- | :---: | :--- |
| 3.1. Hợp đồng dữ liệu `POST /api/v1/media/presigned-url` | **HOÀN THÀNH** | [`packages/contracts/openapi.yaml`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts/openapi.yaml) |
| 3.2. Cài đặt AWS S3 Client & SDK sinh URL có chữ ký bảo mật | **KẾ HOẠCH** | `services/community/src/media/s3-presigner.ts` |
| 3.3. Tích hợp Rich-Text Editor Tiptap trên giao diện Web | **KẾ HOẠCH** | `apps/web/src/components/editor/TiptapEditor.tsx` |
| 3.4. Background Worker dọn dẹp các tệp ảnh mồ côi (Orphan Cleanup) | **KẾ HOẠCH** | `services/community/src/workers/orphan-media-cleaner.ts` |

---

### 🌊 LÀN SÓNG 4: BẢNG ĐIỀU KHIỂN QUẢN TRỊ, GIÁM SÁT SENTRY & KEEP-ALIVE (ƯU TIÊN P1/P2)
*Mục tiêu:* Hoàn thiện trang quản trị người dùng, thiết lập giám sát lỗi tự động và duy trì hệ thống hoạt động liên tục 24/7.

| Nhiệm vụ kỹ thuật | Trạng thái | Tệp mã nguồn / Kịch bản liên quan |
| :--- | :---: | :--- |
| 4.1. Endpoint Backend Admin Stats, List Users, Update Role | **HOÀN THÀNH** | [`apps/api/src/routes/admin-routes.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api) (7/7 tests pass) |
| 4.2. Giao diện Bảng Quản trị Người dùng & Kiểm duyệt | **KẾ HOẠCH** | `apps/web/src/app/admin/users/page.tsx` |
| 4.3. Tích hợp Sentry Error Tracking cho Backend & Frontend | **KẾ HOẠCH** | `apps/api/src/plugins/sentry.ts` |
| 4.4. Script định kỳ Keep-alive chống Render ngủ đông | **HOÀN THÀNH** | [`deploy/scripts/keep-alive.sh`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/scripts/keep-alive.sh) |

---

## 3. Kế Hoạch Bàn Giao Dữ Liệu & Hướng Dẫn Tương Tác CSDL Supabase

### 3.1. Dữ Liệu Mẫu Đã Đóng Gói (Seed Data Deliverables)
Trong tệp [`deploy/migrations/supabase_bootstrap.sql`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/supabase_bootstrap.sql), toàn bộ dữ liệu mẫu đã được tích hợp sẵn:
1. **Tài khoản Người dùng (3 tài khoản phân quyền):**
   - **Quản trị viên (ADMIN):** `admin@acad.internal` (Mật khẩu: `Admin@Acad2026!`, mã băm Scrypt hợp chuẩn).
   - **Kiểm duyệt viên (MODERATOR):** `moderator@acad.internal` (Mật khẩu: `Mod@Acad2026!`).
   - **Kỹ sư DevOps (USER):** `devops_lead@acad.internal` (Mật khẩu: `Dev@Acad2026!`).
2. **Không gian Thảo luận (3 spaces):**
   - `devops-engineering` (DevOps & Cloud Engineering).
   - `system-architecture` (High-Throughput System Architecture).
   - `fullstack-nextjs` (Next.js 15 & Modern Web Development).
3. **Bài viết & Cây Bình luận Mẫu (Threads & Nested Comments):**
   - Bài thảo luận kèm Tiptap AST chuẩn.
   - Cây bình luận 3 tầng phân nhánh ltree Base36 (`0001` $\rightarrow$ `0001.0001` $\rightarrow$ `0001.0001.0001`).

### 3.2. Những Thông Tin Cần Người Dùng Thực Hiện (Không Cần Chia Sẻ Bí Mật)

> [!CAUTION]
> **Nguyên tắc an ninh tối cao:** Người dùng **TUYỆT ĐỐI KHÔNG CẦN VÀ KHÔNG NÊN** gửi mật khẩu database thật, khóa bí mật JWT, hoặc R2 API keys vào khung chat với AI.

**Người dùng chỉ cần thực hiện 2 thao tác độc lập:**
1. **Lựa chọn 1 trong 2 cách nạp CSDL lên Supabase:**
   - **Cách A (1-Click trên Supabase Studio):** Mở Supabase Dashboard $\rightarrow$ **SQL Editor** $\rightarrow$ Dán toàn bộ nội dung file [`deploy/migrations/supabase_bootstrap.sql`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations/supabase_bootstrap.sql) $\rightarrow$ Nhấn **RUN**.
   - **Cách B (Chạy lệnh Terminal trên Debian 13):**
     ```bash
     cd ~/Documents/100_academy/acad_it_devOps/acad_devOps_project
     ./deploy/scripts/migrate-supabase.sh
     ```
     (Script sẽ yêu cầu dán chuỗi Pooler URL, ký tự được ẩn đi để đảm bảo bí mật).
2. **Cập nhật Render Dashboard:**
   - Vào `dashboard.render.com` $\rightarrow$ Web Service `acad-core-api` $\rightarrow$ **Environment**.
   - Thay giá trị `DATABASE_URL` thành chuỗi Pooler IPv4:
     ```text
     postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require
     ```
   - Render sẽ tự động redeploy trong vòng 60 giây và kết nối thành công tới Supabase.

---

## 4. Kịch Bản Kiểm Thử Xác Minh Tích Hợp Chéo (Cross-Module Verification)

Sau khi hoàn tất nạp dữ liệu, thực thi kiểm thử liên phân hệ theo kịch bản:
```bash
# 1. Kiểm tra trạng thái API trực tuyến
curl -s -i "https://acad-core-api.onrender.com/healthz"

# 2. Đăng nhập với tài khoản Admin mẫu vừa được seed
curl -s -X POST "https://acad-core-api.onrender.com/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acad.internal","password":"Admin@Acad2026!"}' | jq .

# 3. Lấy dữ liệu thống kê quản trị (Xác minh Module 1 + 2 + 8 + Supabase DB)
curl -s -X GET "https://acad-core-api.onrender.com/api/v1/auth/admin/stats" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" | jq .
```
