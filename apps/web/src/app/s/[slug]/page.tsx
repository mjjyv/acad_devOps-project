'use client';

import type { Space, SpaceFlair } from '@acad/contracts';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { PostCard, type PostItem } from '@/components/feed/post-card';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { SpaceHeader } from '@/components/spaces/space-header';
import { SpaceSidebar } from '@/components/spaces/space-sidebar';
import { ApiHttpError, CommunityApi, type FeedSortOption } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { mapThreadSummaryToPostItem } from '@/lib/utils/thread-mapper';

export default function SpacePage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const { isAuthenticated, openAuthModal } = useAuth();

  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  const [selectedFlairId, setSelectedFlairId] = useState<string | undefined>();
  const [spaceSort, setSpaceSort] = useState<FeedSortOption>('hot');
  const [spaceSearch, setSpaceSearch] = useState('');
  const [activeQuery, setActiveQuery] = useState('');

  const [space, setSpace] = useState<Space | null>(null);
  const [flairs, setFlairs] = useState<SpaceFlair[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [loadingSpace, setLoadingSpace] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);

  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void isAuthenticated;
    let isMounted = true;
    async function loadSpaceMeta() {
      if (!slug) return;
      try {
        setLoadingSpace(true);
        setNotFoundError(null);
        const data = await CommunityApi.getSpace(slug);
        if (isMounted) {
          setSpace(data.space);
          setFlairs(data.flairs);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setSpace(null);
          if (err instanceof ApiHttpError && err.status === 403) {
            setIsForbidden(true);
          } else {
            setNotFoundError(
              err instanceof Error ? err.message : `Không tìm thấy không gian s/${slug}`,
            );
          }
        }
      } finally {
        if (isMounted) setLoadingSpace(false);
      }
    }
    void loadSpaceMeta();
    return () => {
      isMounted = false;
    };
  }, [slug, isAuthenticated]);

  const loadThreads = useCallback(
    async (cursor?: string) => {
      if (!slug) return;
      const isAppend = Boolean(cursor);
      const joinedSlugs = space?.isJoined ? new Set([slug]) : undefined;

      if (activeQuery && !isAppend) {
        try {
          setLoadingPosts(true);
          const searched = await CommunityApi.searchSpaceThreads(slug, activeQuery, 25);
          setPosts(searched.map((item) => mapThreadSummaryToPostItem(item, { joinedSlugs })));
          setNextCursor(null);
          setHasMore(false);
        } catch {
          setPosts([]);
        } finally {
          setLoadingPosts(false);
        }
        return;
      }

      if (isAppend) {
        if (loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoadingPosts(true);
        setIsForbidden(false);
      }

      try {
        const feedRes = await CommunityApi.getSpaceThreads(slug, {
          sort: spaceSort,
          limit: 25,
          cursor,
          flairId: selectedFlairId,
        });

        if (feedRes.forbidden) {
          setIsForbidden(true);
          setPosts([]);
          setNextCursor(null);
          setHasMore(false);
          return;
        }

        const mapped = feedRes.items.map((item) =>
          mapThreadSummaryToPostItem(item, { joinedSlugs }),
        );
        setPosts((prev) => {
          if (!isAppend) return mapped;
          const seen = new Set(prev.map((p) => p.id));
          return [...prev, ...mapped.filter((m) => !seen.has(m.id))];
        });
        setNextCursor(feedRes.nextCursor);
        setHasMore(feedRes.hasMore);
      } catch {
        if (!isAppend) setPosts([]);
      } finally {
        loadingMoreRef.current = false;
        setLoadingPosts(false);
        setLoadingMore(false);
      }
    },
    [slug, space?.isJoined, activeQuery, spaceSort, selectedFlairId],
  );

  useEffect(() => {
    void isAuthenticated;
    void loadThreads();
  }, [isAuthenticated, loadThreads]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || !nextCursor || loadingPosts || loadingMore || activeQuery) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor && !loadingMoreRef.current) {
          void loadThreads(nextCursor);
        }
      },
      { rootMargin: '240px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, nextCursor, loadingPosts, loadingMore, activeQuery, loadThreads]);

  return (
    <div className="app-shell">
      <Header />

      <div className="app-container">
        <LeftSidebar />

        <main className="main-content" style={{ maxWidth: '1060px' }}>
          {loadingSpace ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Đang tải thông tin không gian s/{slug}...
            </div>
          ) : notFoundError || !space ? (
            <div className="reddit-card" style={{ padding: '36px', textAlign: 'center' }}>
              <h2
                style={{ fontSize: '18px', fontWeight: 800, color: '#f43f5e', marginBottom: '8px' }}
              >
                Không thể tải Không gian s/{slug}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {notFoundError || 'Không gian này không tồn tại hoặc đã bị xóa.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SpaceHeader
                  key={`${space.id}-${Boolean(space.isJoined)}-${space.membersCount}`}
                  space={space}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />

                {activeTab === 'posts' ? (
                  <div>
                    {/* Sort Bar + In-Space pg_trgm Search */}
                    {!isForbidden && (
                      <div
                        className="reddit-card"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                          padding: '10px 14px',
                          marginBottom: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(['hot', 'new', 'top', 'best'] as const).map((sOpt) => (
                            <button
                              key={sOpt}
                              type="button"
                              onClick={() => {
                                setActiveQuery('');
                                setSpaceSort(sOpt);
                              }}
                              className={`reddit-pill-btn ${spaceSort === sOpt && !activeQuery ? 'primary' : ''}`}
                              style={{
                                height: '28px',
                                fontSize: '12px',
                                textTransform: 'capitalize',
                              }}
                            >
                              {sOpt}
                            </button>
                          ))}
                        </div>

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            setActiveQuery(spaceSearch.trim());
                          }}
                          style={{
                            display: 'flex',
                            gap: '6px',
                            flex: '1 1 200px',
                            maxWidth: '280px',
                          }}
                        >
                          <input
                            type="text"
                            placeholder={`Tìm trong s/${space.slug}...`}
                            value={spaceSearch}
                            onChange={(e) => {
                              setSpaceSearch(e.target.value);
                              if (!e.target.value.trim() && activeQuery) {
                                setActiveQuery('');
                              }
                            }}
                            style={{
                              flex: 1,
                              padding: '5px 10px',
                              borderRadius: 'var(--radius-full)',
                              border: '1px solid var(--border-subtle)',
                              backgroundColor: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                            }}
                          />
                          <button
                            type="submit"
                            className="reddit-pill-btn"
                            style={{ height: '28px', fontSize: '11px' }}
                          >
                            Tìm
                          </button>
                        </form>
                      </div>
                    )}

                    {isForbidden ? (
                      <div className="reddit-card" style={{ padding: '32px', textAlign: 'center' }}>
                        <h3
                          style={{
                            fontSize: '16px',
                            fontWeight: 800,
                            color: 'var(--color-brand)',
                            marginBottom: '8px',
                          }}
                        >
                          Không gian Riêng Tư (Private Space)
                        </h3>
                        <p
                          style={{
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                            marginBottom: '14px',
                          }}
                        >
                          Nội dung bên trong s/{space.slug} được bảo vệ bởi RBAC. Chỉ thành viên
                          được Quản trị viên phê duyệt mới có thể xem hoặc đăng bài.
                        </p>
                        {!isAuthenticated && (
                          <button
                            type="button"
                            className="reddit-pill-btn primary"
                            onClick={() => openAuthModal('login')}
                          >
                            Đăng nhập tài khoản thành viên
                          </button>
                        )}
                      </div>
                    ) : loadingPosts && posts.length === 0 ? (
                      <div
                        style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}
                      >
                        Đang tải bài viết của không gian...
                      </div>
                    ) : posts.length === 0 ? (
                      <div
                        className="reddit-card"
                        style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}
                      >
                        Chưa có bài viết nào trong không gian này
                        {selectedFlairId ? ' theo nhãn đã chọn' : ''}
                        {activeQuery ? ` khớp "${activeQuery}"` : ''}.
                      </div>
                    ) : (
                      <>
                        {posts.map((post) => (
                          <PostCard key={post.id} post={post} />
                        ))}
                        {hasMore && nextCursor && !activeQuery && (
                          <div
                            ref={sentinelRef}
                            style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}
                          >
                            <button
                              type="button"
                              disabled={loadingMore}
                              className="reddit-pill-btn"
                              onClick={() => void loadThreads(nextCursor)}
                            >
                              {loadingMore ? 'Đang tải thêm...' : 'Tải thêm bài viết'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: 'var(--bg-surface)',
                      padding: '24px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        margin: '0 0 12px 0',
                      }}
                    >
                      Về Không Gian s/{space.slug}
                    </h3>
                    <p
                      style={{
                        fontSize: '14px',
                        lineHeight: 1.6,
                        color: 'var(--text-secondary)',
                        marginBottom: '20px',
                      }}
                    >
                      {space.description ||
                        'Không gian thảo luận chuyên sâu trên nền tảng SYNAPSE.'}
                    </p>

                    <h4
                      style={{
                        fontSize: '15px',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        margin: '20px 0 10px 0',
                      }}
                    >
                      Nội Quy Quy Định
                    </h4>
                    {space.rules && space.rules.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {space.rules.map((rule, idx) => (
                          <div
                            key={rule.title}
                            style={{
                              padding: '12px 16px',
                              borderRadius: 'var(--radius-md)',
                              backgroundColor: 'var(--bg-subtle)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                              }}
                            >
                              {idx + 1}. {rule.title}
                            </div>
                            {rule.description && (
                              <div
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--text-secondary)',
                                  marginTop: '4px',
                                }}
                              >
                                {rule.description}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                        Chưa có nội quy cụ thể. Vui lòng tuân thủ quy chuẩn ứng xử chung của nền
                        tảng.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="desktop-only-rail">
                <SpaceSidebar
                  space={space}
                  flairs={flairs}
                  selectedFlairId={selectedFlairId}
                  onSelectFlair={setSelectedFlairId}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      <FloatingChatWidget />
      <BottomNav />
    </div>
  );
}
