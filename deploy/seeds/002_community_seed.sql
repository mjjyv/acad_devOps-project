-- ==============================================================================
-- ACAD DEVOPS PLATFORM (SYNAPSE ENGINE) - SEED DỮ LIỆU PHÂN HỆ 2
-- File: deploy/seeds/002_community_seed.sql
-- Mục tiêu: Spaces (Public + Private), Memberships, Flairs (#30364F/#ACBAC4/#E1D9BC/#F0F0DB),
--           Threads phân bố thời gian, Cây bình luận ltree cấp 1..8 + Capped Depth 9 + Soft Delete
-- ==============================================================================

BEGIN;

-- 0. DỌN SẠCH DỮ LIỆU CŨ THEO THỨ TỰ KHÓA NGOẠI (IDEMPOTENT)
DELETE FROM user_saved_threads WHERE thread_id IN (
    SELECT id FROM threads WHERE space_id IN (
        'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000006'
    )
    OR slug IN (
        'trien-khai-self-hosted-homelab-monorepo',
        'chia-se-kinh-nghiem-phong-van-devops-engineer-va-sre',
        'deep-dive-postgresql-16-ltree-cau-truc-cay-binh-luan-de-quy',
        'chien-luoc-bo-dem-karma-va-vote-fsm-nguyen-tu-voi-redis-lua-scripts',
        'quy-dinh-moi-ve-bao-ve-du-lieu-ca-nhan-nghi-dinh-13',
        'toi-uu-hoa-bang-dem-hot-fillfactor-70',
        'thay-the-kube-proxy-bang-cilium-ebpf-cni',
        'post-mortem-p1-ro-ri-bo-nho-nodejs-sse-socket-leak'
    )
);

DELETE FROM comment_votes WHERE comment_id IN (
    SELECT c.id FROM comments c
    JOIN threads t ON c.thread_id = t.id
    WHERE t.space_id IN (
        'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000006'
    )
);

DELETE FROM thread_votes WHERE thread_id IN (
    SELECT id FROM threads WHERE space_id IN (
        'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000006'
    )
);

DELETE FROM comments WHERE thread_id IN (
    SELECT id FROM threads WHERE space_id IN (
        'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000006'
    )
);

DELETE FROM thread_counters WHERE thread_id IN (
    SELECT id FROM threads WHERE space_id IN (
        'b0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000002',
        'b0000000-0000-0000-0000-000000000003',
        'b0000000-0000-0000-0000-000000000004',
        'b0000000-0000-0000-0000-000000000005',
        'b0000000-0000-0000-0000-000000000006'
    )
);

DELETE FROM threads WHERE space_id IN (
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000006'
)
OR slug IN (
    'trien-khai-self-hosted-homelab-monorepo',
    'chia-se-kinh-nghiem-phong-van-devops-engineer-va-sre',
    'deep-dive-postgresql-16-ltree-cau-truc-cay-binh-luan-de-quy',
    'chien-luoc-bo-dem-karma-va-vote-fsm-nguyen-tu-voi-redis-lua-scripts',
    'quy-dinh-moi-ve-bao-ve-du-lieu-ca-nhan-nghi-dinh-13',
    'toi-uu-hoa-bang-dem-hot-fillfactor-70',
    'thay-the-kube-proxy-bang-cilium-ebpf-cni',
    'post-mortem-p1-ro-ri-bo-nho-nodejs-sse-socket-leak'
);

DELETE FROM space_flairs WHERE space_id IN (
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000006'
);

DELETE FROM space_memberships WHERE space_id IN (
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000006'
);

DELETE FROM spaces WHERE id IN (
    'b0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000006'
)
OR LOWER(slug) IN ('devops-arch', 'vozforums', 'kubernetes', 'system-design', 'security-shield', 'incident-vault');

-- Đồng bộ lại threads_count về số bài thật còn lại của user (ngoài tập seed) trước khi insert
UPDATE users u SET threads_count = (SELECT COUNT(*) FROM threads t WHERE t.author_id = u.id);

-- 1. SEED SPACES (5 Public Spaces + 1 Private Space)
-- Khởi tạo member_count = 0, thread_count = 0 để Trigger tự động tính chuẩn xác 100%
INSERT INTO spaces (
    id, name, slug, description, icon_url, banner_url, rules, is_private, creator_id, member_count, thread_count, created_at, updated_at
)
VALUES
  (
    'b0000000-0000-0000-0000-000000000001',
    'DevOps Architecture',
    'devops-arch',
    'Không gian chuyên sâu về thiết kế hệ thống phân tán, hạ tầng High Availability, SRE và kiến trúc Cloud Native.',
    'https://images.unsplash.com/photo-1618401471353-b98aedd04e11?w=128',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200',
    '[
      {"title": "Tranh luận dựa trên số liệu", "description": "Ưu tiên phân tích RPS, P95/P99 latency, IOPS và log trace thực tế thay vì suy đoán cảm tính."},
      {"title": "Bảo vệ bí mật an toàn", "description": "Tuyệt đối không đăng tải token, secret key, chứng chỉ SSH hoặc dữ liệu bí mật sản xuất."}
    ]'::jsonb,
    FALSE,
    'a0000000-0000-0000-0000-000000000003',
    0, 0,
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '30 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Voz Technology & Engineering',
    'vozforums',
    'Cộng đồng công nghệ, thảo luận nghề nghiệp IT, chuyện lập trình, phỏng vấn Big Tech và góc nhìn kiến trúc tự do.',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=128',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200',
    '[
      {"title": "Nói không với Spam", "description": "Không đăng tải tin tuyển dụng rác, bài viết câu view vô giá trị."},
      {"title": "Chia sẻ trung thực", "description": "Mọi bài review kinh nghiệm phỏng vấn và môi trường làm việc cần khách quan, đúng thực tế."}
    ]'::jsonb,
    FALSE,
    'a0000000-0000-0000-0000-000000000004',
    0, 0,
    NOW() - INTERVAL '25 days',
    NOW() - INTERVAL '25 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000003',
    'Kubernetes & Cloud Native',
    'kubernetes',
    'Chuyên sâu về Kubernetes internals, Istio service mesh, Cilium eBPF, Podman rootless và điều phối container đa vùng.',
    'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?w=128',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200',
    '[
      {"title": "Đính kèm manifest", "description": "Đính kèm manifest YAML, Helm values hoặc log lỗi vào khối code block để tiện theo dõi."},
      {"title": "Ghi rõ phiên bản", "description": "Nêu rõ phiên bản k8s runtime, CNI plugin và hạ tầng khi nhờ hỗ trợ gỡ rối."}
    ]'::jsonb,
    FALSE,
    'a0000000-0000-0000-0000-000000000003',
    0, 0,
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '20 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000004',
    'Distributed Systems Design',
    'system-design',
    'Mổ xẻ System Design Big Tech: Kafka event-driven, Database Sharding, Raft Consensus, Cache Stampede mitigation.',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=128',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200',
    '[
      {"title": "Đo lường định lượng", "description": "Ưu tiên các bài viết có phân tích RPS, P99 latency, IOPS và bộ nhớ lưu trữ."},
      {"title": "Khách quan trong so sánh", "description": "Đánh giá trade-off công nghệ theo định lý CAP và PACELC."}
    ]'::jsonb,
    FALSE,
    'a0000000-0000-0000-0000-000000000008',
    0, 0,
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '18 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000005',
    'Zero Trust & DevSecOps',
    'security-shield',
    'An toàn thông tin doanh nghiệp, DevSecOps, phòng chống DDoS, OWASP Top 10 và tuân thủ dữ liệu Nghị định 13.',
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=128',
    'https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=1200',
    '[
      {"title": "Nghiêm cấm mã độc", "description": "Nghiêm cấm chia sẻ payload khai thác có mục đích phá hoại hạ tầng công cộng."},
      {"title": "Phản hồi có kiểm chứng", "description": "Các khuyến nghị bảo mật cần viện dẫn tiêu chuẩn NIST, OWASP hoặc CIS Benchmark."}
    ]'::jsonb,
    FALSE,
    'a0000000-0000-0000-0000-000000000002',
    0, 0,
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '15 days'
  ),
  (
    'b0000000-0000-0000-0000-000000000006',
    'Incident Room & Post-Mortem',
    'incident-vault',
    'Không gian nội bộ phân tích sự cố production thực tế và báo cáo hậu kiểm không đổ lỗi (Blameless Post-Mortem).',
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=128',
    'https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=1200',
    '[
      {"title": "Không gian riêng tư", "description": "Thành viên chỉ được xem và thảo luận khi nằm trong danh sách thành viên được duyệt."},
      {"title": "Blameless Culture", "description": "Tập trung khắc phục điểm yếu kiến trúc và quy trình, không quy chụp cá nhân."}
    ]'::jsonb,
    TRUE,
    'a0000000-0000-0000-0000-000000000001',
    0, 0,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '10 days'
  );

