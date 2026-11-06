'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { SessionsModal } from '@/components/auth/sessions-modal';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { PostCard, type PostItem } from '@/components/feed/post-card';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { FireIcon, ShieldIcon } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

const USER_MOCK_POSTS: PostItem[] = [
  {
    id: 'user-post-1',
    spaceSlug: 'devops-arch',
    spaceName: 'DevOps Architecture',
    spaceColor: '#10b981',
    author: 'demo_user',
    timeAgo: '1 day ago',
    title:
      'Triển khai Self-Hosted Homelab Monorepo: Podman Rootless, Cloudflare Tunnel và Next.js 15 SSR High Availability',
    bodySnippet:
      'Tối ưu hóa tài nguyên phần cứng, triệt tiêu chi phí Cloud đắt đỏ với mô hình Zero Trust Cloudflare Tunnel kết hợp Systemd User Daemons và PostgreSQL 16 ltree nested tree CMS.',
    upvotes: 562,
    comments: 112,
    hasJoined: true,
  },
  {
    id: 'user-post-2',
    spaceSlug: 'vozforums',
    spaceName: 'Voz Forums',
    spaceColor: '#ff4500',
    author: 'demo_user',
    timeAgo: '3 days ago',
    title:
      'Chia sẻ kinh nghiệm phỏng vấn DevOps Engineer và SRE tại các công ty Big Tech & Unicorn',
    bodySnippet:
      'Roadmap ôn tập từ Linux kernel internals, networking TCP/IP, Kubernetes architecture, và deep-dive distributed system...',
    upvotes: 428,
    comments: 89,
    hasJoined: true,
  },
];

export default function UserProfilePage() {
  const params = useParams();
  const username = typeof params?.username === 'string' ? params.username : 'User';
  const { user: currentUser } = useAuth();
  const { showToast } = useUI();

  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'comments' | 'saved'>(
    'overview',
  );
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);

  const isOwnProfile = currentUser?.username === username;
  const karmaScore = isOwnProfile ? currentUser?.karmaScore || 0 : 1240;
  const role = isOwnProfile ? currentUser?.role || 'USER' : 'USER';
  const joinedDate =
    isOwnProfile && currentUser?.createdAt
      ? new Date(currentUser.createdAt).toLocaleDateString('vi-VN', {
          month: 'long',
          year: 'numeric',
        })
      : 'Tháng 11 năm 2026';

  return (
    <div className="app-shell">
      <Header />

      <div className="app-container" style={{ maxWidth: '1080px' }}>
        {/* Main Profile Feed Stream */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Profile Banner & Header */}
          <div
            className="reddit-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              marginBottom: '16px',
            }}
          >
            {/* Banner Background */}
            <div
              style={{
                height: '110px',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #ff4500 150%)',
              }}
            />

            {/* Profile Avatar Bar */}
            <div style={{ padding: '0 20px 20px 20px', position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  marginTop: '-44px',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    width: '84px',
                    height: '84px',
                    borderRadius: '50%',
                    backgroundColor: '#1a1a1b',
                    border: '4px solid var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    fontWeight: 800,
                    color: 'var(--color-brand)',
                    boxShadow: 'var(--shadow-dropdown)',
                  }}
                >
                  {username.charAt(0).toUpperCase()}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => setIsSessionsOpen(true)}
                      className="reddit-pill-btn"
                      style={{ gap: '6px' }}
                    >
                      <ShieldIcon size={14} />
                      <span>Phiên Đăng Nhập</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => showToast('Chia sẻ hồ sơ cá nhân')}
                    className="reddit-pill-btn"
                  >
                    Chia Sẻ
                  </button>
                </div>
              </div>

              {/* Username & Bio */}
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}
              >
                <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  u/{username}
                </h1>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: role === 'ADMIN' ? 'var(--color-danger)' : 'var(--bg-badge)',
                    color: '#ffffff',
                  }}
                >
                  {role}
                </span>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {isOwnProfile && currentUser?.bio
                  ? currentUser.bio
                  : 'Kỹ sư hệ thống & Thành viên tích cực đóng góp trên cộng đồng thảo luận Acad DevOps Platform.'}
              </p>
            </div>

            {/* Profile Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '0 16px',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              {(['overview', 'posts', 'comments', 'saved'] as const).map((tab) => {
                const isActive = activeTab === tab;
                const label =
                  tab === 'overview'
                    ? 'Tổng quan'
                    : tab === 'posts'
                      ? 'Bài viết'
                      : tab === 'comments'
                        ? 'Bình luận'
                        : 'Đã lưu';
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '12px 14px',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                      position: 'relative',
                    }}
                  >
                    {label}
                    {isActive && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 14,
                          right: 14,
                          height: '3px',
                          backgroundColor: 'var(--color-brand)',
                          borderRadius: '2px',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content Stream */}
          <div>
            {USER_MOCK_POSTS.map((post) => (
              <PostCard key={post.id} post={{ ...post, author: username }} />
            ))}
          </div>
        </main>

        {/* Right Info Rail */}
        <aside
          style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}
          className="app-right-rail"
        >
          {/* Karma & Stats Widget */}
          <div className="reddit-card">
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '14px',
              }}
            >
              Điểm Tín Nhiệm & Thành Tích
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  backgroundColor: 'var(--bg-input)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: 'var(--color-brand)',
                    marginBottom: '2px',
                  }}
                >
                  <FireIcon size={16} />
                  <span style={{ fontSize: '16px', fontWeight: 800 }}>{karmaScore}</span>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tổng Karma</span>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-input)',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <span
                  style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    display: 'block',
                    marginBottom: '2px',
                  }}
                >
                  {isOwnProfile ? currentUser?.threadsCount || 2 : 2}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bài Thảo Luận</span>
              </div>
            </div>

            <div
              style={{
                borderTop: '1px solid var(--border-subtle)',
                paddingTop: '12px',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <span>
                🗓️ Gia nhập từ: <strong>{joinedDate}</strong>
              </span>
            </div>
          </div>
        </aside>
      </div>

      <BottomNav />
      <FloatingChatWidget />

      {/* Sessions Modal */}
      <SessionsModal isOpen={isSessionsOpen} onClose={() => setIsSessionsOpen(false)} />
    </div>
  );
}
