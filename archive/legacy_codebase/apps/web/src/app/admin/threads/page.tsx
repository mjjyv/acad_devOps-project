'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Space, ThreadDetail } from '@acad/contracts';
import { communityClient } from '../../../lib/community-client';

export default function AdminThreadsPage() {
  const [threads, setThreads] = useState<ThreadDetail[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [selectedSpaceId, setSelectedSpaceId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [operatingId, setOperatingId] = useState<string | null>(null);

  const loadData = async (targetPage = page) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const [spacesData, threadsData] = await Promise.all([
        communityClient.fetchSpaces().catch(() => []),
        communityClient.adminFetchThreads({
          page: targetPage,
          limit: 15,
          spaceId: selectedSpaceId || undefined,
          search: searchQuery || undefined,
        }),
      ]);

      setSpaces(spacesData);
      setThreads(threadsData.threads);
      setTotal(threadsData.total);
      setPage(threadsData.page);
      setTotalPages(threadsData.totalPages || 1);
    } catch (err: any) {
      setErrorMessage(err.message || 'Không thể tải danh sách bài viết quản trị');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(1);
  }, [selectedSpaceId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(1);
  };

  const handleTogglePin = async (thread: ThreadDetail) => {
    try {
      setOperatingId(thread.id);
      const nextPinned = !thread.isPinned;
      await communityClient.adminPinThread(thread.id, nextPinned);
      setActionMessage(nextPinned ? `Đã ghim bài viết: "${thread.title}"` : `Đã bỏ ghim bài viết: "${thread.title}"`);
      await loadData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi ghim bài viết');
    } finally {
      setOperatingId(null);
    }
  };

  const handleToggleLock = async (thread: ThreadDetail) => {
    try {
      setOperatingId(thread.id);
      const nextLocked = !thread.isLocked;
      await communityClient.adminLockThread(thread.id, nextLocked);
      setActionMessage(nextLocked ? `Đã khóa bình luận bài viết: "${thread.title}"` : `Đã mở khóa bình luận bài viết: "${thread.title}"`);
      await loadData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi khóa bài viết');
    } finally {
      setOperatingId(null);
    }
  };

  const handleDeleteThread = async (thread: ThreadDetail) => {
    if (!confirm(`[XÁC NHẬN XÓA NỘI DUNG VI PHẠM]\nBạn có chắc chắn muốn xóa bài viết "${thread.title}" của tác giả @${thread.authorUsername}?`)) {
      return;
    }

    try {
      setOperatingId(thread.id);
      await communityClient.adminDeleteThread(thread.id);
      setActionMessage(`Đã xóa bài viết vi phạm: "${thread.title}"`);
      await loadData();
      setTimeout(() => setActionMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi xóa bài viết');
    } finally {
      setOperatingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* HEADER SECTION */}
      <div
        style={{
          backgroundColor: '#393E46',
          border: '2px solid #948979',
          padding: '1.5rem',
          boxShadow: '4px 4px 0px #948979',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#948979',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            THREADS MODERATION //
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: '#DFD0B8',
              margin: '0.2rem 0',
              fontFamily: 'var(--font-mono)',
            }}
          >
            QUẢN TRỊ BÀI VIẾT &amp; NỘI DUNG CỘNG ĐỒNG
          </h1>
          <p style={{ color: '#948979', margin: 0, fontSize: '0.82rem' }}>
            Tổng cộng: <strong style={{ color: '#DFD0B8' }}>{total}</strong> bài viết | Thao tác Ghim bài, Khóa bình luận và Xóa bài viết vi phạm.
          </p>
        </div>

        <button
          onClick={() => loadData()}
          disabled={loading}
          style={{
            padding: '0.5rem 1.15rem',
            backgroundColor: '#222831',
            color: '#DFD0B8',
            border: '2px solid #948979',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: '0.8rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '2px 2px 0px #948979',
          }}
        >
          {loading ? '[ ĐANG TẢI... ]' : '[ TẢI LẠI ]'}
        </button>
      </div>

      {/* FEEDBACK BANNERS */}
      {actionMessage && (
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            borderLeft: '6px solid #4E9F3D',
            padding: '0.85rem 1.25rem',
            color: '#DFD0B8',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
          }}
        >
          [THÀNH CÔNG]: {actionMessage}
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            backgroundColor: '#393E46',
            border: '2px solid #948979',
            borderLeft: '6px solid #ff5555',
            padding: '0.85rem 1.25rem',
            color: '#ff7777',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
          }}
        >
          [LỖI]: {errorMessage}
        </div>
      )}

      {/* FILTERS & SEARCH TOOLBAR */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          backgroundColor: '#393E46',
          padding: '1rem',
          border: '2px solid #948979',
          boxShadow: '3px 3px 0px #948979',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1', maxWidth: '450px' }}>
          <input
            type="text"
            placeholder="Tìm theo tiêu đề bài viết hoặc tác giả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: '1',
              padding: '0.5rem 0.85rem',
              backgroundColor: '#222831',
              border: '2px solid #948979',
              color: '#DFD0B8',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#DFD0B8',
              color: '#222831',
              border: '2px solid #948979',
              fontWeight: 800,
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              boxShadow: '2px 2px 0px #948979',
            }}
          >
            TÌM
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedSpaceId}
            onChange={(e) => setSelectedSpaceId(e.target.value)}
            style={{
              padding: '0.5rem 0.85rem',
              backgroundColor: '#222831',
              border: '2px solid #948979',
              color: '#DFD0B8',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">-- TẤT CẢ KHÔNG GIAN --</option>
            {spaces.map((sp) => (
              <option key={sp.id} value={sp.id}>
                s/{sp.slug} ({sp.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* THREADS TABLE BRUTALIST DARK */}
      <div
        style={{
          backgroundColor: '#393E46',
          border: '2px solid #948979',
          overflowX: 'auto',
          boxShadow: '4px 4px 0px #948979',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#222831', borderBottom: '2px solid #948979', color: '#DFD0B8' }}>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>TIÊU ĐỀ BÀI VIẾT</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>TÁC GIẢ</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>KHÔNG GIAN</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>VOTES</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>BÌNH LUẬN</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>TRẠNG THÁI</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)' }}>NGÀY ĐĂNG</th>
              <th style={{ padding: '0.75rem 1rem', fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#948979', fontFamily: 'var(--font-mono)' }}>
                  &gt; Đang nạp danh sách bài viết...
                </td>
              </tr>
            ) : threads.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#948979', fontFamily: 'var(--font-mono)' }}>
                  [!] Không tìm thấy bài viết nào phù hợp với bộ lọc tìm kiếm.
                </td>
              </tr>
            ) : (
              threads.map((t) => {
                const isOperating = operatingId === t.id;
                return (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: '1px solid #222831',
                      backgroundColor: '#393E46',
                    }}
                  >
                    {/* TITLE */}
                    <td style={{ padding: '0.85rem 1rem', maxWidth: '320px' }}>
                      <Link
                        href={`/threads/${t.slug}`}
                        target="_blank"
                        style={{
                          fontWeight: 800,
                          color: '#DFD0B8',
                          textDecoration: 'none',
                          fontSize: '0.85rem',
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {t.isPinned && <span style={{ color: '#DFD0B8', marginRight: '4px' }}>📌</span>}
                        {t.isLocked && <span style={{ color: '#ff7777', marginRight: '4px' }}>🔒</span>}
                        {t.title}
                      </Link>
                      <div style={{ fontSize: '0.72rem', color: '#948979', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.snippet || 'Không có mô tả xem trước'}
                      </div>
                    </td>

                    {/* AUTHOR */}
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#DFD0B8' }}>
                      @{t.authorUsername}
                    </td>

                    {/* SPACE */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <Link
                        href={`/s/${t.spaceSlug}`}
                        target="_blank"
                        style={{
                          padding: '0.2rem 0.5rem',
                          backgroundColor: '#222831',
                          border: '1px solid #948979',
                          color: '#DFD0B8',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        s/{t.spaceSlug}
                      </Link>
                    </td>

                    {/* NET SCORE */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <span
                        style={{
                          fontWeight: 900,
                          color: t.counters.netScore >= 0 ? '#DFD0B8' : '#ff7777',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {t.counters.netScore > 0 ? `+${t.counters.netScore}` : t.counters.netScore}
                      </span>
                    </td>

                    {/* COMMENTS */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#DFD0B8' }}>
                      {t.counters.commentCount}
                    </td>

                    {/* STATUS BADGES */}
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {t.isPinned && (
                          <span
                            style={{
                              padding: '0.15rem 0.4rem',
                              backgroundColor: '#DFD0B8',
                              color: '#222831',
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            GHIM
                          </span>
                        )}
                        {t.isLocked && (
                          <span
                            style={{
                              padding: '0.15rem 0.4rem',
                              backgroundColor: '#4a2525',
                              color: '#ff7777',
                              border: '1px solid #ff5555',
                              fontSize: '0.68rem',
                              fontWeight: 900,
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            KHÓA
                          </span>
                        )}
                        {!t.isPinned && !t.isLocked && (
                          <span style={{ fontSize: '0.72rem', color: '#948979', fontFamily: 'var(--font-mono)' }}>
                            BÌNH THƯỜNG
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CREATED AT */}
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#948979' }}>
                      {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                    </td>

                    {/* ACTIONS */}
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleTogglePin(t)}
                          disabled={isOperating}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: t.isPinned ? '#DFD0B8' : '#222831',
                            color: t.isPinned ? '#222831' : '#DFD0B8',
                            border: '1px solid #948979',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {t.isPinned ? 'BỎ GHIM' : 'GHIM'}
                        </button>

                        <button
                          onClick={() => handleToggleLock(t)}
                          disabled={isOperating}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: t.isLocked ? '#DFD0B8' : '#222831',
                            color: t.isLocked ? '#222831' : '#DFD0B8',
                            border: '1px solid #948979',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          {t.isLocked ? 'MỞ KHÓA' : 'KHÓA'}
                        </button>

                        <button
                          onClick={() => handleDeleteThread(t)}
                          disabled={isOperating}
                          style={{
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#222831',
                            color: '#ff7777',
                            border: '1px solid #948979',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                          }}
                        >
                          XÓA
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* PAGINATION */}
        <div
          style={{
            padding: '0.85rem 1.25rem',
            backgroundColor: '#222831',
            borderTop: '2px solid #948979',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <div style={{ color: '#948979' }}>
            Trang <strong style={{ color: '#DFD0B8' }}>{page}</strong> / {totalPages} (Tổng: {total} bài viết)
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => loadData(page - 1)}
              disabled={page <= 1 || loading}
              style={{
                padding: '0.3rem 0.75rem',
                backgroundColor: '#393E46',
                color: page <= 1 ? '#948979' : '#DFD0B8',
                border: '1px solid #948979',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 700,
              }}
            >
              &larr; TRƯỚC
            </button>
            <button
              onClick={() => loadData(page + 1)}
              disabled={page >= totalPages || loading}
              style={{
                padding: '0.3rem 0.75rem',
                backgroundColor: '#393E46',
                color: page >= totalPages ? '#948979' : '#DFD0B8',
                border: '1px solid #948979',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 700,
              }}
            >
              SAU &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
