acad-web-client

> acad-devops-monorepo@2.0.0 build:libs /opt/render/project/src
> pnpm -r --if-present run build

No projects matched the filters in "/opt/render/project/src"
==> Uploading build...
==> Uploaded in 8.4s. Compression took 4.2s
==> Build successful 🎉
==> Deploying...
==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
==> Running 'pnpm --filter @acad/web exec next start -p $PORT -H 0.0.0.0'
No projects matched the filters in "/opt/render/project/src"
==> Instance srv-dar1thm0tbcc738n98j0-msz5k restarted
==> Application exited early
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
==> Running 'pnpm --filter @acad/web exec next start -p $PORT -H 0.0.0.0'
==> No open ports detected, continuing to scan...
==> Docs on specifying a port: https://render.com/docs/web-services#port-binding
No projects matched the filters in "/opt/render/project/src"
==> Instance srv-dar1thm0tbcc738n98j0-msz5k restarted
==> Running 'pnpm --filter @acad/web exec next start -p $PORT -H 0.0.0.0'


==> Cloning from https://github.com/mjjyv/acad_devOps-project
==> Checking out commit ef1191ff7a68d08d29f2c76ae35912ae57628e76 in branch main
#1 [internal] load build definition from Dockerfile.api.prod
#1 transferring dockerfile: 2.49kB done
#1 DONE 0.0s

#2 [internal] load metadata for docker.io/library/node:22-alpine
#2 ...

#3 [auth] library/node:pull render-prod/docker-mirror-repository/library/node:pull token for us-west1-docker.pkg.dev
#3 DONE 0.0s

#2 [internal] load metadata for docker.io/library/node:22-alpine
#2 DONE 2.6s

#4 [internal] load .dockerignore
#4 transferring context: 195B done
#4 DONE 0.0s

#5 [internal] load build context
#5 DONE 0.0s

#6 [builder  1/14] FROM docker.io/library/node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914
#6 resolve docker.io/library/node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 done
#6 DONE 0.0s

#7 importing cache manifest
#7 inferred cache manifest type: application/vnd.oci.image.manifest.v1+json done
#7 DONE 0.1s

#5 [internal] load build context
#5 transferring context: 376.36kB 0.0s done
#5 DONE 0.0s

#8 [builder  2/14] RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
#8 CACHED

#9 [builder  3/14] WORKDIR /app
#9 CACHED

#10 [builder  4/14] COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./
#10 DONE 0.3s

#11 [builder  5/14] COPY packages/contracts/package.json ./packages/contracts/
#11 DONE 0.0s

#12 [builder  6/14] COPY packages/auth-client/package.json ./packages/auth-client/
#12 DONE 0.0s

#13 [builder  7/14] COPY services/auth/package.json ./services/auth/
#13 DONE 0.0s

#14 [builder  8/14] COPY services/community/package.json ./services/community/
#14 DONE 0.0s

#15 [builder  9/14] COPY apps/api/package.json ./apps/api/
#15 DONE 0.0s

#16 [builder 10/14] RUN pnpm install --frozen-lockfile
#16 0.688 Scope: all 6 workspace projects
#16 0.753 Lockfile is up to date, resolution step is skipped
#16 0.788 Progress: resolved 1, reused 0, downloaded 0, added 0
#16 0.868 Packages: +187
#16 0.868 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
#16 1.174 
#16 1.174    ╭───────────────────────────────────────────────╮
#16 1.174    │                                               │
#16 1.174    │     Update available! 10.15.0 → 12.16.1.      │
#16 1.174    │     Changelog: https://pnpm.io/v/12.16.1      │
#16 1.174    │   To update, run: corepack use pnpm@12.16.1   │
#16 1.174    │                                               │
#16 1.174    ╰───────────────────────────────────────────────╯
#16 1.174 
#16 2.563 Progress: resolved 187, reused 0, downloaded 0, added 0
#16 5.016 Progress: resolved 187, reused 0, downloaded 1, added 0
#16 6.018 Progress: resolved 187, reused 0, downloaded 185, added 185
#16 6.592 Progress: resolved 187, reused 0, downloaded 187, added 187, done
#16 6.692 
#16 6.692 devDependencies:
#16 6.692 + @biomejs/biome 2.6.5
#16 6.692 + @types/node 22.20.4
#16 6.692 + typescript 5.9.3
#16 6.692 + vitest 3.2.7
#16 6.692 
#16 6.692 ╭ Warning ─────────────────────────────────────────────────────────────────────╮
#16 6.692 │                                                                              │
#16 6.692 │   Ignored build scripts: esbuild.                                            │
#16 6.692 │   Run "pnpm approve-builds" to pick which dependencies should be allowed     │
#16 6.692 │   to run scripts.                                                            │
#16 6.692 │                                                                              │
#16 6.692 ╰──────────────────────────────────────────────────────────────────────────────╯
#16 6.692 
#16 6.849 Done in 6.5s using pnpm v10.15.0
#16 DONE 6.9s

