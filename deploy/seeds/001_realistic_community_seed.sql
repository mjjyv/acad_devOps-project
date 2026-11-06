-- ==============================================================================
-- ACAD DEVOPS PLATFORM (SYNAPSE ENGINE) - REALISTIC COMMUNITY SEED DATA
-- Target: PostgreSQL 16+ (PostgreSQL, ltree, trigram)
-- File: deploy/seeds/001_realistic_community_seed.sql
-- ==============================================================================

-- 1. SEED USERS
DELETE FROM comments WHERE thread_id IN (SELECT id FROM threads WHERE space_id IN (SELECT id FROM spaces WHERE slug IN ('devops-arch', 'vozforums', 'kubernetes', 'system-design', 'security-shield')));
DELETE FROM thread_counters WHERE thread_id IN (SELECT id FROM threads WHERE space_id IN (SELECT id FROM spaces WHERE slug IN ('devops-arch', 'vozforums', 'kubernetes', 'system-design', 'security-shield')));
DELETE FROM threads WHERE space_id IN (SELECT id FROM spaces WHERE slug IN ('devops-arch', 'vozforums', 'kubernetes', 'system-design', 'security-shield'));
DELETE FROM space_memberships WHERE space_id IN (SELECT id FROM spaces WHERE slug IN ('devops-arch', 'vozforums', 'kubernetes', 'system-design', 'security-shield'));
DELETE FROM space_flairs WHERE space_id IN (SELECT id FROM spaces WHERE slug IN ('devops-arch', 'vozforums', 'kubernetes', 'system-design', 'security-shield'));
DELETE FROM spaces WHERE slug IN ('devops-arch', 'vozforums', 'kubernetes', 'system-design', 'security-shield');
DELETE FROM users WHERE LOWER(username) IN ('admin_pro', 'cloud_architect', 'sre_expert', 'khoaitaychien', 'devops_ninja', 'lawyer_tech');

INSERT INTO users (id, username, email, password_hash, role, status, karma_score, bio, avatar_url, created_at, updated_at)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'admin_pro',
    'admin@acad.vn',
    '$scrypt$N=16384,r=8,p=1$c021657f819b16c2e84b984a737f8fb1$91418b77b328a77147843a8f0efea77d6b81af90416a3a88f1ee41ae912c6d3bd8e657ed626e4b21bcf0d005e1f85028be06befebbe0139609d8641faa0f0074',
    'ADMIN',
    'ACTIVE',
    9999,
    'Hệ thống quản trị viên Synapse Platform. Giám sát độ tin cậy và bảo mật cụm dịch vụ phân tán.',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    NOW() - INTERVAL '30 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'cloud_architect',
    'architect@acad.vn',
    '$scrypt$N=16384,r=8,p=1$c021657f819b16c2e84b984a737f8fb1$91418b77b328a77147843a8f0efea77d6b81af90416a3a88f1ee41ae912c6d3bd8e657ed626e4b21bcf0d005e1f85028be06befebbe0139609d8641faa0f0074',
    'SPACE_MOD',
    'ACTIVE',
    1850,
    'Principal Infrastructure Architect. Chuyên sâu về Kubernetes internals, High Availability, eBPF & Zero Trust.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    NOW() - INTERVAL '25 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'sre_expert',
    'sre@acad.vn',
    '$scrypt$N=16384,r=8,p=1$c021657f819b16c2e84b984a737f8fb1$91418b77b328a77147843a8f0efea77d6b81af90416a3a88f1ee41ae912c6d3bd8e657ed626e4b21bcf0d005e1f85028be06befebbe0139609d8641faa0f0074',
    'USER',
    'ACTIVE',
    640,
    'Site Reliability Engineer. Đam mê Chaos Engineering, SLO/SLI metrics, OpenTelemetry và Distributed Tracing.',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    NOW() - INTERVAL '20 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'khoaitaychien',
    'khoaitay@acad.vn',
    '$scrypt$N=16384,r=8,p=1$c021657f819b16c2e84b984a737f8fb1$91418b77b328a77147843a8f0efea77d6b81af90416a3a88f1ee41ae912c6d3bd8e657ed626e4b21bcf0d005e1f85028be06befebbe0139609d8641faa0f0074',
    'USER',
    'ACTIVE',
    420,
    'Senior DevOps Engineer. Terraform, ArgoCD, GitOps và Platform Engineering.',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    NOW() - INTERVAL '15 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'devops_ninja',
    'ninja@acad.vn',
    '$scrypt$N=16384,r=8,p=1$c021657f819b16c2e84b984a737f8fb1$91418b77b328a77147843a8f0efea77d6b81af90416a3a88f1ee41ae912c6d3bd8e657ed626e4b21bcf0d005e1f85028be06befebbe0139609d8641faa0f0074',
    'USER',
    'ACTIVE',
    310,
    'Cloud Native Developer & Linux Kernel Enthusiast. Viết code Go, Rust và tối ưu hóa Postgres ltree.',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    NOW() - INTERVAL '10 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000006',
    'lawyer_tech',
    'lawtech@acad.vn',
    '$scrypt$N=16384,r=8,p=1$c021657f819b16c2e84b984a737f8fb1$91418b77b328a77147843a8f0efea77d6b81af90416a3a88f1ee41ae912c6d3bd8e657ed626e4b21bcf0d005e1f85028be06befebbe0139609d8641faa0f0074',
    'USER',
    'ACTIVE',
    195,
    'Tư vấn Pháp lý Công nghệ & Tuân thủ An toàn Dữ liệu (Nghị định 13/2023/NĐ-CP & ISO 27001).',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    NOW() - INTERVAL '8 days',
    NOW()
  )
