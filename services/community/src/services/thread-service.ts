import { randomBytes } from 'node:crypto';
import type { CreateThreadInput, ThreadDetail, ThreadSummary } from '@acad/contracts';
import type { ICommunityRepository, ThreadEntity } from '../repository/community-repository.js';
import type { IVoteStorageEngine } from '../voting/lua-vote-engine.js';
import { InsufficientSpacePermissionError, SpaceNotFoundError } from './space-service.js';
import {
  assertSpaceMembershipIfPrivate,
  mapEntityToThreadDetail,
  mapEntityToThreadSummary,
  resolveViewerThreadState,
} from './thread-mapper.js';

export class ThreadNotFoundError extends Error {
  constructor(message = 'Không tìm thấy bài viết yêu cầu') {
    super(message);
    this.name = 'ThreadNotFoundError';
  }
}

export class ThreadService {
  constructor(
    private readonly repo: ICommunityRepository,
    private readonly voteEngine?: IVoteStorageEngine,
  ) {}

  private generateSeoSlug(title: string): string {
    const normalized = title
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    const base = normalized || 'thread';
    const suffix = randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
  }

  public async createThread(input: CreateThreadInput, authorId: string): Promise<ThreadDetail> {
    const space = await this.repo.findSpaceById(input.spaceId);
    if (!space) {
      throw new SpaceNotFoundError('Không gian thảo luận để đăng bài không tồn tại');
    }

    if (space.isPrivate) {
      const membership = await this.repo.getMembership(space.id, authorId);
      if (!membership) {
        throw new InsufficientSpacePermissionError(
          'Bạn phải là thành viên của không gian riêng tư này để đăng bài',
        );
      }
    }

    const mediaUrls = input.mediaUrls ?? [];
    const threadType =
      input.threadType ?? (mediaUrls.length > 0 ? 'MEDIA' : input.linkUrl ? 'LINK' : 'TEXT');
    const rawContent =
      input.contentText ??
      (input.contentAst && typeof input.contentAst.text === 'string'
        ? input.contentAst.text
        : null);

    const slug = this.generateSeoSlug(input.title);
    const created = await this.repo.createThread({
      spaceId: input.spaceId,
      authorId,
      flairId: input.flairId ?? null,
      title: input.title,
      slug,
      content: rawContent,
      linkUrl: input.linkUrl ?? null,
      mediaUrls,
      threadType,
    });

    return mapEntityToThreadDetail(created, {
      spaceName: space.name,
      spaceSlug: space.slug,
      userVote: 0,
      isSaved: false,
    });
  }

  private async decorateThreadDetail(
    entity: ThreadEntity,
    viewerId?: string,
  ): Promise<ThreadDetail> {
    if (entity.authorStatus === 'SHADOWBANNED' && entity.authorId !== viewerId) {
      throw new ThreadNotFoundError();
    }

    await assertSpaceMembershipIfPrivate(
      this.repo,
      entity.spaceId,
      entity.spaceIsPrivate,
      viewerId,
    );
    const viewerState = await resolveViewerThreadState(
      this.repo,
      this.voteEngine,
      entity.id,
      viewerId,
    );
    return mapEntityToThreadDetail(entity, viewerState);
  }

  public async getThreadById(id: string, viewerId?: string): Promise<ThreadDetail | null> {
    const entity = await this.repo.findThreadById(id);
    if (!entity) return null;
    try {
      return await this.decorateThreadDetail(entity, viewerId);
    } catch (err) {
      if (err instanceof ThreadNotFoundError) return null;
      throw err;
    }
  }

  public async getThreadBySlug(slug: string, viewerId?: string): Promise<ThreadDetail | null> {
    const entity = await this.repo.findThreadBySlug(slug);
    if (!entity) return null;
    try {
      return await this.decorateThreadDetail(entity, viewerId);
    } catch (err) {
      if (err instanceof ThreadNotFoundError) return null;
      throw err;
    }
  }

  public async listThreadsBySpace(
    spaceSlug: string,
    options?: { limit?: number; offset?: number; flairId?: string },
    viewerId?: string,
  ): Promise<ThreadSummary[]> {
    const space = await this.repo.findSpaceBySlug(spaceSlug);
    if (!space) {
      throw new SpaceNotFoundError(`Không gian "${spaceSlug}" không tồn tại`);
    }

    await assertSpaceMembershipIfPrivate(this.repo, space.id, space.isPrivate, viewerId);
    const items = await this.repo.listThreadsBySpace(space.id, { ...options, viewerId });

    return Promise.all(
      items.map(async (t) => {
        const viewerState = await resolveViewerThreadState(
          this.repo,
          this.voteEngine,
          t.id,
          viewerId,
        );
        return mapEntityToThreadSummary(t, {
          ...viewerState,
          spaceName: space.name,
          spaceSlug: space.slug,
        });
      }),
    );
  }

  public async searchThreadsInSpace(
    spaceSlug: string,
    query: string,
    limit = 20,
    viewerId?: string,
  ): Promise<ThreadSummary[]> {
    const space = await this.repo.findSpaceBySlug(spaceSlug);
    if (!space) {
      throw new SpaceNotFoundError(`Không gian "${spaceSlug}" không tồn tại`);
    }

    await assertSpaceMembershipIfPrivate(this.repo, space.id, space.isPrivate, viewerId);
    const items = await this.repo.searchThreadsInSpace(space.id, query, limit, viewerId);

    return Promise.all(
      items.map(async (t) => {
        const viewerState = await resolveViewerThreadState(
          this.repo,
          this.voteEngine,
          t.id,
          viewerId,
        );
        return mapEntityToThreadSummary(t, {
          ...viewerState,
          spaceName: space.name,
          spaceSlug: space.slug,
        });
      }),
    );
  }
}
