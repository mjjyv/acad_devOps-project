'use client';

import type { FlatCommentItem } from '@acad/contracts';
import { useState } from 'react';
import { CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';

interface CommentItemProps {
  comment: FlatCommentItem;
  threadId: string;
  onCommentAdded?: (newComment: FlatCommentItem) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (commentId: string) => void;
}

export function CommentItem({
  comment,
  threadId,
  onCommentAdded,
  isCollapsed = false,
  onToggleCollapse,
}: CommentItemProps) {
  const { user, openAuthModal } = useAuth();

  const [vote, setVote] = useState<number>(comment.userVote || 0);
  const [score, setScore] = useState<number>(comment.netScore || 0);

  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Optimistic Voting cho Bình luận
  const handleVote = async (direction: 1 | -1) => {
    if (!user) {
      openAuthModal('login');
      return;
    }

    const prevVote = vote;
    const prevScore = score;

    let nextVote: number = direction;
    let scoreDelta: number = direction;

    if (prevVote === direction) {
      nextVote = 0;
      scoreDelta = -direction;
    } else if (prevVote !== 0) {
      scoreDelta = direction * 2;
    }

    setVote(nextVote);
    setScore(prevScore + scoreDelta);

    try {
      const res = await CommunityApi.voteComment(comment.id, direction);
      setScore(res.netScore);
      setVote(res.userVote);
    } catch {
      setVote(prevVote);
      setScore(prevScore);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    setReplyError(null);

    try {
      const newComment = await CommunityApi.createComment(
        threadId,
        replyText.trim(),
        comment.id,
        comment.author.username,
      );
      setReplyText('');
      setIsReplying(false);
      onCommentAdded?.(newComment);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gửi phản hồi';
      setReplyError(msg);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const authorLetter = comment.author.username.charAt(0).toUpperCase();

  // Thụt lề theo cấp bậc depth (tối đa cấp 8 trên desktop, cấp 4 trên mobile)
  const indentPx = Math.min(comment.depth, 6) * 20;

  return (
    <div
      style={{
        marginLeft: `${indentPx}px`,
        position: 'relative',
        paddingLeft: comment.depth > 0 ? '14px' : '0',
        marginBottom: '10px',
      }}
    >
      {/* Đường Kẻ Phân Cấp Dọc (Threadline Guide) */}
      {comment.depth > 0 && (
        <button
          type="button"
          aria-label="Thu gọn nhánh bình luận"
          onClick={() => onToggleCollapse?.(comment.id)}
          style={{
            position: 'absolute',
            left: 0,
            top: '8px',
            bottom: '4px',
            width: '2px',
            backgroundColor: 'var(--border-subtle)',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            border: 'none',
            padding: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-brand)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--border-subtle)';
          }}
        />
      )}

      {/* Header Bình Luận */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          marginBottom: '6px',
        }}
      >
        <button
          type="button"
          onClick={() => onToggleCollapse?.(comment.id)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {/* Avatar nhỏ */}
          <span
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              backgroundColor: '#171d2b',
              border: '1px solid var(--border-subtle)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 800,
              color: 'var(--color-brand)',
            }}
          >
            {authorLetter}
          </span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            u/{comment.author.username}
          </span>
        </button>

        <span style={{ color: 'var(--border-subtle)' }}>•</span>
        <span style={{ color: 'var(--text-muted)' }}>
          {new Date(comment.createdAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>

        {isCollapsed && (
          <span
            style={{
              color: 'var(--color-brand)',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onClick={() => onToggleCollapse?.(comment.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onToggleCollapse?.(comment.id);
            }}
          >
            [+ Đã thu gọn nhánh]
          </span>
        )}
      </div>

      {/* Nội dung bình luận nếu chưa bị thu gọn */}
      {!isCollapsed && (
        <div style={{ paddingLeft: '28px' }}>
          {/* Nội dung văn bản */}
          <div
            style={{
              fontSize: '13px',
              lineHeight: 1.5,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              marginBottom: '8px',
            }}
          >
            {comment.isCappedAtMaxDepth && comment.parentAuthorUsername && (
              <span
                style={{
                  color: 'var(--color-brand)',
                  fontWeight: 700,
                  marginRight: '6px',
                }}
              >
                @{comment.parentAuthorUsername}
              </span>
            )}
            {typeof comment.contentAst === 'object' &&
            comment.contentAst &&
            'text' in comment.contentAst
              ? String(comment.contentAst.text)
              : JSON.stringify(comment.contentAst)}
          </div>

          {/* Action Row: Vote + Reply */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
            {/* Upvote / Score / Downvote */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                borderRadius: '9999px',
                padding: '2px 8px',
              }}
            >
              <button
                type="button"
                aria-label="Upvote comment"
                onClick={() => handleVote(1)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: vote === 1 ? 'var(--color-upvote)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontWeight: 900,
                  fontSize: '12px',
                }}
              >
                ▲
              </button>
              <span
                style={{
                  fontWeight: 700,
                  color:
                    vote === 1
                      ? 'var(--color-upvote)'
                      : vote === -1
                        ? 'var(--color-downvote)'
                        : 'var(--text-secondary)',
                  minWidth: '16px',
                  textAlign: 'center',
                }}
              >
                {score}
              </span>
              <button
                type="button"
                aria-label="Downvote comment"
                onClick={() => handleVote(-1)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: vote === -1 ? 'var(--color-downvote)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  fontWeight: 900,
                  fontSize: '12px',
                }}
              >
                ▼
              </button>
            </div>

            {/* Nút Trả Lời (Reply) */}
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  openAuthModal('login');
                } else {
                  setIsReplying(!isReplying);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                borderRadius: '4px',
              }}
            >
              <span>💬</span>
              <span>Trả lời</span>
            </button>
          </div>

          {/* Form Trả Lời Inline nếu mở */}
          {isReplying && (
            <div
              style={{
                marginTop: '10px',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {replyError && (
                <div style={{ color: '#f43f5e', fontSize: '12px', marginBottom: '6px' }}>
                  {replyError}
                </div>
              )}
              <textarea
                placeholder={`Trả lời @${comment.author.username}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  resize: 'vertical',
                  marginBottom: '8px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsReplying(false)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={isSubmittingReply || !replyText.trim()}
                  style={{
                    padding: '4px 14px',
                    borderRadius: '9999px',
                    border: 'none',
                    backgroundColor: 'var(--color-brand)',
                    color: '#090a0f',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: isSubmittingReply ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSubmittingReply ? 'Đang gửi...' : 'Gửi trả lời'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