ON CONFLICT (id) DO UPDATE 
SET username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    karma_score = EXCLUDED.karma_score,
    bio = EXCLUDED.bio;

-- 2. SEED SPACES
INSERT INTO spaces (id, name, slug, description, rules, creator_id, member_count, thread_count, created_at, updated_at)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'DevOps Architecture',
    'devops-arch',
    'Không gian chuyên sâu về thiết kế hệ thống phân tán, hạ tầng High Availability, SRE và kiến trúc Cloud Native.',
    '[
      {"title": "Tôn trọng thành viên", "description": "Tranh luận kỹ thuật văn minh, dựa trên cơ sở kiến trúc và dữ liệu đo lường thực tế."},
      {"title": "Bảo mật thông tin", "description": "Tuyệt đối không đăng tải token, secret key, chứng chỉ SSH hoặc dữ liệu bí mật sản xuất."}
    ]'::jsonb,
    'a0000000-0000-0000-0000-000000000002',
    1240,
    25,
    NOW() - INTERVAL '20 days',
    NOW()
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Voz Technology & Engineering',
    'vozforums',
    'Cộng đồng công nghệ, thảo luận nghề nghiệp IT, chuyện lập trình, review công ty và góc nhìn kiến trúc tự do.',
    '[
      {"title": "Nói không với Spam", "description": "Không đăng tải tin tuyển dụng rác, bài viết câu view vô giá trị."},
      {"title": "Chia sẻ trung thực", "description": "Mọi bài review kinh nghiệm phỏng vấn và môi trường làm việc cần khách quan, đúng thực tế."}
    ]'::jsonb,
    'a0000000-0000-0000-0000-000000000004',
    3890,
    112,
    NOW() - INTERVAL '18 days',
    NOW()
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'Kubernetes & Cloud Native',
    'kubernetes',
    'Chuyên sâu về Kubernetes internals, Istio service mesh, Cilium eBPF, Podman và điều phối container đa vùng.',
    '[
      {"title": "Chuẩn hóa định dạng Code", "description": "Đính kèm manifest YAML, Helm values hoặc log lỗi vào khối code block để tiện theo dõi."},
      {"title": "Tránh câu hỏi chung chung", "description": "Nêu rõ phiên bản k8s, CNI plugin và hạ tầng khi nhờ hỗ trợ gỡ rối."}
    ]'::jsonb,
    'a0000000-0000-0000-0000-000000000003',
    950,
    18,
    NOW() - INTERVAL '15 days',
    NOW()
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'Distributed Systems Design',
    'system-design',
    'Thảo luận chuyên sâu về System Design Big Tech: Kafka event-driven, Database Sharding, Raft Consensus, Cache Stampede.',
    '[
      {"title": "Đo lường định lượng", "description": "Ưu tiên các bài viết có phân tích RPS, P99 latency, IOPS và bộ nhớ lưu trữ."},
      {"title": "Đính kèm sơ đồ kiến trúc", "description": "Khuyến khích sử dụng Mermaid hoặc ASCII diagram mô tả luồng dữ liệu."}
    ]'::jsonb,
    'a0000000-0000-0000-0000-000000000005',
    1420,
    34,
    NOW() - INTERVAL '12 days',
    NOW()
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'Zero Trust & DevSecOps',
    'security-shield',
    'An toàn thông tin doanh nghiệp, DevSecOps, phòng chống DDoS, OWASP Top 10 và tuân thủ dữ liệu Nghị định 13.',
    '[
      {"title": "Có trách nhiệm đạo đức", "description": "Nghiêm cấm chia sẻ payload khai thác có mục đích phá hoại hạ tầng công cộng."},
      {"title": "Phản hồi có kiểm chứng", "description": "Các khuyến nghị bảo mật cần viện dẫn tiêu chuẩn NIST, OWASP hoặc CIS Benchmark."}
    ]'::jsonb,
    'a0000000-0000-0000-0000-000000000006',
    670,
    15,
    NOW() - INTERVAL '10 days',
    NOW()
  )
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    rules = EXCLUDED.rules,
    member_count = EXCLUDED.member_count,
    thread_count = EXCLUDED.thread_count;