-- 2. SEED SPACE MEMBERSHIPS (Kích hoạt Trigger tăng member_count)
INSERT INTO space_memberships (space_id, user_id, role, joined_at)
VALUES
  -- devops-arch
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'CREATOR', NOW() - INTERVAL '30 days'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'MODERATOR', NOW() - INTERVAL '29 days'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'MODERATOR', NOW() - INTERVAL '28 days'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'MEMBER', NOW() - INTERVAL '20 days'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 'MEMBER', NOW() - INTERVAL '18 days'),

  -- vozforums
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000004', 'CREATOR', NOW() - INTERVAL '25 days'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 'MEMBER', NOW() - INTERVAL '22 days'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008', 'MEMBER', NOW() - INTERVAL '19 days'),

  -- kubernetes
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'CREATOR', NOW() - INTERVAL '20 days'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'MEMBER', NOW() - INTERVAL '15 days'),

  -- system-design
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000008', 'CREATOR', NOW() - INTERVAL '18 days'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'MODERATOR', NOW() - INTERVAL '16 days'),

  -- security-shield
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'CREATOR', NOW() - INTERVAL '15 days'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000009', 'MEMBER', NOW() - INTERVAL '10 days'),

  -- incident-vault (PRIVATE: chỉ admin_pro, mod_lead, cloud_architect là thành viên)
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'CREATOR', NOW() - INTERVAL '10 days'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'MODERATOR', NOW() - INTERVAL '9 days'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'MEMBER', NOW() - INTERVAL '8 days');

