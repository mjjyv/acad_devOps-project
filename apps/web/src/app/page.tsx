'use client';

import { useCallback, useEffect, useState } from 'react';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { FeedHeader } from '@/components/feed/feed-header';
import { PostCard, type PostItem } from '@/components/feed/post-card';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { RightRail } from '@/components/layout/right-rail';
import { CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';
import { mapThreadSummaryToPostItem } from '@/lib/utils/thread-mapper';

export default function HomePage() {
  const { activeFeedTab, feedSort, searchQuery, setActiveFeedTab } = useUI();
  const { isAuthenticated, openAuthModal } = useAuth();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadFeed = useCallback(
    async (cursor?: string) => {
      if (activeFeedTab === 'following' && !isAuthenticated) {
        setPosts([]);
        setNextCursor(null);
        setHasMore(false);
        setLoading(false);
        setErrorMsg(null);
        return;
      }

      const isAppend = Boolean(cursor);
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setErrorMsg(null);
      }

      try {
        const [feedRes, spaces] = await Promise.all([
          activeFeedTab === 'following'
            ? CommunityApi.getHomeFeed({ sort: feedSort, limit: 20, cursor })
            : CommunityApi.getPopularFeed({ sort: feedSort, limit: 20, cursor }),
          isAuthenticated && !isAppend
            ? CommunityApi.getSpaces(50, 0).catch(() => [])
            : Promise.resolve([]),
        ]);

        const joinedSlugs = new Set(spaces.filter((s) => s.isJoined).map((s) => s.slug));
        const mapped = feedRes.items.map((item) =>
          mapThreadSummaryToPostItem(item, {
            joinedSlugs: joinedSlugs.size > 0 ? joinedSlugs : undefined,
          }),
        );

        setPosts((prev) => (isAppend ? [...prev, ...mapped] : mapped));
        setNextCursor(feedRes.nextCursor);
        setHasMore(feedRes.hasMore);
      } catch (err: unknown) {
        setErrorMsg(err instanceof Error ? err.message : 'Không thể tải bảng tin từ máy chủ');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeFeedTab, feedSort, isAuthenticated],
  );

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const visiblePosts = normalizedQuery
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(normalizedQuery) ||
          (p.bodySnippet || '').toLowerCase().includes(normalizedQuery) ||
          p.spaceSlug.toLowerCase().includes(normalizedQuery) ||
          p.author.toLowerCase().includes(normalizedQuery),
      )
    : posts;

  return (
    <div className="app-shell">
      <Header />

      <div className="app-container">
        <LeftSidebar />

        <main
          style={{
            flex: 1,
            maxWidth: 'var(--feed-max-width)',
            minWidth: 0,
            width: '100%',
          }}
        >
          <FeedHeader />

          {loading ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Đang tải bảng tin...
            </div>
          ) : errorMsg ? (
            <div
              className="reddit-card"
              style={{ padding: '28px', textAlign: 'center', color: '#f43f5e' }}
            >
              <div style={{ marginBottom: '12px', fontWeight: 700 }}>{errorMsg}</div>
              <button
                type="button"
                className="reddit-pill-btn primary"
                onClick={() => void loadFeed()}
              >
                Thử lại
              </button>
            </div>
          ) : activeFeedTab === 'following' && !isAuthenticated ? (
            <div className="reddit-card" style={{ padding: '32px', textAlign: 'center' }}>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  marginBottom: '8px',
                }}
              >
                Đăng nhập để xem Home Feed cá nhân
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Bảng tin Following hiển thị bài viết từ các không gian thảo luận mà bạn đã tham gia.
              </p>
              <button
                type="button"
                className="reddit-pill-btn primary"
                onClick={() => openAuthModal('login')}
              >
                Đăng nhập ngay
              </button>
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="reddit-card" style={{ padding: '32px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {activeFeedTab === 'following'
                  ? 'Bạn chưa tham gia không gian nào hoặc chưa có bài viết mới.'
                  : 'Chưa có bài viết phù hợp với bộ lọc hiện tại.'}
              </p>
              {activeFeedTab === 'following' && (
                <button
                  type="button"
                  className="reddit-pill-btn primary"
                  onClick={() => setActiveFeedTab('for_you')}
                >
                  Khám phá Popular Feed
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {visiblePosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}

              {hasMore && nextCursor && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                  <button
                    type="button"
                    disabled={loadingMore}
                    className="reddit-pill-btn"
                    onClick={() => void loadFeed(nextCursor)}
                  >
                    {loadingMore ? 'Đang tải thêm...' : 'Tải thêm bài viết'}
                  </button>
                </div>
              )}
            </div>
          )}
        </main>

        <RightRail />
      </div>

      <BottomNav />
      <FloatingChatWidget />
    </div>
  );
}