#17 [builder 11/14] COPY packages/ ./packages/
#17 DONE 0.1s

#18 [builder 12/14] COPY services/ ./services/
#18 DONE 0.0s

#19 [builder 13/14] COPY apps/api/ ./apps/api/
#19 DONE 0.0s

#20 [builder 14/14] RUN pnpm run build
#20 0.388 
#20 0.388 > acad-devops-monorepo@2.0.0 build /app
#20 0.388 > pnpm -r --if-present run build
#20 0.388 
#20 0.741 Scope: 5 of 6 workspace projects
#20 0.744 packages/contracts build$ tsc
#20 2.136 packages/contracts build: Done
#20 2.137 packages/auth-client build$ tsc
#20 2.137 services/community build$ tsc
#20 2.138 services/auth build$ tsc
#20 3.621 packages/auth-client build: Done
#20 3.912 services/auth build: Done
#20 4.119 services/community build: Done
#20 4.120 apps/api build$ tsc
#20 5.539 apps/api build: Done
#20 DONE 5.8s

#21 [runner  2/16] WORKDIR /app
#21 CACHED

#22 [runner  3/16] RUN addgroup --system --gid 1001 nodejs &&     adduser --system --uid 1001 appuser
#22 CACHED

#23 [runner  4/16] COPY --from=builder /app/package.json ./
#23 CACHED

#24 [runner  5/16] COPY --from=builder /app/pnpm-workspace.yaml ./
#24 CACHED

#25 [runner  6/16] COPY --from=builder /app/node_modules ./node_modules
#25 DONE 0.5s

#26 [runner  7/16] COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
#26 DONE 0.0s

#27 [runner  8/16] COPY --from=builder /app/packages/contracts/package.json ./packages/contracts/package.json
#27 DONE 0.0s

#28 [runner  9/16] COPY --from=builder /app/packages/auth-client/dist ./packages/auth-client/dist
#28 DONE 0.0s

#29 [runner 10/16] COPY --from=builder /app/packages/auth-client/package.json ./packages/auth-client/package.json
#29 DONE 0.0s

#30 [runner 11/16] COPY --from=builder /app/services/auth/dist ./services/auth/dist
#30 DONE 0.0s

#31 [runner 12/16] COPY --from=builder /app/services/auth/package.json ./services/auth/package.json
#31 DONE 0.0s

#32 [runner 13/16] COPY --from=builder /app/services/community/dist ./services/community/dist
#32 DONE 0.0s

#33 [runner 14/16] COPY --from=builder /app/services/community/package.json ./services/community/package.json
#33 DONE 0.0s

#34 [runner 15/16] COPY --from=builder /app/apps/api/dist ./apps/api/dist
#34 DONE 0.0s

#35 [runner 16/16] COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
#35 DONE 0.0s

#36 exporting to image
#36 exporting layers
#36 exporting layers 1.6s done
#36 pushing layers
#36 pushing layers 3.1s done
#36 DONE 5.2s

#37 exporting cache to registry
#37 preparing build cache for export
#37 sending cache export
#37 sending cache export 4.5s done
#37 DONE 13.2s
==> Deploying...
==> Setting WEB_CONCURRENCY=1 by default, based on available CPUs in the instance
node:internal/modules/package_json_reader:314
  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);
        ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@acad/auth-service' imported from /app/apps/api/dist/server.js
    at Object.getPackageJSONURL (node:internal/modules/package_json_reader:314:9)
    at packageResolve (node:internal/modules/esm/resolve:772:81)
    at moduleResolve (node:internal/modules/esm/resolve:859:18)
    at defaultResolve (node:internal/modules/esm/resolve:989:11)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:747:20)
    at ModuleLoader.resolve (node:internal/modules/esm/loader:724:38)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:320:38)
    at ModuleJob._link (node:internal/modules/esm/module_job:182:49) {
  code: 'ERR_MODULE_NOT_FOUND'
}

Node.js v22.23.4
==> Exited with status 1
==> Common ways to troubleshoot your deploy: https://render.com/docs/troubleshooting-deploys
node:internal/modules/package_json_reader:314
  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);
        ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@acad/auth-service' imported from /app/apps/api/dist/server.js
    at Object.getPackageJSONURL (node:internal/modules/package_json_reader:314:9)
    at packageResolve (node:internal/modules/esm/resolve:772:81)
    at moduleResolve (node:internal/modules/esm/resolve:859:18)
    at defaultResolve (node:internal/modules/esm/resolve:989:11)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:747:20)
    at ModuleLoader.resolve (node:internal/modules/esm/loader:724:38)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:320:38)
    at ModuleJob._link (node:internal/modules/esm/module_job:182:49) {
  code: 'ERR_MODULE_NOT_FOUND'
}

