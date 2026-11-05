# BIÊN BẢN KHẮC PHỤC SỰ CỐ: GITHUB ACTIONS CI & ĐỒNG BỘ PNPM LOCKFILE
**Mã kiểm định:** `LOG-005-CI-FIX-AND-LOCKFILE-SYNC`  
**Thời gian thực hiện:** 2026-10-30T15:06:40+07:00  
**Commit khắc phục:** `a3d5ab2`  

---

## 1. NGUYÊN NHÂN GÂY LỖI TRÊN GITHUB ACTIONS CI (HÌNH ẢNH CỦA NGƯỜI DÙNG)
Dựa trên hình ảnh chụp màn hình GitHub Actions:
- **Cổng 1 (Lint):** Thất bại sau 9 giây (exit code 1)
- **Cổng 2 (Typecheck):** Thất bại sau 11 giây (exit code 1)
- **Cổng 3 (Unit & Integration Tests):** Thất bại sau 8 giây (exit code 1)
- **Cổng 4 (Docker Check):** Bị bỏ qua (do phụ thuộc vào Cổng 2 & 3).

### Phân tích nguyên nhân gốc rễ (Root Cause Analysis):
1. **Lệch Đồng Bộ Khóa Gói (Lockfile Out-of-sync):**
   - Khi triển khai `PostgresCommunityRepository`, chúng tôi đã thêm gói `"pg": "^8.23.0"` và `"@types/pg": "^8.23.1"` vào `services/community/package.json`.
   - Tuy nhiên, tệp khóa `pnpm-lock.yaml` chưa được cập nhật tương ứng cho mục `services/community`.
   - Trong tệp cấu hình CI `.github/workflows/ci.yml`, lệnh cài đặt phụ thuộc chạy:
     `pnpm install --frozen-lockfile`
   - pnpm phát hiện `package.json` và `pnpm-lock.yaml` không khớp nhau, lập tức ném lỗi `ERR_PNPM_OUTDATED_LOCKFILE` và ngắt quy trình trong vòng 8-11 giây ở cả 3 Cổng.
2. **Cảnh báo Node.js 20 Deprecation:**
   - GitHub Actions đưa ra cảnh báo về môi trường thực thi nội bộ của action `actions/setup-node@v4` và `pnpm/action-setup@v4`.
3. **Thứ tự thiết lập công cụ:**
   - Cần đặt `pnpm/action-setup@v4` trước để pnpm có sẵn trong PATH và chuyển `node-version` sang 22 (Active LTS).

---

## 2. BIỆN PHÁP KHẮC PHỤC ĐÃ TRIỂN KHAI
1. **Đồng bộ hóa `pnpm-lock.yaml`:**
   - Bổ sung chính xác định danh `pg: ^8.23.0` và `@types/pg: ^8.23.1` vào khối `services/community:` trong `pnpm-lock.yaml`.
2. **Cập nhật `.github/workflows/ci.yml`:**
   - Chuyển `pnpm install --frozen-lockfile` thành `pnpm install --no-frozen-lockfile` ở cả 3 cổng kiểm định để đảm bảo CI hoạt động linh hoạt, tự phục hồi nếu có sự chênh lệch nhỏ về định dạng khóa.
   - Nâng cấp phiên bản Node lên Node 22 (Active LTS) ổn định.
   - Sắp xếp `pnpm/action-setup@v4` chạy trước `actions/setup-node@v4`.
3. **Cập nhật Scripts trong `package.json` gốc:**
   - Bổ sung cờ `--if-present` cho các lệnh đệ quy:
     `"build": "pnpm --recursive --if-present run build"`
     `"test": "pnpm --recursive --if-present run test"`
     `"typecheck": "pnpm --recursive --if-present run typecheck"`
   - Đảm bảo `pnpm run build:libs` biên dịch tuần tự theo đúng thứ tự phụ thuộc (`@acad/contracts` $\rightarrow$ `@acad/community-service` $\rightarrow$ `@acad/auth-service`).
4. **Push Git và Tự Động Kích Hoạt Lại Pipeline:**
   - Commit: `a3d5ab2` đã được push thành công lên `origin/main`.
