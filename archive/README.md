# Thư Mục Lưu Trữ Tài Liệu & Mã Nguồn Cũ (Archive Repository)

> **Cập nhật gần nhất:** 2026-11-12T15:48:00+07:00  
> **Mục đích:** Lưu trữ nguyên vẹn các phiên bản tài liệu đặc tả và bản chụp (snapshot) mã nguồn qua từng thế hệ (`v1.2.0`, `v2.1.0`) để phục vụ tra cứu, đối chiếu và khôi phục nhanh khi tái thiết nền tảng mới.

---

## 🗂️ Cấu Trúc Danh Mục Lưu Trữ

```text
archive/
├── README.md                                 # Bản hướng dẫn & mục lục lưu trữ
├── v2_codebase_20261112/                     # Toàn bộ mã nguồn v2.1.0 đã qua QA + Playwright E2E (apps, services, packages, tests)
├── legacy_codebase/                          # Toàn bộ mã nguồn cũ v1 nguyên bản
│   ├── apps/                                 # api, web cũ
│   ├── services/                             # auth, community cũ
│   ├── packages/                             # contracts, auth-client, tree-virtualizer, ui-tokens cũ
│   ├── deploy/                               # docker, migrations, redis, render, scripts cũ
│   └── package.json, pnpm-workspace.yaml...  # Cấu hình workspace cũ
├── codebase_snapshots/                       # Bản nén nguyên vẹn mã nguồn dự án
│   ├── acad_devops_codebase_v2.1.0_20261112.tar.gz         # Snapshot sạch v2.1.0 (Giai đoạn A–D hoàn tất)
│   ├── acad_devops_codebase_v2.1.0_20261112.tar.gz.sha256  # Checksum toàn vẹn SHA-256
│   └── acad_devops_codebase_v1.2.0_20261105.tar.gz         # Snapshot cũ v1.2.0
├── legacy_reference_docs/                    # Tài liệu tham chiếu & đặc tả v1
└── legacy_docs_v1/                           # Snapshot docs/ phiên bản v1
```

---

## 📦 Hướng Dẫn Giải Nén & Khôi Phục Mã Nguồn Snapshot

### Khôi phục nhanh từ bản v2.1.0 (hoặc dùng Git Tag `v2.1.0-e2e-verified`)
```bash
# Cách 1: Kiểm tra checksum & giải nén snapshot v2.1.0
(cd archive/codebase_snapshots && sha256sum -c acad_devops_codebase_v2.1.0_20261112.tar.gz.sha256)
mkdir -p /tmp/acad_v2_restore && cd /tmp/acad_v2_restore
tar -xzf /home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/archive/codebase_snapshots/acad_devops_codebase_v2.1.0_20261112.tar.gz
pnpm install

# Cách 2: Checkout trực tiếp qua Git Tag bất biến
git show v2.1.0-e2e-verified
```

### Khôi phục bản v1.2.0 lịch sử
```bash
mkdir -p /tmp/acad_restore && cd /tmp/acad_restore
tar -xzf /path/to/archive/codebase_snapshots/acad_devops_codebase_v1.2.0_20261105.tar.gz
pnpm install
```
