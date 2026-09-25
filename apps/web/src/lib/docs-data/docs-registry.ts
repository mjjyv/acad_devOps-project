import { DocItem } from './types.js';

export const DOCS_REGISTRY: DocItem[] = [
  // 1. DISCOVERY & PRD
  {
    id: 'prd-discovery',
    slug: 'prd-discovery',
    category: 'discovery',
    categoryTitle: '1. Khảo Sát & Định Vị (PRD)',
    title: 'Hồ Sơ Yêu Cầu Sản Phẩm (PRD) & Chân Dung Người Dùng',
    description: 'Tầm nhìn sản phẩm, mục tiêu chiến lược, OKRs và 5 luồng tương tác người dùng cốt lõi.',
    stageBadge: 'Giai đoạn 1 • Completed',
    updatedAt: '2026-09-25',
    readingTimeMinutes: 8,
    keyTakeaways: [
      'Xây dựng nền tảng mạng xã hội và diễn đàn học tập IT/DevOps đẳng cấp doanh nghiệp.',
      '3 Chân dung người dùng mục tiêu: Junior Engineer, Lead DevOps Engineer, System Architect.',
      'Chỉ số hiệu năng cam kết (SLAs): Thời gian phản hồi p95 < 200ms, hỗ trợ cây bình luận phân cấp vô hạn.',
      '5 Luồng tương tác cốt lõi: Khám phá nội dung, thảo luận phân nhánh, bình chọn thời gian thực, quản trị không gian và định danh đa thiết bị.',
    ],
    headings: [
      { id: 'tong-quan', title: '1. Tổng quan Dự án & Tầm nhìn', level: 2 },
      { id: 'okrs', title: '2. Mục tiêu Kinh doanh & OKRs', level: 2 },
      { id: 'personas', title: '3. Chân dung Người dùng (Personas)', level: 2 },
      { id: 'core-flows', title: '4. 5 Luồng Tương tác Cốt lõi', level: 2 },
      { id: 'kpi-sla', title: '5. Tiêu chuẩn Kỹ thuật & Chỉ số Đo lường', level: 2 },
    ],
    content: `
## 1. Tổng quan Dự án & Tầm nhìn
Dự án **Acad Community Platform** là nền tảng mạng xã hội và diễn đàn thảo luận kỹ nghệ chuyên sâu dành cho cộng đồng kỹ sư phần mềm, chuyên gia DevOps và kiến trúc sư hệ thống. Nền tảng giải quyết triệt để các hạn chế của các diễn đàn truyền thống: tải chậm khi cây bình luận sâu, thiếu phân quyền granular, thiếu tính năng thời gian thực và kiến trúc triển khai phức tạp.

## 2. Mục tiêu Kinh doanh & OKRs
- **Mục tiêu 1 (Trải nghiệm người dùng mượt mà)**: Thời gian tải trang ban đầu (FCP) dưới 0.8 giây, p95 API response time dưới 200ms.
- **Mục tiêu 2 (An ninh phiên cấp doanh nghiệp)**: Loại bỏ hoàn toàn rủi ro rò rỉ token qua CSRF nhờ phân tách Cookie kép Lax/Strict và xoay vòng Refresh Token kèm cửa sổ Grace Period 30 giây.
- **Mục tiêu 3 (Mở rộng quy mô & DevOps)**: Đóng gói container Docker siêu nhẹ (<100MB cho Backend, <150MB cho Frontend Next.js standalone), triển khai tự động hóa qua GitHub Actions và Render Cloud.

## 3. Chân dung Người dùng (Personas)
1. **Junior Software Engineer**: Cần tìm kiếm giải pháp nhanh, đọc các bài phân tích kiến trúc, đặt câu hỏi phân nhánh rõ ràng và nhận thông báo khi có phản hồi.
2. **Senior DevOps Engineer**: Quan tâm đến các bài viết tối ưu CI/CD, hạ tầng Kubernetes, Terraform, và chia sẻ các cấu hình thực chiến.
3. **Space Moderator / Administrator**: Quản trị không gian (Space), kiểm duyệt nội dung tự động và phân quyền cộng tác viên dựa trên luật ABAC (Karma score, tuổi tài khoản).

## 4. 5 Luồng Tương tác Cốt lõi
- **Luồng 1 (Khám phá & Xếp hạng)**: Xem dòng thời gian bài viết được xếp hạng thông minh theo thuật toán Gravity Decay.
- **Luồng 2 (Thảo luận Đa tầng ltree)**: Bình luận phân cấp vô hạn không giới hạn độ sâu, hiển thị mượt mà nhờ thuật toán trải phẳng cây $\\mathcal{O}(N)$.
- **Luồng 3 (Bình chọn Thời gian thực)**: Upvote/Downvote tức thời với kịch bản Redis Lua Script nguyên tử $\\mathcal{O}(1)$.
- **Luồng 4 (Định danh Bảo mật Kép)**: Đăng nhập cấp cặp HttpOnly Cookie, tự động làm mới token ngầm với Mutex Lock.
- **Luồng 5 (Biên tập Đa phương tiện Zero-Hop)**: Đăng bài viết kèm hình ảnh nén WebP và tạo Blurhash trực tiếp trên trình duyệt, tải thẳng lên Cloudflare R2 qua presigned URL.
`,
  },

  // 2. SECURITY & AUTH
  {
    id: 'auth-security',
    slug: 'auth-security',
    category: 'security',
    categoryTitle: '2. An Ninh & Định Danh',
    title: 'Đặc Tả An Ninh, Ma Trận RBAC/ABAC & Token Rotation Protocol',
    description: 'Mô hình đe dọa, giao thức xoay vòng Refresh Token kép, Grace Period 30s và cơ chế tự động hủy session khi bị tấn công.',
    stageBadge: 'Giai đoạn 1 & 4 • Production Ready',
    updatedAt: '2026-09-25',
    readingTimeMinutes: 10,
    keyTakeaways: [
      'Áp dụng chiến lược Double Cookie: Access Token (15m, Lax, Path=/) và Refresh Token (7d, Strict, Path=/api/v1/auth/refresh).',
      'Cửa sổ an toàn Grace Period 30s: Chống race condition khi nhiều tab trình duyệt cùng làm mới token.',
      'Phát hiện Token Reuse Attack: Tự động vô hiệu hóa toàn bộ session family (DEL session:{user_id}:*) và trả về HTTP 403.',
      'Ma trận kết hợp RBAC (5 vai trò tĩnh) và ABAC (Karma, Account Age, Space Permission) kiểm soát truy cập linh hoạt.',
    ],
    headings: [
      { id: 'token-rotation-dag', title: '1. Giao thức Xoay vòng Token Kép & DAG Flow', level: 2 },
      { id: 'grace-period-logic', title: '2. Cửa Sổ An Toàn Grace Period 30 Giây', level: 2 },
      { id: 'token-reuse-defense', title: '3. Cơ chế Phát hiện Tấn công Tái sử dụng Token', level: 2 },
      { id: 'cookie-specs', title: '4. Đặc tả Thuộc tính Cookie An toàn', level: 2 },
      { id: 'rbac-abac-matrix', title: '5. Ma trận Phân quyền Kép RBAC & ABAC', level: 2 },
    ],
    content: `
## 1. Giao thức Xoay vòng Token Kép & DAG Flow
Luồng xác thực của hệ thống tuân thủ chặt chẽ nguyên tắc **Zero-Trust**:
1. Người dùng gửi thông tin đăng nhập tới \`POST /api/v1/auth/login\`.
2. Hệ thống kiểm tra mật khẩu bằng thuật toán băm bảo mật cao **Argon2id** (có cơ chế dự phòng scrypt).
3. Hệ thống sinh cặp tokens mới:
   - **Access Token (JWT HS256)**: Có thời hạn sống ngắn (15 phút = 900 giây).
   - **Refresh Token (64-byte CSPRNG base64url)**: Có thời hạn sống dài (7 ngày = 604,800 giây).
4. Lưu giá trị băm SHA-256 của Refresh Token vào Redis Hash: \`session:{user_id}:{device_fingerprint}\`.
5. Đặt 2 header \`Set-Cookie\` tương ứng và trả về hồ sơ người dùng.

## 2. Cửa Sổ An Toàn Grace Period 30 Giây
Trong thực tế, khi người dùng mở nhiều tab trình duyệt cùng lúc hoặc mạng bị trễ gói tin (network latency), các tab sẽ đồng thời gửi yêu cầu \`POST /api/v1/auth/refresh\` với cùng một refresh token cũ.
- **Nếu không có Grace Period**: Yêu cầu đầu tiên thành công, các yêu cầu tiếp theo bị coi là tái sử dụng token và người dùng bị văng ra khỏi hệ thống vô cớ!
- **Giải pháp của Acad Platform**: Khi token được xoay vòng, token cũ được lưu vào trường \`previous_token_hash\` với thời hạn 30 giây (\`grace_period_expires_at\`). Bất kỳ yêu cầu nào đến trong vòng 30s mang token cũ này sẽ được **cấp lại Access Token mới** mà không xoay vòng thêm Refresh Token.

## 3. Cơ chế Phát hiện Tấn công Tái sử dụng Token (Token Reuse Detection)
Nếu hệ thống nhận được một Refresh Token không khớp với \`current_token_hash\`, và cũng không khớp với \`previous_token_hash\` trong Grace Period 30s:
- Đây là bằng chứng rõ ràng Refresh Token cũ đã bị kẻ xấu đánh cắp và cố tình phát lại (Replay Attack).
- **Hành động phản ứng tức thời**:
  1. Hủy bỏ toàn bộ cụm phiên của tài khoản: \`DEL session:{user_id}:*\`.
  2. Đánh dấu \`is_revoked = TRUE\` trong CSDL PostgreSQL.
  3. Ghi nhật ký cảnh báo an ninh vào bảng \`auth_audit_logs\` với sự kiện \`TOKEN_REUSE_DETECTED\`.
  4. Trả về mã lỗi HTTP **403 Forbidden**.

## 4. Đặc tả Thuộc tính Cookie An toàn
| Cookie Name | TTL | HttpOnly | Secure | SameSite | Path | Mục đích |
|---|---|---|---|---|---|---|
| \`access_token\` | 900s (15m) | True | True (prod) | Lax | \`/\` | Gọi các API endpoint |
| \`refresh_token\` | 604800s (7d) | True | True (prod) | Strict | \`/api/v1/auth/refresh\` | Chỉ dùng làm mới phiên |

## 5. Ma trận Phân quyền Kép RBAC & ABAC
- **5 Vai trò RBAC**:
  - \`GUEST\`: Đọc bài viết công khai, không được bình chọn, không được đăng bài.
  - \`USER\`: Đăng bài, bình luận, bình chọn nếu thỏa mãn điều kiện ABAC.
  - \`SPACE_MOD\`: Điều hành không gian được chỉ định, ghim bài, ẩn bài vi phạm.
  - \`GLOBAL_MOD\`: Điều hành toàn sàn, xử lý báo cáo vi phạm, đình chỉ tài khoản tạm thời.
  - \`ADMIN\`: Toàn quyền hệ thống, phân quyền vai trò, xem audit logs.
- **Luật ABAC Bổ sung**:
  - Tạo không gian mới: Yêu cầu \`karmaScore >= 100\` và \`accountAgeDays >= 30\`.
  - Bình chọn: Yêu cầu tài khoản \`ACTIVE\` và không tự vote bài của chính mình.
`,
  },

  // 3. ARCHITECTURE & DESIGN
  {
    id: 'architecture-design',
    slug: 'architecture-design',
    category: 'architecture',
    categoryTitle: '3. Thiết Kế & Kiến Trúc',
    title: 'Kiến Trúc CSDL PostgreSQL 16 ltree, Design Tokens & Động Cơ Redis Lua',
    description: 'Cấu trúc đường dẫn phân cấp ltree Base36, bố cục 3 cột thích ứng, thuật toán Gravity Decay và trải phẳng cây bình luận O(N).',
    stageBadge: 'Giai đoạn 2 • Completed',
    updatedAt: '2026-09-25',
    readingTimeMinutes: 9,
    keyTakeaways: [
      'Sử dụng extension PostgreSQL ltree kết hợp mã hóa Base36 cho cây thảo luận không giới hạn độ sâu.',
      'Bộ đếm nguyên tử thread_counters tách rời bảng threads để chống khóa dòng (Row-level Lock Contention).',
      'Động cơ bình chọn bằng Redis Lua Script O(1) đảm bảo tính toàn vẹn dữ liệu khi có hàng ngàn lượt vote đồng thời.',
      'Thuật toán flattenCommentTree O(N) chuyển đổi cây đệ quy thành mảng phẳng cho danh sách ảo hóa siêu tốc.',
    ],
    headings: [
      { id: 'database-schema', title: '1. Lược Đồ CSDL PostgreSQL 16 Mở Rộng', level: 2 },
      { id: 'ltree-base36', title: '2. Cấu Trúc ltree Base36 & Tối Ưu Truy Vấn', level: 2 },
      { id: 'redis-lua-voting', title: '3. Động Cơ Bình Chọn Nguyên Tử Redis Lua O(1)', level: 2 },
      { id: 'flatten-tree-algo', title: '4. Thuật Toán Trải Phẳng Cây Bình Luận O(N)', level: 2 },
      { id: 'design-tokens-layout', title: '5. Hệ Thống Design Tokens & Bố Cục 3 Cột', level: 2 },
    ],
    content: `
## 1. Lược Đồ CSDL PostgreSQL 16 Mở Rộng
Cơ sở dữ liệu được thiết kế tối ưu hóa cho đọc (Read-heavy) và ghi đồng thời cao (High-concurrency):
- **Bảng \`spaces\`**: Lưu trữ các không gian chủ đề với tiền tố slug độc nhất.
- **Bảng \`threads\`**: Lưu trữ bài viết chính.
- **Bảng \`thread_counters\`**: Tách rời các chỉ số \`upvotes\`, \`downvotes\`, \`comment_count\` ra khỏi bảng \`threads\` chính nhằm loại bỏ hiện tượng khóa dòng khi nhiều người dùng cùng tương tác.
- **Bảng \`comments\`**: Sử dụng cột kiểu dữ liệu \`ltree\` có chỉ mục GiST để biểu diễn mối quan hệ cha-con.

## 2. Cấu Trúc ltree Base36 & Tối Ưu Truy Vấn
- Mỗi đoạn trong đường dẫn ltree được mã hóa bằng số nguyên Base36 có độ dài cố định 8 ký tự:
  \`\`\`text
  Gốc:        00000001
  Cấp 1:      00000001.00000002
  Cấp 2:      00000001.00000002.00000003
  \`\`\`
- **Ưu điểm vượt trội**:
  - Truy vấn lấy toàn bộ nhánh con: \`SELECT * FROM comments WHERE path <@ '00000001';\`
  - Tự động sắp xếp thứ tự duyệt cây (Depth-First Search) khi sử dụng \`ORDER BY path ASC\`.

## 3. Động Cơ Bình Chọn Nguyên Tử Redis Lua O(1)
Kịch bản Lua script tại \`deploy/redis/execute_vote.lua\` thực thi nguyên tử trên Redis:
- Nhận diện 3 trạng thái: Upvote, Downvote, Unvote.
- Tự động đảo chiều điểm số khi người dùng chuyển từ Upvote sang Downvote (-2 điểm) hoặc hủy vote.
- Cập nhật hash cache và lưu buffer vào Redis Stream để worker đồng bộ ngầm xuống PostgreSQL theo lô (Batch Write).

## 4. Thuật Toán Trải Phẳng Cây Bình Luận O(N)
Trong giao diện người dùng, việc render các component lồng nhau sâu (Deeply nested components) sẽ gây tràn call stack và làm giật lag trình duyệt.
- Hàm \`flattenCommentTree\` chuyển đổi cây phân cấp thành mảng 1 chiều phẳng:
  \`\`\`typescript
  interface FlattenedCommentItem {
    id: string;
    depth: number;
    hasChildren: boolean;
    isLastChild: boolean;
    data: CommentNode;
  }
  \`\`\`
- Giúp thư viện ảo hóa (Virtualizer) chỉ render đúng các phần tử đang hiển thị trên khung nhìn (Viewport) với độ phức tạp thời gian $\\mathcal{O}(N)$.

## 5. Hệ Thống Design Tokens & Bố Cục 3 Cột
- **Bố cục 3 Cột Thích Ứng (3-Column Layout)**:
  - Cột trái (\`leftRailWidth: 240px\`): Thanh điều hướng danh mục không gian.
  - Cột giữa (\`centerStageMaxWidth: 768px\`): Dòng thời gian bài viết và chi tiết thảo luận.
  - Cột phải (\`rightRailWidth: 320px\`): Thông tin quy tắc cộng đồng, xu hướng nổi bật và widgets.
`,
  },

  // 4. DEVOPS & CLOUD
  {
    id: 'devops-guide',
    slug: 'devops-guide',
    category: 'devops',
    categoryTitle: '4. Vận Hành DevOps & CI/CD',
    title: 'Cẩm Nang Triển Khai Docker, CI/CD Pipeline 4 Cổng & Render Cloud',
    description: 'Hướng dẫn vận hành Docker Compose cục bộ, Multi-stage Docker builds, GitHub Actions và Blueprint Render Cloud.',
    stageBadge: 'Giai đoạn 3 • Production Ready',
    updatedAt: '2026-09-25',
    readingTimeMinutes: 7,
    keyTakeaways: [
      '1 câu lệnh Docker Compose khởi chạy toàn bộ 4 containers: PostgreSQL, Redis, Backend API, Frontend Web.',
      'Multi-stage Docker builds tối ưu hóa kích thước: Backend API < 100MB, Frontend Next.js standalone < 150MB.',
      'CI/CD Pipeline 4 Cổng GitHub Actions tự động kiểm định: Linting -> Typecheck -> Tests -> Docker Syntax.',
      'Render Cloud Blueprint (IaC) tự động hóa deploy và kịch bản keep-alive chống ngủ đông.',
    ],
    headings: [
      { id: 'docker-compose-local', title: '1. Khởi Động Cụm Docker Compose Cục Bộ', level: 2 },
      { id: 'multi-stage-builds', title: '2. Kiến Trúc Multi-stage Dockerfile Siêu Nhẹ', level: 2 },
      { id: 'github-actions-ci', title: '3. Quy Trình CI/CD 4 Cổng Tự Động Hóa', level: 2 },
      { id: 'render-iac-deployment', title: '4. Triển Khai Đám Mây Render (IaC) & Spin-down Mitigation', level: 2 },
      { id: 'troubleshooting-cheatsheet', title: '5. Sổ Tay Khắc Phục Sự Cố Nhanh', level: 2 },
    ],
    content: `
## 1. Khởi Động Cụm Docker Compose Cục Bộ
Toàn bộ môi trường phát triển được cấu hình đồng nhất trong tệp \`deploy/docker/docker-compose.dev.yml\`:
\`\`\`bash
# Khởi động toàn bộ 4 dịch vụ ở chế độ chạy ngầm
docker compose -f deploy/docker/docker-compose.dev.yml up -d

# Xem log thời gian thực của toàn bộ cụm
docker compose -f deploy/docker/docker-compose.dev.yml logs -f
\`\`\`
- **Database (PostgreSQL 16)**: Cổng 5432, tự động chạy script \`init-db.sql\` bật extensions và tạo bảng.
- **Cache (Redis 7)**: Cổng 6379, hỗ trợ AOF persistence.
- **Backend API**: Cổng 8080 với chế độ reload tự động.
- **Frontend Web (Next.js 15)**: Cổng 3000 với Fast Refresh.

## 2. Kiến Trúc Multi-stage Dockerfile Siêu Nhẹ
- **API Runner (\`deploy/docker/Dockerfile.api.prod\`)**:
  - Giai đoạn 1 (Builder): Sử dụng Node 24 Alpine, cài đặt dependencies và compile TypeScript qua \`pnpm\`.
  - Giai đoạn 2 (Runner): Chỉ sao chép mã nguồn đã biên dịch (\`dist/\`) và node_modules sản xuất, chạy dưới user bảo mật \`appuser\` (non-root). Dung lượng cuối cùng < 100MB.
- **Web Client (\`deploy/docker/Dockerfile.web.prod\`)**:
  - Tận dụng tính năng \`output: "standalone"\` của Next.js 15, loại bỏ toàn bộ devDependencies cồng kềnh. Dung lượng image < 150MB.

## 3. Quy Trình CI/CD 4 Cổng Tự Động Hóa
Mỗi khi có commit hoặc Pull Request lên nhánh \`main\` / \`develop\`, GitHub Actions kích hoạt pipeline 4 cổng:
1. **Cổng 1 (Lint & Format)**: Kiểm tra chuẩn mã nguồn bằng Biome linter.
2. **Cổng 2 (TypeScript Validation)**: Xác minh kiểu tĩnh trên toàn bộ 8 packages/apps qua \`pnpm run typecheck\`.
3. **Cổng 3 (Automated Tests)**: Chạy toàn bộ 45+ unit & integration test suites qua \`pnpm test\`.
4. **Cổng 4 (Docker Syntax Verification)**: Kiểm tra tính hợp lệ của tệp Docker Compose và Dockerfiles.

## 4. Triển Khai Đám Mây Render (IaC) & Spin-down Mitigation
- Tệp \`deploy/render/render.yaml\` khai báo hạ tầng dưới dạng mã nguồn (Infrastructure as Code).
- **Giải pháp chống ngủ đông (Spin-down Mitigation)**:
  \`\`\`bash
  bash deploy/scripts/keep-alive.sh https://acad-core-api.onrender.com 600
  \`\`\`
  Kịch bản gửi yêu cầu kiểm tra sức khỏe tới endpoint \`/healthz\` mỗi 10 phút, giữ container luôn thức và sẵn sàng phục vụ.

## 5. Sổ Tay Khắc Phục Sự Cố Vận Hành (DevOps Post-Mortem)
- **Sự cố Render Docker \`ERR_MODULE_NOT_FOUND\`: Cannot find module '/app/packages/contracts/src/auth.js'**:
  - *Nguyên nhân*: \`package.json\` trỏ trường \`exports\` về \`./src/index.ts\`. Node.js 24 khi nạp mã TypeScript đã cố tìm \`src/auth.js\` (chỉ tồn tại \`auth.ts\`).
  - *Khắc phục*: Trỏ chuẩn ESM \`exports\` về \`./dist/index.js\` và \`./dist/index.d.ts\`, đồng thời đảm bảo lệnh build Docker thực hiện \`pnpm --filter @acad/api... run build\`.
- **Sự cố CI Pipeline Gate 2 & Gate 3 fail vì thiếu package entry**:
  - *Nguyên nhân*: Runner GitHub Actions khởi chạy môi trường sạch chưa có thư mục \`dist/\` của các shared packages.
  - *Khắc phục*: Bổ sung bước tiền đề \`pnpm run build:libs\` trong Cổng 2 (Typecheck) và Cổng 3 (Tests) trong \`.github/workflows/ci.yml\`, đồng thời trang bị alias trong \`vitest.config.ts\`.
- **Sự cố Upstash Redis URL TypeError: Invalid URL**:
  - *Khắc phục*: Tích hợp hàm làm sạch \`sanitizeRedisUrl\` tự động lọc bỏ tiền tố CLI \`redis-cli --tls -u\` và cung cấp cơ chế fallback an toàn sang In-Memory session/user store nếu credentials không hợp lệ.
`,
  },

  // 5. PLANS & WALKTHROUGHS
  {
    id: 'plans-history',
    slug: 'plans-history',
    category: 'plans',
    categoryTitle: '5. Kế Hoạch & Báo Cáo Nghiệm Thu',
    title: 'Biên Niên Sử Phát Triển & Báo Cáo Nghiệm Thu Các Giai Đoạn',
    description: 'Tổng hợp toàn bộ các kế hoạch triển khai (implementation plans) và báo cáo walkthrough từ Giai đoạn 1 đến Giai đoạn 4.',
    stageBadge: 'Giai đoạn 1 - 4 • Lưu trữ Đồng bộ',
    updatedAt: '2026-09-25',
    readingTimeMinutes: 6,
    keyTakeaways: [
      'Giai đoạn 1: Hoàn thành PRD, Ma trận RBAC/ABAC, Lõi Auth Token Rotation (19 tests).',
      'Giai đoạn 2: Hoàn thành Lược đồ PostgreSQL 16 ltree, OpenAPI 3.1, Redis Lua Voting, Flatten Tree (14 tests).',
      'Giai đoạn 3: Hoàn thành Khung Apps, Docker Compose, Multi-stage Docker, GitHub Actions CI/CD (4 tests).',
      'Giai đoạn 4.1: Hoàn thành PostgresUserRepository, RedisSessionStore, 7 HTTP REST Endpoints, Next.js Auth Client (8 tests).',
      'Tổng kết kiểm định hiện tại: 45/45 tests PASS 100%, 8 packages typecheck 100%.',
    ],
    headings: [
      { id: 'stage-1-summary', title: '1. Nghiệm Thu Giai Đoạn 1: Discovery & PRD', level: 2 },
      { id: 'stage-2-summary', title: '2. Nghiệm Thu Giai Đoạn 2: Architecture & Design', level: 2 },
      { id: 'stage-3-summary', title: '3. Nghiệm Thu Giai Đoạn 3: DevOps & Foundation', level: 2 },
      { id: 'stage-4-summary', title: '4. Nghiệm Thu Giai Đoạn 4: Auth Subsystem', level: 2 },
    ],
    content: `
## 1. Nghiệm Thu Giai Đoạn 1: Discovery & PRD
- **Tài liệu bàn giao**: \`PRD_STAGE_1_DISCOVERY.md\`, \`AUTH_SECURITY_SPECIFICATION.md\`.
- **Mã nguồn bàn giao**: \`@acad/contracts\`, \`@acad/auth-client\`, \`services/auth\` (Password hasher Argon2id, JWT Token Manager, InMemorySessionStore, RBAC/ABAC Engine).
- **Kết quả kiểm định**: 19 tests pass 100%.

## 2. Nghiệm Thu Giai Đoạn 2: Architecture & Design
- **Tài liệu bàn giao**: \`UI_UX_DESIGN_SPECIFICATION.md\`, \`000002_create_community_schema.up.sql\`, \`openapi.yaml\`.
- **Mã nguồn bàn giao**: \`@acad/ui-tokens\`, \`@acad/tree-virtualizer\`, \`services/community\` (Gravity decay, ltree Base36 encoder, Redis Lua vote executor).
- **Kết quả kiểm định**: 14 tests pass 100%.

## 3. Nghiệm Thu Giai Đoạn 3: DevOps & Foundation
- **Tài liệu bàn giao**: \`DEVOPS_SETUP_GUIDE.md\`, \`render.yaml\`.
- **Mã nguồn bàn giao**: \`apps/web\` (Next.js 15), \`apps/api\` (HTTP Gateway /healthz), \`docker-compose.dev.yml\`, \`Dockerfile.api.prod\`, \`Dockerfile.web.prod\`, \`.github/workflows/ci.yml\`.
- **Kết quả kiểm định**: 4 healthcheck tests pass 100%, kích hoạt CI/CD thành công trên GitHub Actions.

## 4. Nghiệm Thu Giai Đoạn 4: Auth Subsystem
- **Mã nguồn bàn giao**:
  - \`PostgresUserRepository\`: Kết nối CSDL PostgreSQL 16 và ghi nhận an ninh vào \`auth_audit_logs\`.
  - \`RedisSessionStore\`: Quản lý HSET \`session:{user_id}:{device_fingerprint}\`, Grace Period 30s và cơ chế xóa cụm session khi bị tấn công tái sử dụng token.
  - \`auth-router.ts\`: 7 REST endpoints chuẩn OpenAPI 3.1.
  - \`apps/web\`: Singleton \`WebAuthService\` với Mutex Lock, React \`AuthProvider\` và Next.js Edge Middleware.
- **Kết quả kiểm định**: 8/8 HTTP integration tests pass, nâng tổng số test của toàn bộ monorepo lên **45/45 tests PASS 100%**.
`,
  },
];
