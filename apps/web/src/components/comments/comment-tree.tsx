'use client';

import type { FlatCommentItem } from '@acad/contracts';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { CommentItem } from './comment-item';

interface CommentTreeProps {
  threadId: string;
  initialComments?: FlatCommentItem[];
}

type CommentSortMode = 'tree' | 'top' | 'new';

export function CommentTree({ threadId, initialComments = [] }: CommentTreeProps) {
  const { user, openAuthModal } = useAuth();
  const [comments, setComments] = useState<FlatCommentItem[]>(initialComments);
  const [sortMode, setSortMode] = useState<CommentSortMode>('tree');
  const [visibleLimit, setVisibleLimit] = useState<number>(80);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setComments(initialComments);
    setVisibleLimit(80);
  }, [initialComments]);

  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [rootText, setRootText] = useState('');
  const [isSubmittingRoot, setIsSubmittingRoot] = useState(false);
  const [errorRoot, setErrorRoot] = useState<string | null>(null);

  const handleToggleCollapse = (commentId: string) => {
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;

    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(target.path)) {
        next.delete(target.path);
      } else {
        next.add(target.path);
      }
      return next;
    });
  };

  const handleSendRootComment = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!rootText.trim()) return;

    setIsSubmittingRoot(true);
    setErrorRoot(null);

    try {
      const newComment = await CommunityApi.createComment(threadId, rootText.trim());
      setComments((prev) => [...prev, newComment]);
      setRootText('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi gửi bình luận';
      setErrorRoot(msg);
    } finally {
      setIsSubmittingRoot(false);
    }
  };

  const handleChildCommentAdded = (newComment: FlatCommentItem) => {
    setComments((prev) => {
      const parentIdx = prev.findIndex((c) => c.id === newComment.parentId);
      if (parentIdx !== -1) {
        const next = [...prev];
        next.splice(parentIdx + 1, 0, newComment);
        return next;
      }
      return [...prev, newComment];
    });
  };

  const handleCommentDeleted = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              isDeleted: true,
              contentAst: { text: '[Bình luận này đã bị xóa bởi tác giả]' },
            }
          : c,
      ),
    );
  };

  const orderedComments = useMemo(() => {
    if (sortMode === 'tree') return comments;
    const copy = [...comments];
    if (sortMode === 'top') {
      return copy.sort((a, b) => b.netScore - a.netScore || a.path.localeCompare(b.path));
    }
    return copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [comments, sortMode]);

  const eligibleComments = useMemo(() => {
    if (sortMode !== 'tree' || collapsedPaths.size === 0) {
      return orderedComments;
    }
    return orderedComments.filter((c) => {
      for (const collapsedPath of collapsedPaths) {
        if (c.path !== collapsedPath && c.path.startsWith(`${collapsedPath}.`)) {
          return false;
        }
      }
      return true;
    });
  }, [orderedComments, sortMode, collapsedPaths]);

  const totalEligible = eligibleComments.length;

  const visibleComments = useMemo(
    () => eligibleComments.slice(0, visibleLimit),
    [eligibleComments, visibleLimit],
  );

  // Progressive windowed reveal via IntersectionObserver
  useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || visibleLimit >= totalEligible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleLimit((prev) => prev + 80);
        }
      },
      { rootMargin: '120px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visibleLimit, totalEligible]);

  return (
    <div
      style={{
        marginTop: '24px',
        paddingTop: '20px',
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Bình Luận ({comments.length})
        </h3>

        <div style={{ display: 'flex', gap: '6px' }}>
          {(
            [
              { id: 'tree', label: 'Theo nhánh' },
              { id: 'top', label: 'Nổi bật' },
              { id: 'new', label: 'Mới nhất' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSortMode(opt.id)}
              className={`reddit-pill-btn ${sortMode === opt.id ? 'primary' : ''}`}
              style={{ height: '26px', fontSize: '11px', padding: '0 10px' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Khung viết bình luận gốc (Root Comment Box) */}
      <div
        style={{
          backgroundColor: 'var(--bg-subtle)',
          padding: '14px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '24px',
        }}
      >
        {errorRoot && (
          <div style={{ color: '#f43f5e', fontSize: '12px', marginBottom: '8px' }}>{errorRoot}</div>
        )}

        <textarea
          placeholder={
            user
              ? 'Để lại ý kiến đóng góp hoặc phản biện kỹ thuật...'
              : 'Đăng nhập để tham gia thảo luận...'
          }
          value={rootText}
          onChange={(e) => setRootText(e.target.value)}
          onClick={() => {
            if (!user) openAuthModal('login');
          }}
          rows={3}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
            resize: 'vertical',
            marginBottom: '10px',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={handleSendRootComment}
            disabled={isSubmittingRoot || !rootText.trim()}
            style={{
              padding: '8px 20px',
              borderRadius: '9999px',
              border: 'none',
              backgroundColor:
                isSubmittingRoot || !rootText.trim()
                  ? 'var(--border-strong)'
                  : 'var(--color-brand)',
              color: '#090a0f',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isSubmittingRoot || !rootText.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {isSubmittingRoot ? 'Đang gửi...' : 'Gửi Bình Luận'}
          </button>
        </div>
      </div>

      {/* Cây Bình Luận Đa Tầng Windowed */}
      {comments.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '36px',
            color: 'var(--text-muted)',
            fontSize: '14px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px dashed var(--border-subtle)',
          }}
        >
          Chưa có bình luận nào. Hãy là người đầu tiên mở đầu cuộc thảo luận!
        </div>
      ) : (
        <div>
          {visibleComments.map((comment) => {
            const isSelfCollapsed = sortMode === 'tree' && collapsedPaths.has(comment.path);
            return (
              <CommentItem
                key={comment.id}
                comment={comment}
                threadId={threadId}
                isCollapsed={isSelfCollapsed}
                onToggleCollapse={handleToggleCollapse}
                onCommentAdded={handleChildCommentAdded}
                onCommentDeleted={handleCommentDeleted}
              />
            );
          })}

          {visibleLimit < totalEligible && (
            <div
              ref={loadMoreRef}
              style={{ display: 'flex', justifyContent: 'center', padding: '14px 0' }}
            >
              <button
                type="button"
                className="reddit-pill-btn"
                onClick={() => setVisibleLimit((prev) => prev + 80)}
              >
                Hiển thị thêm ({totalEligible - visibleLimit} bình luận còn lại)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
