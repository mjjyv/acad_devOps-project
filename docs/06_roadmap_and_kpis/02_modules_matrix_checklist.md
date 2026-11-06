# Bảng Kiểm Ma Trận Đa Chiều 10 Phân Hệ (Modules Matrix Checklist)

> **Mã tài liệu:** `ROADMAP-MODULES-MATRIX`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Quy chuẩn đánh giá:** 6 Tiêu chuẩn kỹ thuật: Data Layer (C1), Contract & API (C2), Security (C3), Performance (C4), Resiliency (C5), UI/UX Experience (C6).  
> **Trạng thái thực tế:** **Khởi động Tái thiết Sạch từ đầu (Zero-Base Clean Rebuild v2.0 - Phase B0: 0%)**

---

## 1. MA TRẬN TÁI THIẾT SẠCH v2.0 (CLEAN REBUILD BASELINE)

Toàn bộ mã nguồn cũ đã được lưu trữ an toàn trong `archive/legacy_codebase/`. Dưới đây là ma trận theo dõi tiến độ tái thiết sạch theo chiến lược **Backend-First**:

```
Phân hệ (Modules)                    | C1: Data | C2: Contract | C3: Security | C4: Perf | C5: Resiliency | C6: UI/UX | Tái Thiết v2.0
-------------------------------------|:--------:|:------------:|:------------:|:--------:|:--------------:|:---------:|:-------------:
M0: Nền Tảng Monorepo & Tooling      |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    N/A    |    100% (B0 Done)
M1: Định Danh & Mã Hóa (Auth)        |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    N/A    |    100% (B1 Done)
M2: Quản Lý Phiên (Session Shield)   |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    N/A    |    100% (B1 Done)
M3: Không Gian Thảo Luận (Spaces)    |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    N/A    |    100% (B2 Done)
M4: Bài Viết & Soạn Thảo (Threads)   |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    N/A    |    100% (B2 Done)
M5: Cây Bình Luận Ảo Hóa (Ltree)     |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    N/A    |    100% (B2 Done)
M6: Bầu Chọn Nguyên Tử (Lua Voting)  |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    N/A    |    100% (B3 Done)
M7: Tin Nhắn Tức Thời (Reddit Chats) |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    N/A    |    100% (B4 Done)
M8: Trung Tâm Quản Trị (Admin Hub)   |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    N/A    |    100% (B5 Done)
M9: Frontend Web Client (Next.js 15) |   [ ]    |     [x]      |     [ ]      |   [ ]    |      [ ]       |    [ ]    |      0% (F1-F4)
M10: DevOps, CI/CD & Hạ Tầng Cloud   |   [ ]    |     [ ]      |     [ ]      |   [ ]    |      [ ]       |    N/A    |      0% (D1-D2)
---------------------------------------------------------------------------------------------------------------------------------
TIẾN ĐỘ THỰC THI HIỆN TẠI (v2.0 Clean Rebuild):                                                                  85.0% (Stream B Hoàn Tất 100%)
```

---

## 2. ĐÁNH GIÁ LỊCH SỬ MÃ NGUỒN CŨ v1.2 (ARCHIVED REFERENCE)

Để phục vụ đối chiếu và kế thừa các thuật toán ưu việt (được lưu tại `archive/legacy_codebase/`), dưới đây là mức độ hoàn thiện của phiên bản cũ trước khi lưu trữ (theo trích xuất từ `docs/docs.md`):

```
Phân hệ Lịch Sử v1.2                 | C1: Data | C2: Contract | C3: Security | C4: Perf | C5: Resiliency | C6: UI/UX | Mức Cũ
-------------------------------------|:--------:|:------------:|:------------:|:--------:|:--------------:|:---------:|:------:
M1: Định Danh & Mã Hóa (Auth)        |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    [x]    |  100%
M2: Quản Lý Phiên (Session Shield)   |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    [x]    |  100%
M3: Không Gian Thảo Luận (Spaces)    |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    [x]    |  100%
M4: Bài Viết & Soạn Thảo (Threads)   |   [x]    |     [x]      |     [x]      |   [x]    |      [/]       |    [/]    |   75%
M5: Cây Bình Luận Ảo Hóa (Ltree)     |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    [/]    |   85%
M6: Bầu Chọn Nguyên Tử (Lua Voting)  |   [x]    |     [x]      |     [x]      |   [x]    |      [/]       |    [/]    |   80%
M7: Tin Nhắn Tức Thời (Reddit Chats) |   [x]    |     [x]      |     [x]      |   [/]    |      [ ]       |    [ ]    |   40%
M8: Trung Tâm Quản Trị (Admin Hub)   |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    [/]    |   80%
M9: Frontend Web Client (Next.js 15) |   [/]    |     [x]      |     [x]      |   [/]    |      [x]       |    [/]    |   75%
M10: DevOps, CI/CD & Hạ Tầng Cloud   |   [x]    |     [x]      |     [x]      |   [x]    |      [x]       |    N/A    |   85%
---------------------------------------------------------------------------------------------------------------------------------
ĐÁNH GIÁ MÃ NGUỒN CŨ TRƯỚC KHI LƯU TRỮ:                                                                         ~82.0%
```

---

## 3. TIÊU CHÍ CHI TIẾT TỪNG CHIỀU KỸ THUẬT (CHUẨN v2.0)

- **C1 - Data Integrity:** Lược đồ CSDL PostgreSQL 16 chuẩn hóa 3NF, ràng buộc toàn vẹn khóa ngoại, chỉ mục hiệu năng cao (GiST cho `ltree`, GIN Trigram cho tìm kiếm, HOT updates `fillfactor = 70`).
- **C2 - API Contract:** Đặc tả OpenAPI 3.1.0 và Zod Schemas đặt tại `packages/contracts`, chuẩn hóa mã lỗi HTTP RFC 7807 Problem Details, phân trang bằng con trỏ Base64 tổng hợp.
- **C3 - Security:** Mã hóa mật khẩu Argon2id (64MB RAM), Token Rotation kèm 30s Grace Period, Token Reuse Detection, phân quyền kép RBAC + ABAC (Admin Guard 401/403).
- **C4 - Performance:** Bỏ phiếu nguyên tử $\mathcal{O}(1)$ qua Redis Lua, trải phẳng mảng phân cấp tuyến tính $\mathcal{O}(N)$, k6 Stress Testing đạt 5,000 RPS với $P_{95} < 50\text{ms}$.
- **C5 - Resiliency (Không Dùng In-Memory Mock):** Xử lý ngắt kết nối CSDL theo nguyên tắc Fail-Fast 503 RFC 7807 + Exponential Backoff Connection Pooler Retry; Client Interceptor Mutex Lock chống bão yêu cầu 401 (Thundering Herd).
- **C6 - UI/UX:** Ngôn ngữ thiết kế Minimalist Brutalism Dark Mode (`#222831`, `#393E46`, `#948979`, `#DFD0B8`), 3px 3px 0px hard shadows, 0px border radius, Optimistic UI updates.
