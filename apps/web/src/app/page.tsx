'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '../components/navbar';
import { useAuth } from '../contexts/auth-context';
import { communityClient } from '../lib/community-client';
import { Space, ThreadSummary, ContentAST } from '@acad/contracts';

export default function HomePage() {
  const { user } = useAuth();

  // State
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSort, setSelectedSort] = useState<'hot' | 'new' | 'top'>('hot');
  const [selectedSpaceSlug, setSelectedSpaceSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals
  const [showCreateThreadModal, setShowCreateThreadModal] = useState(false);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);

  // Create Thread Form State
  const [newThreadSpaceId, setNewThreadSpaceId] = useState('');
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newThreadCode, setNewThreadCode] = useState('');
  const [newThreadCodeLang, setNewThreadCodeLang] = useState('bash');
  const [isSubmittingThread, setIsSubmittingThread] = useState(false);
  const [threadFormError, setThreadFormError] = useState<string | null>(null);

  // Create Space Form State
  const [newSpaceName, setNewSpaceName] = useState('');
  const [newSpaceSlug, setNewSpaceSlug] = useState('');
  const [newSpaceDesc, setNewSpaceDesc] = useState('');
  const [isSubmittingSpace, setIsSubmittingSpace] = useState(false);
  const [spaceFormError, setSpaceFormError] = useState<string | null>(null);

  // Load spaces & threads
  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [spacesData, threadsData] = await Promise.all([
        communityClient.fetchSpaces(),
        communityClient.fetchThreads({
          sort: selectedSort,
          spaceSlug: selectedSpaceSlug || undefined,
        }),
      ]);
      setSpaces(spacesData);
      setThreads(threadsData.items);
      if (spacesData.length > 0 && !newThreadSpaceId) {
        setNewThreadSpaceId(spacesData[0].id);
      }
    } catch (err: any) {
      console.error('[HomePage] Error loading data:', err);
      setErrorMsg(err.message || 'Không thể nạp dữ liệu cộng đồng');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedSort, selectedSpaceSlug]);

  // Handle Vote
  const handleVote = async (threadId: string, direction: 1 | -1) => {
    if (!user) {
      alert('Vui lòng đăng nhập để bình chọn bài viết!');
      return;
    }

    // Optimistic UI update
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        const currentDir = t.userVoteDirection;
        let newNetScore = t.counters.netScore;
        let newUpvotes = t.counters.upvotes;
        let newDownvotes = t.counters.downvotes;
        let newDirection: 1 | -1 | null = direction;

        if (currentDir === direction) {
          // Unvote
          newDirection = null;
          if (direction === 1) {
            newUpvotes -= 1;
            newNetScore -= 1;
          } else {
            newDownvotes -= 1;
            newNetScore += 1;
          }
        } else if (currentDir === null || currentDir === undefined) {
          // New vote
          if (direction === 1) {
            newUpvotes += 1;
            newNetScore += 1;
          } else {
            newDownvotes += 1;
            newNetScore -= 1;
          }
        } else {
          // Reverse
          if (direction === 1) {
            newUpvotes += 1;
            newDownvotes -= 1;
            newNetScore += 2;
          } else {
            newUpvotes -= 1;
            newDownvotes += 1;
            newNetScore -= 2;
          }
        }

        return {
          ...t,
          counters: {
            ...t.counters,
            netScore: newNetScore,
            upvotes: Math.max(0, newUpvotes),
            downvotes: Math.max(0, newDownvotes),
          },
          userVoteDirection: newDirection,
        };
      }),
    );

    try {
      const res = await communityClient.voteThread(threadId, direction);
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== threadId) return t;
          return {
            ...t,
            counters: {
              ...t.counters,
              netScore: res.netScore,
              upvotes: res.upvotes,
              downvotes: res.downvotes,
            },
            userVoteDirection: res.userVote,
          };
        }),
      );
    } catch (err: any) {
      console.error('Vote failed:', err);
      loadData(); // Revert on failure
    }
  };

  // Submit new thread
  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadTitle.trim() || newThreadTitle.length < 5) {
      setThreadFormError('Tiêu đề bài viết phải có tối thiểu 5 ký tự');
      return;
    }
    if (!newThreadContent.trim()) {
      setThreadFormError('Nội dung bài viết không được để trống');
      return;
    }
    if (!newThreadSpaceId) {
      setThreadFormError('Vui lòng chọn không gian thảo luận');
      return;
    }

    setIsSubmittingThread(true);
    setThreadFormError(null);

    try {
      const astContent: any[] = [
        {
          type: 'paragraph',
          text: newThreadContent.trim(),
        },
      ];

      if (newThreadCode.trim()) {
        astContent.push({
          type: 'codeBlock',
          attrs: { language: newThreadCodeLang },
          text: newThreadCode.trim(),
        });
      }

      const contentAst: ContentAST = {
        type: 'doc',
        content: astContent,
      };

      const created = await communityClient.createThread({
        spaceId: newThreadSpaceId,
        title: newThreadTitle.trim(),
        contentAst,
      });

      // Prepend to current threads list
      setThreads((prev) => [created, ...prev]);

      // Reset form
      setNewThreadTitle('');
      setNewThreadContent('');
      setNewThreadCode('');
      setShowCreateThreadModal(false);
    } catch (err: any) {
      setThreadFormError(err.message || 'Lỗi khi đăng bài viết');
    } finally {
      setIsSubmittingThread(false);
    }
  };

  // Submit new space
  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim() || !newSpaceSlug.trim()) {
      setSpaceFormError('Vui lòng nhập tên và slug của không gian');
      return;
    }

    setIsSubmittingSpace(true);
    setSpaceFormError(null);

    try {
      const space = await communityClient.createSpace({
        name: newSpaceName.trim(),
        slug: newSpaceSlug.trim().toLowerCase(),
        description: newSpaceDesc.trim() || undefined,
        rules: [],
        isPrivate: false,
      });

      setSpaces((prev) => [space, ...prev]);
      setNewSpaceName('');
      setNewSpaceSlug('');
      setNewSpaceDesc('');
      setShowCreateSpaceModal(false);
    } catch (err: any) {
      setSpaceFormError(err.message || 'Lỗi khi tạo không gian');
    } finally {
      setIsSubmittingSpace(false);
    }
  };

  return (
    <div style={{ backgroundColor: '#222831', minHeight: '100vh', color: '#DFD0B8' }}>
      <Navbar />

      <main
        style={{
          maxWidth: '1360px',
          margin: '0 auto',
          padding: '1.5rem 1rem',
          display: 'grid',
          gridTemplateColumns: '260px 1fr 300px',
          gap: '1.5rem',
        }}
      >
        {/* ================================================================= */}
        {/* LEFT RAIL: SPACES DIRECTORY (MINIMALIST BRUTALISM) */}
        {/* ================================================================= */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* User Fast Action */}
          <div
            style={{
              backgroundColor: '#393E46',
              border: '2px solid #948979',
              padding: '1rem',
              boxShadow: '3px 3px 0px #948979',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#948979', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              // TÁC VỤ NHANH
            </div>
            {user ? (
              <button
                onClick={() => setShowCreateThreadModal(true)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.5rem',
                  backgroundColor: '#DFD0B8',
                  color: '#222831',
                  border: '2px solid #DFD0B8',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  boxShadow: '3px 3px 0px #948979',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <span>+ ĐĂNG BÀI VIẾT</span>
              </button>
            ) : (
              <Link
                href="/login"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.5rem',
                  backgroundColor: '#DFD0B8',
                  color: '#222831',
                  border: '2px solid #DFD0B8',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  boxShadow: '3px 3px 0px #948979',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                ĐĂNG NHẬP ĐỂ POST
              </Link>
            )}
          </div>

          {/* Spaces List */}
          <div
            style={{
              backgroundColor: '#393E46',
              border: '2px solid #948979',
              padding: '1rem',
              boxShadow: '3px 3px 0px #948979',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.75rem',
                borderBottom: '1px solid #948979',
                paddingBottom: '0.5rem',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#948979', letterSpacing: '0.08em' }}>
                // KHÔNG GIAN THẢO LUẬN
              </span>
              {user && (
                <button
                  onClick={() => setShowCreateSpaceModal(true)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#DFD0B8',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  + TẠO MỚI
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <button
                onClick={() => setSelectedSpaceSlug(null)}
                style={{
                  textAlign: 'left',
                  padding: '0.45rem 0.65rem',
                  backgroundColor: selectedSpaceSlug === null ? '#222831' : 'transparent',
                  color: selectedSpaceSlug === null ? '#DFD0B8' : '#948979',
                  border: selectedSpaceSlug === null ? '1px solid #DFD0B8' : '1px solid transparent',
                  fontWeight: selectedSpaceSlug === null ? 800 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                * TẤT CẢ KHÔNG GIAN
              </button>

              {spaces.map((s) => {
                const isSelected = selectedSpaceSlug === s.slug;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSpaceSlug(s.slug)}
                    style={{
                      textAlign: 'left',
                      padding: '0.45rem 0.65rem',
                      backgroundColor: isSelected ? '#222831' : 'transparent',
                      color: isSelected ? '#DFD0B8' : '#948979',
                      border: isSelected ? '1px solid #DFD0B8' : '1px solid transparent',
                      fontWeight: isSelected ? 800 : 500,
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      s/{s.slug}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#948979', fontFamily: 'var(--font-mono)' }}>
                      {s.threadCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ================================================================= */}
        {/* CENTER STAGE: FEED & CONTENT STREAM */}
        {/* ================================================================= */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Feed Controls Header */}
          <div
            style={{
              backgroundColor: '#393E46',
              border: '2px solid #948979',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '3px 3px 0px #948979',
            }}
          >
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['hot', 'new', 'top'] as const).map((tab) => {
                const active = selectedSort === tab;
                const label = tab === 'hot' ? 'THỊNH HÀNH' : tab === 'new' ? 'MỚI NHẤT' : 'ĐIỂM CAO';
                return (
                  <button
                    key={tab}
                    onClick={() => setSelectedSort(tab)}
                    style={{
                      padding: '0.35rem 0.75rem',
                      backgroundColor: active ? '#DFD0B8' : '#222831',
                      color: active ? '#222831' : '#DFD0B8',
                      border: '1px solid #948979',
                      fontWeight: 800,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: '0.75rem', color: '#948979', fontFamily: 'var(--font-mono)' }}>
              {threads.length} BÀI VIẾT
            </div>
          </div>

          {/* Loading / Error States */}
          {isLoading && (
            <div
              style={{
                backgroundColor: '#393E46',
                border: '2px solid #948979',
                padding: '3rem',
                textAlign: 'center',
                color: '#DFD0B8',
                fontFamily: 'var(--font-mono)',
              }}
            >
              // ĐANG NẠP DỮ LIỆU CỘNG ĐỒNG THỰC TẾ...
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                backgroundColor: '#393E46',
                border: '2px solid #D96B6B',
                padding: '1rem',
                color: '#D96B6B',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
              }}
            >
              [LỖI]: {errorMsg}
            </div>
          )}

          {/* Post Items Stream */}
          {!isLoading && threads.length === 0 && (
            <div
              style={{
                backgroundColor: '#393E46',
                border: '2px solid #948979',
                padding: '3rem',
                textAlign: 'center',
                color: '#948979',
              }}
            >
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#DFD0B8', marginBottom: '0.5rem' }}>
                Chưa có bài viết nào trong không gian này
              </div>
              <p style={{ fontSize: '0.85rem' }}>Hãy là người đầu tiên khai mở luồng thảo luận kỹ thuật!</p>
            </div>
          )}

          {!isLoading &&
            threads.map((thread) => {
              const isVotedUp = thread.userVoteDirection === 1;
              const isVotedDown = thread.userVoteDirection === -1;

              return (
                <article
                  key={thread.id}
                  style={{
                    backgroundColor: '#393E46',
                    border: '2px solid #948979',
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr',
                    boxShadow: '3px 3px 0px #948979',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                >
                  {/* VOTING COLUMN */}
                  <div
                    style={{
                      backgroundColor: '#2E343E',
                      borderRight: '2px solid #948979',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '0.75rem 0',
                      gap: '0.25rem',
                    }}
                  >
                    <button
                      onClick={() => handleVote(thread.id, 1)}
                      title="Tán thành (Upvote)"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isVotedUp ? '#DFD0B8' : '#948979',
                        cursor: 'pointer',
                        padding: '2px',
                        transform: isVotedUp ? 'scale(1.2)' : 'none',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={isVotedUp ? '#DFD0B8' : 'none'} stroke="currentColor" strokeWidth="2.5">
                        <polygon points="12 4 4 18 20 18" />
                      </svg>
                    </button>

                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 900,
                        color: isVotedUp ? '#DFD0B8' : isVotedDown ? '#D96B6B' : '#DFD0B8',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {thread.counters.netScore}
                    </span>

                    <button
                      onClick={() => handleVote(thread.id, -1)}
                      title="Phản đối (Downvote)"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: isVotedDown ? '#D96B6B' : '#948979',
                        cursor: 'pointer',
                        padding: '2px',
                        transform: isVotedDown ? 'scale(1.2)' : 'none',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill={isVotedDown ? '#D96B6B' : 'none'} stroke="currentColor" strokeWidth="2.5">
                        <polygon points="12 20 4 6 20 6" />
                      </svg>
                    </button>
                  </div>

                  {/* THREAD CONTENT */}
                  <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {/* Metadata Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#948979' }}>
                      <Link
                        href={`/s/${thread.spaceSlug}`}
                        style={{
                          fontWeight: 800,
                          color: '#DFD0B8',
                          textDecoration: 'none',
                          backgroundColor: '#222831',
                          padding: '0.15rem 0.45rem',
                          border: '1px solid #948979',
                        }}
                      >
                        s/{thread.spaceSlug}
                      </Link>
                      <span>•</span>
                      <span>Đăng bởi u/{thread.authorUsername}</span>
                      <span>•</span>
                      <span>{new Date(thread.createdAt).toLocaleDateString('vi-VN')}</span>
                      {thread.isPinned && (
                        <span style={{ backgroundColor: '#DFD0B8', color: '#222831', padding: '0.1rem 0.35rem', fontWeight: 900, fontSize: '0.68rem' }}>
                          GHIM
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <Link
                      href={`/threads/${thread.slug}`}
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: '#DFD0B8',
                        textDecoration: 'none',
                        lineHeight: 1.35,
                      }}
                    >
                      {thread.title}
                    </Link>

                    {/* Snippet */}
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#B3AAA0', lineHeight: 1.5 }}>
                      {thread.snippet}
                    </p>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #444A54' }}>
                      <Link
                        href={`/threads/${thread.slug}`}
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#DFD0B8',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          backgroundColor: '#222831',
                          padding: '0.3rem 0.6rem',
                          border: '1px solid #948979',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{thread.counters.commentCount} BÌNH LUẬN</span>
                      </Link>

                      <span style={{ fontSize: '0.75rem', color: '#948979', fontFamily: 'var(--font-mono)' }}>
                        {thread.counters.viewCount} lượt xem
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
        </section>

        {/* ================================================================= */}
        {/* RIGHT RAIL: PROTOCOL RULES & REPUTATION */}
        {/* ================================================================= */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Platform Info */}
          <div
            style={{
              backgroundColor: '#393E46',
              border: '2px solid #948979',
              padding: '1rem',
              boxShadow: '3px 3px 0px #948979',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#948979', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              // NỀN TẢNG KỸ NGHỆ
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#DFD0B8', marginBottom: '0.5rem' }}>
              ACAD DEVOPS & INFRA
            </div>
            <p style={{ fontSize: '0.82rem', color: '#B3AAA0', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Cộng đồng thảo luận kiến trúc phân tán, CI/CD, Kubernetes, Zero-Trust và hạ tầng đám mây cho kỹ sư Việt Nam.
            </p>

            <div style={{ borderTop: '1px solid #948979', paddingTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#DFD0B8', fontFamily: 'var(--font-mono)' }}>
                  {spaces.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#948979' }}>KHÔNG GIAN</div>
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#DFD0B8', fontFamily: 'var(--font-mono)' }}>
                  {threads.length}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#948979' }}>BÀI VIẾT</div>
              </div>
            </div>
          </div>

          {/* Brutalist Rules */}
          <div
            style={{
              backgroundColor: '#393E46',
              border: '2px solid #948979',
              padding: '1rem',
              boxShadow: '3px 3px 0px #948979',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#948979', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
              // NGUYÊN TẮC CỘNG ĐỒNG
            </div>
            <ol style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#B3AAA0', lineHeight: 1.6 }}>
              <li>Tập trung vào giải pháp kỹ thuật có kiểm chứng.</li>
              <li>Đính kèm mã nguồn cấu hình rõ ràng (YAML, Docker, SQL).</li>
              <li>Không lộ Secrets, Token hoặc Private Key.</li>
              <li>Tôn trọng đồng nghiệp và đóng góp văn minh.</li>
            </ol>
          </div>
        </aside>
      </main>

      {/* =================================================================== */}
      {/* MODAL: TẠO BÀI VIẾT MỚI (MINIMALIST BRUTALISM) */}
      {/* =================================================================== */}
      {showCreateThreadModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(34, 40, 49, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '680px',
              backgroundColor: '#393E46',
              border: '2px solid #DFD0B8',
              boxShadow: '6px 6px 0px #DFD0B8',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #948979', paddingBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#DFD0B8', textTransform: 'uppercase' }}>
                // ĐĂNG BÀI VIẾT THẢO LUẬN MỚI
              </h2>
              <button
                onClick={() => setShowCreateThreadModal(false)}
                style={{
                  backgroundColor: '#222831',
                  border: '1px solid #948979',
                  color: '#DFD0B8',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                }}
              >
                ✕
              </button>
            </div>

            {threadFormError && (
              <div style={{ backgroundColor: '#222831', border: '1px solid #D96B6B', padding: '0.5rem', color: '#D96B6B', fontSize: '0.82rem' }}>
                [LỖI]: {threadFormError}
              </div>
            )}

            <form onSubmit={handleCreateThread} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Select Space */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#948979', marginBottom: '0.35rem' }}>
                  CHỌN KHÔNG GIAN THẢO LUẬN:
                </label>
                <select
                  value={newThreadSpaceId}
                  onChange={(e) => setNewThreadSpaceId(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#222831',
                    border: '2px solid #948979',
                    color: '#DFD0B8',
                    padding: '0.55rem',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      s/{s.slug} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#948979', marginBottom: '0.35rem' }}>
                  TIÊU ĐỀ BÀI VIẾT:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tối ưu hóa Kubernetes Ingress với Envoy Gateway..."
                  value={newThreadTitle}
                  onChange={(e) => setNewThreadTitle(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#222831',
                    border: '2px solid #948979',
                    color: '#DFD0B8',
                    padding: '0.55rem',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Content */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#948979', marginBottom: '0.35rem' }}>
                  NỘI DUNG CHI TIẾT:
                </label>
                <textarea
                  rows={4}
                  placeholder="Mô tả bối cảnh, vấn đề gặp phải, kiến trúc đề xuất..."
                  value={newThreadContent}
                  onChange={(e) => setNewThreadContent(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#222831',
                    border: '2px solid #948979',
                    color: '#DFD0B8',
                    padding: '0.55rem',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Optional Code Snippet */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#948979' }}>
                    MÃ NGUỒN ĐÍNH KÈM (TÙY CHỌN):
                  </label>
                  <select
                    value={newThreadCodeLang}
                    onChange={(e) => setNewThreadCodeLang(e.target.value)}
                    style={{
                      backgroundColor: '#222831',
                      border: '1px solid #948979',
                      color: '#DFD0B8',
                      fontSize: '0.75rem',
                      padding: '0.15rem 0.4rem',
                    }}
                  >
                    <option value="bash">Bash / Shell</option>
                    <option value="yaml">YAML / K8s</option>
                    <option value="typescript">TypeScript</option>
                    <option value="sql">PostgreSQL / SQL</option>
                    <option value="dockerfile">Dockerfile</option>
                  </select>
                </div>
                <textarea
                  rows={3}
                  placeholder="# Dán cấu hình hoặc code snippet tại đây..."
                  value={newThreadCode}
                  onChange={(e) => setNewThreadCode(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#222831',
                    border: '2px solid #948979',
                    color: '#DFD0B8',
                    padding: '0.55rem',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateThreadModal(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    backgroundColor: '#222831',
                    border: '2px solid #948979',
                    color: '#DFD0B8',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  HỦY BỎ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingThread}
                  style={{
                    padding: '0.55rem 1.5rem',
                    backgroundColor: '#DFD0B8',
                    border: '2px solid #DFD0B8',
                    color: '#222831',
                    fontWeight: 900,
                    cursor: isSubmittingThread ? 'not-allowed' : 'pointer',
                    boxShadow: '3px 3px 0px #948979',
                  }}
                >
                  {isSubmittingThread ? 'ĐANG ĐĂNG...' : 'XÁC NHẬN ĐĂNG BÀI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: TẠO KHÔNG GIAN MỚI */}
      {/* =================================================================== */}
      {showCreateSpaceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(34, 40, 49, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#393E46',
              border: '2px solid #DFD0B8',
              boxShadow: '6px 6px 0px #DFD0B8',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #948979', paddingBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#DFD0B8', textTransform: 'uppercase' }}>
                // TẠO KHÔNG GIAN MỚI
              </h2>
              <button
                onClick={() => setShowCreateSpaceModal(false)}
                style={{
                  backgroundColor: '#222831',
                  border: '1px solid #948979',
                  color: '#DFD0B8',
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                }}
              >
                ✕
              </button>
            </div>

            {spaceFormError && (
              <div style={{ backgroundColor: '#222831', border: '1px solid #D96B6B', padding: '0.5rem', color: '#D96B6B', fontSize: '0.82rem' }}>
                [LỖI]: {spaceFormError}
              </div>
            )}

            <form onSubmit={handleCreateSpace} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#948979', marginBottom: '0.35rem' }}>
                  TÊN KHÔNG GIAN:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: An Ninh Ứng Dụng"
                  value={newSpaceName}
                  onChange={(e) => {
                    setNewSpaceName(e.target.value);
                    if (!newSpaceSlug) {
                      setNewSpaceSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9]/g, '-')
                          .replace(/-+/g, '-'),
                      );
                    }
                  }}
                  style={{
                    width: '100%',
                    backgroundColor: '#222831',
                    border: '2px solid #948979',
                    color: '#DFD0B8',
                    padding: '0.55rem',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#948979', marginBottom: '0.35rem' }}>
                  SLUG (ĐƯỜNG DẪN URL):
                </label>
                <input
                  type="text"
                  placeholder="an-ninh-ung-dung"
                  value={newSpaceSlug}
                  onChange={(e) => setNewSpaceSlug(e.target.value.toLowerCase())}
                  style={{
                    width: '100%',
                    backgroundColor: '#222831',
                    border: '2px solid #948979',
                    color: '#DFD0B8',
                    padding: '0.55rem',
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-mono)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#948979', marginBottom: '0.35rem' }}>
                  MÔ TẢ NGẮN:
                </label>
                <textarea
                  rows={3}
                  placeholder="Mô tả phạm vi thảo luận..."
                  value={newSpaceDesc}
                  onChange={(e) => setNewSpaceDesc(e.target.value)}
                  style={{
                    width: '100%',
                    backgroundColor: '#222831',
                    border: '2px solid #948979',
                    color: '#DFD0B8',
                    padding: '0.55rem',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateSpaceModal(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    backgroundColor: '#222831',
                    border: '2px solid #948979',
                    color: '#DFD0B8',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  HỦY BỎ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSpace}
                  style={{
                    padding: '0.55rem 1.5rem',
                    backgroundColor: '#DFD0B8',
                    border: '2px solid #DFD0B8',
                    color: '#222831',
                    fontWeight: 900,
                    cursor: isSubmittingSpace ? 'not-allowed' : 'pointer',
                    boxShadow: '3px 3px 0px #948979',
                  }}
                >
                  {isSubmittingSpace ? 'ĐANG TẠO...' : 'TẠO KHÔNG GIAN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
