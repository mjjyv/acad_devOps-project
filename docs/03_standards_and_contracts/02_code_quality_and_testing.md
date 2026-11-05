# Quy Chuẩn Chất Lượng Mã Nguồn & Kiểm Thử (Code Quality & Testing)

> **Mã tài liệu:** `STD-CODE-QUALITY`  
> **Dự án:** Acad DevOps Fullstack Monorepo  
> **Công cụ:** TypeScript 5.9 Strict, Biome linter, Vitest

---

## 1. QUY CHUẨN TYPESCRIPT STRICT (STRICT MODE GOVERNANCE)

Toàn bộ 8 packages và apps trong monorepo đều tuân thủ cấu hình nghiêm ngặt nhất của trình biên dịch TypeScript:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false
  }
}
```
- **Không sử dụng `any` bừa bãi:** Trường hợp fallback phải khai báo kiểu dữ liệu tường minh `Promise.resolve<Record<string, number>>({})` thay vì đối tượng rỗng nhằm tránh lỗi `TS7053` trong pipeline CI.
- **Tập tin đuôi `.js` trong import:** Tuân thủ chuẩn ECMAScript Modules (ESM) của Node.js, bắt buộc thêm phần mở rộng `.js` trong các câu lệnh import tương đối (ví dụ: `import { AuthModule } from './factory.js';`).

---

## 2. BIOME LINTER & FORMATTER

Hệ thống sử dụng **Biome** ([`biome.json`](file:///home/debv/Documents/100_academy/acad_it_devOps/acad_devOps_project/biome.json)) thay thế hoàn toàn bộ đôi ESLint & Prettier:
- Tốc độ thực thi kiểm tra toàn bộ monorepo dưới **0.5 giây** (nhanh hơn ESLint 25 lần).
- Quy chuẩn định dạng: thụt lề 2 spaces, dấu nháy đơn `'`, chiều dài dòng tối đa 100 ký tự.

---

## 3. KIM TỰ THÁP KIỂM THỬ (VITEST TESTING PYRAMID)

Hệ thống xây dựng 59+ test suites tự động bao phủ toàn diện các phân hệ:
1. **Kiểm Thử Mật Mã & Session:** `crypto.test.ts`, `token-rotation.test.ts`, `client-interceptor.test.ts`.
2. **Kiểm Thử Cây Bình Luận & Ltree:** `ltree-path.test.ts`, `flatten-tree.test.ts`.
3. **Kiểm Thử Bầu Chọn & Điểm Số:** `lua-vote.test.ts`, `gravity-decay.test.ts`.
4. **Kiểm Thử Cổng API & RBAC:** `auth-endpoints.test.ts`, `community-endpoints.test.ts`, `admin-endpoints.test.ts`.

Lệnh chạy kiểm thử tự động toàn diện:
```bash
node ./packages/tree-virtualizer/node_modules/vitest/vitest.mjs run
```
