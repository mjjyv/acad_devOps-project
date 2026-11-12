'use client';

import type { SortMode, ThreadSummary } from '@acad/contracts';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { PostCard } from '@/components/feed/post-card';
import { AppShell } from '@/components/layout/app-shell';
import { ExploreIcon, HomeIcon, PopularIcon } from '@/components/ui/icons';
import { CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { type FeedTabMode, useUI } from '@/lib/store/ui-context';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'hot', label: 'Nổi bật' },
  { value: 'new', label: 'Mới nhất' },
  { value: 'top', label: 'Đánh giá cao' },
  { value: 'best', label: 'Đề xuất tốt' },
];

function HomeFeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeFeedTab, setActiveFeedTab, feedSort, setFeedSort, searchQuery } = useUI();

  const urlTab = searchParams.get('tab');
  const urlSort = searchParams.get('sort') as SortMode | null;
  const urlQuery = searchParams.get('q') ?? '';

  const effectiveTab: FeedTabMode =
    urlTab === 'following' || urlTab === 'for_you' ? urlTab : activeFeedTab;
  const effectiveSort: SortMode =
    urlSort && ['hot', 'new', 'top', 'best'].includes(urlSort) ? urlSort : feedSort;
  const effectiveQuery = urlQuery || searchQuery;

  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (urlTab === 'following' || urlTab === 'for_you') {
      setActiveFeedTab(urlTab);
    }
  }, [urlTab, setActiveFeedTab]);

  useEffect(() => {
    if (urlSort && ['hot', 'new', 'top', 'best'].includes(urlSort)) {
      setFeedSort(urlSort);
    }
  }, [urlSort, setFeedSort]);

  const loadFeed = useCallback(
    async (cursor?: string) => {
      try {
        if (cursor) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setErrorMsg(null);
        }

        const data =
          effectiveTab === 'following' && isAuthenticated && !effectiveQuery
            ? await CommunityApi.getHomeFeed({
                sort: effectiveSort,
                limit: 15,
                ...(cursor ? { cursor } : {}),
              })
            : await CommunityApi.getPopularFeed({
                sort: effectiveSort,
                limit: 15,
                ...(effectiveQuery ? { q: effectiveQuery } : {}),
                ...(cursor ? { cursor } : {}),
              });

        const incoming = Array.isArray(data.items) ? data.items : [];
        setThreads((prev) => (cursor ? [...prev, ...incoming] : incoming));
        setNextCursor(data.pagination?.nextCursor ?? null);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Không thể tải bảng tin');
        if (!cursor) setThreads([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [effectiveTab, effectiveSort, effectiveQuery, isAuthenticated],
  );

  useEffect(() => {
    if (authLoading) return;
    void loadFeed();
  }, [authLoading, loadFeed]);

  const switchTab = (tab: FeedTabMode) => {
    setActiveFeedTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    params.set('sort', effectiveSort);
    router.push(`/?${params.toString()}`);
  };

  const switchSort = (sort: SortMode) => {
    setFeedSort(sort);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', effectiveTab);
    params.set('sort', sort);
    router.push(`/?${params.toString()}`);
  };

  const isBlankHomeEmpty =
    !loading &&
    !errorMsg &&
    threads.length === 0 &&
    effectiveTab === 'following' &&
    !effectiveQuery;

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Feed Switcher & Sort Bar */}
        <section
          className="surface-card"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '10px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => switchTab('following')}
              className={effectiveTab === 'following' ? 'btn-primary' : 'btn-ghost'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '13px',
              }}
            >
              <HomeIcon size={15} />
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => switchTab('for_you')}
              className={effectiveTab === 'for_you' ? 'btn-primary' : 'btn-ghost'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '13px',
              }}
            >
              <PopularIcon size={15} />
              <span>Popular</span>
            </button>
          </div>

          <fieldset
            aria-label="Sắp xếp bài viết"
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4px',
              border: 'none',
              padding: 0,
              margin: 0,
            }}
          >
            {SORT_OPTIONS.map((opt) => {
              const active = effectiveSort === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => switchSort(opt.value)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-full)',
                    border: active ? '1px solid var(--border-focus)' : '1px solid transparent',
                    backgroundColor: active ? 'var(--bg-pill-hover)' : 'transparent',
                    color: active ? 'var(--color-brand)' : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </fieldset>
        </section>

        {effectiveQuery && (
          <div
            className="surface-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              fontSize: '13px',
            }}
          >
            <span>
              Kết quả tìm kiếm cho:{' '}
              <strong style={{ color: 'var(--color-brand)' }}>{effectiveQuery}</strong>
            </span>
            <Link
              href="/?tab=for_you&sort=hot"
              style={{ color: 'var(--text-secondary)', fontSize: '12px' }}
            >
              Xóa bộ lọc
            </Link>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="surface-card"
                style={{
                  height: '132px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                Đang tải dữ liệu bảng tin...
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && errorMsg && (
          <div
            className="surface-card"
            role="alert"
            style={{
              borderColor: 'var(--color-danger)',
              color: 'var(--color-danger)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <strong>Không thể tải bài viết</strong>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{errorMsg}</p>
            <div>
              <button type="button" className="btn-ghost" onClick={() => void loadFeed()}>
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* Blank-User Home Empty-State */}
        {isBlankHomeEmpty && (
          <section
            className="surface-card"
            data-testid="home-empty-state"
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <ExploreIcon size={32} />
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {isAuthenticated
                ? 'Bảng tin Home của bạn chưa có bài viết nào'
                : 'Đăng nhập hoặc khám phá cộng đồng mở'}
            </h1>
            <p
              style={{
                fontSize: '13.5px',
                color: 'var(--text-secondary)',
                maxWidth: '460px',
                lineHeight: 1.5,
              }}
            >
              {isAuthenticated
                ? 'Bạn chưa tham gia cộng đồng (Space) nào. Hãy khám phá các không gian học thuật và DevOps để cá nhân hóa bảng tin Home.'
                : 'Chuyển sang tab Popular để đọc ngay các thảo luận công khai, hoặc khám phá danh sách Spaces theo chủ đề.'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
              <Link
                href="/explore"
                className="btn-primary"
                style={{
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ExploreIcon size={16} />
                <span>Khám phá cộng đồng</span>
              </Link>
              <button type="button" className="btn-ghost" onClick={() => switchTab('for_you')}>
                Xem bảng tin Popular
              </button>
            </div>
          </section>
        )}

        {/* Generic Empty Popular / Search State */}
        {!loading && !errorMsg && threads.length === 0 && !isBlankHomeEmpty && (
          <section
            className="surface-card"
            style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}
          >
            Không tìm thấy bài viết phù hợp.
          </section>
        )}

        {/* Feed Post Cards */}
        {!loading &&
          !errorMsg &&
          threads.map((thread) => <PostCard key={thread.id} thread={thread} />)}

        {/* Cursor Pagination */}
        {!loading && nextCursor && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '6px' }}>
            <button
              type="button"
              className="btn-ghost"
              disabled={loadingMore}
              onClick={() => void loadFeed(nextCursor)}
            >
              {loadingMore ? 'Đang tải thêm...' : 'Tải thêm bài viết'}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="surface-card" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Đang khởi tạo SYNAPSE...
          </div>
        </AppShell>
      }
    >
      <HomeFeedContent />
    </Suspense>
  );
}
