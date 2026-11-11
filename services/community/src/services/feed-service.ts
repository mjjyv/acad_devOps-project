/**
 * @file feed-service.ts
 * @description Service managing Home Feed, Popular Feed, and Space Feed with Keyset Cursor Pagination.
 */

import type { ThreadListResponse, ThreadSummary } from '@acad/contracts';
import type {
  FeedFilter,
  ICommunityRepository,
  ThreadEntity,
} from '../repository/community-repository.js';
import type { IVoteStorageEngine } from '../voting/lua-vote-engine.js';
import { SpaceNotFoundError } from './space-service.js';
import {
  assertSpaceMembershipIfPrivate,
  mapEntityToThreadSummary,
  resolveViewerThreadState,
} from './thread-mapper.js';

export class FeedService {
  constructor(
    private repo: ICommunityRepository,
    private voteEngine?: IVoteStorageEngine,
  ) {}

  /**
   * Home Feed: Các bài viết thuộc Spaces mà người dùng đã tham gia
   */
  public async getHomeFeed(
    userId: string | undefined,
    filter: FeedFilter = {},
  ): Promise<ThreadListResponse> {
    if (!userId) {
      return this.getPopularFeed(undefined, filter);
    }

    const { items, nextCursor } = await this.repo.listHomeFeedThreads(userId, filter);
    const summaries = await Promise.all(items.map((t) => this.toThreadSummary(t, userId)));

    return {
      items: summaries,
      pagination: {
        nextCursor,
        hasMore: Boolean(nextCursor),
        limit: filter.limit ?? 20,
      },
    };
  }

  /**
   * Popular Feed: Bảng tin toàn cầu từ toàn bộ các không gian công khai
   */
  public async getPopularFeed(
    userId: string | undefined,
    filter: FeedFilter = {},
  ): Promise<ThreadListResponse> {
    const { items, nextCursor } = await this.repo.listPopularFeedThreads(filter);
    const summaries = await Promise.all(items.map((t) => this.toThreadSummary(t, userId)));

    return {
      items: summaries,
      pagination: {
        nextCursor,
        hasMore: Boolean(nextCursor),
        limit: filter.limit ?? 20,
      },
    };
  }

  /**
   * Space Feed: Bảng tin bên trong một không gian cụ thể theo sort/cursor
   */
  public async getSpaceFeed(
    spaceSlug: string,
    userId: string | undefined,
    filter: FeedFilter = {},
  ): Promise<ThreadListResponse> {
    const space = await this.repo.findSpaceBySlug(spaceSlug);
    if (!space) {
      throw new SpaceNotFoundError(`Không gian thảo luận "${spaceSlug}" không tồn tại`);
    }

    await assertSpaceMembershipIfPrivate(this.repo, space.id, space.isPrivate, userId);

    const { items, nextCursor } = await this.repo.listSpaceFeedThreads(space.id, filter);
    const summaries = await Promise.all(
      items.map((t) => this.toThreadSummary(t, userId, space.name, space.slug)),
    );

    return {
      items: summaries,
      pagination: {
        nextCursor,
        hasMore: Boolean(nextCursor),
        limit: filter.limit ?? 20,
      },
    };
  }

  private async toThreadSummary(
    entity: ThreadEntity,
    userId?: string | undefined,
    spaceName?: string | undefined,
    spaceSlug?: string | undefined,
  ): Promise<ThreadSummary> {
    const viewerState = await resolveViewerThreadState(
      this.repo,
      this.voteEngine,
      entity.id,
      userId,
    );

    return mapEntityToThreadSummary(entity, {
      ...viewerState,
      spaceName,
      spaceSlug,
    });
  }
}
