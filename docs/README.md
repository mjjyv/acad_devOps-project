# Hệ Thống Tài Liệu Kỹ Thuật Toàn Diện (System Documentation Portal)

> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Kiến trúc:** High-throughput Social/Discussion Engine với Cây bình luận đa tầng ảo hóa, Realtime Voting & Kiến trúc bảo mật Multi-tier.  
> **Môi trường mục tiêu:** Debian GNU/Linux 13 (trixie) x86_64, Node.js 20+, Docker Compose, Render Cloud, Supabase PostgreSQL.

---

## 🗺️ Bản Đồ Cấu Trúc Tài Liệu (Documentation Directory Map)

```text
docs/
├── README.md                          # Cổng mục lục điều hướng tài liệu toàn hệ thống
├── supabase.md                        # Thông tin cấu hình và bối cảnh CSDL Supabase
├── architechure/                      # Thiết kế kiến trúc tổng thể & hạ tầng
│   ├── system-overview.md             # Kiến trúc phân tầng Monorepo, Topology, RSC + PPR
│   ├── database-schema.md             # DDL PostgreSQL 16 (ltree, HOT 70), Keyspace Redis
│   ├── data-flows.md                  # Sơ đồ DAG 3 luồng: Token Rotation, Voting, Zero-hop Media
│   └── frontend-architecture.md       # Ranh giới RSC vs Client, Quản lý State 3 tầng, FSM
├── core-analysis/                     # Phân tích sâu các thuật toán & phân hệ cốt lõi
│   ├── auth-subsystem.md              # Argon2id, JWT Rotation, 30s Grace Period, Reuse Detection
│   ├── voting-reputation.md           # Lua Script O(1) Atomic, Gravity Decay, Batch Sync
│   └── tree-virtualization.md         # Base36 ltree generator, Thuật toán O(N) Virtualizer
├── standards/                         # Quy chuẩn kỹ thuật & thực hành tốt nhất
│   ├── git-workflow.md                # Trunk-based Development, Semantic Commits, CI Gates
│   ├── code-quality.md                # Strict TypeScript, Biome linter, Vitest pyramid
│   ├── ui-design-tokens.md            # Thiết kế Minimalist Editorial UI, Bento grid
│   └── api-contracts.md               # OpenAPI 3.1 RESTful conventions, Base64 Cursor
├── roadmap/                           # Lộ trình phát triển & Checklist tiến độ
│   ├── modules-matrix-checklist.md    # Bảng kiểm ma trận đa chiều 10 phân hệ × 6 tiêu chí
│   ├── multi-dimensional-plan.md      # Kế hoạch triển khai đa chiều theo 4 làn sóng (Waves)
│   ├── phases-overview.md             # Tổng quan 7 giai đoạn, KPIs và tiêu chí nghiệm thu
│   └── progress-checklist.md          # Bảng theo dõi tiến độ chi tiết từng hạng mục
├── plan/                              # Kế hoạch hành động & nâng cấp hạ tầng
│   ├── brutalist-ui-redesign-plan.md  # Kế hoạch cải tạo UI sang Minimalist Brutalism Dark Mode
│   ├── supabase-migration-plan.md     # Kế hoạch chuyển đổi DB Supabase, bỏ DB Render cũ
│   └── phase4-next-steps.md           # Lộ trình hoàn thiện các tính năng còn lại của Phase 4
├── guides/                            # Hướng dẫn thực hành dành cho người dùng & lập trình viên
│   ├── backend-testing-guide.md       # Hướng dẫn kiểm thử toàn diện backend bằng cURL trên Debian 13
│   └── developer-os-setup.md          # Cấu hình môi trường dev tối ưu cho Debian 13 (trixie)
└── logs/                              # Nhật ký kiểm thử & xác minh trước khi phát hành
    └── log_001_phase4_verification.md # Biên bản kiểm thử Vitest 59/59, Typecheck & Healthz
```

---

## 📚 Danh Mục Tài Liệu Chi Tiết

### 1. Kiến Trúc Hệ Thống (Architecture)
- [System Overview](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/architechure/system-overview.md): Tổng quan kiến trúc Monorepo, mô hình microservices, ranh giới giữa Apps, Services, và Packages.
- [Database Schema](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/architechure/database-schema.md): Chi tiết lược đồ cơ sở dữ liệu PostgreSQL 16 (ltree, GiST indexes, `fillfactor=70`) và Redis keyspace topology.
- [Data Flows](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/architechure/data-flows.md): Sơ đồ luồng xử lý dữ liệu chi tiết của 3 phân hệ trọng yếu: Auth Token Rotation, Realtime Voting Lua, Zero-hop Presigned URL Media.
- [Frontend Architecture](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/architechure/frontend-architecture.md): Phân ranh giới RSC/PPR, quản lý state 3 tầng (TanStack Query, Zustand, nuqs), và Statechart FSM của tính năng voting.