-- 3. SEED SPACE FLAIRS (Chuẩn color_hex & background_hex theo bảng màu #30364F/#ACBAC4/#E1D9BC/#F0F0DB)
INSERT INTO space_flairs (id, space_id, name, slug, color_hex, background_hex, created_at)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Architecture', 'architecture', '#E1D9BC', '#30364F', NOW() - INTERVAL '30 days'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'DevOps', 'devops', '#ACBAC4', '#30364F', NOW() - INTERVAL '30 days'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Troubleshooting', 'troubleshooting', '#F0F0DB', '#30364F', NOW() - INTERVAL '30 days'),

  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'Chia sẻ', 'chia-se', '#E1D9BC', '#30364F', NOW() - INTERVAL '25 days'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'Thảo luận', 'thao-luan', '#ACBAC4', '#30364F', NOW() - INTERVAL '25 days'),

  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 'Production', 'production', '#E1D9BC', '#30364F', NOW() - INTERVAL '20 days'),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 'eBPF / CNI', 'ebpf-cni', '#F0F0DB', '#30364F', NOW() - INTERVAL '20 days'),

  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004', 'Deep Dive', 'deep-dive', '#E1D9BC', '#30364F', NOW() - INTERVAL '18 days'),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000004', 'Database Internals', 'database-internals', '#ACBAC4', '#30364F', NOW() - INTERVAL '18 days'),

  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000005', 'Zero Trust', 'zero-trust', '#F0F0DB', '#30364F', NOW() - INTERVAL '15 days'),
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000005', 'Compliance', 'compliance', '#ACBAC4', '#30364F', NOW() - INTERVAL '15 days'),

  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000006', 'Post-Mortem P1', 'post-mortem-p1', '#F0F0DB', '#30364F', NOW() - INTERVAL '10 days');

