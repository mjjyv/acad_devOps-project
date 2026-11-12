# Cổng Thông Tin Tài Liệu Kỹ Thuật (SYNAPSE / Acad DevOps Docs v2.1)

> **Dự án:** Acad DevOps Fullstack Monorepo (**SYNAPSE Engine**)  
> **Phiên bản tài liệu:** `v2.1.0` — Chuẩn hóa đồng bộ với Lược đồ DB PostgreSQL `000001`–`000006`, Redis 7 Keyspace thực tế và Workspace Monorepo hiện tại  
> **Khung chuẩn phân tích & thiết kế mục tiêu:** [`SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md`](./SYSTEM%20ANALYSIS%20%26%20DESIGN%20LIFECYCLE%20FRAMEWORK.md)  
> **Hạ tầng vận hành thực tế:** Debian GNU/Linux 13 (x86_64), Node.js 22 LTS, `pnpm@10.15.0`, PostgreSQL 16 & Redis 7 (Podman Rootless), Systemd User Units (`acad-api.service`, `acad-web.service`), Cloudflare Tunnel

---

## 1. Kiến Trúc Tổng Quan & Thành Phần Workspace Thực Tế

| Nhóm Thành Phần | Thư Mục Thực Tế | Vai Trò & Công Nghệ |
| :--- | :--- | :--- |
| **Frontend Web Client** | [`apps/web`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/web) | Next.js `15.5.29` (App Router, Client Components + `/api/*` & `/auth/*` rewrites tới `127.0.0.1:10000`), React 19, Slate Indigo Palette (`#30364F / #ACBAC4 / #E1D9BC / #F0F0DB`) |
| **Core API Gateway** | [`apps/api`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/apps/api) | Express REST + SSE Gateway (`:10000`), Security Shield headers, CORS, Sliding-Window Rate Limiter, `authGuard` & `adminGuard`, `VoteFlushWorker` |
| **Auth Service** | [`services/auth`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/auth) | Định danh, Node `crypto.scrypt`, JWT HS256 (15m), Refresh Token Rotation + 30s Grace Period + Reuse Attack Detection, `RedisSessionStore` |
| **Community Service** | [`services/community`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/community) | Spaces (`pg_trgm`), Flairs, Threads (`TEXT`/`LINK`/`MEDIA`), Nested Comments (`ltree` Base36), `RedisVoteEngine` + Lua Script, Ranking SQL/Engine |
| **Realtime Chat Service** | [`services/chat`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/chat) | Kênh `DIRECT` & `GROUP`, Chat Threads (`parent_message_id`), Hàng đợi người lạ `chat_requests`, `SseManager` (`RFC 8895`), `PresenceManager` |
| **Moderation Service** | [`services/moderation`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/services/moderation) | Mod Queue `reports` (Anti-duplicate pending index), Quản trị Role/Status/Space/Thread, `audit_logs` bất biến (DB trigger chặn UPDATE/DELETE) |
| **Shared Libraries** | [`packages/contracts`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/contracts), [`packages/auth-client`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/packages/auth-client) | OpenAPI YAML + Zod Schemas + DTO Types; `AcadClient` với Mutex Lock chống 401 Thundering Herd |
| **Database & Migrations** | [`deploy/migrations`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/migrations), [`deploy/seeds`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/seeds), [`deploy/redis`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/deploy/redis) | 6 file SQL Migrations (`000001`–`000006`, 14 bảng, 5 Enum, 11 Triggers, 2 Hàm xếp hạng) & Redis Lua `execute_vote.lua` |
| **Anti-Slop E2E Skill** | [`.agents/skills/real-user-e2e-verification`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/.agents/skills/real-user-e2e-verification/SKILL.md) | Quy trình bắt buộc kiểm thử bằng tài khoản trắng mới, đối soát UI ↔ API ↔ DB, nghiêm cấm dữ liệu giả lập & nghiệm thu HTTP 200 rỗng |

---

## 2. Cấu Trúc Thư Mục Tài Liệu

```text
docs/
├── README.md                                  # Cổng điều hướng tài liệu đã đồng bộ DB & code thực tế
├── SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md  # Khung chuẩn 6 Giai đoạn (Mục tiêu tái cấu trúc toàn bộ mô tả & sơ đồ)
│
├── 00_overview/                               # TỔNG QUAN HỆ THỐNG
│   ├── 01_product_vision_and_prd.md
│   ├── 02_system_topology.md                  # Đã đồng bộ Monorepo & Homelab Stack thực tế
│   └── 03_reddit_functional_specification.md
│
├── 01_architecture_and_data/                  # KIẾN TRÚC DỮ LIỆU & LUỒNG XỬ LÝ
│   ├── 01_database_schema_postgres.md         # Đã đồng bộ 100% DDL 000001–000006 (14 bảng, 11 triggers, 2 hàm ranking)
│   ├── 02_redis_keyspace_and_caching.md       # Đã đồng bộ keyspace thực (session, target:{id}:*, presence, typing, ratelimit)
│   ├── 03_data_flows_dag.md
│   ├── 04_frontend_state_architecture.md
│   └── 05_frontend_design_system_and_ux_guidelines.md
│
├── 02_core_engines/                           # ĐẶC TẢ CHI TIẾT 7 PHÂN HỆ
│   ├── 01_auth_identity_subsystem.md          # Đã cập nhật Node crypto.scrypt + JWT HS256
│   ├── 02_spaces_and_content_engine.md
│   ├── 03_nested_comments_ltree.md
│   ├── 04_atomic_voting_and_reputation.md
│   ├── 05_feed_aggregation_and_discovery.md
│   ├── 06_realtime_chat_engine.md
│   └── 07_moderation_and_admin_hub.md         # Đã cập nhật 5-tab SPA Admin Console & apps/api guards
│
├── 03_standards_and_contracts/                # CHUẨN API, MÃ NGUỒN, GIAO DIỆN & CI
│   ├── 01_api_contracts_openapi.md
│   ├── 02_code_quality_and_testing.md
│   ├── 03_git_workflow_and_ci_gates.md
│   └── 04_minimalist_brutalist_tokens.md      # Đã cập nhật đúng Design Tokens Slate Indigo Matrix (#30364F)
│
├── 04_deployment_and_devops/                  # VẬN HÀNH & HẠ TẦNG HOMELAB / CLOUD
├── 05_guides_and_verification/                # CẨM NANG KIỂM THỬ & LOGS
└── 06_roadmap_and_kpis/                       # LỘ TRÌNH, MA TRẬN & TRẠNG THÁI THỰC TẾ
```

> **Lưu ý về các tài liệu lịch sử/đề xuất thô:** Các tệp ở gốc `docs/` như `docs.md`, `SQL.md`, `update-backend-01.md`, `reddit.md`, `guide.md`, `render-logs.md` là tư liệu tham chiếu/nhật ký từ các đợt trước; các đặc tả chính thức phải tuân theo thư mục `00_` đến `06_` và khung `SYSTEM ANALYSIS & DESIGN LIFECYCLE FRAMEWORK.md`.