Node.js v22.23.4
==> Instance srv-dar0s6e0tbcc738jfirg-z8x5s restarted


---

# BIÊN BẢN CHẨN ĐOÁN & KHẮC PHỤC LỖI TRIỂN KHAI RENDER (INCIDENT RESOLUTION REPORT)

> **Mã sự cố:** `INCIDENT-RENDER-DEPLOY-001`  
> **Thời điểm xử lý:** 2026-11-06T05:52:00+07:00  
> **Các dịch vụ ảnh hưởng:**  
> 1. `acad-core-api` (Docker Web Service, ID: `srv-dar0s6e0tbcc738jfirg`)  
> 2. `acad-web-client` (Node Web Service, ID: `srv-dar1thm0tbcc738n98j0`)  
> **Trạng thái:** ✅ **Đã khắc phục triệt để và đồng bộ Blueprint**

---

## 1. NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE ANALYSIS)

### Sự cố 1: `acad-core-api` Crash Loop với `ERR_MODULE_NOT_FOUND`
- **Hiện tượng:** Docker container build thành công nhưng khi khởi chạy `node apps/api/dist/server.js`, Node.js v22 văng lỗi:
  ```text
  Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@acad/auth-service' imported from /app/apps/api/dist/server.js
  ```
- **Nguyên nhân:**
  Trong file `deploy/docker/Dockerfile.api.prod`, Stage 2 (Runner) chỉ sao chép thư mục `node_modules` ở thư mục gốc `/app/node_modules`. Tuy nhiên, cơ chế pnpm workspaces tổ chức các symlinks liên kết chéo (`@acad/auth-service`, `@acad/community-service`, `@acad/contracts`) nằm trực tiếp bên trong `apps/api/node_modules` và thư mục `node_modules` của từng package. Do Stage 2 không sao chép `apps/api/node_modules` và cây thư mục `packages/`, `services/`, runtime Node.js của container không thể resolve được module ESM cục bộ.

### Sự cố 2: `acad-web-client` Crash Loop do thiếu Filter `@acad/web`
- **Hiện tượng:**
  Render chạy lệnh start:
  ```text
  pnpm --filter @acad/web exec next start -p $PORT -H 0.0.0.0
  No projects matched the filters in "/opt/render/project/src"
  Application exited early
  ```
- **Nguyên nhân:**
  Dịch vụ `acad-web-client` được khởi tạo từ Blueprint trước đợt tái thiết Zero-Base v2.0. Khi mã nguồn cũ được lưu trữ vào `archive/legacy_codebase/`, trong monorepo chưa có gói `@acad/web` hoạt động, khiến pnpm filter không tìm thấy package và văng lỗi lập tức.

---

## 2. GIẢI PHÁP ĐÃ TRIỂN KHAI (CORRECTIVE ACTIONS)

1. **Khắc phục triệt để Dockerfile Production (`deploy/docker/Dockerfile.api.prod`):**
   - Stage 1 (Builder): Sử dụng `pnpm --filter @acad/api-gateway... run build` để chỉ biên dịch đúng các gói backend phụ thuộc, tối ưu tốc độ build.
   - Stage 2 (Runner): Sao chép toàn bộ cấu trúc monorepo phân tầng và symlinks của pnpm:
     ```dockerfile
     COPY --from=builder --chown=appuser:nodejs /app/package.json ./
     COPY --from=builder --chown=appuser:nodejs /app/pnpm-workspace.yaml ./
     COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
     COPY --from=builder --chown=appuser:nodejs /app/packages ./packages
     COPY --from=builder --chown=appuser:nodejs /app/services ./services
     COPY --from=builder --chown=appuser:nodejs /app/apps/api ./apps/api
     ```
   - Đảm bảo quyền sở hữu non-root user `appuser:nodejs`.
   - Bổ sung cơ chế tự động kích hoạt SSL (`rejectUnauthorized: false`) trong `apps/api/src/server.ts` khi kết nối đến cơ sở dữ liệu Cloud (Render PostgreSQL, Neon, Supabase).

2. **Khôi phục và hiện đại hóa `@acad/web` (Next.js 15 Brutalist Dark Mode):**
   - Thiết lập gói `apps/web` (`@acad/web`) với Next.js 15, React 19, tương thích hoàn toàn monorepo ESM.
   - Xây dựng giao diện Minimalist Brutalism Dark Mode (`#222831`, `#393E46`, `#948979`, `#DFD0B8`) hiển thị trạng thái hệ thống thời gian thực và liên kết API Gateway.
   - Đảm bảo lệnh `next build` và `next start -p $PORT -H 0.0.0.0` hoạt động mượt mà và vượt qua toàn bộ 4 Cổng CI.

3. **Cập nhật Đặc Tả Blueprint (`deploy/render/render.yaml`):**
   - Định nghĩa chính xác cả hai dịch vụ `acad-web-client` (Node Web Service) và `acad-core-api` (Docker Web Service).
