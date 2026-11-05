import { CheatSheetEntry } from './types.js';

export const CHEAT_SHEETS: CheatSheetEntry[] = [
  // 1. SECURITY & AUTH
  {
    category: 'Security & Auth',
    title: 'Phân tách Cookie Kép (Double Cookie Strategy)',
    description: 'Quy chuẩn đặt thuộc tính Cookie an toàn ngăn rò rỉ và CSRF',
    commandOrSnippet: `Set-Cookie: access_token=AT1; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=900
Set-Cookie: refresh_token=RT1; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth/refresh; Max-Age=604800`,
    explanation:
      'Access token chỉ sống 15 phút, có Path=/ phục vụ các API request. Refresh token có SameSite=Strict và Path=/api/v1/auth/refresh để trình duyệt KHÔNG BAO GIỜ gửi refresh token sang các route khác hoặc từ bên thứ 3.',
    tip: 'Chống tấn công CSRF tuyệt đối mà không cần CSRF Token phức tạp.',
  },
  {
    category: 'Security & Auth',
    title: 'Grace Period 30 Giây Chống Race Condition',
    description: 'Quy tắc xử lý khi nhiều tab gọi refresh cùng lúc',
    commandOrSnippet: `IF current_token_hash == SHA256(RT):
   Rotate token mới, lưu previous_token_hash với TTL 30s.
ELSE IF previous_token_hash == SHA256(RT) AND now <= gracePeriodExpiresAt:
   Trả về access_token hiện hành (KHÔNG xoay vòng thêm Refresh Token).
ELSE:
   Phát hiện TOKEN_REUSE_DETECTED -> Hủy toàn bộ session!`,
    explanation:
      'Khi người dùng mở 5 tab cùng lúc và access token hết hạn, 5 tab sẽ đồng thời gọi /refresh. Tab đầu tiên xoay token thành công; 4 tab tiếp theo đến trong vòng 30s sẽ khớp previous_token_hash và được cấp token an toàn thay vì bị văng ra khỏi hệ thống.',
    tip: 'Luôn giữ nguyên refresh_token cho client trong cửa sổ Grace Period.',
  },
  {
    category: 'Security & Auth',
    title: 'Phát hiện Tái sử dụng Token & Quét sạch Session',
    description: 'Hành động tức thời khi Refresh Token bị kẻ tấn công đánh cắp',
    commandOrSnippet: `// Redis CLI / Pipeline:
DEL session:{user_id}:*
// Cập nhật Database:
UPDATE user_sessions SET is_revoked = TRUE WHERE family_id = $1;
// Ghi nhận nhật ký:
INSERT INTO auth_audit_logs (user_id, event_type, metadata)
VALUES ($1, 'TOKEN_REUSE_DETECTED', '{"threat": "Stolen RT Replay"}'::jsonb);`,
    explanation:
      'Nếu token gửi lên không khớp cả current lẫn previous hash (hoặc ngoài 30s), token cũ đã bị phát lại. Toàn bộ phiên làm việc của user trên thiết bị đó bị hủy ngay lập tức để bảo vệ tài khoản.',
  },

  // 2. DEVOPS & DOCKER
  {
    category: 'DevOps & Docker',
    title: 'Khởi động Toàn Cụm Môi Trường Phát Triển Cục Bộ',
    description: 'Dựng cụm PostgreSQL 16, Redis 7, Backend API và Next.js Web',
    commandOrSnippet: `docker compose -f deploy/docker/docker-compose.dev.yml up -d`,
    explanation:
      'Tự động khởi chạy 4 containers: infra-db (cổng 5432, nạp sẵn extensions ltree/pgcrypto), infra-cache (cổng 6379), core-api (cổng 8080) và web-client (cổng 3000).',
    tip: 'Thêm --build nếu có thay đổi package.json hoặc cấu hình dependencies.',
  },
  {
    category: 'DevOps & Docker',
    title: 'Truy cập PostgreSQL CLI trong Container',
    description: 'Kết nối trực tiếp vào cơ sở dữ liệu PostgreSQL 16 cục bộ',
    commandOrSnippet: `docker exec -it acad-postgres psql -U postgres -d acad_community_dev`,
    explanation:
      'Kiểm tra bảng users, user_sessions, và kiểm tra extensions ltree qua lệnh: \\dx',
  },
  {
    category: 'DevOps & Docker',
    title: 'Truy cập Redis CLI & Kiểm tra Session Keys',
    description: 'Tra cứu các hash keys phiên làm việc trên Redis',
    commandOrSnippet: `docker exec -it acad-redis redis-cli
127.0.0.1:6379> KEYS session:*
127.0.0.1:6379> HGETALL session:<user_id>:<device_fp>`,
    explanation:
      'Kiểm tra TTL và các trường: currentTokenHash, previousTokenHash, gracePeriodExpiresAt.',
  },
  {
    category: 'DevOps & Docker',
    title: 'Kiểm tra Sức khỏe Hệ thống (Healthcheck Probe)',
    description: 'Endpoint phục vụ Docker container healthcheck và Render keep-alive',
    commandOrSnippet: `curl -s http://localhost:8080/healthz | jq .`,
    explanation:
      'Trả về HTTP 200: {"status":"ok","service":"acad-community-api","uptime":...,"timestamp":...}',
  },
  {
    category: 'DevOps & Docker',
    title: 'Kịch bản Chống Ngủ Đông Trên Render Cloud (Spin-down Mitigation)',
    description: 'Gửi heartbeat ping định kỳ 10 phút để giữ container luôn thức',
    commandOrSnippet: `bash deploy/scripts/keep-alive.sh https://acad-core-api.onrender.com 600`,
    explanation:
      'Gói Free của Render đưa dịch vụ vào trạng thái ngủ sau 15 phút không có traffic. Kịch bản gửi GET request mỗi 10 phút để đảm bảo API phản hồi tức thời.',
  },

  // 3. ARCHITECTURE & DATABASE
  {
    category: 'Architecture & Database',
    title: 'Cấu trúc ltree Base36 Cho Cây Bình Luận Vô Hạn',
    description: 'Định dạng đường dẫn phân cấp ltree tối ưu không gian và sắp xếp tự nhiên',
    commandOrSnippet: `Path format: {comment_id_base36}.{reply_id_base36}.{subreply_id_base36}
Ví dụ:
00000001
00000001.00000002
00000001.00000002.00000003`,
    explanation:
      'Mã hóa ID sang Base36 với độ dài cố định 8 ký tự cho mỗi phân đoạn. Khi sắp xếp ORDER BY path ASC, toàn bộ cây thảo luận được duyệt theo thứ tự Depth-First Search tự nhiên trong CSDL.',
    tip: 'Hỗ trợ truy vấn toàn bộ nhánh con của 1 bình luận chỉ bằng toán tử: path <@ \'00000001\'.',
  },
  {
    category: 'Architecture & Database',
    title: 'Công thức Xếp Hạng Bài Viết Gravity Decay',
    description: 'Thuật toán chấm điểm bài viết nổi bật theo thời gian',
    commandOrSnippet: `Score = (Upvotes - Downvotes) / (Age_Hours + 2)^1.8`,
    explanation:
      'Các bài viết mới có điểm số cao hơn. Theo thời gian, trọng số mũ 1.8 sẽ làm giảm dần điểm số để nhường chỗ cho các thảo luận mới nổi bật hơn.',
  },
  {
    category: 'Architecture & Database',
    title: 'Thuật toán Trải Phẳng Cây Bình Luận O(N) (Flatten Tree)',
    description: 'Biến cây phân cấp thành mảng phẳng cho FlatList / VirtualizedList',
    commandOrSnippet: `flattenCommentTree(nodes: CommentNode[], maxDepth = 10): FlattenedCommentItem[]`,
    explanation:
      'Thuật toán đệ quy có kiểm soát độ sâu tối đa (maxDepth). Tự động tính toán depth, hasChildren, isLastChild để render thụt lề và đường kẻ chỉ dẫn (tree guide lines) mà không gây giật lag trình duyệt.',
  },
];
