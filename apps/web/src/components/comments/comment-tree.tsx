'use client';

import type { FlatCommentItem } from '@acad/contracts';
import { useEffect, useState } from 'react';
import { CommunityApi } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { CommentItem } from './comment-item';

interface CommentTreeProps {
  threadId: string;
  initialComments?: FlatCommentItem[];
}

export function CommentTree({ threadId, initialComments = [] }: CommentTreeProps) {
  const { user, openAuthModal } = useAuth();
  const [comments, setComments] = useState<FlatCommentItem[]>(initialComments);

  // Đồng bộ danh sách bình luận khi component cha tải xong từ API
  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  // Set các đường dẫn ltree (path) đang bị thu gọn
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());

  // Root comment input
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
      setComments((prev) => [newComment, ...prev]);
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
      // Tìm vị trí của parent để chèn ngay sau nó hoặc ở đúng cây
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

  // Lọc các bình luận con có tiền tố path nằm trong collapsedPaths
  const isHiddenByParentCollapse = (itemPath: string): boolean => {
    for (const collapsedPath of collapsedPaths) {
      if (itemPath !== collapsedPath && itemPath.startsWith(`${collapsedPath}.`)) {
        return true;
      }
    }
    return false;
  };

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
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            margin: 0,
          }}
        >
          Bình Luận ({comments.length})
        </h3>
      </div>

      {/* Hộp Soạn Bình Luận Cấp 1 (Root Box) */}
      <div
        style={{
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
          padding: '14px',
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
          rows={3}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-subtle)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            lineHeight: 1.5,
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

      {/* Cây Bình Luận Đa Tầng Lồng Nhau */}
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
          {comments.map((comment) => {
            if (isHiddenByParentCollapse(comment.path)) {
              return null;
            }
            const isSelfCollapsed = collapsedPaths.has(comment.path);

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
        </div>
      )}
    </div>
  );
}
