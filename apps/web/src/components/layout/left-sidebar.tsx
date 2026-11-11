'use client';

import type { Space } from '@acad/contracts';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CommunityApi } from '../../lib/api/community';
import { useAuth } from '../../lib/auth/auth-context';
import { useUI } from '../../lib/store/ui-context';
import { ExploreIcon, HomeIcon, PlusIcon, PopularIcon, ShieldIcon } from '../ui/icons';

export function LeftSidebar() {
  const router = useRouter();
  const { sidebarOpen, setActiveFeedTab, showToast } = useUI();
  const { isAuthenticated, requireAuth, user } = useAuth();
  const [topicsExpanded, setTopicsExpanded] = useState(true);
  const [communitiesExpanded, setCommunitiesExpanded] = useState(true);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);

  useEffect(() => {
    void isAuthenticated;
    let isMounted = true;
    async function fetchSpaces() {
      try {
        setLoadingSpaces(true);
        const liveSpaces = await CommunityApi.getSpaces(50, 0);
        if (isMounted) {
          setSpaces(Array.isArray(liveSpaces) ? liveSpaces : []);
        }
      } catch {
        if (isMounted) {
          setSpaces([]);
        }
      } finally {
        if (isMounted) {
          setLoadingSpaces(false);
        }
      }
    }
    fetchSpaces();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const joinedSpaces = spaces.filter((s) => s.isJoined);
  const unjoinedSpaces = spaces.filter((s) => !s.isJoined);

  return (
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
        boxShadow: sidebarOpen ? '4px 0 20px rgba(0, 0, 0, 0.4)' : 'none',
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
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <PopularIcon size={20} />
          <span>Popular</span>
        </Link>

        <Link
          href="/"
          onClick={() => setActiveFeedTab('for_you')}
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
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <ExploreIcon size={20} />
          <span>Explore</span>
        </Link>
      </div>

      {/* 2. Quick Action: Create Post / Space */}
      <div>
        <button
          type="button"
          onClick={() =>
            requireAuth(() => router.push('/submit'), 'Đăng nhập để tạo bài viết thảo luận mới')
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
          <span>Đăng bài mới</span>
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
          <span>
            {isAuthenticated ? 'CỘNG ĐỒNG CỦA BẠN' : 'KHÁM PHÁ CỘNG ĐỒNG'} (
            {isAuthenticated ? joinedSpaces.length : spaces.length})
          </span>
          <span style={{ fontSize: '10px' }}>{communitiesExpanded ? '▲' : '▼'}</span>
        </button>

        {communitiesExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
            {isAuthenticated && joinedSpaces.length > 0 ? (
              joinedSpaces.map((space) => (
                <Link
                  key={space.slug}
                  href={`/s/${space.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textDecoration: 'none',
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
                        backgroundColor: '#30364F',
                        border: '1px solid var(--color-brand)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'var(--color-brand)',
                      }}
                    >
                      {space.slug.charAt(0).toUpperCase()}
                    </div>
                    <span
                      style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}
                    >
                      s/{space.slug}
                    </span>
                  </div>
                  <span
                    style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 700 }}
                  >
                    ✓
                  </span>
                </Link>
              ))
            ) : isAuthenticated && joinedSpaces.length === 0 ? (
              <div
                style={{
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}
              >
                Bạn chưa tham gia không gian nào.
              </div>
            ) : null}

            {/* Other Spaces / Discover Spaces */}
            {loadingSpaces && spaces.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Đang tải danh sách không gian...
              </div>
            ) : (
              (isAuthenticated ? unjoinedSpaces : spaces).map((space) => (
                <Link
                  key={space.slug}
                  href={`/s/${space.slug}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    textDecoration: 'none',
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
                        backgroundColor: 'color' in space ? String(space.color) : '#30364F',
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
                      s/{space.slug}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {space.membersCount}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* 5. Moderation Quick Link for Admins & Mods */}
      {(user?.role === 'ADMIN' || user?.role === 'GLOBAL_MOD' || user?.role === 'SPACE_MOD') && (
        <div style={{ marginTop: 'auto', paddingTop: '16px' }}>
          <Link
            href="/s/incident-vault"
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
            <span>Incident Vault (Mod/Admin)</span>
          </Link>
        </div>
      )}
    </aside>
  );
}