-- 3. SEED SPACE FLAIRS
INSERT INTO space_flairs (id, space_id, name, color, created_at)
VALUES
  -- devops-arch flairs
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Architecture', '#E1D9BC', NOW()),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'DevOps', '#ACBAC4', NOW()),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Troubleshooting', '#F0F0DB', NOW()),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'CI/CD', '#30364F', NOW()),

  -- vozforums flairs
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'Chia sẻ', '#E1D9BC', NOW()),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'Thảo luận', '#ACBAC4', NOW()),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000002', 'Hỏi đáp', '#F0F0DB', NOW()),

  -- kubernetes flairs
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000003', 'Production', '#E1D9BC', NOW()),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 'Networking', '#ACBAC4', NOW()),
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 'eBPF', '#F0F0DB', NOW()),

  -- system-design flairs
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000004', 'Deep Dive', '#E1D9BC', NOW()),
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000004', 'Database', '#ACBAC4', NOW()),

  -- security-shield flairs
  ('c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000005', 'AppSec', '#E1D9BC', NOW()),
  ('c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000005', 'Zero Trust', '#F0F0DB', NOW()),
  ('c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000005', 'Compliance', '#ACBAC4', NOW())
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    color = EXCLUDED.color;

-- 4. SEED SPACE MEMBERSHIPS
INSERT INTO space_memberships (space_id, user_id, role, joined_at)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'CREATOR', NOW() - INTERVAL '20 days'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'MODERATOR', NOW() - INTERVAL '19 days'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'MEMBER', NOW() - INTERVAL '15 days'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'MEMBER', NOW() - INTERVAL '12 days'),

  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'CREATOR', NOW() - INTERVAL '18 days'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'MEMBER', NOW() - INTERVAL '17 days'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 'MEMBER', NOW() - INTERVAL '10 days'),

  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'CREATOR', NOW() - INTERVAL '15 days'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 'CREATOR', NOW() - INTERVAL '12 days'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006', 'CREATOR', NOW() - INTERVAL '10 days')
ON CONFLICT (space_id, user_id) DO NOTHING;