-- 4. SEED THREADS (8 Bài viết kỹ thuật rải đều mốc thời gian 5d -> 6h)
-- Triggers tự động cập nhật spaces.thread_count, users.threads_count và khởi tạo thread_counters
INSERT INTO threads (
    id, space_id, author_id, flair_id, title, slug, content, link_url, thread_type, upvotes_count, downvotes_count, comment_count, is_pinned, is_locked, created_at, updated_at
)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003', -- cloud_architect
    'c0000000-0000-0000-0000-000000000001', -- Architecture
    'Triển khai Self-Hosted Homelab Monorepo: Podman Rootless, Cloudflare Tunnel và Next.js 15 SSR High Availability',
    'trien-khai-self-hosted-homelab-monorepo',
    '### Kiến Trúc Hạ Tầng Cục Bộ Đạt Chuẩn Production
Tối ưu hóa tài nguyên phần cứng, triệt tiêu chi phí Cloud đắt đỏ với mô hình Zero Trust Cloudflare Tunnel kết hợp Systemd User Daemons và PostgreSQL 16 `ltree` nested tree CMS.

1. **Podman Rootless:** Chạy PostgreSQL 16 Alpine và Redis 7 Alpine không cần quyền root, phân quyền Cgroups v2 với giới hạn 1GB RAM và 2 CPU cores.
2. **Systemd User Units:** Tự động điều phối Backend API Gateway (`:10000`) và Next.js 15 Web Client (`:3000`).
3. **Cloudflare Tunnel (`cloudflared`):** Khởi tạo 4 kết nối QUIC/HTTP2 ra Cloudflare Edge, đóng 100% port NAT router.
4. **PostgreSQL Materialized Path `ltree`:** Tối ưu hóa cây thảo luận đa tầng với chỉ mục GiST `< 1.2ms`.',
    NULL, 'TEXT', 0, 0, 0, TRUE, FALSE,
    NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004', -- devops_coder
    'c0000000-0000-0000-0000-000000000004', -- Chia sẻ
    'Chia sẻ kinh nghiệm phỏng vấn DevOps Engineer và SRE tại các công ty Big Tech & Unicorn',
    'chia-se-kinh-nghiem-phong-van-devops-engineer-va-sre',
    'Chào anh em, mình vừa kết thúc chuỗi phỏng vấn ở 4 công ty công nghệ lớn tại VN và Singapore. Muốn chia sẻ lại toàn bộ roadmap ôn tập Linux kernel internals, networking TCP/IP, Kubernetes architecture và distributed systems.

### Các chủ đề cốt lõi thường được hỏi kỹ:
1. **Linux OS Internals:** Virtual Memory, Inode, Cgroups v2, Namespaces, Socket buffer tuning, zombie processes.
2. **Kubernetes Troubleshooting:** Vòng đời Pod, CoreDNS, `OOMKilled` vs `CrashLoopBackOff`, CNI IPAM.
3. **Database & Storage:** IOPS, WAL Write-Ahead Log, chỉ mục GiST/GIN.
4. **Behavioral & Postmortem:** Tư duy Blameless RCA theo chuẩn Google SRE.',
    NULL, 'TEXT', 0, 0, 0, FALSE, FALSE,
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000008', -- devops_ninja
    'c0000000-0000-0000-0000-000000000008', -- Deep Dive
    'Deep-dive PostgreSQL 16 ltree: Cấu trúc cây bình luận đệ quy tối ưu hóa cho hàng triệu nút',
    'deep-dive-postgresql-16-ltree-cau-truc-cay-binh-luan-de-quy',
    'Tại sao các nền tảng thảo luận quy mô lớn chuyển từ Recursive CTE sang Materialized Path `ltree`?

- Mã hóa Base36 rút gọn 4 ký tự (`0001.000a.003f`) hỗ trợ tới 1.67 triệu nhánh con trên mỗi nút.
- Chỉ mục GiST hỗ trợ toán tử `<@` (descendant) và `@>` (ancestor) đạt độ trễ `< 1.2ms`.
- Kỹ thuật Capped Depth cấp 8 kết hợp Flat Reply `@mention` để chống tràn giao diện trên thiết bị di động.',
    NULL, 'TEXT', 0, 0, 0, FALSE, FALSE,
    NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000001', -- admin_pro
    'c0000000-0000-0000-0000-000000000009', -- Database Internals
    'Tối ưu hóa bảng đếm Heap-Only Tuples (HOT) trong PostgreSQL 16 với fillfactor = 70',
    'toi-uu-hoa-bang-dem-hot-fillfactor-70',
    '### Vấn Đề Ghi Đĩa & Index Bloat Khi Có Hàng Nghìn Lượt Bỏ Phiếu
