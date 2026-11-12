'use client';

import type { FlatCommentItem } from '@acad/contracts';
import { useState } from 'react';
import { CommentNode } from './comment-node';

interface CommentTreeProps {
  items: FlatCommentItem[];
  isThreadLocked: boolean;
  onRefresh: () => Promise<void>;
  onOpenReport: (commentId: string) => void;
}

export function CommentTree({ items, isThreadLocked, onRefresh, onOpenReport }: CommentTreeProps) {
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set());

  const toggleCollapse = (path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="surface-card" style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}>
        Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ góc nhìn!
      </div>
    );
  }

  // O(N) descendant skip when an ancestor comment path is collapsed
  const visibleItems = items.filter((item) => {
    for (const collapsedPath of collapsedPaths) {
      if (item.path !== collapsedPath && item.path.startsWith(`${collapsedPath}.`)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div
      data-testid="comment-tree-container"
      className="surface-card"
      style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '14px 16px' }}
    >
      {visibleItems.map((comment) => (
        <CommentNode
          key={comment.id}
          comment={comment}
          isThreadLocked={isThreadLocked}
          isCollapsed={collapsedPaths.has(comment.path)}
          onToggleCollapse={toggleCollapse}
          onReplySubmitted={onRefresh}
          onDeleted={onRefresh}
          onOpenReport={onOpenReport}
        />
      ))}
    </div>
  );
}