-- 5. SEED THREADS
INSERT INTO threads (id, space_id, author_id, flair_id, title, slug, content, link_url, thread_type, upvotes_count, downvotes_count, comment_count, is_pinned, is_locked, created_at, updated_at)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'Triển khai Self-Hosted Homelab Monorepo: Podman Rootless, Cloudflare Tunnel và Next.js 15 SSR High Availability',
    'trien-khai-self-hosted-homelab-monorepo',
    'Tối ưu hóa tài nguyên phần cứng, triệt tiêu chi phí Cloud đắt đỏ với mô hình Zero Trust Cloudflare Tunnel kết hợp Systemd User Daemons và PostgreSQL 16 ltree nested tree CMS. Giảm 100% rủi ro bị tấn công trực diện vào địa chỉ IP công cộng và đảm bảo bảo mật dữ liệu tuyệt đối tại chỗ.

### 1. Kiến trúc hệ thống tổng thể
- **Edge Layer:** Cloudflare WAF + TLS 1.3 + DDoS Shield
- **Inbound Tunnel:** `cloudflared` daemon tạo kết nối out-bound trực tiếp qua 4 kết nối QUIC/HTTP2 tới edge, đóng hoàn toàn các port ingress trên router (không cần port forwarding NAT).
- **Core Database:** PostgreSQL 16 Alpine chạy cô lập trên Podman Rootless với Cgroups v2 resource limit (RAM 1GB, CPU 1.5 cores, no-new-privileges).
- **In-Memory Cache:** Redis 7 với AOF persistence và Lua scripts nguyên tử hóa bộ đếm vote/karma.
- **Node.js 22 Gateway:** Express với RFC 7807 Problem Details, Tiered Rate Limiter, Anti-SSRF guard và OWASP Security Headers.
- **Web Client:** Next.js 15 App Router Server-Side Rendering với Turbopack.

### 2. Kết quả đo lường thực tế
- Latency phản hồi trung bình qua mạng nội bộ: **< 15ms**.
- RAM tiêu thụ toàn hệ thống khi chịu tải 180 req/min: **~350MB RAM**!
- Độ sẵn sàng (Uptime): **99.98%** trên cụm Homelab Debian 12.',
    NULL,
    'TEXT',
    562,
    0,
    6,
    TRUE,
    FALSE,
    NOW() - INTERVAL '3 days',
    NOW()
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000005',
    'Chia sẻ kinh nghiệm phỏng vấn DevOps Engineer và SRE tại các công ty Big Tech & Unicorn',
    'chia-se-kinh-nghiem-phong-van-devops-engineer-va-sre',
    'Chào anh em, mình vừa kết thúc chuỗi phỏng vấn ở 4 công ty công nghệ lớn tại VN và Singapore. Muốn chia sẻ lại toàn bộ roadmap ôn tập từ Linux kernel internals, networking TCP/IP, Kubernetes architecture, và deep-dive distributed system.

### Các chủ đề cốt lõi thường được hỏi kỹ:
1. **Linux OS Internals:** Hiểu rõ Virtual Memory, Inode, Cgroups v2, Namespaces, Socket buffer tuning, và cách phân tích zombie processes.
2. **Kubernetes Troubleshooting:** Vòng đời của Pod, Cơ chế hoạt động của CoreDNS, OOMKilled vs CrashLoopBackOff, CNI IPAM allocation.
3. **Database & Storage:** IOPS, WAL Write-Ahead-Log trong PostgreSQL, nguyên lý ltree cho hệ thống bình luận đa cấp.
4. **Behavioral & Incident Postmortem:** Cách viết một bài Postmortem không đổ lỗi (Blameless RCA) theo chuẩn Google SRE.',
    NULL,
    'TEXT',
    428,
    2,
    3,
    FALSE,
    FALSE,
    NOW() - INTERVAL '2 days',
    NOW()
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000011',
    'Deep-dive PostgreSQL 16 ltree: Cấu trúc cây bình luận đệ quy tối ưu hóa cho hàng triệu nút',
    'deep-dive-postgresql-16-ltree-cau-truc-cay-binh-luan-de-quy',
    'Tại sao Reddit và các diễn đàn lớn chuyển từ Recursive CTE sang Materialized Path `ltree`?

