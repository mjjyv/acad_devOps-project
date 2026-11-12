'use client';

import type { FlatCommentItem, VoteDirection } from '@acad/contracts';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { extractApiErrorMessage } from '@/lib/api/client';
import { CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';
import { ArrowDownIcon, ArrowUpIcon, FlagIcon } from '../ui/icons';

interface CommentNodeProps {
  comment: FlatCommentItem;
  isThreadLocked: boolean;
  isCollapsed: boolean;
  onToggleCollapse: (path: string) => void;
  onReplySubmitted: () => Promise<void>;
  onDeleted: () => Promise<void>;
  onOpenReport: (commentId: string) => void;
}

function getCommentText(comment: FlatCommentItem): string {
  const raw = comment.contentAst?.text;
  return typeof raw === 'string' ? raw : '';
}

export function CommentNode({
  comment,
  isThreadLocked,
  isCollapsed,
  onToggleCollapse,
  onReplySubmitted,
  onDeleted,
  onOpenReport,
}: CommentNodeProps) {
  const { user, requireAuth } = useAuth();
  const { showToast } = useUI();

  const [netScore, setNetScore] = useState(comment.netScore);
  const [userVote, setUserVote] = useState(comment.userVote);
  const [busyVote, setBusyVote] = useState(false);

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwnComment = Boolean(user && user.id === comment.author.id);
  const indentPx = Math.max(0, Math.min(comment.depth, 8) - 1) * 20;
  const textContent = getCommentText(comment);

  const handleVote = (direction: VoteDirection) => {
    requireAuth(async () => {
      if (busyVote) return;
      try {
        setBusyVote(true);
        const res = await CommunityApi.voteComment(comment.id, direction);
        setNetScore(res.netScore);
        setUserVote(res.userVote);
      } catch (err) {
        showToast(extractApiErrorMessage(err, 'Không thể biểu quyết bình luận'), 'error');
      } finally {
        setBusyVote(false);
      }
    }, 'Đăng nhập để biểu quyết bình luận');
  };

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    try {
      setSubmittingReply(true);
      await CommunityApi.createComment(comment.threadId, replyText.trim(), comment.id);
      setReplyText('');
      setReplyOpen(false);
      await onReplySubmitted();
      showToast('Đã đăng phản hồi', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể gửi phản hồi'), 'error');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await CommunityApi.deleteComment(comment.id);
      await onDeleted();
      showToast('Đã xóa mềm bình luận', 'success');
    } catch (err) {
      showToast(extractApiErrorMessage(err, 'Không thể xóa bình luận'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      data-testid={`comment-node-${comment.id}`}
      data-depth={comment.depth}
      style={{
        marginLeft: `${indentPx}px`,
        paddingLeft: '12px',
        borderLeft:
          comment.depth > 1 ? '2px solid var(--border-subtle)' : '2px solid var(--border-focus)',
        paddingTop: '8px',
        paddingBottom: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
        }}
      >
        <button
          type="button"
          onClick={() => onToggleCollapse(comment.path)}
          aria-label={isCollapsed ? 'Mở rộng nhánh bình luận' : 'Thu gọn nhánh bình luận'}
          style={{
            background: 'var(--bg-pill)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-secondary)',
            fontSize: '11px',
            padding: '1px 6px',
            cursor: 'pointer',
          }}
        >
          {isCollapsed ? `[+ mở nhánh]` : '[-]'}
        </button>

        {comment.isDeleted ? (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>[đã xóa]</span>
        ) : (
          <Link
            href={`/u/${comment.author.username}`}
            style={{ fontWeight: 700, color: 'var(--color-brand)', textDecoration: 'none' }}
          >
            u/{comment.author.username}
          </Link>
        )}

        <span>•</span>
        <span style={{ color: 'var(--text-muted)' }}>Tầng {comment.depth}</span>

        {(comment.depth >= 8 || comment.isCappedAtMaxDepth) && (
          <span
            style={{
              padding: '1px 7px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--bg-pill)',
              color: 'var(--color-brand)',
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            Flat Reply (Bậc 8)
            {comment.parentAuthorUsername ? ` → @${comment.parentAuthorUsername}` : ''}
          </span>
        )}

        <span>•</span>
        <span style={{ color: 'var(--text-muted)' }}>
          {new Date(comment.createdAt).toLocaleString()}
        </span>
      </div>

      {/* Body */}
      {!isCollapsed && (
        <>
          {comment.isDeleted ? (
            <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              [Bình luận đã bị tác giả xóa]
            </p>
          ) : (
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {textContent}
            </p>
          )}

          {/* Action bar */}
          {!comment.isDeleted && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  backgroundColor: 'var(--bg-pill)',
                  borderRadius: 'var(--radius-full)',
                  padding: '1px 6px',
                }}
              >
                <button
                  type="button"
                  disabled={busyVote}
                  onClick={() => handleVote(1)}
                  aria-label="Upvote bình luận"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '3px',
                    color: userVote === 1 ? 'var(--color-upvote)' : 'var(--text-secondary)',
                    display: 'inline-flex',
                  }}
                >
                  <ArrowUpIcon size={13} />
                </button>
                <span
                  data-testid={`comment-score-${comment.id}`}
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    minWidth: '18px',
                    textAlign: 'center',
                  }}
                >
                  {netScore}
                </span>
                <button
                  type="button"
                  disabled={busyVote}
                  onClick={() => handleVote(-1)}
                  aria-label="Downvote bình luận"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '3px',
                    color: userVote === -1 ? 'var(--color-downvote)' : 'var(--text-secondary)',
                    display: 'inline-flex',
                  }}
                >
                  <ArrowDownIcon size={13} />
                </button>
              </div>

              {!isThreadLocked && (
                <button
                  type="button"
                  onClick={() =>
                    requireAuth(
                      () => setReplyOpen((prev) => !prev),
                      'Đăng nhập để trả lời bình luận',
                    )
                  }
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '3px 6px',
                  }}
                >
                  {replyOpen ? 'Đóng trả lời' : 'Trả lời'}
                </button>
              )}

              {isOwnComment && (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDelete()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-danger)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '3px 6px',
                  }}
                >
                  {deleting ? 'Đang xóa...' : 'Xóa'}
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  requireAuth(() => onOpenReport(comment.id), 'Đăng nhập để báo cáo bình luận')
                }
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '3px 6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <FlagIcon size={12} />
                <span>Báo cáo</span>
              </button>
            </div>
          )}

          {/* Inline Reply Form */}
          {replyOpen && (
            <form
              onSubmit={handleReplySubmit}
              style={{
                marginTop: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxWidth: '580px',
              }}
            >
              <textarea
                required
                rows={2}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Phản hồi u/${comment.author.username}...`}
                className="input-field"
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  disabled={submittingReply}
                  className="btn-primary"
                  style={{ padding: '5px 12px', fontSize: '12px' }}
                >
                  {submittingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
                <button
                  type="button"
                  onClick={() => setReplyOpen(false)}
                  className="btn-ghost"
                  style={{ padding: '5px 12px', fontSize: '12px' }}
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