Khi người dùng Upvote/Downvote liên tục, cập nhật trực tiếp lên bảng `threads` sẽ kéo theo ghi lại toàn bộ các cây chỉ mục B-Tree (slug, title, created_at...). Giải pháp tách riêng bảng `thread_counters` với `WITH (fillfactor = 70)` dành sẵn 30% trang dữ liệu 8KB cho cập nhật HOT tại chỗ.',
    NULL, 'TEXT', 0, 0, 0, FALSE, FALSE,
    NOW() - INTERVAL '2 days 12 hours', NOW() - INTERVAL '2 days 12 hours'
  ),
  (
    'd0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000007', -- sre_expert
    'c0000000-0000-0000-0000-000000000007', -- eBPF / CNI
    'Thay thế kube-proxy bằng Cilium eBPF CNI: Trải nghiệm thực tế trên cụm Bare-Metal',
    'thay-the-kube-proxy-bang-cilium-ebpf-cni',
    'Đánh giá hiệu năng mạng Pod-to-Pod sau khi loại bỏ `iptables` chuyển sang Cilium eBPF:
- Triệt tiêu độ trễ O(N) khi số lượng Kubernetes Services vượt ngưỡng 5,000.
- Giám sát luồng L7 HTTP request thời gian thực qua Hubble UI mà không cần sidecar proxy.',
    'https://cilium.io', 'LINK', 0, 0, 0, FALSE, FALSE,
    NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ),
  (
    'd0000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000007', -- sre_expert
    'c0000000-0000-0000-0000-000000000006', -- Production
    'Chiến lược bộ đếm Karma và Vote FSM nguyên tử với Redis Lua Scripts',
    'chien-luoc-bo-dem-karma-va-vote-fsm-nguyen-tu-voi-redis-lua-scripts',
    'Giải quyết bài toán Race Condition khi có 5,000 lượt upvote/downvote đồng thời trên cùng một bài viết kỹ thuật bằng script Lua chạy đơn luồng nguyên tử trên Redis và cơ chế flush theo lô `VoteFlushWorker`.',
    NULL, 'TEXT', 0, 0, 0, FALSE, FALSE,
    NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
  ),
  (
    'd0000000-0000-0000-0000-000000000007',
    'b0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000009', -- lawyer_tech
    'c0000000-0000-0000-0000-000000000011', -- Compliance
    'Quy định mới về bảo vệ dữ liệu cá nhân Nghị định 13 và tác động trực tiếp đến kiến trúc lưu trữ log hệ thống',
    'quy-dinh-moi-ve-bao-ve-du-lieu-ca-nhan-nghi-dinh-13',
    'Đối với các hệ thống backend có ghi nhận IP, cookie tracking hoặc thông tin người dùng, việc lưu trữ plain text trong PostgreSQL hay Elasticsearch có thể đối mặt với rủi ro pháp lý cao theo Nghị định 13/2023/NĐ-CP. Phân tích phương án IP masking & Data Retention 30 ngày.',
    NULL, 'TEXT', 0, 0, 0, FALSE, FALSE,
    NOW() - INTERVAL '6 hours', NOW() - INTERVAL '6 hours'
  ),
  -- Thread 8 nằm trong Private Space (incident-vault) để kiểm thử phân quyền 403/Hidden from Popular
  (
    'd0000000-0000-0000-0000-000000000008',
    'b0000000-0000-0000-0000-000000000006', -- incident-vault (is_private = TRUE)
    'a0000000-0000-0000-0000-000000000001', -- admin_pro
    'c0000000-0000-0000-0000-000000000012', -- Post-Mortem P1
    '[P1 POST-MORTEM] Sự cố rò rỉ bộ nhớ Node.js do lắng nghe sự kiện SSE không đóng socket',
    'post-mortem-p1-ro-ri-bo-nho-nodejs-sse-socket-leak',
    '**Thời gian gián đoạn:** 42 phút
**Nguyên nhân gốc rễ (RCA):** Cổng Server-Sent Events khi client đóng tab trình duyệt không nhận được sự kiện đóng kịp thời do buffering proxy, khiến listener trong `SseManager` không được thu hồi.
**Khắc phục:** Bắt đồng thời `req.on("close")`, `res.on("close")`, header `X-Accel-Buffering: no` và dọn socket `writableEnded` trong vòng lặp heartbeat.',
    NULL, 'TEXT', 0, 0, 0, FALSE, TRUE,
    NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'
  );

