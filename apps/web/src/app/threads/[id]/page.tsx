'use client';

import type { FlatCommentItem, ThreadDetail } from '@acad/contracts';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FloatingChatWidget } from '@/components/chat/floating-chat-widget';
import { CommentTree } from '@/components/comments/comment-tree';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { LeftSidebar } from '@/components/layout/left-sidebar';
import { RightRail } from '@/components/layout/right-rail';
import { CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';

export default function ThreadDetailPage() {
  const params = useParams();
  const threadId = (params?.id as string) || '';
  const { user, openAuthModal } = useAuth();

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [comments, setComments] = useState<FlatCommentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [vote, setVote] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadThreadAndComments() {
      try {
        setLoading(true);
        const data = await CommunityApi.getThread(threadId);
        if (isMounted && data) {
          setThread(data);
          setScore(data.netScore || 0);
          setVote(data.userVote || 0);
        }
      } catch {
        // Fallback demo thread data
        if (isMounted) {
          const fallbackThread: ThreadDetail = {
            id: threadId,
            spaceId: 'space-1',
            spaceSlug: 'devops-arch',
            spaceName: 'DevOps Architecture',
            authorId: 'author-1',
            authorUsername: 'cloud_architect',
            title:
              'Triển khai Self-Hosted Homelab Monorepo: Podman Rootless, Cloudflare Tunnel và Next.js 15 SSR High Availability',
            slug: 'trien-khai-self-hosted-homelab-monorepo',
            isPinned: false,
            isLocked: false,
            upvotes: 562,
            downvotes: 0,
            netScore: 562,
            commentsCount: 3,
            userVote: 0,
            isSaved: false,
            createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
            contentText: `Tối ưu hóa tài nguyên phần cứng, triệt tiêu chi phí Cloud đắt đỏ với mô hình Zero Trust Cloudflare Tunnel kết hợp Systemd User Daemons và PostgreSQL 16 ltree nested tree CMS.\n\n### 1. Kiến trúc tổng thể\n- **Edge Network:** Cloudflare WAF + TLS 1.3\n- **Inbound:** Cloudflare Tunnel daemon (NAT closed 100%)\n- **Database Engine:** PostgreSQL 16 Alpine với Podman Rootless Cgroups v2 isolation\n- **Cache:** Redis 7 In-Memory Engine\n- **API Gateway:** Node.js 22 Express (RFC 7807 problem details)\n\n### 2. Kết quả đo lường thực tế\nLatency phản hồi trung bình nội bộ < 15ms. Bộ nhớ tiêu thụ toàn hệ thống chỉ ~350MB RAM!`,
          };
          setThread(fallbackThread);
          setScore(fallbackThread.netScore);
          setVote(fallbackThread.userVote);
        }
      }

      try {
        const commentData = await CommunityApi.getThreadComments(threadId);
        if (isMounted && commentData.items && commentData.items.length > 0) {
          setComments(commentData.items);
        } else if (isMounted) {
          // Demo sample nested comments
          const demoComments: FlatCommentItem[] = [
            {
              id: 'comment-1',
              threadId,
              parentId: null,
              path: '0001',
              depth: 0,
              isCappedAtMaxDepth: false,
              parentAuthorMentionNeeded: false,
              contentAst: {
                text: 'Kiến trúc rất ấn tượng! Cho mình hỏi việc backup volume .data/postgres bạn tự động hóa bằng giải pháp nào?',
              },
              author: { id: 'u-1', username: 'sre_expert', karmaScore: 140 },
              netScore: 18,
              upvotes: 18,
              downvotes: 0,
              userVote: 0,
              directRepliesCount: 1,
              totalDescendantsCount: 2,
              isCollapsed: false,
              isDeleted: false,
              createdAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
            },
            {
              id: 'comment-2',
              threadId,
              parentId: 'comment-1',
              path: '0001.0001',
              depth: 1,
              isCappedAtMaxDepth: false,
              parentAuthorMentionNeeded: false,
              parentAuthorUsername: 'sre_expert',
              contentAst: {
                text: 'Mình dùng pg_dump định kỳ lúc 2h sáng đẩy lên Cloudflare R2 qua Rclone mã hóa GPG nhé bạn!',
              },
              author: { id: 'u-2', username: 'cloud_architect', karmaScore: 560 },
              netScore: 12,
              upvotes: 12,
              downvotes: 0,
              userVote: 0,
              directRepliesCount: 1,
              totalDescendantsCount: 1,
              isCollapsed: false,
              isDeleted: false,
              createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
            },
            {
              id: 'comment-3',
              threadId,
              parentId: 'comment-2',
              path: '0001.0001.0001',
              depth: 2,
              isCappedAtMaxDepth: false,
              parentAuthorMentionNeeded: false,
              parentAuthorUsername: 'cloud_architect',
              contentAst: { text: 'Tuyệt vời, cảm ơn bác nhiều!' },
              author: { id: 'u-1', username: 'sre_expert', karmaScore: 140 },
              netScore: 4,
              upvotes: 4,
              downvotes: 0,
              userVote: 0,
              directRepliesCount: 0,
              totalDescendantsCount: 0,
              isCollapsed: false,
              isDeleted: false,
              createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
            },
          ];
          setComments(demoComments);
        }
      } catch {
        // Ignored
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadThreadAndComments();
    return () => {
      isMounted = false;
    };
  }, [threadId]);

  // Optimistic Thread Voting FSM
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
      const res = await CommunityApi.voteThread(threadId, direction);
      setScore(res.netScore);
      setVote(res.userVote);
    } catch {
      setVote(prevVote);
      setScore(prevScore);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
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
                      href={`/s/${thread.spaceSlug}`}
                      style={{
                        color: 'var(--color-brand)',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      s/{thread.spaceSlug}
                    </Link>
                    <span>•</span>
                    <span>Đăng bởi</span>
                    <Link
                      href={`/u/${thread.authorUsername}`}
                      style={{
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      u/{thread.authorUsername}
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

                  {/* Nội dung bài viết */}
                  <div
                    style={{
                      fontSize: '14px',
                      lineHeight: 1.7,
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-wrap',
                      marginBottom: '20px',
                    }}
                  >
                    {thread.contentText}
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
                    {/* Bầu chọn Upvote / Downvote */}
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

                    {/* Nút Bình luận */}
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
                      <span>{comments.length} bình luận</span>
                    </div>

                    {/* Nút Chia sẻ */}
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
                  </div>

                  {/* Cây Bình Luận Đa Tầng Ltree */}
                  <CommentTree threadId={thread.id} initialComments={comments} />
                </article>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#f43f5e' }}>
                  Không tìm thấy bài viết này.
                </div>
              )}
            </div>

            {/* Cột Phải */}
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