Bài viết phân tích:
- Thuật toán mã hóa đường dẫn Base36 rút gọn `0001.000a.003f`.
- Chỉ mục GiST (Generalized Search Tree) hỗ trợ toán tử `<@` (is descendant) và `@>` (is ancestor) với tốc độ **< 1.2ms** ngay cả trên bảng chứa hàng triệu dòng dữ liệu.
- Kỹ thuật Capped Depth và gắn nhãn tag @mention để bảo vệ giao diện di động.',
    NULL,
    'TEXT',
    315,
    1,
    2,
    FALSE,
    FALSE,
    NOW() - INTERVAL '1 day',
    NOW()
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000008',
    'Chiến lược bộ đếm Karma và Vote FSM nguyên tử với Redis Lua Scripts',
    'chien-luoc-bo-dem-karma-va-vote-fsm-nguyen-tu-voi-redis-lua-scripts',
    'Giải quyết bài toán Race Condition khi có 5,000 lượt upvote/downvote đồng thời trên cùng một bài viết kỹ thuật.

- Triển khai Redis Lua Scripts chạy đơn luồng nguyên tử (Atomic).
- Mô hình Finite State Machine: Chuyển đổi trạng thái vote (+1 -> 0 -> -1) chính xác 100%, không bao giờ bị trôi lệch số liệu counter.
- Bảng `thread_counters` được tối ưu hóa `fillfactor = 70` để hỗ trợ HOT (Heap-Only Tuples) updates cực nhanh trong PostgreSQL.',
    NULL,
    'TEXT',
    289,
    0,
    1,
    FALSE,
    FALSE,
    NOW() - INTERVAL '18 hours',
    NOW()
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000006',
    'c0000000-0000-0000-0000-000000000015',
    'Quy định mới về bảo vệ dữ liệu cá nhân Nghị định 13 và tác động trực tiếp đến kiến trúc lưu trữ log hệ thống',
    'quy-dinh-moi-ve-bao-ve-du-lieu-ca-nhan-nghi-dinh-13',
    'Đối với các hệ thống backend có ghi nhận IP, cookie tracking hoặc thông tin người dùng, việc lưu trữ plain text trong PostgreSQL hay Elasticsearch có thể đối mặt với rủi ro pháp lý cao theo Nghị định 13/2023/NĐ-CP.

Bài viết này phân tích phương án mã hóa cột AES-GCM 256, kỹ thuật masking IP address tự động trước khi ghi log và chính sách Data Retention tự động loại bỏ dữ liệu quá hạn.',
    NULL,
    'TEXT',
    195,
    3,
    1,
    FALSE,
    FALSE,
    NOW() - INTERVAL '12 hours',
    NOW()
  )
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    content = EXCLUDED.content,
    upvotes_count = EXCLUDED.upvotes_count,
    downvotes_count = EXCLUDED.downvotes_count,
    comment_count = EXCLUDED.comment_count;

-- 6. SEED THREAD COUNTERS
INSERT INTO thread_counters (thread_id, upvotes, downvotes, net_score, hot_score, wilson_score, comment_count, updated_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 562, 0, 562, 1450.8, 0.98, 6, NOW()),
  ('d0000000-0000-0000-0000-000000000002', 428, 2, 426, 1240.2, 0.95, 3, NOW()),
  ('d0000000-0000-0000-0000-000000000003', 315, 1, 314, 980.5, 0.93, 2, NOW()),
  ('d0000000-0000-0000-0000-000000000004', 289, 0, 289, 875.0, 0.92, 1, NOW()),
  ('d0000000-0000-0000-0000-000000000005', 195, 3, 192, 620.1, 0.88, 1, NOW())
ON CONFLICT (thread_id) DO UPDATE
SET upvotes = EXCLUDED.upvotes,
    downvotes = EXCLUDED.downvotes,
    net_score = EXCLUDED.net_score,
    hot_score = EXCLUDED.hot_score,
    comment_count = EXCLUDED.comment_count;

