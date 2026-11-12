'use client';

import type { Space } from '@acad/contracts';
import Link from 'next/link';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { extractApiErrorMessage } from '@/lib/api/client';
import { type AdminThreadItem, ModerationApi } from '@/lib/api/moderation';
import { useUI } from '@/lib/store/ui-context';
import { LockIcon, PinIcon, SearchIcon, TrashIcon } from '../ui/icons';

export function AdminContentPanel() {
  const { showToast } = useUI();
  const [subView, setSubView] = useState<'threads' | 'spaces'>('threads');

  // Spaces state
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loadingSpaces, setLoadingSpaces] = useState(true);
  const [confirmDeleteSpaceId, setConfirmDeleteSpaceId] = useState<string | null>(null);
  const [spaceSlugConfirm, setSpaceSlugConfirm] = useState('');

  // Threads state
  const [threads, setThreads] = useState<AdminThreadItem[]>([]);
  const [totalThreads, setTotalThreads] = useState(0);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [spaceFilter, setSpaceFilter] = useState<string>('ALL');
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDeleteThreadId, setConfirmDeleteThreadId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSpaces = useCallback(async () => {
    try {
      setLoadingSpaces(true);
      const list = await ModerationApi.getSpaces();
      setSpaces(Array.isArray(list) ? list : []);
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'Không thể tải danh sách Space'));
    } finally {
      setLoadingSpaces(false);
    }
  }, []);

  const loadThreads = useCallback(async () => {
    try {
      setLoadingThreads(true);
      setErrorMsg(null);
      const res = await ModerationApi.getThreads({
        spaceId: spaceFilter === 'ALL' ? undefined : spaceFilter,
        search: searchQuery || undefined,
        limit,
        offset,
      });
      setThreads(Array.isArray(res.threads) ? res.threads : []);
      setTotalThreads(res.total ?? 0);
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'Không thể tải danh sách bài viết'));
    } finally {
      setLoadingThreads(false);
    }
  }, [spaceFilter, searchQuery, offset]);

  useEffect(() => {
    void loadSpaces();
  }, [loadSpaces]);

  useEffect(() => {
    if (subView === 'threads') {
      void loadThreads();
    }
  }, [subView, loadThreads]);

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setOffset(0);
    setSearchQuery(searchInput.trim());
  };

  const handleTogglePin = async (thread: AdminThreadItem) => {
    try {
      setBusyId(thread.id);
      const res = await ModerationApi.setThreadPinned(thread.id, !thread.isPinned);
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, isPinned: res.isPinned } : t)),
      );
      showToast(res.isPinned ? 'Đã ghim bài viết' : 'Đã bỏ ghim bài viết', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể cập nhật trạng thái ghim'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleLock = async (thread: AdminThreadItem) => {
    try {
      setBusyId(thread.id);
      const res = await ModerationApi.setThreadLocked(thread.id, !thread.isLocked);
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? { ...t, isLocked: res.isLocked } : t)),
      );
      showToast(res.isLocked ? 'Đã khóa bình luận bài viết' : 'Đã mở khóa bình luận', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể cập nhật trạng thái khóa'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    try {
      setBusyId(threadId);
      await ModerationApi.deleteThread(threadId);
      setThreads((prev) => prev.filter((t) => t.id !== threadId));
      setTotalThreads((c) => Math.max(0, c - 1));
      setConfirmDeleteThreadId(null);
      showToast('Đã xóa bài viết khỏi hệ thống', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể xóa bài viết'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteSpace = async (space: Space) => {
    if (spaceSlugConfirm.trim() !== space.slug) {
      showToast(`Vui lòng nhập chính xác "${space.slug}" để xác nhận xóa Space`, 'error');
      return;
    }
    try {
      setBusyId(space.id);
      await ModerationApi.deleteSpace(space.id);
      setSpaces((prev) => prev.filter((s) => s.id !== space.id));
      setConfirmDeleteSpaceId(null);
      setSpaceSlugConfirm('');
      showToast(`Đã xóa Space s/${space.slug}`, 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể xóa Space'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      data-testid="admin-content-panel"
      style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      {/* Sub-view switcher */}
      <div
        className="surface-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            data-testid="content-subtab-threads"
            className={subView === 'threads' ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setSubView('threads')}
            style={{ fontSize: '12.5px', padding: '6px 14px' }}
          >
            Bài viết ({totalThreads})
          </button>
          <button
            type="button"
            data-testid="content-subtab-spaces"
            className={subView === 'spaces' ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setSubView('spaces')}
            style={{ fontSize: '12.5px', padding: '6px 14px' }}
          >
            Cộng đồng / Spaces ({spaces.length})
          </button>
        </div>
      </div>

      {errorMsg && (
        <div
          className="surface-card"
          style={{
            padding: '14px',
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
            fontSize: '13px',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Threads Management */}
      {subView === 'threads' && (
        <>
          <form
            onSubmit={handleSearchSubmit}
            className="surface-card"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
            }}
          >
            <div
              style={{
                flex: '1 1 220px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0 10px',
              }}
            >
              <SearchIcon size={15} />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm tiêu đề hoặc slug bài viết..."
                data-testid="admin-threads-search"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  padding: '7px 0',
                }}
              />
            </div>

            <select
              aria-label="Lọc theo Space"
              value={spaceFilter}
              onChange={(e) => {
                setOffset(0);
                setSpaceFilter(e.target.value);
              }}
              className="input-field"
              style={{ width: 'auto', minWidth: '170px', fontSize: '12.5px', padding: '7px 10px' }}
            >
              <option value="ALL">Tất cả Spaces</option>
              {spaces.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  s/{sp.slug} — {sp.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="btn-primary"
              style={{ fontSize: '12.5px', padding: '7px 14px' }}
            >
              Tìm
            </button>
          </form>

          {loadingThreads ? (
            <div
              className="surface-card"
              style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13.5px' }}
            >
              Đang tải danh sách bài viết...
            </div>
          ) : threads.length === 0 ? (
            <div
              className="surface-card"
              style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}
            >
              Không có bài viết nào khớp bộ lọc.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {threads.map((t) => {
                const isBusy = busyId === t.id;
                const isConfirming = confirmDeleteThreadId === t.id;
                const netScore = t.upvotesCount - t.downvotesCount;
                return (
                  <article
                    key={t.id}
                    data-testid={`admin-thread-row-${t.id}`}
                    className="surface-card"
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div
                      style={{
                        flex: '1 1 280px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {t.isPinned && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '999px',
                              backgroundColor: 'var(--bg-pill)',
                              color: 'var(--color-brand)',
                            }}
                          >
                            ĐÃ GHIM
                          </span>
                        )}
                        {t.isLocked && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '999px',
                              backgroundColor: 'var(--bg-subtle)',
                              color: 'var(--color-warning)',
                            }}
                          >
                            ĐÃ KHÓA
                          </span>
                        )}
                        <Link
                          href={`/threads/${t.id}`}
                          style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                          }}
                        >
                          {t.title}
                        </Link>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        s/{t.spaceSlug} · bởi u/{t.authorUsername} · Điểm {netScore} ·{' '}
                        {t.commentCount} bình luận ·{' '}
                        {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <button
                        type="button"
                        disabled={isBusy}
                        data-testid={`admin-pin-btn-${t.id}`}
                        onClick={() => handleTogglePin(t)}
                        className="btn-ghost"
                        style={{
                          fontSize: '12px',
                          padding: '5px 10px',
                          border: '1px solid var(--border-subtle)',
                          color: t.isPinned ? 'var(--color-brand)' : 'var(--text-secondary)',
                        }}
                      >
                        <PinIcon size={13} />
                        <span>{t.isPinned ? 'Bỏ ghim' : 'Ghim'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        data-testid={`admin-lock-btn-${t.id}`}
                        onClick={() => handleToggleLock(t)}
                        className="btn-ghost"
                        style={{
                          fontSize: '12px',
                          padding: '5px 10px',
                          border: '1px solid var(--border-subtle)',
                          color: t.isLocked ? 'var(--color-warning)' : 'var(--text-secondary)',
                        }}
                      >
                        <LockIcon size={13} />
                        <span>{t.isLocked ? 'Mở khóa' : 'Khóa'}</span>
                      </button>

                      {isConfirming ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            disabled={isBusy}
                            data-testid={`admin-confirm-delete-thread-${t.id}`}
                            onClick={() => handleDeleteThread(t.id)}
                            className="btn-primary"
                            style={{
                              fontSize: '12px',
                              padding: '5px 10px',
                              backgroundColor: 'var(--color-danger)',
                              borderColor: 'var(--color-danger)',
                            }}
                          >
                            Xác nhận xóa
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => setConfirmDeleteThreadId(null)}
                            className="btn-ghost"
                            style={{ fontSize: '12px', padding: '5px 10px' }}
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isBusy}
                          data-testid={`admin-delete-thread-btn-${t.id}`}
                          onClick={() => setConfirmDeleteThreadId(t.id)}
                          className="btn-ghost"
                          style={{
                            fontSize: '12px',
                            padding: '5px 10px',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--color-danger)',
                          }}
                        >
                          <TrashIcon size={13} />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {totalThreads > limit && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '6px',
              }}
            >
              <button
                type="button"
                disabled={offset === 0 || loadingThreads}
                onClick={() => setOffset((o) => Math.max(0, o - limit))}
                className="btn-ghost"
                style={{ fontSize: '12.5px' }}
              >
                Trang trước
              </button>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Trang {Math.floor(offset / limit) + 1} / {Math.ceil(totalThreads / limit)}
              </span>
              <button
                type="button"
                disabled={offset + limit >= totalThreads || loadingThreads}
                onClick={() => setOffset((o) => o + limit)}
                className="btn-ghost"
                style={{ fontSize: '12.5px' }}
              >
                Trang sau
              </button>
            </div>
          )}
        </>
      )}

      {/* Spaces Management */}
      {subView === 'spaces' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {loadingSpaces ? (
            <div
              className="surface-card"
              style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '13.5px' }}
            >
              Đang tải danh sách Spaces...
            </div>
          ) : spaces.length === 0 ? (
            <div
              className="surface-card"
              style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}
            >
              Chưa có Space nào trong hệ thống.
            </div>
          ) : (
            spaces.map((sp) => {
              const isBusy = busyId === sp.id;
              const isConfirming = confirmDeleteSpaceId === sp.id;
              return (
                <article
                  key={sp.id}
                  data-testid={`admin-space-row-${sp.slug}`}
                  className="surface-card"
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link
                          href={`/s/${sp.slug}`}
                          style={{
                            fontWeight: 700,
                            fontSize: '14.5px',
                            color: 'var(--text-primary)',
                            textDecoration: 'none',
                          }}
                        >
                          s/{sp.slug} — {sp.name}
                        </Link>
                        <span
                          style={{
                            fontSize: '11px',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {sp.topic}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {sp.membersCount} thành viên · {sp.threadsCount} bài viết
                        {sp.isPrivate ? ' · Riêng tư' : ' · Công khai'}
                      </span>
                    </div>

                    {!isConfirming && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setConfirmDeleteSpaceId(sp.id);
                          setSpaceSlugConfirm('');
                        }}
                        className="btn-ghost"
                        style={{
                          fontSize: '12px',
                          padding: '5px 10px',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--color-danger)',
                        }}
                      >
                        <TrashIcon size={13} />
                        <span>Xóa Space</span>
                      </button>
                    )}
                  </div>

                  {isConfirming && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: '8px',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border-divider)',
                      }}
                    >
                      <input
                        type="text"
                        value={spaceSlugConfirm}
                        onChange={(e) => setSpaceSlugConfirm(e.target.value)}
                        placeholder={`Nhập "${sp.slug}" để xác nhận xóa...`}
                        className="input-field"
                        style={{ flex: '1 1 220px', fontSize: '12.5px', padding: '6px 10px' }}
                      />
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleDeleteSpace(sp)}
                        className="btn-primary"
                        style={{
                          fontSize: '12px',
                          padding: '6px 12px',
                          backgroundColor: 'var(--color-danger)',
                          borderColor: 'var(--color-danger)',
                        }}
                      >
                        Xác nhận xóa vĩnh viễn
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setConfirmDeleteSpaceId(null);
                          setSpaceSlugConfirm('');
                        }}
                        className="btn-ghost"
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        Hủy
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
