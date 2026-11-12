'use client';

import type { SortMode, Space, SpaceFlair, ThreadSummary } from '@acad/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { PostCard } from '@/components/feed/post-card';
import { AppShell } from '@/components/layout/app-shell';
import { PlusIcon, SearchIcon } from '@/components/ui/icons';
import { extractApiErrorMessage } from '@/lib/api/client';
import { CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'hot', label: 'Nổi bật' },
  { value: 'new', label: 'Mới nhất' },
  { value: 'top', label: 'Đánh giá cao' },
  { value: 'best', label: 'Đề xuất tốt' },
];

export default function SpaceDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = decodeURIComponent(params.slug ?? '');
  const { isAuthenticated, requireAuth } = useAuth();
  const { showToast } = useUI();

  const [space, setSpace] = useState<Space | null>(null);
  const [flairs, setFlairs] = useState<SpaceFlair[]>([]);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [sort, setSort] = useState<SortMode>('hot');
  const [selectedFlairId, setSelectedFlairId] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchQuery, setActiveSearchQuery] = useState('');

  const [loadingSpace, setLoadingSpace] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyJoin, setBusyJoin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create Flair inline state for Space Creator / Mod / Admin
  const [flairFormOpen, setFlairFormOpen] = useState(false);
  const [flairName, setFlairName] = useState('');
  const [flairSlug, setFlairSlug] = useState('');
  const [creatingFlair, setCreatingFlair] = useState(false);

  const loadSpaceMeta = useCallback(async () => {
    if (!slug) return;
    void isAuthenticated;
    try {
      setLoadingSpace(true);
      setErrorMsg(null);
      const [spaceRes, flairList] = await Promise.all([
        CommunityApi.getSpaceBySlug(slug),
        CommunityApi.getFlairs(slug),
      ]);
      setSpace(spaceRes);
      setFlairs(flairList);
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, `Không tìm thấy không gian s/${slug}`));
      setSpace(null);
    } finally {
      setLoadingSpace(false);
    }
  }, [slug, isAuthenticated]);

  const loadThreads = useCallback(
    async (cursor?: string) => {
      if (!slug) return;
      try {
        if (cursor) {
          setLoadingMore(true);
        } else {
          setLoadingThreads(true);
        }

        if (activeSearchQuery) {
          const found = await CommunityApi.searchSpaceThreads(slug, activeSearchQuery, 30);
          setThreads(found);
          setNextCursor(null);
          return;
        }

        const feed = await CommunityApi.getSpaceThreads(slug, {
          sort,
          limit: 15,
          ...(selectedFlairId ? { flairId: selectedFlairId } : {}),
          ...(cursor ? { cursor } : {}),
        });
        const items = Array.isArray(feed.items) ? feed.items : [];
        setThreads((prev) => (cursor ? [...prev, ...items] : items));
        setNextCursor(feed.pagination?.nextCursor ?? null);
      } catch (err) {
        if (!cursor) {
          showToast(extractApiErrorMessage(err, 'Không thể tải bài viết của Space'), 'error');
          setThreads([]);
        }
      } finally {
        setLoadingThreads(false);
        setLoadingMore(false);
      }
    },
    [slug, sort, selectedFlairId, activeSearchQuery, showToast],
  );

  useEffect(() => {
    void loadSpaceMeta();
  }, [loadSpaceMeta]);

  useEffect(() => {
    if (space) {
      void loadThreads();
    }
  }, [space, loadThreads]);

  const handleToggleJoin = () => {
    if (!space) return;
    requireAuth(async () => {
      if (busyJoin) return;
      try {
        setBusyJoin(true);
        if (space.isJoined) {
          await CommunityApi.leaveSpace(space.slug);
          setSpace((prev) =>
            prev
              ? { ...prev, isJoined: false, membersCount: Math.max(0, prev.membersCount - 1) }
              : prev,
          );
          showToast(`Đã rời khỏi s/${space.slug}`, 'info');
        } else {
          await CommunityApi.joinSpace(space.slug);
          setSpace((prev) =>
            prev ? { ...prev, isJoined: true, membersCount: prev.membersCount + 1 } : prev,
          );
          showToast(`Đã tham gia s/${space.slug}`, 'success');
        }
      } catch (err) {
        showToast(extractApiErrorMessage(err, 'Cập nhật thành viên thất bại'), 'error');
      } finally {
        setBusyJoin(false);
      }
    }, `Đăng nhập để tham gia s/${space.slug}`);
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setActiveSearchQuery(searchInput.trim());
  };

  const handleCreateFlair = async (e: FormEvent) => {
    e.preventDefault();
    if (!space) return;
    try {
      setCreatingFlair(true);
      const created = await CommunityApi.createFlair(space.slug, {
        name: flairName.trim(),
        slug: (flairSlug.trim() || flairName.trim()).toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
        colorHex: '#E1D9BC',
        backgroundHex: '#23283C',
      });
      setFlairs((prev) => [...prev, created]);
      setFlairName('');
      setFlairSlug('');
      setFlairFormOpen(false);
      showToast(`Đã tạo Flair "${created.name}"`, 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể tạo Flair mới'), 'error');
    } finally {
      setCreatingFlair(false);
    }
  };

  const canManageFlairs =
    space?.myRole === 'CREATOR' || space?.myRole === 'MODERATOR' || space?.myRole === 'ADMIN';

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loadingSpace && (
          <div className="surface-card" style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
            Đang tải không gian s/{slug}...
          </div>
        )}

        {!loadingSpace && errorMsg && (
          <section
            className="surface-card"
            role="alert"
            style={{
              padding: '28px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Không tìm thấy s/{slug}</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{errorMsg}</p>
            <Link href="/explore" className="btn-primary" style={{ textDecoration: 'none' }}>
              Quay lại Explore
            </Link>
          </section>
        )}

        {!loadingSpace && space && (
          <>
            {/* Space Header */}
            <section
              className="surface-card"
              data-testid="space-header-card"
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                  >
                    <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {space.name}
                    </h1>
                    <span
                      style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-brand)' }}
                    >
                      s/{space.slug}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--bg-pill)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {space.topic}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '13.5px',
                      color: 'var(--text-secondary)',
                      marginTop: '6px',
                      lineHeight: 1.5,
                    }}
                  >
                    {space.description || 'Cộng đồng chia sẻ kiến thức và thảo luận chuyên sâu.'}
                  </p>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '8px' }}>
                    <strong>{space.membersCount}</strong> thành viên ·{' '}
                    <strong>{space.threadsCount}</strong> bài viết
                    {space.isPrivate && ' · Không gian riêng tư'}
                  </div>
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}
                >
                  <Link
                    href={`/submit?space=${space.slug}`}
                    className="btn-primary"
                    style={{
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <PlusIcon size={15} />
                    <span>Đăng bài</span>
                  </Link>
                  <button
                    type="button"
                    disabled={busyJoin}
                    onClick={handleToggleJoin}
                    className="btn-ghost"
                  >
                    {space.isJoined ? 'Đã tham gia' : 'Tham gia Space'}
                  </button>
                </div>
              </div>

              {space.rules && space.rules.length > 0 && (
                <div
                  style={{
                    borderTop: '1px solid var(--border-divider)',
                    paddingTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <strong style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Nội quy không gian
                  </strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {space.rules.map((rule) => (
                      <div
                        key={rule.title}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--bg-subtle)',
                          fontSize: '12px',
                        }}
                      >
                        <strong style={{ color: 'var(--color-brand)' }}>{rule.title}:</strong>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{rule.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Filters, Flair Bar & Search */}
            <section
              className="surface-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div
                  style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFlairId('')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-full)',
                      border: !selectedFlairId
                        ? '1px solid var(--border-focus)'
                        : '1px solid var(--border-subtle)',
                      backgroundColor: !selectedFlairId
                        ? 'var(--bg-pill-hover)'
                        : 'var(--bg-subtle)',
                      color: !selectedFlairId ? 'var(--color-brand)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: !selectedFlairId ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    Tất cả Flair
                  </button>
                  {flairs.map((flair) => {
                    const active = selectedFlairId === flair.id;
                    return (
                      <button
                        key={flair.id}
                        type="button"
                        onClick={() => setSelectedFlairId(active ? '' : flair.id)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full)',
                          border: active
                            ? '1px solid var(--border-focus)'
                            : '1px solid var(--border-subtle)',
                          backgroundColor: flair.backgroundHex,
                          color: flair.colorHex,
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {flair.name}
                      </button>
                    );
                  })}
                  {canManageFlairs && (
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setFlairFormOpen((prev) => !prev)}
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      + Thêm Flair
                    </button>
                  )}
                </div>

                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setActiveSearchQuery('');
                        setSort(opt.value);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        border:
                          sort === opt.value && !activeSearchQuery
                            ? '1px solid var(--border-focus)'
                            : '1px solid transparent',
                        backgroundColor:
                          sort === opt.value && !activeSearchQuery
                            ? 'var(--bg-pill-hover)'
                            : 'transparent',
                        color:
                          sort === opt.value && !activeSearchQuery
                            ? 'var(--color-brand)'
                            : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: sort === opt.value ? 700 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {flairFormOpen && canManageFlairs && (
                <form
                  onSubmit={handleCreateFlair}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--border-divider)',
                  }}
                >
                  <input
                    required
                    placeholder="Tên Flair (vd: Production Bug)"
                    value={flairName}
                    onChange={(e) => setFlairName(e.target.value)}
                    className="input-field"
                    style={{ flex: 1, minWidth: '180px' }}
                  />
                  <input
                    placeholder="Slug (tùy chọn)"
                    value={flairSlug}
                    onChange={(e) => setFlairSlug(e.target.value)}
                    className="input-field"
                    style={{ width: '160px' }}
                  />
                  <button type="submit" disabled={creatingFlair} className="btn-primary">
                    {creatingFlair ? 'Đang tạo...' : 'Lưu Flair'}
                  </button>
                </form>
              )}

              <form
                onSubmit={handleSearchSubmit}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <div
                  style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}
                >
                  <SearchIcon
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      color: 'var(--text-muted)',
                      pointerEvents: 'none',
                    }}
                  />
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder={`Tìm bài viết trong s/${space.slug}...`}
                    className="input-field"
                    style={{ paddingLeft: '34px' }}
                  />
                </div>
                <button type="submit" className="btn-ghost">
                  Tìm
                </button>
                {activeSearchQuery && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setSearchInput('');
                      setActiveSearchQuery('');
                    }}
                  >
                    Xóa lọc
                  </button>
                )}
              </form>
            </section>

            {/* Space Threads */}
            {loadingThreads ? (
              <div
                className="surface-card"
                style={{ color: 'var(--text-muted)', fontSize: '13px' }}
              >
                Đang tải bài viết trong s/{space.slug}...
              </div>
            ) : threads.length === 0 ? (
              <div
                className="surface-card"
                style={{
                  padding: '28px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span>Chưa có bài viết nào khớp tiêu chí.</span>
                <Link
                  href={`/submit?space=${space.slug}`}
                  className="btn-primary"
                  style={{ textDecoration: 'none' }}
                >
                  Đăng bài viết đầu tiên
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {threads.map((thread) => (
                  <PostCard key={thread.id} thread={thread} />
                ))}
              </div>
            )}

            {!loadingThreads && nextCursor && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={loadingMore}
                  onClick={() => void loadThreads(nextCursor)}
                >
                  {loadingMore ? 'Đang tải thêm...' : 'Tải thêm bài viết'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
