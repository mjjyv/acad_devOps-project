-- ==============================================================================
-- ACAD DEVOPS PLATFORM (SYNAPSE ENGINE) - SEED DỮ LIỆU PHÂN HỆ 1 (AUTH & SESSIONS)
-- File: deploy/seeds/001_auth_seed.sql
-- Mật khẩu mẫu toàn bộ tài khoản kiểm thử: Password123!
-- Lưu ý: karma_score khởi tạo = 0 để 100% tính thật qua trigger từ thread_votes & comment_votes
-- ==============================================================================

BEGIN;

DELETE FROM users
WHERE id NOT IN (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000005',
    'a0000000-0000-0000-0000-000000000006',
    'a0000000-0000-0000-0000-000000000007',
    'a0000000-0000-0000-0000-000000000008',
    'a0000000-0000-0000-0000-000000000009'
)
AND (
    LOWER(username) IN ('admin_pro', 'mod_lead', 'cloud_architect', 'devops_coder', 'stealth_spammer', 'banned_actor', 'sre_expert', 'devops_ninja', 'lawyer_tech')
    OR LOWER(email) IN ('admin@acad.vn', 'mod@acad.vn', 'architect@acad.vn', 'coder@acad.vn', 'spammer@acad.vn', 'banned@acad.vn', 'sre@acad.vn', 'ninja@acad.vn', 'lawtech@acad.vn')
);

INSERT INTO users (
    id, username, email, password_hash, role, status, karma_score, threads_count, avatar_url, bio, created_at, updated_at
)
VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    'admin_pro',
    'admin@acad.vn',
    '$scrypt$N=16384,r=8,p=1$b255175bbd6ad58ead522b940ced70ac$e91917e2bb6e3deab4ea3583f6a9425d4d0a1e8dcde2132f8ef5b422186b5e61489309cbe105e52cf5a1015d98db308e016454c642e5309b32f63e18b5bea426',
    'ADMIN',
    'ACTIVE',
    0,
    0,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    'Lead Systems Architect & Core Admin. Giám sát độ tin cậy và bảo mật cụm dịch vụ phân tán.',
    NOW() - INTERVAL '60 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000002',
    'mod_lead',
    'mod@acad.vn',
    '$scrypt$N=16384,r=8,p=1$b255175bbd6ad58ead522b940ced70ac$e91917e2bb6e3deab4ea3583f6a9425d4d0a1e8dcde2132f8ef5b422186b5e61489309cbe105e52cf5a1015d98db308e016454c642e5309b32f63e18b5bea426',
    'GLOBAL_MOD',
    'ACTIVE',
    0,
    0,
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    'Global Moderator & DevSecOps Lead. Điều phối Mod Queue và xử lý vi phạm nội dung hệ thống.',
    NOW() - INTERVAL '45 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000003',
    'cloud_architect',
    'architect@acad.vn',
    '$scrypt$N=16384,r=8,p=1$b255175bbd6ad58ead522b940ced70ac$e91917e2bb6e3deab4ea3583f6a9425d4d0a1e8dcde2132f8ef5b422186b5e61489309cbe105e52cf5a1015d98db308e016454c642e5309b32f63e18b5bea426',
    'SPACE_MOD',
    'ACTIVE',
    0,
    0,
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    'Principal Infrastructure Architect. Chuyên sâu về Kubernetes internals, High Availability, eBPF & Zero Trust.',
    NOW() - INTERVAL '30 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000004',
    'devops_coder',
    'coder@acad.vn',
    '$scrypt$N=16384,r=8,p=1$b255175bbd6ad58ead522b940ced70ac$e91917e2bb6e3deab4ea3583f6a9425d4d0a1e8dcde2132f8ef5b422186b5e61489309cbe105e52cf5a1015d98db308e016454c642e5309b32f63e18b5bea426',
    'USER',
    'ACTIVE',
    0,
    0,
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
    'Senior DevOps Engineer. Thiết kế CI/CD pipeline, GitOps ArgoCD và hạ tầng tự host.',
    NOW() - INTERVAL '20 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000005',
    'stealth_spammer',
    'spammer@acad.vn',
    '$scrypt$N=16384,r=8,p=1$b255175bbd6ad58ead522b940ced70ac$e91917e2bb6e3deab4ea3583f6a9425d4d0a1e8dcde2132f8ef5b422186b5e61489309cbe105e52cf5a1015d98db308e016454c642e5309b32f63e18b5bea426',
    'USER',
    'SHADOWBANNED',
    0,
    0,
    NULL,
    'Tài khoản thử nghiệm cơ chế cấm ngầm (Shadowban Engine).',
    NOW() - INTERVAL '12 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000006',
    'banned_actor',
    'banned@acad.vn',
    '$scrypt$N=16384,r=8,p=1$b255175bbd6ad58ead522b940ced70ac$e91917e2bb6e3deab4ea3583f6a9425d4d0a1e8dcde2132f8ef5b422186b5e61489309cbe105e52cf5a1015d98db308e016454c642e5309b32f63e18b5bea426',
    'USER',
    'SUSPENDED',
    0,
    0,
    NULL,
    'Tài khoản bị đình chỉ hoạt động do vi phạm quy chuẩn cộng đồng.',
    NOW() - INTERVAL '10 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000007',
    'sre_expert',
    'sre@acad.vn',
    '$scrypt$N=16384,r=8,p=1$b255175bbd6ad58ead522b940ced70ac$e91917e2bb6e3deab4ea3583f6a9425d4d0a1e8dcde2132f8ef5b422186b5e61489309cbe105e52cf5a1015d98db308e016454c642e5309b32f63e18b5bea426',
    'USER',
    'ACTIVE',
    0,
    0,
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    'Site Reliability Engineer & Postgres DBA. Quan sát hệ thống phân tán và Chaos Engineering.',
    NOW() - INTERVAL '18 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000008',
    'devops_ninja',
    'ninja@acad.vn',
    '$scrypt$N=16384,r=8,p=1$b255175bbd6ad58ead522b940ced70ac$e91917e2bb6e3deab4ea3583f6a9425d4d0a1e8dcde2132f8ef5b422186b5e61489309cbe105e52cf5a1015d98db308e016454c642e5309b32f63e18b5bea426',
    'USER',
    'ACTIVE',
    0,
    0,
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
    'Platform Engineer chuyên eBPF, Cilium và Kernel tuning.',
    NOW() - INTERVAL '14 days',
    NOW()
  ),
  (
    'a0000000-0000-0000-0000-000000000009',
    'lawyer_tech',
    'lawtech@acad.vn',
    '$scrypt$N=16384,r=8,p=1$b255175bbd6ad58ead522b940ced70ac$e91917e2bb6e3deab4ea3583f6a9425d4d0a1e8dcde2132f8ef5b422186b5e61489309cbe105e52cf5a1015d98db308e016454c642e5309b32f63e18b5bea426',
    'USER',
    'ACTIVE',
    0,
    0,
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    'Chuyên gia tư vấn An toàn thông tin & Tuân thủ Nghị định 13/2023.',
    NOW() - INTERVAL '10 days',
    NOW()
  )
