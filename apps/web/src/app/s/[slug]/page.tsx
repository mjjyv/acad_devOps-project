'use client';

import type { Space, SpaceFlair } from '@acad/contracts';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { PostCard, type PostItem } from '@/components/feed/post-card';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { SpaceHeader } from '@/components/spaces/space-header';
import { SpaceSidebar } from '@/components/spaces/space-sidebar';
import { ApiHttpError, CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { mapThreadSummaryToPostItem } from '@/lib/utils/thread-mapper';

export default function SpacePage() {
  const params = useParams();
  const slug = (params?.slug as string) || '';
  const { isAuthenticated, openAuthModal } = useAuth();

  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  const [selectedFlairId, setSelectedFlairId] = useState<string | undefined>();
  const [space, setSpace] = useState<Space | null>(null);
  const [flairs, setFlairs] = useState<SpaceFlair[]>([]);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [loadingSpace, setLoadingSpace] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [notFoundError, setNotFoundError] = useState<string | null>(null);

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

  useEffect(() => {
    void isAuthenticated;
    let isMounted = true;
    async function loadThreads() {
      if (!slug) return;
      try {
        setLoadingPosts(true);
        setIsForbidden(false);
        const feedRes = await CommunityApi.getSpaceThreads(slug, {
          sort: 'hot',
          limit: 25,
          flairId: selectedFlairId,
        });
        if (!isMounted) return;

        if (feedRes.forbidden) {
          setIsForbidden(true);
          setPosts([]);
          setNextCursor(null);
          setHasMore(false);
          return;
        }

        const joinedSlugs = space?.isJoined ? new Set([slug]) : undefined;
        setPosts(feedRes.items.map((item) => mapThreadSummaryToPostItem(item, { joinedSlugs })));
        setNextCursor(feedRes.nextCursor);
        setHasMore(feedRes.hasMore);
      } catch {
        if (isMounted) {
          setPosts([]);
        }
      } finally {
        if (isMounted) setLoadingPosts(false);
      }
    }
    void loadThreads();
    return () => {
      isMounted = false;
    };
  }, [slug, selectedFlairId, isAuthenticated, space?.isJoined]);

  const handleLoadMore = async () => {
    if (!nextCursor || !slug) return;
    const feedRes = await CommunityApi.getSpaceThreads(slug, {
      sort: 'hot',
      limit: 25,
      cursor: nextCursor,
      flairId: selectedFlairId,
    });
    const joinedSlugs = space?.isJoined ? new Set([slug]) : undefined;
    setPosts((prev) => [
      ...prev,
      ...feedRes.items.map((item) => mapThreadSummaryToPostItem(item, { joinedSlugs })),
    ]);
    setNextCursor(feedRes.nextCursor);
    setHasMore(feedRes.hasMore);
  };

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
              {/* Cột Chính */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <SpaceHeader
                  key={`${space.id}-${Boolean(space.isJoined)}-${space.membersCount}`}
                  space={space}
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                />

                {activeTab === 'posts' ? (
                  <div>
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
                        {selectedFlairId ? ' theo nhãn đã chọn' : ''}.
                      </div>
                    ) : (
                      <>
                        {posts.map((post) => (
                          <PostCard key={post.id} post={post} />
                        ))}
                        {hasMore && nextCursor && (
                          <div
                            style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}
                          >
                            <button
                              type="button"
                              className="reddit-pill-btn"
                              onClick={() => void handleLoadMore()}
                            >
                              Tải thêm bài viết
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

              {/* Cột Phải Đặc Thù Không Gian */}
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
