'use client';

import type {
  FlatCommentItem,
  ModReportTargetType,
  ThreadDetail,
  VoteDirection,
} from '@acad/contracts';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { CommentTree } from '@/components/comments/comment-tree';
import { AppShell } from '@/components/layout/app-shell';
import { ReportModal } from '@/components/moderation/report-modal';
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BookmarkIcon,
  CommentIcon,
  FlagIcon,
  LockIcon,
  PinIcon,
  TrashIcon,
} from '@/components/ui/icons';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { extractApiErrorMessage } from '@/lib/api/client';
import { CommunityApi, resolveRenderableMediaUrl } from '@/lib/api/community';
import { ModerationApi } from '@/lib/api/moderation';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';

export default function ThreadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const threadIdOrSlug = decodeURIComponent(params.id ?? '');
  const { user, isAuthenticated, requireAuth } = useAuth();
  const { showToast } = useUI();
  const isGlobalModerator = user?.role === 'ADMIN' || user?.role === 'GLOBAL_MOD';
  const [modBusy, setModBusy] = useState(false);
  const [confirmDeleteThread, setConfirmDeleteThread] = useState(false);

  const [thread, setThread] = useState<ThreadDetail | null>(null);
  const [comments, setComments] = useState<FlatCommentItem[]>([]);
  const [totalActiveComments, setTotalActiveComments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [busyVote, setBusyVote] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [reportTarget, setReportTarget] = useState<{
    type: ModReportTargetType;
    id: string;
  } | null>(null);

  const refreshComments = useCallback(async (targetId: string) => {
    const tree = await CommunityApi.getComments(targetId);
    setComments(Array.isArray(tree.items) ? tree.items : []);
    setTotalActiveComments(tree.totalCount ?? 0);
    setThread((prev) => (prev ? { ...prev, commentsCount: tree.totalCount ?? 0 } : prev));
  }, []);

  const loadThreadAndComments = useCallback(async () => {
    if (!threadIdOrSlug) return;
    void isAuthenticated;
    try {
      setLoading(true);
      setErrorMsg(null);
      const [detail, tree] = await Promise.all([
        CommunityApi.getThread(threadIdOrSlug),
        CommunityApi.getComments(threadIdOrSlug),
      ]);
      setThread(detail);
      setComments(Array.isArray(tree.items) ? tree.items : []);
      setTotalActiveComments(tree.totalCount ?? detail.commentsCount);
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'Không tìm thấy bài viết yêu cầu'));
      setThread(null);
    } finally {
      setLoading(false);
    }
  }, [threadIdOrSlug, isAuthenticated]);

  useEffect(() => {
    void loadThreadAndComments();
  }, [loadThreadAndComments]);

  const handleVoteThread = (direction: VoteDirection) => {
    if (!thread) return;
    requireAuth(async () => {
      if (busyVote) return;
      try {
        setBusyVote(true);
        const res = await CommunityApi.voteThread(thread.id, direction);
        setThread((prev) =>
          prev
            ? {
                ...prev,
                netScore: res.netScore,
                upvotes: res.upvotes,
                downvotes: res.downvotes,
                userVote: res.userVote,
              }
            : prev,
        );
      } catch (err) {
        showToast(extractApiErrorMessage(err, 'Không thể biểu quyết bài viết'), 'error');
      } finally {
        setBusyVote(false);
      }
    }, 'Đăng nhập để tham gia biểu quyết bài viết');
  };

  const handleToggleSave = () => {
    if (!thread) return;
    requireAuth(async () => {
      try {
        const res = await CommunityApi.toggleSaveThread(thread.id);
        setThread((prev) => (prev ? { ...prev, isSaved: res.isSaved } : prev));
        showToast(res.isSaved ? 'Đã lưu bài viết' : 'Đã bỏ lưu bài viết', 'success');
      } catch (err) {
        showToast(extractApiErrorMessage(err, 'Không thể cập nhật lưu bài viết'), 'error');
      }
    }, 'Đăng nhập để lưu bài viết');
  };

  const handleCreateRootComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!thread || !commentText.trim()) return;
    requireAuth(async () => {
      try {
        setSubmittingComment(true);
        await CommunityApi.createComment(thread.id, commentText.trim());
        setCommentText('');
        await refreshComments(thread.id);
        showToast('Đã đăng bình luận', 'success');
      } catch (err) {
        showToast(extractApiErrorMessage(err, 'Không thể đăng bình luận'), 'error');
      } finally {
        setSubmittingComment(false);
      }
    }, 'Đăng nhập để bình luận');
  };

  const handleTogglePin = async () => {
    if (!thread || !isGlobalModerator) return;
    try {
      setModBusy(true);
      const res = await ModerationApi.setThreadPinned(thread.id, !thread.isPinned);
      setThread((prev) => (prev ? { ...prev, isPinned: res.isPinned } : prev));
      showToast(res.isPinned ? 'Đã ghim bài viết' : 'Đã bỏ ghim bài viết', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể thay đổi trạng thái ghim'), 'error');
    } finally {
      setModBusy(false);
    }
  };

  const handleToggleLock = async () => {
    if (!thread || !isGlobalModerator) return;
    try {
      setModBusy(true);
      const res = await ModerationApi.setThreadLocked(thread.id, !thread.isLocked);
      setThread((prev) => (prev ? { ...prev, isLocked: res.isLocked } : prev));
      showToast(res.isLocked ? 'Đã khóa bình luận bài viết' : 'Đã mở khóa bình luận', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể thay đổi trạng thái khóa'), 'error');
    } finally {
      setModBusy(false);
    }
  };

  const handleDeleteThread = async () => {
    if (!thread || !isGlobalModerator) return;
    try {
      setModBusy(true);
      const targetSpace = thread.spaceSlug;
      await ModerationApi.deleteThread(thread.id);
      showToast('Đã xóa bài viết khỏi cộng đồng', 'success');
      router.push(`/s/${targetSpace}`);
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể xóa bài viết'), 'error');
      setModBusy(false);
    }
  };

  return (
    <AppShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading && (
          <div className="surface-card" style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
            Đang tải nội dung bài viết và cây bình luận...
          </div>
        )}

        {!loading && errorMsg && (
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
            <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Không thể mở bài viết</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{errorMsg}</p>
            <Link href="/" className="btn-primary" style={{ textDecoration: 'none' }}>
              Quay về trang chủ
            </Link>
          </section>
        )}

        {!loading && thread && (
          <>
            {/* Thread Full Card */}
            <article
              data-testid="thread-detail-card"
              className="surface-card"
              style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  fontSize: '12.5px',
                  color: 'var(--text-secondary)',
                }}
              >
                <Link
                  href={`/s/${thread.spaceSlug}`}
                  style={{ fontWeight: 700, color: 'var(--color-brand)', textDecoration: 'none' }}
                >
                  s/{thread.spaceSlug}
                </Link>
                <span>•</span>
                <Link
                  href={`/u/${thread.authorUsername}`}
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                >
                  u/{thread.authorUsername}
                </Link>
                <span>•</span>
                <span>{new Date(thread.createdAt).toLocaleString()}</span>
                {thread.flair && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: thread.flair.colorHex,
                      backgroundColor: thread.flair.backgroundHex,
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {thread.flair.name}
                  </span>
                )}
                {thread.isPinned && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'var(--bg-pill)',
                      color: 'var(--color-brand)',
                    }}
                  >
                    Đã ghim
                  </span>
                )}
                {thread.isLocked && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'var(--bg-pill)',
                      color: 'var(--color-warning)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <LockIcon size={12} />
                    <span>Đã khóa bình luận</span>
                  </span>
                )}
              </div>

              <h1
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  lineHeight: 1.35,
                  color: 'var(--text-primary)',
                }}
              >
                {thread.title}
              </h1>

              {thread.linkUrl && (
                <a
                  href={thread.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-brand)',
                    wordBreak: 'break-all',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-subtle)',
                  }}
                >
                  {thread.linkUrl}
                </a>
              )}

              {thread.mediaUrls && thread.mediaUrls.length > 0 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      thread.mediaUrls.length > 1 ? 'repeat(auto-fit, minmax(240px, 1fr))' : '1fr',
                    gap: '10px',
                  }}
                >
                  {thread.mediaUrls.map((url) => (
                    <img
                      key={url}
                      data-testid="thread-media-image"
                      src={resolveRenderableMediaUrl(url)}
                      alt={thread.title}
                      style={{
                        width: '100%',
                        maxHeight: '520px',
                        objectFit: 'contain',
                        backgroundColor: 'var(--bg-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    />
                  ))}
                </div>
              )}

              {thread.contentText && <MarkdownContent content={thread.contentText} />}

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  borderTop: '1px solid var(--border-divider)',
                  paddingTop: '12px',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: 'var(--bg-pill)',
                    borderRadius: 'var(--radius-full)',
                    padding: '2px 8px',
                  }}
                >
                  <button
                    type="button"
                    disabled={busyVote}
                    onClick={() => handleVoteThread(1)}
                    aria-label="Upvote bài viết"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color:
                        thread.userVote === 1 ? 'var(--color-upvote)' : 'var(--text-secondary)',
                      display: 'inline-flex',
                    }}
                  >
                    <ArrowUpIcon size={16} />
                  </button>
                  <span
                    data-testid="detail-thread-score"
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 700,
                      minWidth: '22px',
                      textAlign: 'center',
                    }}
                  >
                    {thread.netScore}
                  </span>
                  <button
                    type="button"
                    disabled={busyVote}
                    onClick={() => handleVoteThread(-1)}
                    aria-label="Downvote bài viết"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color:
                        thread.userVote === -1 ? 'var(--color-downvote)' : 'var(--text-secondary)',
                      display: 'inline-flex',
                    }}
                  >
                    <ArrowDownIcon size={16} />
                  </button>
                </div>

                <div
                  data-testid="detail-comment-count"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-pill)',
                    color: 'var(--text-secondary)',
                    fontSize: '12.5px',
                  }}
                >
                  <CommentIcon size={14} />
                  <span>{totalActiveComments} bình luận</span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSave}
                  className="btn-ghost"
                  style={{
                    padding: '5px 12px',
                    fontSize: '12.5px',
                    color: thread.isSaved ? 'var(--color-brand)' : 'var(--text-secondary)',
                  }}
                >
                  <BookmarkIcon size={14} />
                  <span>{thread.isSaved ? 'Đã lưu' : 'Lưu bài'}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    requireAuth(
                      () => setReportTarget({ type: 'THREAD', id: thread.id }),
                      'Đăng nhập để báo cáo bài viết',
                    )
                  }
                  className="btn-ghost"
                  style={{ padding: '5px 12px', fontSize: '12.5px' }}
                >
                  <FlagIcon size={14} />
                  <span>Báo cáo</span>
                </button>
              </div>

              {isGlobalModerator && (
                <div
                  data-testid="thread-mod-toolbar"
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '8px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-divider)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--color-brand)',
                      marginRight: '4px',
                    }}
                  >
                    Kiểm duyệt:
                  </span>
                  <button
                    type="button"
                    disabled={modBusy}
                    data-testid="mod-pin-thread-btn"
                    onClick={handleTogglePin}
                    className="btn-ghost"
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      border: '1px solid var(--border-subtle)',
                      color: thread.isPinned ? 'var(--color-brand)' : 'var(--text-secondary)',
                    }}
                  >
                    <PinIcon size={13} />
                    <span>{thread.isPinned ? 'Bỏ ghim' : 'Ghim bài'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={modBusy}
                    data-testid="mod-lock-thread-btn"
                    onClick={handleToggleLock}
                    className="btn-ghost"
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      border: '1px solid var(--border-subtle)',
                      color: thread.isLocked ? 'var(--color-warning)' : 'var(--text-secondary)',
                    }}
                  >
                    <LockIcon size={13} />
                    <span>{thread.isLocked ? 'Mở khóa' : 'Khóa bình luận'}</span>
                  </button>

                  {confirmDeleteThread ? (
                    <>
                      <button
                        type="button"
                        disabled={modBusy}
                        data-testid="mod-confirm-delete-thread-btn"
                        onClick={handleDeleteThread}
                        className="btn-primary"
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          backgroundColor: 'var(--color-danger)',
                          borderColor: 'var(--color-danger)',
                        }}
                      >
                        Xác nhận xóa bài
                      </button>
                      <button
                        type="button"
                        disabled={modBusy}
                        onClick={() => setConfirmDeleteThread(false)}
                        className="btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        Hủy
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={modBusy}
                      data-testid="mod-delete-thread-btn"
                      onClick={() => setConfirmDeleteThread(true)}
                      className="btn-ghost"
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--color-danger)',
                      }}
                    >
                      <TrashIcon size={13} />
                      <span>Xóa bài</span>
                    </button>
                  )}
                </div>
              )}
            </article>

            {/* Root Comment Composer */}
            {thread.isLocked ? (
              <div
                className="surface-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--color-warning)',
                  fontSize: '13.5px',
                }}
              >
                <LockIcon size={16} />
                <span>Bài viết này đã bị khóa bình luận bởi quản trị viên.</span>
              </div>
            ) : (
              <form
                onSubmit={handleCreateRootComment}
                className="surface-card"
                style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px' }}
              >
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Thảo luận ({totalActiveComments} bình luận)
                  </span>
                  <textarea
                    name="rootComment"
                    required
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Viết bình luận đóng góp của bạn..."
                    className="input-field"
                  />
                </label>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={submittingComment} className="btn-primary">
                    {submittingComment ? 'Đang gửi...' : 'Gửi bình luận'}
                  </button>
                </div>
              </form>
            )}

            {/* O(N) Flat ltree Comment Tree */}
            <CommentTree
              items={comments}
              isThreadLocked={thread.isLocked}
              onRefresh={() => refreshComments(thread.id)}
              onOpenReport={(commentId) => setReportTarget({ type: 'COMMENT', id: commentId })}
            />
          </>
        )}
      </div>

      <ReportModal
        open={Boolean(reportTarget)}
        targetType={reportTarget?.type ?? 'THREAD'}
        targetId={reportTarget?.id ?? null}
        onClose={() => setReportTarget(null)}
      />
    </AppShell>
  );
}