### 2. Phân Tích Kỹ Thuật Chuyên Sâu (Core Analysis)
- [Auth Subsystem](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/core-analysis/auth-subsystem.md): Cơ chế băm Argon2id, JWT Rotation, 30s Grace Period, Token Reuse Detection, Redis multi-device session store, Client Interceptor mutex lock.
- [Voting & Reputation](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/core-analysis/voting-reputation.md): Kịch bản Redis Lua nguyên tử $\mathcal{O}(1)$, thuật toán Hacker News Gravity Decay, hàng đợi Batch Flush Worker.
- [Tree Virtualization](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/core-analysis/tree-virtualization.md): Thuật toán sinh mã đường dẫn `ltree` Base36 4 ký tự, giới hạn độ sâu cấp 8, và thuật toán trải phẳng cây tuyến tính $\mathcal{O}(N)$ `@acad/tree-virtualizer`.

### 3. Quy Chuẩn Kỹ Thuật (Standards)
- [Git Workflow](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/standards/git-workflow.md): Mô hình Trunk-based development, Semantic Commits (`feat:`, `fix:`, `chore:`, `refactor:`), 4 cổng GitHub Actions CI gates.
- [Code Quality](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/standards/code-quality.md): Cấu hình TypeScript Strict mode, Biome linter & formatter, kim tự tháp kiểm thử Vitest.
- [UI Design Tokens](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/standards/ui-design-tokens.md): Ngôn ngữ thiết kế Protocol Minimalist Editorial UI, bento grid, typography, và tokens trong `@acad/ui-tokens`.
- [API Contracts](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/standards/api-contracts.md): Quy ước OpenAPI 3.1, cấu trúc RESTful chuẩn, định dạng lỗi RFC 7807, Cursor-based pagination Base64.

### 4. Lộ Trình & Tiến Độ (Roadmap & Plans)
- [Modules Matrix Checklist](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/roadmap/modules-matrix-checklist.md): Bảng kiểm ma trận đa chiều phân rã 10 phân hệ nghiệp vụ theo 6 tiêu chí kỹ thuật chuẩn doanh nghiệp.
- [Multi-Dimensional Plan](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/roadmap/multi-dimensional-plan.md): Kế hoạch triển khai đa chiều theo 4 làn sóng ưu tiên (Waves), phân bổ theo đồ thị phụ thuộc DAG.
- [Phases Overview](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/roadmap/phases-overview.md): Tổng quan 7 giai đoạn của dự án, KPIs, tiêu chí bàn giao và ma trận chấp thuận.
- [Progress Checklist](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/roadmap/progress-checklist.md): Bảng kiểm checklist chi tiết 7 giai đoạn, liên tục được cập nhật theo tiến độ hoàn thành thực tế (~70%).
- [Brutalist UI Redesign Plan](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/plan/brutalist-ui-redesign-plan.md): Kế hoạch chuyển đổi toàn diện giao diện sang Minimalist Brutalism Dark Mode với 4 tông màu chính (#222831 40%, #393E46 25%, #948979 15%, #DFD0B8 15%).
- [Supabase Migration Plan](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/plan/supabase-migration-plan.md): Kế hoạch loại bỏ hẳn database Render cũ (hết hạn/suspended) và chuyển sang Supabase Managed PostgreSQL.
- [Phase 4 Next Steps](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/plan/phase4-next-steps.md): Kế hoạch chi tiết hoàn thiện các phần còn lại của Giai đoạn 4 (CMS Presigned URL R2, UI Virtualized Comment Tree, SSE Realtime Hub).

### 5. Hướng Dẫn Thực Hành (Guides)
- [Backend Testing Guide](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/guides/backend-testing-guide.md): Hướng dẫn từng bước kiểm thử toàn bộ API Backend bằng `curl` và shell script trên **Debian GNU/Linux 13 (trixie)**.
- [Developer OS Setup](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/guides/developer-os-setup.md): Hướng dẫn cài đặt và tối ưu hóa môi trường lập trình Monorepo cho máy chạy Debian 13 x86_64.

### 6. Nhật Ký Kiểm Thử (Logs)
- [Log 001 - Phase 4 Verification](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/docs/logs/log_001_phase4_verification.md): Biên bản ghi nhận kết quả chạy thực tế của Vitest (59/59 tests pass), TypeScript check (0 errors) và tình trạng kiểm định hệ thống.

---

## 🚀 Live Demo & Deployment Links

- **Web Client (Frontend):** [https://acad-web-client.onrender.com](https://acad-web-client.onrender.com)
- **Core API (Backend):** [https://acad-core-api.onrender.com](https://acad-core-api.onrender.com)
- **Healthcheck Probe:** [https://acad-core-api.onrender.com/healthz](https://acad-core-api.onrender.com/healthz)
- **Git Repository:** [git@github.com:mjjyv/acad_devOps-project.git](https://github.com/mjjyv/acad_devOps-project)
