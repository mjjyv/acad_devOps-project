'use client';

import type { ThreadSummary, VoteDirection } from '@acad/contracts';
import Link from 'next/link';
import { useState } from 'react';
import { CommunityApi, resolveRenderableMediaUrl } from '@/lib/api/community';
import { useAuth } from '@/lib/auth/auth-context';
import { useUI } from '@/lib/store/ui-context';
import { ArrowDownIcon, ArrowUpIcon, BookmarkIcon, CommentIcon } from '../ui/icons';
import { MarkdownContent } from '../ui/markdown-content';

export function PostCard({ thread }: { thread: ThreadSummary }) {
  const { requireAuth } = useAuth();
  const { showToast } = useUI();
  const [netScore, setNetScore] = useState(thread.netScore);
  const [userVote, setUserVote] = useState(thread.userVote);
  const [isSaved, setIsSaved] = useState(thread.isSaved);
  const [busyVote, setBusyVote] = useState(false);

  const handleVote = (direction: VoteDirection) => {
    requireAuth(async () => {
      if (busyVote) return;
      try {
        setBusyVote(true);
        const res = await CommunityApi.voteThread(thread.id, direction);
        setNetScore(res.netScore);
        setUserVote(res.userVote);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Không thể gửi biểu quyết', 'error');
      } finally {
        setBusyVote(false);
      }
    }, 'Đăng nhập để tham gia biểu quyết bài viết');
  };

  const handleToggleSave = () => {
    requireAuth(async () => {
      try {
        const res = await CommunityApi.toggleSaveThread(thread.id);
        setIsSaved(res.isSaved);
        showToast(res.isSaved ? 'Đã lưu bài viết' : 'Đã bỏ lưu bài viết', 'success');
      } catch {
        showToast('Không thể cập nhật lưu bài viết', 'error');
      }
    }, 'Đăng nhập để lưu bài viết');
  };

  return (
    <article
      className="surface-card"
      style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
    >
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
        <span>{new Date(thread.createdAt).toLocaleDateString()}</span>
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
            Ghim
          </span>
        )}
      </div>

      <Link
        href={`/threads/${thread.id}`}
        style={{ textDecoration: 'none', color: 'var(--text-primary)' }}
      >
        <h2 style={{ fontSize: '17px', fontWeight: 700, lineHeight: 1.35 }}>{thread.title}</h2>
      </Link>

      {thread.contentSnippet && <MarkdownContent content={thread.contentSnippet} compact />}

      {thread.mediaUrls && thread.mediaUrls.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: thread.mediaUrls.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr',
            gap: '8px',
          }}
        >
          {thread.mediaUrls.map((url) => (
            <img
              key={url}
              src={resolveRenderableMediaUrl(url)}
              alt={thread.title}
              style={{
                width: '100%',
                maxHeight: '360px',
                objectFit: 'cover',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            />
          ))}
        </div>
      )}

      {thread.linkUrl && (
        <a
          href={thread.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '12px',
            color: 'var(--color-brand)',
            wordBreak: 'break-all',
          }}
        >
          {thread.linkUrl}
        </a>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--bg-pill)',
            borderRadius: 'var(--radius-full)',
            padding: '2px 6px',
          }}
        >
          <button
            type="button"
            disabled={busyVote}
            onClick={() => handleVote(1)}
            aria-label="Upvote bài viết"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: userVote === 1 ? 'var(--color-upvote)' : 'var(--text-secondary)',
              display: 'inline-flex',
            }}
          >
            <ArrowUpIcon size={15} />
          </button>
          <span
            data-testid={`thread-score-${thread.id}`}
            style={{
              fontSize: '13px',
              fontWeight: 700,
              minWidth: '20px',
              textAlign: 'center',
              color:
                userVote === 1
                  ? 'var(--color-upvote)'
                  : userVote === -1
                    ? 'var(--color-downvote)'
                    : 'var(--text-primary)',
            }}
          >
            {netScore}
          </span>
          <button
            type="button"
            disabled={busyVote}
            onClick={() => handleVote(-1)}
            aria-label="Downvote bài viết"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: userVote === -1 ? 'var(--color-downvote)' : 'var(--text-secondary)',
              display: 'inline-flex',
            }}
          >
            <ArrowDownIcon size={15} />
          </button>
        </div>

        <Link
          href={`/threads/${thread.id}`}
          className="btn-ghost"
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            border: 'none',
            backgroundColor: 'var(--bg-pill)',
          }}
        >
          <CommentIcon size={14} />
          <span>{thread.commentsCount} bình luận</span>
        </Link>

        <button
          type="button"
          onClick={handleToggleSave}
          className="btn-ghost"
          style={{
            padding: '4px 10px',
            fontSize: '12px',
            border: 'none',
            backgroundColor: 'var(--bg-pill)',
            color: isSaved ? 'var(--color-brand)' : 'var(--text-secondary)',
          }}
        >
          <BookmarkIcon size={14} />
          <span>{isSaved ? 'Đã lưu' : 'Lưu'}</span>
        </button>
      </div>
    </article>
  );
}
