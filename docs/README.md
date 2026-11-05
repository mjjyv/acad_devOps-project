# Cổng Thông Tin Tài Liệu Kỹ Thuật Toàn Diện (Docs v2 Portal)

> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Kiến trúc:** High-throughput Discussion Engine (Mô hình Reddit Lai Bluesky)  
> **Phiên bản tài liệu:** `v2.0.0` (Chuẩn hóa toàn diện, Backend-First Roadmap & Tích hợp Reddit Spec)  
> **Môi trường mục tiêu:** Debian GNU/Linux 13 (trixie) x86_64, Node.js 22 LTS, Docker, Render Cloud & Supabase Managed DB  
> **Trạng thái phát triển:** **Khởi động tái thiết sạch từ đầu (Clean-Slate Zero-Base Rebuild v2.0 - Đã xong Phase B0: 10%, chuẩn bị bước vào Phase B1)**. Toàn bộ mã nguồn và tài liệu cũ đã được sao lưu toàn vẹn tại [`archive/legacy_codebase/`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/archive/legacy_codebase).

---

## 🌐 Trực Quan & Hệ Thống Đang Vận Hành Trực Tuyến

| Thành phần | Nền tảng | Địa chỉ URL | Trạng thái kỹ thuật |
| :--- | :---: | :--- | :---: |
| **Web Client (Frontend)** | Render Cloud | [https://acad-web-client.onrender.com](https://acad-web-client.onrender.com) | Hoạt động bình thường (200 OK) |
| **Core API Gateway** | Render Cloud | [https://acad-core-api.onrender.com](https://acad-core-api.onrender.com) | Hoạt động bình thường (200 OK) |
| **Healthcheck Probe** | Render Cloud | [https://acad-core-api.onrender.com/healthz](https://acad-core-api.onrender.com/healthz) | Hoạt động (Uptime, Auth DB & Community DB) |
| **Kho Lưu Trữ Git** | GitHub | [git@github.com:mjjyv/acad_devOps-project.git](https://github.com/mjjyv/acad_devOps-project) | Nhánh `main` (Auto Deploy Hook) |

---

## 🗺️ Bản Đồ Cấu Trúc Tài Liệu Chuẩn Hóa v2 (7 Phân Khu Chuyên Sâu)

```text
docs/
├── README.md                                  # Cổng mục lục điều hướng Master v2
├── guide.md                                   # Cẩm nang vận hành: Quy trình API-first, Self-healing & 8 DoD
├── docs.md                                    # Bản đặc tả kiến trúc toàn diện Master (1671 dòng)
├── reddit.md                                  # Bản đặc tả chức năng Reddit chuyên sâu
│
├── 00_overview/                               # TỔNG QUAN SẢN PHẨM & ĐỊNH VỊ
│   ├── 01_product_vision_and_prd.md           # Tầm nhìn sản phẩm, PRD, OKRs, Chân dung User Personas, KPIs
│   ├── 02_system_topology.md                  # Kiến trúc Monorepo, Ranh giới RSC/Client, Microservices
│   └── 03_reddit_functional_specification.md  # Nhận diện chức năng Reddit (reddit.md) & Bản đồ tích hợp
│
├── 01_architecture_and_data/                  # THIẾT KẾ KIẾN TRÚC & DỮ LIỆU
│   ├── 01_database_schema_postgres.md         # DDL PostgreSQL 16 (ltree, HOT 70, GiST, pgcrypto, Flairs, Chat)
│   ├── 02_redis_keyspace_and_caching.md       # Cấu trúc Keyspace Redis 7, Hash session, Lua set, Presence
│   ├── 03_data_flows_dag.md                   # Sơ đồ Sequence/DAG 3 luồng: Auth, Lua Voting, Chat Request
│   └── 04_frontend_state_architecture.md      # Quản lý State 3 tầng (Query, Zustand, nuqs) & Voting/Chat FSM
│
├── 02_core_engines/                           # PHÂN TÍCH CHUYÊN SÂU CÁC MODULE CỐT LÕI
│   ├── 01_auth_identity_subsystem.md          # Argon2id, Token Rotation, 30s Grace Period, Token Reuse Attack
│   ├── 02_spaces_and_content_engine.md        # Không gian (Spaces), Post Flairs, Zero-hop Media Presigned URL
│   ├── 03_nested_comments_ltree.md            # Cây bình luận ltree Base36, Capped Depth 8, Thuật toán O(N)
│   ├── 04_atomic_voting_and_reputation.md     # Redis Lua Script execute_vote.lua, Gravity Decay, HOT update
│   ├── 05_feed_aggregation_and_discovery.md   # Thuật toán Feed (Hot/New/Top/Best), Home/Popular, Tìm kiếm q
│   ├── 06_realtime_chat_engine.md             # Reddit Chat: 1-1 Direct, Group Chat, Chat Requests Queue
│   └── 07_moderation_and_admin_hub.md         # Admin Guard, Quản trị Users (threadsCount), Spaces, Threads
│
├── 03_standards_and_contracts/                # QUY CHUẨN KỸ THUẬT & KHẾ ƯỚC
│   ├── 01_api_contracts_openapi.md            # Quy chuẩn RESTful OpenAPI 3.1, Zod schema, RFC 7807, Cursor
│   ├── 02_code_quality_and_testing.md         # TypeScript 5.9 Strict, Biome configuration, Vitest Pyramid
│   ├── 03_git_workflow_and_ci_gates.md        # Trunk-based git, Semantic commits, 4 cổng GitHub Actions CI
│   └── 04_minimalist_brutalist_tokens.md      # Bảng 4 màu Brutalist (#222831, #393E46, #948979, #DFD0B8)
│
├── 04_deployment_and_devops/                  # VẬN HÀNH, HẠ TẦNG & TRIỂN KHAI
│   ├── 01_debian13_developer_setup.md         # Cấu hình môi trường fnm, Node 22 LTS, pnpm trên Debian 13
│   ├── 02_docker_containerization.md          # Dockerfile Multi-stage Alpine (< 100MB), docker-compose dev
│   ├── 03_cloud_infrastructure_render.md      # Render Blueprint render.yaml, Keep-alive worker chống ngủ đông
│   └── 04_supabase_database_migration.md      # Hướng dẫn kết nối Supabase, chạy migrate-supabase.sh
│
├── 05_guides_and_verification/                # CẨM NANG KIỂM THỬ DÀNH CHO KỸ SƯ
│   ├── 01_backend_testing_curl_guide.md       # Kịch bản cURL kiểm thử toàn bộ API Backend (Auth, Spaces, Vote)
│   ├── 02_admin_and_search_testing.md         # Kiểm thử giao diện Admin Console, Đổi Role, Khóa user, Ghim bài
│   └── 03_test_logs_registry.md               # Tổng hợp chỉ mục các biên bản kiểm thử (log_001 -> log_006)
│
└── 06_roadmap_and_kpis/                       # LỘ TRÌNH CHIẾN LƯỢC & BẢNG KIỂM TIẾN ĐỘ
    ├── 01_backend_first_roadmap.md            # Lộ trình chiến lược Backend-First (Phases B1->B5, F1->F4, D1->D2)
    ├── 02_modules_matrix_checklist.md         # Ma trận 10 phân hệ x 6 tiêu chuẩn kỹ thuật (~82.0%)
    └── 03_progress_checklist.md               # Bảng theo dõi tiến độ chi tiết toàn bộ các hạng mục SDLC
```

---

## ⚡ Điểm Sáng Kỹ Thuật Nổi Bật

1. **Chiến Lược Phát Triển Backend-First:** Ưu tiên hoàn thiện 100% CSDL, khế ước API OpenAPI 3.1 và logic an ninh (Argon2id, Token Rotation 30s Grace Period, Redis Lua Voting, Materialized Path `ltree`) trước khi tích hợp giao diện Frontend.
2. **Tích Hợp Chức Năng Reddit Chuyên Sâu:** Ánh xạ toàn diện các nhóm chức năng từ [`docs/reddit.md`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/reddit.md) gồm: Subreddit $\rightarrow$ Spaces (`/s/[slug]`), Nhãn bài viết (Post Flairs), Bình luận phân cấp vô hạn, Bầu chọn Up/Downvote, Thuật toán Feed Wilson Score ("Best") và Phân hệ Reddit Chat có hàng đợi duyệt tin nhắn lạ (Chat Requests).
3. **Ảo Hóa DOM Tuyến Tính $\mathcal{O}(N)$:** Gói thư viện `@acad/tree-virtualizer` chuyển đổi cây bình luận đệ quy sang mảng phẳng một chiều, hỗ trợ thu gọn/mở rộng nhánh tức thì mà không bị tràn bộ nhớ trình duyệt.
4. **Hạ Tầng Điện Toán Đám Mây Hiện Đại:** Docker Multi-stage Node 24 Alpine siêu gọn nhẹ, CI/CD tự động 4 Cổng, Render Cloud Web Services và Supabase Managed PostgreSQL.
