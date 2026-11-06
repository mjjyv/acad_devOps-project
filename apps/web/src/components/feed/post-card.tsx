'use client';

import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';
import {
  BookmarkIcon,
  CheckIcon,
  CommentIcon,
  DownvoteIcon,
  MoreHorizontalIcon,
  ShareIcon,
  UpvoteIcon,
} from '@/components/ui/icons';
import { useUIState } from '@/lib/store/ui-context';

export interface PostItem {
  id: string;
  spaceSlug: string;
  spaceName: string;
  spaceColor?: string;
  author: string;
  timeAgo: string;
  title: string;
  bodySnippet?: string;
  imageUrl?: string;
  upvotes: number;
  comments: number;
  hasJoined?: boolean;
  userVote?: 1 | -1 | null;
}

interface PostCardProps {
  post: PostItem;
}

export function PostCard({ post }: PostCardProps) {
  const { viewMode, showToast, addRecentPost } = useUIState();
  const [vote, setVote] = useState<1 | -1 | null>(post.userVote || null);
  const [baseVotes, _setBaseVotes] = useState<number>(post.upvotes);
  const [isJoined, setIsJoined] = useState<boolean>(!!post.hasJoined);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  // 0ms Optimistic Voting State Machine
  const handleVote = (direction: 1 | -1, e: React.MouseEvent) => {
    e.stopPropagation();
    if (vote === direction) {
      // Toggle off
      setVote(null);
    } else {
      setVote(direction);
    }
  };

  const calculatedVotes =
    baseVotes +
    (vote === 1
      ? post.userVote === 1
        ? 0
        : 1
      : vote === -1
        ? post.userVote === -1
          ? 0
          : -1
        : post.userVote === 1
          ? -1
          : post.userVote === -1
            ? 1
            : 0);

  const handleJoinToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsJoined(!isJoined);
    showToast(!isJoined ? `Joined r/${post.spaceSlug}` : `Left r/${post.spaceSlug}`);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/s/${post.spaceSlug}/comments/${post.id}`
        : '';
    try {
      if (navigator.clipboard && url) {
        await navigator.clipboard.writeText(url);
      }
      showToast('Link copied to clipboard!');
    } catch {
      showToast('Could not copy link');
    }
  };

  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
    showToast(!isBookmarked ? 'Post saved to bookmarks' : 'Post removed from bookmarks');
  };

  const handlePostClick = () => {
    addRecentPost({
      id: post.id,
      title: post.title,
      spaceSlug: post.spaceSlug,
      spaceName: post.spaceName,
      upvotes: calculatedVotes,
      comments: post.comments,
    });
  };

  // Compact View rendering
  if (viewMode === 'compact') {
    return (
      <article
        onClick={handlePostClick}
        className="reddit-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 12px',
          cursor: 'pointer',
        }}
      >
        {/* Vote Pill */}
        <div className="vote-pill" style={{ height: 28 }}>
          <button
            type="button"
            onClick={(e) => handleVote(1, e)}
            className={`vote-btn up ${vote === 1 ? 'active' : ''}`}
            aria-label="Upvote"
          >
            <UpvoteIcon size={14} />
          </button>
          <span
            className={`vote-count ${vote === 1 ? 'up' : vote === -1 ? 'down' : ''}`}
            style={{ fontSize: 11 }}
          >
            {calculatedVotes}
          </span>
          <button
            type="button"
            onClick={(e) => handleVote(-1, e)}
            className={`vote-btn down ${vote === -1 ? 'active' : ''}`}
            aria-label="Downvote"
          >
            <DownvoteIcon size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              r/{post.spaceSlug}
            </span>
            <span>•</span>
            <span>{post.timeAgo}</span>
          </div>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              margin: '2px 0 0 0',
            }}
          >
            {post.title}
          </h2>
        </div>

        {/* Comments count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--text-secondary)',
            fontSize: 12,
          }}
        >
          <CommentIcon size={14} />
          <span>{post.comments}</span>
        </div>
      </article>
    );
  }

  // Standard Card View rendering (matching docs/reddit.png)
  return (
    <article onClick={handlePostClick} className="reddit-card" style={{ cursor: 'pointer' }}>
      {/* Top Header: Community info & metadata */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Space Avatar Icon */}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: post.spaceColor || 'var(--color-brand)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {post.spaceSlug.charAt(0).toUpperCase()}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <Link
              href={`/s/${post.spaceSlug}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                fontWeight: 700,
                color: 'var(--text-primary)',
                textDecoration: 'none',
              }}
            >
              r/{post.spaceSlug}
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>•</span>
            <span style={{ color: 'var(--text-muted)' }}>{post.timeAgo}</span>
          </div>

          {/* Join / Joined Pill */}
          <button
            type="button"
            onClick={handleJoinToggle}
            className={`reddit-pill-btn ${isJoined ? 'joined' : 'primary'}`}
            style={{
              height: 24,
              fontSize: 11,
              padding: '0 10px',
              marginLeft: 4,
            }}
          >
            {isJoined ? (
              <>
                <CheckIcon size={12} />
                <span>Joined</span>
              </>
            ) : (
              <span>Join</span>
            )}
          </button>
        </div>

        {/* Overflow Menu */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            showToast('Options menu opened');
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Post options"
        >
          <MoreHorizontalIcon size={18} />
        </button>
      </div>

      {/* Post Title */}
      <h2
        style={{
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1.35,
          color: 'var(--text-primary)',
          margin: '0 0 8px 0',
        }}
      >
        {post.title}
      </h2>

      {/* Post Text Body snippet if present */}
      {post.bodySnippet && (
        <p
          style={{
            fontSize: 14,
            color: 'var(--text-secondary)',
            lineHeight: 1.5,
            marginBottom: 10,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {post.bodySnippet}
        </p>
      )}

      {/* Media Image Container if present */}
      {post.imageUrl && (
        <div
          style={{
            width: '100%',
            maxHeight: 460,
            backgroundColor: '#000000',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <img
            src={post.imageUrl}
            alt={post.title}
            style={{
              width: '100%',
              height: 'auto',
              maxHeight: 460,
              objectFit: 'cover',
            }}
            loading="lazy"
          />
        </div>
      )}

      {/* Action Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 6,
        }}
      >
        {/* Optimistic Vote Pill */}
        <div className="vote-pill">
          <button
            type="button"
            onClick={(e) => handleVote(1, e)}
            className={`vote-btn up ${vote === 1 ? 'active' : ''}`}
            aria-label="Upvote"
          >
            <UpvoteIcon size={16} />
          </button>
          <span className={`vote-count ${vote === 1 ? 'up' : vote === -1 ? 'down' : ''}`}>
            {calculatedVotes}
          </span>
          <button
            type="button"
            onClick={(e) => handleVote(-1, e)}
            className={`vote-btn down ${vote === -1 ? 'active' : ''}`}
            aria-label="Downvote"
          >
            <DownvoteIcon size={16} />
          </button>
        </div>

        {/* Comments Pill */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePostClick();
          }}
          className="reddit-pill-btn"
        >
          <CommentIcon size={15} />
          <span>{post.comments}</span>
        </button>

        {/* Share Pill */}
        <button type="button" onClick={handleShare} className="reddit-pill-btn">
          <ShareIcon size={15} />
          <span>Share</span>
        </button>

        {/* Save/Bookmark Pill */}
        <button
          type="button"
          onClick={handleBookmarkToggle}
          className="reddit-pill-btn"
          style={{
            marginLeft: 'auto',
            color: isBookmarked ? 'var(--color-brand)' : 'var(--text-secondary)',
          }}
          aria-label="Save post"
        >
          <BookmarkIcon size={15} />
        </button>
      </div>
    </article>
  );
}
