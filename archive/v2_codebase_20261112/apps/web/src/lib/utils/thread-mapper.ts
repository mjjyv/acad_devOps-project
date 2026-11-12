import type { ThreadSummary } from '@acad/contracts';
import type { PostItem } from '@/components/feed/post-card';

export function formatTimeAgo(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} ngày trước`;
  return new Date(ts).toLocaleDateString('vi-VN');
}

export function mapThreadSummaryToPostItem(
  t: ThreadSummary,
  options: { joinedSlugs?: Set<string> } = {},
): PostItem {
  const slug = t.spaceSlug || '';
  return {
    id: t.id,
    spaceSlug: slug,
    spaceName: slug ? `s/${slug}` : 's/general',
    spaceColor: t.flair?.colorHex || '#E1D9BC',
    flair: t.flair
      ? {
          name: t.flair.name,
          colorHex: t.flair.colorHex,
          backgroundHex: t.flair.backgroundHex,
        }
      : null,
    author: t.authorUsername || 'anonymous',
    timeAgo: formatTimeAgo(t.createdAt),
    title: t.title,
    bodySnippet:
      t.contentSnippet ??
      ('contentText' in t && typeof t.contentText === 'string' ? t.contentText.slice(0, 220) : ''),
    upvotes: t.netScore ?? t.upvotes - t.downvotes,
    comments: t.commentsCount ?? 0,
    hasJoined: options.joinedSlugs ? options.joinedSlugs.has(slug) : false,
    userVote: t.userVote === 1 ? 1 : t.userVote === -1 ? -1 : null,
    isSaved: Boolean(t.isSaved),
  };
}