-- 7. SEED NESTED COMMENTS (ltree)
-- Thread 1 Comments (trien-khai-self-hosted-homelab-monorepo)
INSERT INTO comments (id, thread_id, author_id, parent_id, path, depth, content, upvotes_count, downvotes_count, created_at)
VALUES
  -- Root comment 1 (depth 1)
  (
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    NULL,
    '0001',
    1,
    'Kiến trúc rất ấn tượng! Cho mình hỏi việc backup volume .data/postgres bạn tự động hóa bằng giải pháp nào để tránh downtime?',
    18,
    0,
    NOW() - INTERVAL '2 days'
  ),
  -- Reply to root 1 (depth 2)
  (
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    '0001.0001',
    2,
    'Mình dùng cron job chạy lúc 02:00 AM, thực thi lệnh `pg_dump` nén gzip trực tiếp vào stream và đẩy lên Cloudflare R2 bucket. File sao lưu được mã hóa GPG trước khi ra khỏi máy chủ cục bộ.',
    12,
    0,
    NOW() - INTERVAL '1 day 20 hours'
  ),
  -- Reply to reply (depth 3)
  (
    'e0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000002',
    '0001.0001.0001',
    3,
    'Cloudflare R2 có tính phí Data Egress không bác? Và việc kết nối bằng AWS S3 SDK chuẩn có gặp trục trặc tương thích nào không?',
    8,
    0,
    NOW() - INTERVAL '1 day 16 hours'
  ),
  -- Reply to depth 3 (depth 4 - Capped Depth test)
  (
    'e0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000003',
    '0001.0001.0001.0001',
    4,
    'R2 miễn phí 100% data egress nhé bác! Bạn chỉ cần đặt custom endpoint URL là `https://<account_id>.r2.cloudflarestorage.com`, các client AWS CLI, boto3 hay MinIO đều hoạt động trơn tru.',
    15,
    0,
    NOW() - INTERVAL '1 day 12 hours'
  ),
  -- Another reply to root 1 (depth 2)
  (
    'e0000000-0000-0000-0000-000000000005',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000001',
    '0001.0002',
    2,
    'Bác có thể chia sẻ file systemd unit service cho node API và Next.js không? Nhất là phần cấu hình log retention qua journalctl.',
    7,
    0,
    NOW() - INTERVAL '1 day 8 hours'
  ),
  -- Root comment 2 (depth 1)
  (
    'e0000000-0000-0000-0000-000000000006',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000006',
    NULL,
    '0002',
    1,
    'Mô hình Zero Trust Cloudflare Tunnel này rất chuẩn chỉnh cho việc tuân thủ ISO 27001 và Nghị định 13 vì hoàn toàn không cần mở port 80/443 ở router biên, ngăn chặn 100% nguy cơ quét port tự động từ botnet.',
    22,
    0,
    NOW() - INTERVAL '1 day'
  ),

  -- Thread 2 Comments (chia-se-kinh-nghiem-phong-van-devops-engineer-va-sre)
  -- Root comment 1 (depth 1)
  (
    'e0000000-0000-0000-0000-000000000007',
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    NULL,
    '0001',
    1,
    'Vòng phỏng vấn Linux Kernel có bị vặn sâu vào Socket buffer tuning và Cgroups v2 memory limit không bác? Đợt mình phỏng vấn ở Grab bị hỏi case Pod bị OOMKilled dù node vẫn còn 40% RAM trống, giải thích cơ chế `memory.max` và kernel cgroup limit rất căng.',
    45,
    0,
    NOW() - INTERVAL '1 day 18 hours'
  ),
  -- Reply to comment 1 (depth 2)
  (
    'e0000000-0000-0000-0000-000000000008',
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000007',
    '0001.0001',
    2,
    'Có hỏi kỹ nhé bác! Case OOMKilled đó là kinh điển: cgroup memory limit của container bị chạm ngưỡng trước khi node-level memory cạn. Phải kiểm tra file `/sys/fs/cgroup/memory.events` xem metric `oom_kill` để chứng minh. Ngoài ra họ hỏi thêm tham số sysctl `net.core.somaxconn` và `tcp_max_syn_backlog` khi xử lý SYN flood.',
    38,
    0,
    NOW() - INTERVAL '1 day 14 hours'
  ),
  -- Root comment 2 (depth 1)
  (
    'e0000000-0000-0000-0000-000000000009',
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    NULL,
    '0002',
    1,
    'Roadmap rất chất lượng. Đặc biệt phần Behavioral & Incident Postmortem: các công ty Big Tech đánh giá cực cao tư duy Blameless RCA và cách điều phối Incident Commander hơn là chỉ thuộc lòng cú pháp lệnh.',
    52,
    0,
    NOW() - INTERVAL '1 day 10 hours'
  ),

  -- Thread 3 Comments (deep-dive-postgresql-16-ltree-cau-truc-cay-binh-luan-de-quy)
  -- Root comment 1 (depth 1)
  (
    'e0000000-0000-0000-0000-000000000010',
    'd0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000002',
    NULL,
    '0001',
    1,
    'Chỉ mục GiST trên cột ltree xử lý toán tử descendant `<@` cực kỳ xuất sắc. Lưu ý thêm là khi kích thước path vượt quá 10 cấp nên dùng Base36 để tiết kiệm không gian index, tránh bloat GiST tree.',
    29,
    0,
    NOW() - INTERVAL '20 hours'
  ),
  -- Reply to comment 1 (depth 2)
  (
    'e0000000-0000-0000-0000-000000000011',
    'd0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000010',
    '0001.0001',
    2,
    'Chuẩn bác, Base36 4 ký tự `000a` cho phép tới 1.6 triệu comment nhánh con mà mỗi node chỉ tốn 4 bytes UTF-8.',
    18,
    0,
    NOW() - INTERVAL '16 hours'
  ),

  -- Thread 4 Comments (chien-luoc-bo-dem-karma-va-vote-fsm-nguyen-tu-voi-redis-lua-scripts)
  -- Root comment 1 (depth 1)
  (
    'e0000000-0000-0000-0000-000000000012',
    'd0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000004',
    NULL,
    '0001',
    1,
    'Lua script chạy atomic trên single thread Redis là giải pháp triệt tiêu race condition tốt nhất. Vừa nhanh vừa không cần distributed lock phức tạp như Redlock.',
    21,
    0,
    NOW() - INTERVAL '14 hours'
  ),

  -- Thread 5 Comments (quy-dinh-moi-ve-bao-ve-du-lieu-ca-nhan-nghi-dinh-13)
  -- Root comment 1 (depth 1)
  (
    'e0000000-0000-0000-0000-000000000013',
    'd0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000001',
    NULL,
    '0001',
    1,
    'Chúng ta đã cấu hình IP Masking tự động trên Nginx/Cloudflare và cài đặt cron job tự động purge log sau 30 ngày để tuân thủ điều khoản Data Retention của Nghị định 13.',
    34,
    0,
    NOW() - INTERVAL '8 hours'
  )
ON CONFLICT (id) DO UPDATE
SET content = EXCLUDED.content,
    upvotes_count = EXCLUDED.upvotes_count,
    path = EXCLUDED.path;

-- 8. SEED VOTES
INSERT INTO thread_votes (thread_id, user_id, direction, created_at)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 1, NOW() - INTERVAL '2 days'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 1, NOW() - INTERVAL '2 days'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 1, NOW() - INTERVAL '1 day'),
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 1, NOW() - INTERVAL '1 day')
ON CONFLICT (thread_id, user_id) DO NOTHING;

INSERT INTO comment_votes (comment_id, user_id, direction, created_at)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 1, NOW() - INTERVAL '1 day'),
  ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 1, NOW() - INTERVAL '1 day')
ON CONFLICT (comment_id, user_id) DO NOTHING;
