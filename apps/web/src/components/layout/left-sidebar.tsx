'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../lib/auth/auth-context';
import { useUI } from '../../lib/store/ui-context';
import { ExploreIcon, HomeIcon, PlusIcon, PopularIcon, ShieldIcon } from '../ui/icons';

export function LeftSidebar() {
  const { sidebarOpen, setSidebarOpen, showToast } = useUI();
  const { requireAuth } = useAuth();
  const [topicsExpanded, setTopicsExpanded] = useState(true);
  const [communitiesExpanded, setCommunitiesExpanded] = useState(true);

  const spacesList = [
    { slug: 'devops-arch', name: 'r/devops-arch', members: '1.2k', color: '#ff4500' },
    { slug: 'vozforums', name: 'r/vozforums', members: '4.5k', color: '#3b82f6' },
    { slug: 'vietnam', name: 'r/VietNam', members: '8.9k', color: '#ef4444' },
    { slug: 'database', name: 'r/database', members: '950', color: '#10b981' },
    { slug: 'kubernetes', name: 'r/kubernetes', members: '2.1k', color: '#8b5cf6' },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 40,
            backdropFilter: 'blur(2px)',
          }}
          className="sidebar-backdrop"
        />
      )}

      <aside
        style={{
          width: 'var(--sidebar-width)',
          flexShrink: 0,
          height: 'calc(100vh - var(--header-height))',
          position: 'sticky',
          top: 'var(--header-height)',
          overflowY: 'auto',
          borderRight: '1px solid var(--border-subtle)',
          padding: '16px 12px 32px 12px',
          display: sidebarOpen ? 'flex' : 'none',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: 'var(--bg-canvas)',
          zIndex: 45,
        }}
        className="app-sidebar"
      >
        {/* 1. Main Navigation Feeds */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface-hover)',
              color: 'var(--text-primary)',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            <HomeIcon size={20} style={{ color: 'var(--color-brand)' }} />
            <span>Home</span>
          </Link>

          <Link
            href="/?sort=hot"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <PopularIcon size={20} />
            <span>Popular</span>
          </Link>

          <Link
            href="/explore"
            onClick={(e) => {
              e.preventDefault();
              showToast('Trang Khám Phá Không Gian sẽ kích hoạt trong Phase F2');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '14px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            <ExploreIcon size={20} />
            <span>Explore</span>
          </Link>
        </div>

        {/* 2. Quick Action: Start a community */}
        <div>
          <button
            type="button"
            onClick={() =>
              requireAuth(
                () => showToast('Hộp thoại Tạo Không Gian sẽ kích hoạt trong Phase F2'),
                'Đăng nhập để khởi tạo cộng đồng mới',
              )
            }
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'transparent',
              border: '1px dashed var(--border-strong)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-brand)';
              e.currentTarget.style.color = 'var(--color-brand)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
          >
            <PlusIcon size={16} />
            <span>Start a community</span>
          </button>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

        {/* 3. Topics Section (Collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setTopicsExpanded(!topicsExpanded)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            <span>Topics</span>
            <span style={{ fontSize: '10px' }}>{topicsExpanded ? '▲' : '▼'}</span>
          </button>

          {topicsExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
              {[
                'DevOps & SRE',
                'Kubernetes Architecture',
                'PostgreSQL 16 & Redis 7',
                'Cloudflare Zero Trust',
                'Debian Linux Homelab',
              ].map((topic) => (
                <div
                  key={topic}
                  onClick={() => showToast(`Lọc theo chủ đề: ${topic}`)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {topic}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--border-subtle)', margin: '4px 0' }} />

        {/* 4. Communities Section */}
        <div>
          <button
            type="button"
            onClick={() => setCommunitiesExpanded(!communitiesExpanded)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              padding: '6px 10px',
              cursor: 'pointer',
            }}
          >
            <span>Communities ({spacesList.length})</span>
            <span style={{ fontSize: '10px' }}>{communitiesExpanded ? '▲' : '▼'}</span>
          </button>

          {communitiesExpanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
              {spacesList.map((space) => (
                <div
                  key={space.slug}
                  onClick={() => showToast(`Điều hướng đến không gian ${space.name}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: space.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: '#ffffff',
                      }}
                    >
                      {space.slug.charAt(0).toUpperCase()}
                    </div>
                    <span
                      style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
                    >
                      {space.name}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {space.members}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Moderation Quick Link for Admins */}
        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              showToast('Bảng điều khiển Quản Trị Mod Hub sẽ kích hoạt trong Phase F5');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#1b2920',
              border: '1px solid #285432',
              color: '#46d160',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '12px',
            }}
          >
            <ShieldIcon size={16} />
            <span>Mod Hub & Admin Console</span>
          </a>
        </div>
      </aside>
    </>
  );
}
