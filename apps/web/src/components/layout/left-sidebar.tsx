'use client';

import type { Space } from '@acad/contracts';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CommunityApi, type SpaceTopicStat } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';
import { CreateSpaceModal } from '../spaces/create-space-modal';
import { ExploreIcon, HomeIcon, PlusIcon, PopularIcon, ShieldIcon } from '../ui/icons';

export function LeftSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { sidebarOpen, activeFeedTab, setActiveFeedTab, setFeedSort } = useUI();
  const { isAuthenticated, requireAuth, user } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [topics, setTopics] = useState<SpaceTopicStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);

  useEffect(() => {
    void isAuthenticated;
    let active = true;
    async function loadNavData() {
      try {
        setLoading(true);
        const [liveSpaces, liveTopics] = await Promise.all([
          CommunityApi.getSpaces(30, 0),
          CommunityApi.getTopics(),
        ]);
        if (active) {
          setSpaces(liveSpaces);
          setTopics(liveTopics);
        }
      } catch {
        if (active) {
          setSpaces([]);
          setTopics([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadNavData();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const joinedSpaces = spaces.filter((s) => s.isJoined);
  const publicSpaces = spaces.filter((s) => !s.isJoined);

  const navLinkStyle = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    borderRadius: 'var(--radius-md)',
    backgroundColor: active ? 'var(--bg-surface-hover)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    textDecoration: 'none',
    fontWeight: active ? 700 : 500,
    fontSize: '13.5px',
  });

  return (
    <>
      <aside
        className="app-sidebar"
        style={{
          width: 'var(--sidebar-width)',
          flexShrink: 0,
          height: 'calc(100vh - var(--header-height))',
          position: 'sticky',
          top: 'var(--header-height)',
          overflowY: 'auto',
          borderRight: '1px solid var(--border-subtle)',
          padding: '14px 12px 28px',
          display: sidebarOpen ? 'flex' : 'none',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: 'var(--bg-canvas)',
          zIndex: 45,
        }}
      >
        <nav
          aria-label="Điều hướng chính"
          style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
        >
          <Link
            href="/?tab=following"
            onClick={() => setActiveFeedTab('following')}
            style={navLinkStyle(pathname === '/' && activeFeedTab === 'following')}
          >
            <HomeIcon size={18} />
            <span>Home</span>
          </Link>
          <Link
            href="/?tab=for_you&sort=hot"
            onClick={() => {
              setActiveFeedTab('for_you');
              setFeedSort('hot');
            }}
            style={navLinkStyle(pathname === '/' && activeFeedTab === 'for_you')}
          >
            <PopularIcon size={18} />
            <span>Popular</span>
          </Link>
          <Link href="/explore" style={navLinkStyle(pathname.startsWith('/explore'))}>
            <ExploreIcon size={18} />
            <span>Explore Spaces</span>
          </Link>
          {(user?.role === 'ADMIN' || user?.role === 'GLOBAL_MOD') && (
            <Link href="/admin" style={navLinkStyle(pathname.startsWith('/admin'))}>
              <ShieldIcon size={18} />
              <span>Admin Console</span>
            </Link>
          )}
        </nav>

        <div style={{ borderTop: '1px solid var(--border-divider)', paddingTop: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px 8px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
            }}
          >
            <span>Chủ đề</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {topics.length === 0 && !loading ? (
              <span style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Chưa có chủ đề
              </span>
            ) : (
              topics.map((t) => (
                <Link
                  key={t.topic}
                  href={`/explore?topic=${encodeURIComponent(t.topic)}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                  }}
                >
                  <span>{t.topic}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {t.spacesCount}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-divider)', paddingTop: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px 8px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
            }}
          >
            <span>Không gian ({spaces.length})</span>
            <button
              type="button"
              onClick={() => requireAuth(() => setCreateSpaceOpen(true), 'Đăng nhập để tạo Space')}
              aria-label="Tạo Space mới"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-brand)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <PlusIcon size={15} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {loading ? (
              <span style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Đang tải Spaces...
              </span>
            ) : (
              [...joinedSpaces, ...publicSpaces].slice(0, 12).map((s) => (
                <Link
                  key={s.id}
                  href={`/s/${s.slug}`}
                  style={navLinkStyle(pathname === `/s/${s.slug}`)}
                >
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-badge)',
                      color: 'var(--color-brand)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    s/
                  </span>
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                  >
                    {s.slug}
                  </span>
                  {s.isJoined && (
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--bg-pill)',
                        color: 'var(--color-brand)',
                      }}
                    >
                      Joined
                    </span>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>
      </aside>

      <CreateSpaceModal
        open={createSpaceOpen}
        onClose={() => setCreateSpaceOpen(false)}
        onCreated={(created) => {
          setSpaces((prev) => [created, ...prev]);
          router.push(`/s/${created.slug}`);
        }}
      />
    </>
  );
}
