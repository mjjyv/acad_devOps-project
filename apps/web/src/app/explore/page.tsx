'use client';

import type { Space } from '@acad/contracts';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { RightRail } from '@/components/layout/right-rail';
import { CreateSpaceModal } from '@/components/spaces/create-space-modal';
import { ExploreIcon, PlusIcon } from '@/components/ui/icons';
import { CommunityApi, SPACE_TOPICS } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, requireAuth } = useAuth();
  const { showToast } = useUI();

  const activeTopic = searchParams.get('topic') || 'ALL';
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadSpaces = useCallback(async () => {
    try {
      setLoading(true);
      const data = await CommunityApi.getSpaces(100, 0, {
        topic: activeTopic !== 'ALL' ? activeTopic : undefined,
        q: debouncedQuery || undefined,
      });
      setSpaces(data);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Không thể tải danh sách cộng đồng');
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  }, [activeTopic, debouncedQuery, showToast]);

  useEffect(() => {
    void isAuthenticated;
    void loadSpaces();
  }, [isAuthenticated, loadSpaces]);

  const handleSelectTopic = (topic: string) => {
    const qs = new URLSearchParams();
    if (topic !== 'ALL') qs.set('topic', topic);
    if (searchInput.trim()) qs.set('q', searchInput.trim());
    const nextSearch = qs.toString();
    router.replace(nextSearch ? `/explore?${nextSearch}` : '/explore');
  };

  const handleToggleMembership = (space: Space) => {
    requireAuth(async () => {
      try {
        setPendingSlug(space.slug);
        if (space.isJoined) {
          await CommunityApi.leaveSpace(space.slug);
          setSpaces((prev) =>
            prev.map((s) =>
              s.id === space.id
                ? { ...s, isJoined: false, membersCount: Math.max(0, s.membersCount - 1) }
                : s,
            ),
          );
          showToast(`Đã rời khỏi s/${space.slug}`);
        } else {
          await CommunityApi.joinSpace(space.slug);
          setSpaces((prev) =>
            prev.map((s) =>
              s.id === space.id ? { ...s, isJoined: true, membersCount: s.membersCount + 1 } : s,
            ),
          );
          showToast(`Đã tham gia s/${space.slug}`);
        }
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái thành viên');
      } finally {
        setPendingSlug(null);
      }
    }, 'Đăng nhập để tham gia cộng đồng thảo luận');
  };

  return (
    <>
      <div className="reddit-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ExploreIcon size={24} style={{ color: 'var(--color-brand)' }} />
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                Khám Phá Cộng Đồng (Explore Spaces)
              </h1>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Tham gia các không gian chuyên sâu để cá nhân hóa bảng tin Home của bạn.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="reddit-pill-btn primary"
            style={{
              height: '34px',
              fontSize: '12px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onClick={() =>
              requireAuth(() => setIsCreateOpen(true), 'Đăng nhập để tạo cộng đồng mới')
            }
          >
            <PlusIcon size={14} /> Tạo cộng đồng
          </button>
        </div>

        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Tìm không gian theo tên, slug hoặc mô tả..."
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            marginBottom: '12px',
          }}
        />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`reddit-pill-btn ${activeTopic === 'ALL' ? 'primary' : ''}`}
            style={{ height: '28px', fontSize: '12px' }}
            onClick={() => handleSelectTopic('ALL')}
          >
            Tất cả chủ đề
          </button>
          {SPACE_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              className={`reddit-pill-btn ${activeTopic === topic ? 'primary' : ''}`}
              style={{ height: '28px', fontSize: '12px' }}
              onClick={() => handleSelectTopic(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="reddit-card"
              style={{ padding: '16px', height: '140px', opacity: 0.6 }}
            />
          ))}
        </div>
      ) : spaces.length === 0 ? (
        <div className="reddit-card" style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            Chưa có cộng đồng nào phù hợp với bộ lọc hiện tại.
          </p>
          {activeTopic !== 'ALL' && (
            <button
              type="button"
              className="reddit-pill-btn"
              onClick={() => handleSelectTopic('ALL')}
            >
              Xem tất cả chủ đề
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
          }}
        >
          {spaces.map((space) => (
            <div
              key={space.id}
              className="reddit-card"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '6px',
                  }}
                >
                  <Link href={`/s/${space.slug}`} style={{ textDecoration: 'none' }}>
                    <div
                      style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' }}
                    >
                      s/{space.slug}
                    </div>
                    <div
                      style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}
                    >
                      {space.name}
                    </div>
                  </Link>
                  <button
                    type="button"
                    disabled={pendingSlug === space.slug}
                    onClick={() => handleToggleMembership(space)}
                    className={`reddit-pill-btn ${space.isJoined ? '' : 'primary'}`}
                    style={{ height: '28px', fontSize: '11px', flexShrink: 0 }}
                  >
                    {pendingSlug === space.slug
                      ? '...'
                      : space.isJoined
                        ? 'Đã tham gia'
                        : 'Tham gia'}
                  </button>
                </div>

                {space.description && (
                  <p
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                      marginBottom: '8px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {space.description}
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <span>{space.topic}</span>
                <span>
                  {space.membersCount} thành viên • {space.threadsCount} bài
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateSpaceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={() => void loadSpaces()}
      />
    </>
  );
}

export default function ExplorePage() {
  return (
    <div className="app-shell">
      <Header />
      <div className="app-container">
        <LeftSidebar />
        <main className="main-content">
          <Suspense
            fallback={
              <div className="reddit-card" style={{ padding: '24px', color: 'var(--text-muted)' }}>
                Đang tải danh sách cộng đồng...
              </div>
            }
          >
            <ExploreContent />
          </Suspense>
        </main>
        <RightRail />
      </div>
      <BottomNav />
      <FloatingChatWidget />
    </div>
  );
}