ON CONFLICT (id) DO UPDATE
SET username = EXCLUDED.username,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    bio = EXCLUDED.bio,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();

INSERT INTO user_sessions (
    id, user_id, refresh_token_hash, previous_token_hash, grace_period_expires_at,
    device_fingerprint, ip_address, user_agent, is_revoked, expires_at, created_at, updated_at
)
VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    NULL,
    NULL,
    'debian13_xfce_x86_64_admin_station',
    '127.0.0.1'::inet,
    'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
    FALSE,
    NOW() + INTERVAL '7 days',
    NOW() - INTERVAL '1 hour',
    NOW() - INTERVAL '1 hour'
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000004',
    'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    '1111111111111111111111111111111111111111111111111111111111111111',
    NOW() + INTERVAL '25 seconds',
    'macos_arm64_safari_developer',
    '192.168.1.150'::inet,
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Chrome/120.0',
    FALSE,
    NOW() + INTERVAL '7 days',
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '5 seconds'
  ),
  (
    'f1000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000004',
    '2222222222222222222222222222222222222222222222222222222222222222',
    NULL,
    NULL,
    'iphone15_mobile_safari',
    '14.232.208.55'::inet,
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) Mobile/15E148',
    TRUE,
    NOW() + INTERVAL '3 days',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '2 days'
  )
ON CONFLICT (id) DO UPDATE
SET refresh_token_hash = EXCLUDED.refresh_token_hash,
    previous_token_hash = EXCLUDED.previous_token_hash,
    grace_period_expires_at = EXCLUDED.grace_period_expires_at,
    is_revoked = EXCLUDED.is_revoked,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();

COMMIT;
