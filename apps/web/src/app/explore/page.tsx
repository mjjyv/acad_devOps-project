'use client';

import type { Space } from '@acad/contracts';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { CreateSpaceModal } from '@/components/spaces/create-space-modal';
import { ExploreIcon, PlusIcon, SearchIcon } from '@/components/ui/icons';
import { extractApiErrorMessage } from '@/lib/api/client';
import { CommunityApi, type SpaceTopicStat } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, requireAuth } = useAuth();
  const { showToast } = useUI();

  const selectedTopic = searchParams.get('topic') ?? '';
  const initialQ = searchParams.get('q') ?? '';

  const [topics, setTopics] = useState<SpaceTopicStat[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [searchText, setSearchText] = useState(initialQ);
  const [debouncedSearch, setDebouncedSearch] = useState(initialQ);
  const [loading, setLoading] = useState(true);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 220);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadExplore = useCallback(async () => {
    void isAuthenticated;
    try {
      setLoading(true);
      const [topicList, spaceList] = await Promise.all([
        CommunityApi.getTopics(),
        CommunityApi.getSpaces(50, 0, {
          ...(selectedTopic ? { topic: selectedTopic } : {}),
          ...(debouncedSearch ? { q: debouncedSearch } : {}),
        }),
      ]);
      setTopics(topicList);
      setSpaces(spaceList);
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể tải danh sách không gian'), 'error');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedTopic, debouncedSearch, showToast]);

  useEffect(() => {
    void loadExplore();
  }, [loadExplore]);

  const selectTopic = (topic: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (topic) {
      params.set('topic', topic);
    } else {
      params.delete('topic');
    }
    const qs = params.toString();
    router.push(qs ? `/explore?${qs}` : '/explore');
  };

  const handleToggleJoin = (space: Space) => {
    requireAuth(async () => {
      if (busySlug) return;
      try {
        setBusySlug(space.slug);
        if (space.isJoined) {
          await CommunityApi.leaveSpace(space.slug);
          setSpaces((prev) =>
            prev.map((item) =>
              item.id === space.id
                ? {
                    ...item,
                    isJoined: false,
                    membersCount: Math.max(0, item.membersCount - 1),
                  }
                : item,
            ),
          );
          showToast(`Đã rời khỏi s/${space.slug}`, 'info');
        } else {
          await CommunityApi.joinSpace(space.slug);
          setSpaces((prev) =>
            prev.map((item) =>
              item.id === space.id
                ? {
                    ...item,
                    isJoined: true,
                    membersCount: item.membersCount + 1,
                  }
                : item,
            ),
          );
          showToast(`Đã tham gia s/${space.slug}`, 'success');
        }
      } catch (err) {
        showToast(extractApiErrorMessage(err, 'Không thể cập nhật trạng thái tham gia'), 'error');
      } finally {
        setBusySlug(null);
      }
    }, `Đăng nhập để tham gia s/${space.slug}`);
  };

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <section
          className="surface-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            padding: '18px 20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ExploreIcon size={24} />
              <div>
                <h1 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Khám phá Không gian (Explore Spaces)
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Tìm theo chủ đề học thuật, DevOps hoặc tạo không gian thảo luận của riêng bạn.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => requireAuth(() => setCreateOpen(true), 'Đăng nhập để tạo Space mới')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusIcon size={16} />
              <span>Tạo Space mới</span>
            </button>
          </div>

          {/* Search input */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <SearchIcon
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                color: 'var(--text-muted)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Lọc không gian theo tên, slug hoặc mô tả..."
              className="input-field"
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Topic Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              type="button"
              onClick={() => selectTopic('')}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-full)',
                border: !selectedTopic
                  ? '1px solid var(--border-focus)'
                  : '1px solid var(--border-subtle)',
                backgroundColor: !selectedTopic ? 'var(--bg-pill-hover)' : 'var(--bg-subtle)',
                color: !selectedTopic ? 'var(--color-brand)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: !selectedTopic ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              Tất cả chủ đề
            </button>
            {topics.map((t) => {
              const active = selectedTopic === t.topic;
              return (
                <button
                  key={t.topic}
                  type="button"
                  onClick={() => selectTopic(t.topic)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    border: active
                      ? '1px solid var(--border-focus)'
                      : '1px solid var(--border-subtle)',
                    backgroundColor: active ? 'var(--bg-pill-hover)' : 'var(--bg-subtle)',
                    color: active ? 'var(--color-brand)' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {t.topic} ({t.spacesCount})
                </button>
              );
            })}
          </div>
        </section>

        {loading ? (
          <div className="surface-card" style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
            Đang tải danh sách không gian...
          </div>
        ) : spaces.length === 0 ? (
          <div
            className="surface-card"
            style={{ textAlign: 'center', padding: '28px 20px', color: 'var(--text-secondary)' }}
          >
            Không tìm thấy không gian phù hợp bộ lọc hiện tại.
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
              <article
                key={space.id}
                data-testid={`explore-space-card-${space.slug}`}
                className="surface-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <Link
                      href={`/s/${space.slug}`}
                      style={{
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'var(--color-brand)',
                        textDecoration: 'none',
                      }}
                    >
                      s/{space.slug}
                    </Link>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--bg-pill)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {space.isPrivate ? 'Riêng tư' : space.topic}
                    </span>
                  </div>

                  <Link
                    href={`/s/${space.slug}`}
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    {space.name}
                  </Link>

                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {space.description || 'Không gian thảo luận học thuật & thực hành kỹ thuật.'}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-divider)',
                    paddingTop: '10px',
                    gap: '8px',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <strong>{space.membersCount}</strong> thành viên ·{' '}
                    <strong>{space.threadsCount}</strong> bài viết
                  </div>

                  <button
                    type="button"
                    disabled={busySlug === space.slug}
                    onClick={() => handleToggleJoin(space)}
                    className={space.isJoined ? 'btn-ghost' : 'btn-primary'}
                    style={{ padding: '5px 12px', fontSize: '12.5px' }}
                  >
                    {space.isJoined ? 'Đã tham gia' : 'Tham gia'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <CreateSpaceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(created) => {
          setSpaces((prev) => [created, ...prev]);
          router.push(`/s/${created.slug}`);
        }}
      />
    </AppShell>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="surface-card" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Đang tải Explore...
          </div>
        </AppShell>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
