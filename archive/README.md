# Thư Mục Lưu Trữ Tài Liệu & Mã Nguồn Cũ (Archive Repository)

> **Thời điểm đóng gói:** 2026-11-05T20:13:00+07:00  
> **Mục đích:** Lưu trữ toàn bộ các phiên bản tài liệu đặc tả ban đầu, các kế hoạch triển khai sơ khởi và bản chụp (snapshot) mã nguồn hệ thống để phục vụ công tác tra cứu lịch sử và làm tiền đề tái thiết lập hệ thống tài liệu kỹ thuật chuẩn mới.

---

## 🗂️ Cấu Trúc Danh Mục Lưu Trữ

```text
archive/
├── README.md                                 # Bản hướng dẫn & mục lục lưu trữ
├── legacy_codebase/                          # Toàn bộ mã nguồn cũ nguyên bản (apps, services, packages, deploy)
│   ├── apps/                                 # api, web cũ
│   ├── services/                             # auth, community cũ
│   ├── packages/                             # contracts, auth-client, tree-virtualizer, ui-tokens cũ
│   ├── deploy/                               # docker, migrations, redis, render, scripts cũ
│   └── package.json, pnpm-workspace.yaml...  # Cấu hình workspace cũ
├── codebase_snapshots/                       # Bản nén nguyên vẹn mã nguồn dự án
│   └── acad_devops_codebase_v1.2.0_20261105.tar.gz  # Snapshot toàn bộ apps, services, packages, deploy (clean)
├── legacy_reference_docs/                    # Toàn bộ tài liệu tham chiếu & đặc tả từ reference-docs
│   ├── stage-1/                              # PRD_STAGE_1_DISCOVERY.md, AUTH_SECURITY_SPECIFICATION.md
│   ├── stage-2/                              # UI_UX_DESIGN_SPECIFICATION.md
│   ├── stage-3/                              # DEVOPS_SETUP_GUIDE.md
│   ├── plan/                                 # 18 kế hoạch và biên bản walkthrough cũ (001 -> 008)
│   ├── acad_devOps-project-docs.md           # Tài liệu tổng hợp ban đầu
│   ├── acad_devOps-project-docs-checklist.md # Bảng kiểm checklist sơ khởi (2050 dòng)
│   ├── acad_devOps-project-docs-checklist-note.md
│   ├── SKILL_UI.md                           # Tiêu chuẩn thiết kế giao diện ban đầu
│   ├── os.md                                 # Thông số môi trường Debian 13
│   └── UPDATE_AUTH.md                        # Ghi chú nâng cấp Auth ban đầu
└── legacy_docs_v1/                           # Snapshot hệ thống tài liệu docs/ phiên bản v1
    ├── architechure/                         # system-overview, database-schema, data-flows, frontend-architecture
    ├── core-analysis/                        # auth-subsystem, voting-reputation, tree-virtualization
    ├── standards/                            # git-workflow, code-quality, ui-design-tokens, api-contracts
    ├── roadmap/                              # phases-overview, progress-checklist, modules-matrix, multi-dimensional
    ├── plan/                                 # supabase-migration-plan, brutalist-ui-redesign-plan, phase4-next-steps
    ├── guides/                               # backend-testing-guide, developer-os-setup, testing guides
    ├── logs/                                 # log_001 đến log_006
    └── supabase.md                           # Ghi chú kết nối Supabase cũ
```

---

## 📦 Hướng Dẫn Giải Nén & Khôi Phục Mã Nguồn Snapshot

Nếu cần khôi phục lại mã nguồn tại thời điểm đóng gói:
```bash
# Tạo thư mục đích khôi phục
mkdir -p /tmp/acad_restore
cd /tmp/acad_restore

# Giải nén
tar -xzf /path/to/archive/codebase_snapshots/acad_devops_codebase_v1.2.0_20261105.tar.gz

# Cài đặt lại thư viện phụ thuộc
pnpm install
```
