'use client';

import type { FlatCommentItem, ThreadDetail } from '@acad/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { CommentTree } from '@/components/comments/comment-tree';
import { MarkdownRenderer } from '@/components/common/markdown-renderer';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { RightRail } from '@/components/layout/right-rail';
import { ReportModal } from '@/components/moderation/report-modal';
import { ApiHttpError, CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';
import { formatTimeAgo } from '@/lib/utils/thread-mapper';

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = (params?.id as string) || '';
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const { addRecentPost } = useUI();

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [comments, setComments] = useState<FlatCommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [vote, setVote] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  useEffect(() => {
    void isAuthenticated;
    let isMounted = true;
    async function loadThreadAndComments() {
      if (!threadId) return;
      try {
        setLoading(true);
        setErrorStatus(null);
        setErrorMsg(null);

        const [threadData, treeData] = await Promise.all([
          CommunityApi.getThread(threadId),
          CommunityApi.getThreadComments(threadId),
        ]);

        if (!isMounted) return;

        setThread(threadData);
        setScore(threadData.netScore || 0);
        setVote(threadData.userVote || 0);
        setComments(treeData.items || []);

        addRecentPost({
          id: threadData.id,
          spaceSlug: threadData.spaceSlug,
          spaceName: `s/${threadData.spaceSlug}`,
          title: threadData.title,
          timeAgo: formatTimeAgo(threadData.createdAt),
          upvotes: threadData.netScore || 0,
          comments: threadData.commentsCount || (treeData.items?.length ?? 0),
        });
      } catch (err: unknown) {
        if (!isMounted) return;
        setThread(null);
        setComments([]);
        if (err instanceof ApiHttpError) {
          setErrorStatus(err.status);
          setErrorMsg(err.message);
        } else {
          setErrorStatus(404);
          setErrorMsg('Không tìm thấy bài viết này.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void loadThreadAndComments();
    return () => {
      isMounted = false;
    };
  }, [threadId, isAuthenticated, addRecentPost]);

  const handleVote = async (direction: 1 | -1) => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    const prevVote = vote;
    const prevScore = score;

    let nextVote: number = direction;
    let delta: number = direction;

    if (prevVote === direction) {
      nextVote = 0;
      delta = -direction;
    } else if (prevVote !== 0) {
      delta = direction * 2;
    }

    setVote(nextVote);
    setScore(prevScore + delta);

    try {
      const res = await CommunityApi.voteThread(thread?.id || threadId, direction);
      setScore(res.netScore);
      setVote(res.userVote);
    } catch {
      setVote(prevVote);
      setScore(prevScore);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      void navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <div className="app-container">
        <LeftSidebar />

        <main className="main-content" style={{ maxWidth: '1060px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
            {/* Cột Chi Tiết Bài Viết & Bình Luận */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {loading && !thread ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Đang tải nội dung bài viết...
                </div>
              ) : thread ? (
                <article
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface)',
                    padding: '24px',
                  }}
                >
                  {/* Meta Bar */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      marginBottom: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Link
                      href={`/s/${thread.spaceSlug || 'devops-arch'}`}
                      style={{
                        color: 'var(--color-brand)',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      s/{thread.spaceSlug || 'devops-arch'}
                    </Link>
                    {thread.flair?.name && (
                      <span
                        style={{
                          backgroundColor: thread.flair.backgroundHex || 'var(--bg-subtle)',
                          color: thread.flair.colorHex || 'var(--color-brand)',
                          border: `1px solid ${thread.flair.colorHex || 'var(--color-brand)'}44`,
                          padding: '2px 8px',
                          borderRadius: '9999px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {thread.flair.name}
                      </span>
                    )}
                    <span>•</span>
                    <span>Đăng bởi</span>
                    <Link
                      href={`/u/${thread.authorUsername || 'anonymous'}`}
                      style={{
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      u/{thread.authorUsername || 'anonymous'}
                    </Link>
                    <span>•</span>
                    <span>{new Date(thread.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>

                  {/* Tiêu đề bài viết */}
                  <h1
                    style={{
                      fontSize: '22px',
                      fontWeight: 800,
                      lineHeight: 1.35,
                      color: 'var(--text-primary)',
                      margin: '0 0 16px 0',
                    }}
                  >
                    {thread.title}
                  </h1>

                  {/* Liên kết ngoài nếu là LINK thread */}
                  {thread.linkUrl && (
                    <a
                      href={thread.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        marginBottom: '14px',
                        fontSize: '13px',
                        color: 'var(--color-brand)',
                        textDecoration: 'underline',
                        wordBreak: 'break-all',
                      }}
                    >
                      {thread.linkUrl}
                    </a>
                  )}

                  {/* Nội dung bài viết với Markdown Renderer */}
                  <div style={{ marginBottom: '24px' }}>
                    <MarkdownRenderer content={thread.contentText || ''} />
                  </div>

                  {/* Action Bar Pills */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '9999px',
                        padding: '4px 12px',
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Upvote"
                        onClick={() => handleVote(1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: vote === 1 ? 'var(--color-upvote)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: 900,
                          fontSize: '14px',
                        }}
                      >
                        ▲
                      </button>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: '13px',
                          color:
                            vote === 1
                              ? 'var(--color-upvote)'
                              : vote === -1
                                ? 'var(--color-downvote)'
                                : 'var(--text-primary)',
                          minWidth: '24px',
                          textAlign: 'center',
                        }}
                      >
                        {score}
                      </span>
                      <button
                        type="button"
                        aria-label="Downvote"
                        onClick={() => handleVote(-1)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: vote === -1 ? 'var(--color-downvote)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          fontWeight: 900,
                          fontSize: '14px',
                        }}
                      >
                        ▼
                      </button>
                    </div>

                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '9999px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <span>💬</span>
                      <span>{comments.filter((c) => !c.isDeleted).length} bình luận</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '9999px',
                        border: 'none',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: copied ? 'var(--color-success)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      <span>🔗</span>
                      <span>{copied ? 'Đã sao chép link!' : 'Chia sẻ'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!user) {
                          openAuthModal('login');
                        } else {
                          setIsReportOpen(true);
                        }
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '9999px',
                        border: 'none',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      <span>🚩</span>
                      <span>Báo cáo</span>
                    </button>
                  </div>

                  <ReportModal
                    isOpen={isReportOpen}
                    targetType="THREAD"
                    targetId={thread.id}
                    targetLabel={thread.title}
                    onClose={() => setIsReportOpen(false)}
                  />

                  {/* Cây Bình Luận Đa Tầng ltree */}
                  <CommentTree threadId={thread.id} initialComments={comments} />
                </article>
              ) : (
                <div className="reddit-card" style={{ padding: '40px', textAlign: 'center' }}>
                  <h2
                    style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: errorStatus === 403 ? 'var(--color-brand)' : '#f43f5e',
                      marginBottom: '8px',
                    }}
                  >
                    {errorStatus === 403
                      ? 'Không gian Riêng Tư — Yêu cầu Quyền Thành Viên'
                      : 'Không tìm thấy bài viết'}
                  </h2>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginBottom: '16px',
                    }}
                  >
                    {errorMsg || 'Bài viết này không tồn tại hoặc bạn không có quyền xem.'}
                  </p>
                  {errorStatus === 403 && !isAuthenticated && (
                    <button
                      type="button"
                      className="reddit-pill-btn primary"
                      onClick={() => openAuthModal('login')}
                    >
                      Đăng nhập
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="desktop-only-rail">
              <RightRail />
            </div>
          </div>
        </main>
      </div>

      <FloatingChatWidget />
      <BottomNav />
    </div>
  );
}
