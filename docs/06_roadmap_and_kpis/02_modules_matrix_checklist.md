# Ma Trận Kiểm Soát 7 Phân Hệ & Khoảng Trống Thiết Kế (Modules Matrix v2.1)

> **Mã tài liệu:** `ROADMAP-MODULES-MATRIX`  
> **Dự án:** Acad DevOps Fullstack Monorepo (**SYNAPSE Engine**)  
> **Khung chuẩn đối chiếu:** [`SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/SYSTEM%20ANALYSIS%20%26%20DESIGN%20LIFECYCLE%20FRAMEWORK.md)  
> **Skill nghiệm thu bắt buộc:** [`.agents/skills/real-user-e2e-verification/SKILL.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/.agents/skills/real-user-e2e-verification/SKILL.md)

---

## 1. MA TRẬN HIỆN TRẠNG THỰC TẾ THEO 6 TIÊU CHUẨN

*(Chú thích: `[x]` Đạt qua kiểm thử thực tế | `[/]` Đã có code nhưng còn khoảng trống E2E riêng | `[ ]` Chưa hoàn thành)*

| Phân Hệ (Modules) | C1: DB & Consistency | C2: API Contract | C3: Security | C4: SAD Diagrams | C5: Real-User E2E | C6: UI/UX | Trạng Thái & Ghi Chú Xác Minh |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **M1: Identity, Auth & User Search** | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | GIN Trigram + `GET /auth/users/search?q=`; `authRateLimiter` giới hạn `POST /login`, `/register`, `/refresh`; `initSession` chỉ thu hồi token khi `401/403` |
| **M2: Spaces, Explore & Threads** | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | Đã bổ sung `spaces.topic`, lọc `?topic=&q=`, trang `/explore` thật + bộ chọn Topic trong `CreateSpaceModal` |
| **M3: Nested Comments (`ltree`)** | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | Trigger `000007` trừ `comment_count` khi soft-delete `is_deleted = TRUE`; UI đếm đúng bình luận đang hoạt động |
| **M4: Atomic Voting & Karma** | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | 100% vote thật trong `thread_votes`, [`resolveViewerThreadState`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community/src/services/thread-mapper.ts#L96-L152) overlay bộ đếm live Redis ngay khi reload |
| **M5: Feeds (`Home`/`Popular`) & Rail** | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | `Home` (`/?tab=following`), `Popular` (`/?sort=hot`), `Explore` (`/explore`), `Topics` & `Recent Posts` đều điều hướng thật qua URL/state |
| **M6: Realtime Chat & Requests** | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | Shared `NewChatComposer` (search username), `ChatRequestsPanel` (Incoming & Sent), chặn nhóm 1 người (`400`), xóa `messages` khi chuyển tab rỗng & SSE reconnect |
| **M7: Moderation & Admin Console** | `[x]` | `[x]` | `[x]` | `[x]` | `[/]` | `[x]` | Hoàn thiện tài liệu SAD & 21 unit + 19 API endpoint tests pass (chưa chạy kịch bản Playwright riêng cho `/admin`) |
| **M8: Homelab & Playwright E2E Gate** | `[x]` | `[x]` | `[x]` | `[x]` | `[x]` | N/A | Bộ test Playwright Chromium [`real-user-e2e.spec.ts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/tests/e2e/real-user-e2e.spec.ts) (`pnpm run test:e2e`) + kiểm toán Postgres/Redis 0% lệch |
