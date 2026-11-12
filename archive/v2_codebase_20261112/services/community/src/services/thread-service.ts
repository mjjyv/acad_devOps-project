/**
 * @file thread-service.ts
 * @description Service for managing Discussion Threads, Slug Generation, and In-Space Search.
 */

import { randomBytes } from 'node:crypto';
import type { CreateThreadInput, ThreadDetail, ThreadSummary } from '@acad/contracts';
import type { ICommunityRepository } from '../repository/community-repository.js';
import type { IVoteStorageEngine } from '../voting/lua-vote-engine.js';
import {
  assertSpaceMembershipIfPrivate,
  mapEntityToThreadDetail,
  mapEntityToThreadSummary,
  resolveViewerThreadState,
} from './thread-mapper.js';

export class ThreadNotFoundError extends Error {
  constructor(message: string = 'Không tìm thấy bài viết yêu cầu') {
    super(message);
    this.name = 'ThreadNotFoundError';
  }
}

export class ThreadService {
  constructor(
    private repo: ICommunityRepository,
    private voteEngine?: IVoteStorageEngine,
  ) {}

  public static generateSlug(title: string): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[đĐ]/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    const suffix = randomBytes(4).toString('hex');
    return `${baseSlug || 'bai-viet'}-${suffix}`;
  }

  public async createThread(input: CreateThreadInput, authorId: string): Promise<ThreadDetail> {
    await assertSpaceMembershipIfPrivate(this.repo, input.spaceId, undefined, authorId);
    const slug = ThreadService.generateSlug(input.title);

    const thread = await this.repo.createThread({
      spaceId: input.spaceId,
      authorId,
      flairId: input.flairId || null,
      title: input.title,
      slug,
      content: input.contentText || null,
      linkUrl: input.linkUrl || null,
      threadType: input.linkUrl ? 'LINK' : 'TEXT',
    });

    return mapEntityToThreadDetail(thread);
  }

  public async getThreadById(id: string, viewerId?: string): Promise<ThreadDetail | null> {
    const thread = await this.repo.findThreadById(id);
    if (!thread) return null;

    await assertSpaceMembershipIfPrivate(
      this.repo,
      thread.spaceId,
      thread.spaceIsPrivate,
      viewerId,
    );
    const viewerState = await resolveViewerThreadState(
      this.repo,
      this.voteEngine,
      thread.id,
      viewerId,
    );
    return mapEntityToThreadDetail(thread, viewerState);
  }

  public async getThreadBySlug(slug: string, viewerId?: string): Promise<ThreadDetail | null> {
    const thread = await this.repo.findThreadBySlug(slug);
    if (!thread) return null;

    await assertSpaceMembershipIfPrivate(
      this.repo,
      thread.spaceId,
      thread.spaceIsPrivate,
      viewerId,
    );
    const viewerState = await resolveViewerThreadState(
      this.repo,
      this.voteEngine,
      thread.id,
      viewerId,
    );
    return mapEntityToThreadDetail(thread, viewerState);
  }

  public async listSpaceThreads(
    spaceId: string,
    options?: {
      flairId?: string | undefined;
      limit?: number | undefined;
      offset?: number | undefined;
    },
    viewerId?: string,
  ): Promise<ThreadSummary[]> {
    await assertSpaceMembershipIfPrivate(this.repo, spaceId, undefined, viewerId);
    const threads = await this.repo.listThreadsBySpace(spaceId, options);
    return Promise.all(
      threads.map(async (t) => {
        const viewerState = await resolveViewerThreadState(
          this.repo,
          this.voteEngine,
          t.id,
          viewerId,
        );
        return mapEntityToThreadSummary(t, viewerState);
      }),
    );
  }

  public async searchThreads(
    spaceId: string,
    query: string,
    limit = 20,
    viewerId?: string,
  ): Promise<ThreadSummary[]> {
    await assertSpaceMembershipIfPrivate(this.repo, spaceId, undefined, viewerId);
    const threads = await this.repo.searchThreadsInSpace(spaceId, query, limit);
    return Promise.all(
      threads.map(async (t) => {
        const viewerState = await resolveViewerThreadState(
          this.repo,
          this.voteEngine,
          t.id,
          viewerId,
        );
        return mapEntityToThreadSummary(t, viewerState);
      }),
    );
  }
}
