/**
 * @file thread-mapper.ts
 * @description Shared mappers converting ThreadEntity to ThreadSummary and ThreadDetail DTOs.
 */

import type { SpaceFlair, ThreadDetail, ThreadSummary } from '@acad/contracts';
import type { ICommunityRepository, ThreadEntity } from '../repository/community-repository.js';
import type { IVoteStorageEngine } from '../voting/lua-vote-engine.js';
import { InsufficientSpacePermissionError } from './space-service.js';

function buildFallbackFlairSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'general';
}

export function buildContentSnippet(
  content: string | null | undefined,
  maxLength: number = 240,
): string | null {
  if (!content) return null;
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3)}...` : normalized;
}

export function mapThreadFlair(entity: ThreadEntity): SpaceFlair | null {
  if (!entity.flairId) return null;
  const name = entity.flairName ?? '';
  return {
    id: entity.flairId,
    spaceId: entity.spaceId,
    name,
    slug: entity.flairSlug || buildFallbackFlairSlug(name),
    colorHex: entity.flairColorHex ?? '#F0F0DB',
    backgroundHex: entity.flairBackgroundHex ?? '#30364F',
    createdAt: entity.createdAt,
  };
}

export interface ThreadMapOverrides {
  userVote?: number | undefined;
  isSaved?: boolean | undefined;
  spaceName?: string | undefined;
  spaceSlug?: string | undefined;
}

export function mapEntityToThreadSummary(
  entity: ThreadEntity,
  overrides: ThreadMapOverrides = {},
): ThreadSummary {
  const upvotes = entity.upvotesCount;
  const downvotes = entity.downvotesCount;

  return {
    id: entity.id,
    spaceId: entity.spaceId,
    spaceSlug: overrides.spaceSlug ?? entity.spaceSlug ?? '',
    spaceName: overrides.spaceName ?? entity.spaceName ?? '',
    authorId: entity.authorId,
    authorUsername: entity.authorUsername ?? '',
    authorAvatarUrl: entity.authorAvatarUrl ?? null,
    flair: mapThreadFlair(entity),
    title: entity.title,
    slug: entity.slug,
    contentSnippet: entity.contentSnippet ?? buildContentSnippet(entity.content),
    linkUrl: entity.linkUrl,
    isPinned: entity.isPinned,
    isLocked: entity.isLocked,
    upvotes,
    downvotes,
    netScore: upvotes - downvotes,
    commentsCount: entity.commentCount,
    userVote: overrides.userVote ?? 0,
    isSaved: overrides.isSaved ?? false,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export function mapEntityToThreadDetail(
  entity: ThreadEntity,
  overrides: ThreadMapOverrides = {},
): ThreadDetail {
  return {
    ...mapEntityToThreadSummary(entity, overrides),
    contentText: entity.content,
    contentAst: entity.content ? { text: entity.content } : null,
  };
}

export async function resolveViewerThreadState(
  repo: Pick<ICommunityRepository, 'getUserVote' | 'isThreadSaved'>,
  voteEngine: IVoteStorageEngine | undefined,
  threadId: string,
  viewerId?: string,
  options?: { preSaved?: boolean | undefined },
): Promise<{ userVote: number; isSaved: boolean }> {
  if (!viewerId) {
    return { userVote: 0, isSaved: options?.preSaved ?? false };
  }

  let userVote = 0;
  if (voteEngine) {
    userVote = await voteEngine.getUserVote(threadId, viewerId);
    if (userVote === 0) {
      const dbVote = await repo.getUserVote(threadId, 'THREAD', viewerId);
      if (dbVote !== 0) {
        await voteEngine.ensureUserVoteSeeded(threadId, viewerId, dbVote);
        userVote = dbVote;
      }
    }
  } else {
    userVote = await repo.getUserVote(threadId, 'THREAD', viewerId);
  }

  const isSaved =
    options?.preSaved !== undefined
      ? options.preSaved
      : await repo.isThreadSaved(viewerId, threadId);

  return { userVote, isSaved };
}

export async function assertSpaceMembershipIfPrivate(
  repo: Pick<ICommunityRepository, 'findSpaceById' | 'getMembership'>,
  spaceId: string,
  knownIsPrivate: boolean | undefined,
  viewerId: string | undefined,
): Promise<void> {
  const isPrivate =
    knownIsPrivate !== undefined
      ? knownIsPrivate
      : ((await repo.findSpaceById(spaceId))?.isPrivate ?? false);

  if (!isPrivate) return;

  if (!viewerId) {
    throw new InsufficientSpacePermissionError(
      'Không gian này ở chế độ riêng tư, yêu cầu đăng nhập và tham gia thành viên',
    );
  }

  const membership = await repo.getMembership(spaceId, viewerId);
  if (!membership) {
    throw new InsufficientSpacePermissionError(
      'Bạn cần là thành viên của không gian riêng tư này để truy cập nội dung',
    );
  }
}