-- 5. SEED NESTED COMMENTS (CÂY BÌNH LUẬN LTREE BASE36 CẤP 1 -> CẤP 8 + CAPPED DEPTH 9 + SOFT DELETE)
INSERT INTO comments (
    id, thread_id, author_id, parent_id, path, depth, content, reply_to_user_id, upvotes_count, downvotes_count, is_deleted, created_at, updated_at
)
VALUES
  -- [CẤP 1 - 1 chunk] Path: 0000
  (
    'e0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    NULL, '0000'::ltree, 1,
    'Kiến trúc chạy Podman rootless kết hợp Cloudflare Tunnel rất hay! Cho mình hỏi khi backup dữ liệu PostgreSQL thì cơ chế stream backup nén vào R2 bạn cấu hình thế nào để không làm gián đoạn I/O?',
    NULL, 18, 0, FALSE, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
  ),
  -- [CẤP 2 - 2 chunks] Path: 0000.0000
  (
    'e0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001', '0000.0000'::ltree, 2,
    'Mình chạy một cron job lúc 02:00 AM gọi `pg_dump` nén qua `gzip` rồi stream thẳng lên Cloudflare R2 bucket. Nhờ MVCC của Postgres nên quá trình dump không khóa bảng đọc/ghi.',
    'a0000000-0000-0000-0000-000000000004', 14, 0, FALSE, NOW() - INTERVAL '3 days 20 hours', NOW() - INTERVAL '3 days 20 hours'
  ),
  -- [CẤP 3 - 3 chunks]
  (
    'e0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000002', '0000.0000.0000'::ltree, 3,
    'Bổ sung thêm: Nếu CSDL lớn hơn 50GB thì nên chuyển sang `pgBackRest` hoặc `WAL-G` để backup vi sai theo block.',
    'a0000000-0000-0000-0000-000000000003', 9, 0, FALSE, NOW() - INTERVAL '3 days 15 hours', NOW() - INTERVAL '3 days 15 hours'
  ),
  -- [CẤP 4 - 4 chunks]
  (
    'e0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000003', '0000.0000.0000.0000'::ltree, 4,
    'Chuẩn bác, WAL archiving liên tục lên object storage kết hợp Point-in-Time Recovery (PITR) giúp khôi phục đúng giây trước sự cố.',
    'a0000000-0000-0000-0000-000000000002', 5, 0, FALSE, NOW() - INTERVAL '3 days 10 hours', NOW() - INTERVAL '3 days 10 hours'
  ),
  -- [CẤP 5 - 5 chunks]
  (
    'e0000000-0000-0000-0000-000000000005',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000004', '0000.0000.0000.0000.0000'::ltree, 5,
    'Hiện tại Homelab DB ~2GB nên giải pháp stream dump vẫn phản hồi dưới 15 giây.',
    'a0000000-0000-0000-0000-000000000004', 4, 0, FALSE, NOW() - INTERVAL '2 days 18 hours', NOW() - INTERVAL '2 days 18 hours'
  ),
  -- [CẤP 6 - 6 chunks]
  (
    'e0000000-0000-0000-0000-000000000006',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000005', '0000.0000.0000.0000.0000.0000'::ltree, 6,
    'Cloudflare R2 miễn phí egress bandwidth nên đồng bộ bản sao rất tiết kiệm.',
    'a0000000-0000-0000-0000-000000000003', 6, 0, FALSE, NOW() - INTERVAL '2 days 12 hours', NOW() - INTERVAL '2 days 12 hours'
  ),
  -- [CẤP 7 - 7 chunks]
  (
    'e0000000-0000-0000-0000-000000000007',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000006', '0000.0000.0000.0000.0000.0000.0000'::ltree, 7,
    'Lưu ý token truy cập R2 cần xoay vòng định kỳ 90 ngày để đáp ứng chuẩn Zero Trust.',
    'a0000000-0000-0000-0000-000000000004', 8, 0, FALSE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
  ),
  -- [CẤP 8 - ĐỦ 8 CHUNKS - NGƯỠNG TỐI ĐA]
  (
    'e0000000-0000-0000-0000-000000000008',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000007', '0000.0000.0000.0000.0000.0000.0000.0000'::ltree, 8,
    'Cảm ơn anh đã nhắc nhở, em đã cấu hình Vault Agent tự động rotate API secret.',
    'a0000000-0000-0000-0000-000000000001', 3, 0, FALSE, NOW() - INTERVAL '1 day 18 hours', NOW() - INTERVAL '1 day 18 hours'
  ),
  -- [CẤP 9 FLAT REPLY - GIỮ NGUYÊN PATH 8 CHUNKS & DEPTH = 8 KÈM @MENTION]
  (
    'e0000000-0000-0000-0000-000000000012',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000008', '0000.0000.0000.0000.0000.0000.0000.0000'::ltree, 8,
    '@devops_coder Rất chuẩn! Bình luận này đạt ngưỡng Capped Depth 8 nên hệ thống tự động giữ phẳng kèm @mention để không vỡ khung hình di động.',
    'a0000000-0000-0000-0000-000000000004', 7, 0, FALSE, NOW() - INTERVAL '1 day 12 hours', NOW() - INTERVAL '1 day 12 hours'
  ),

  -- [NHÁNH SOFT-DELETED ĐỂ TEST BẢO TOÀN CÂY CON] Path: 0000.0001 & 0000.0001.0000
  (
    'e0000000-0000-0000-0000-000000000009',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000001', '0000.0001'::ltree, 2,
    '[Bình luận đã bị xóa bởi tác giả]',
    'a0000000-0000-0000-0000-000000000004', 0, 2, TRUE, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days 20 hours'
  ),
  (
    'e0000000-0000-0000-0000-000000000010',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000009', '0000.0001.0000'::ltree, 3,
    'Phản hồi này vẫn được bảo toàn nguyên vẹn nhờ mô hình ltree materialized path: nút cha bị soft-delete không làm gãy cây con.',
    'a0000000-0000-0000-0000-000000000005', 11, 0, FALSE, NOW() - INTERVAL '2 days 19 hours', NOW() - INTERVAL '2 days 19 hours'
  ),

  -- [CẤP 1 - NÚT GỐC 2 CHO THREAD 1] Path: 0001
  (
    'e0000000-0000-0000-0000-000000000011',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    NULL, '0001'::ltree, 1,
    'Đã kiểm chứng bài viết. Cụm Systemd user unit vận hành ổn định liên tục trên Linux kernel của Debian 12/13.',
    NULL, 25, 0, FALSE, NOW() - INTERVAL '4 days 2 hours', NOW() - INTERVAL '4 days 2 hours'
  ),

  -- Comments cho Thread 2 (Phỏng vấn SRE)
  (
    'e0000000-0000-0000-0000-000000000013',
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000007',
    NULL, '0000'::ltree, 1,
    'Vòng phỏng vấn Linux Kernel có bị hỏi sâu về Cgroups v2 memory.max và OOMKilled không bác?',
    NULL, 45, 0, FALSE, NOW() - INTERVAL '3 days 12 hours', NOW() - INTERVAL '3 days 12 hours'
  ),
  (
    'e0000000-0000-0000-0000-000000000014',
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000013', '0000.0000'::ltree, 2,
    'Có hỏi rất kỹ! Case kinh điển: đọc `/sys/fs/cgroup/memory.events` xem trường `oom_kill` và sysctl `net.core.somaxconn`.',
    'a0000000-0000-0000-0000-000000000007', 38, 0, FALSE, NOW() - INTERVAL '3 days 8 hours', NOW() - INTERVAL '3 days 8 hours'
  ),
  (
    'e0000000-0000-0000-0000-000000000015',
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    NULL, '0001'::ltree, 1,
    'Roadmap rất chất lượng. Phần Behavioral & Incident Postmortem các công ty Big Tech đánh giá cực cao tư duy Blameless RCA.',
    NULL, 52, 0, FALSE, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
  );

COMMIT;
