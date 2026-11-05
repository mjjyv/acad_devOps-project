/**
 * @file thread-service.ts
 * @description Service for managing Discussion Threads, Slug Generation, and In-Space Search.
 */

import { randomBytes } from 'node:crypto';
import type { CreateThreadInput, ThreadDetail, ThreadSummary } from '@acad/contracts';
import type { ICommunityRepository, ThreadEntity } from '../repository/community-repository.js';

export class ThreadNotFoundError extends Error {
  constructor(message: string = 'Không tìm thấy bài viết yêu cầu') {
    super(message);
    this.name = 'ThreadNotFoundError';
  }
}

export class ThreadService {
  constructor(private repo: ICommunityRepository) {}

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

  private toThreadSummary(entity: ThreadEntity): ThreadSummary {
    return {
      id: entity.id,
      spaceId: entity.spaceId,
      spaceSlug: '',
      spaceName: '',
      authorId: entity.authorId,
      authorUsername: '',
      flair: entity.flairId
        ? {
            id: entity.flairId,
            spaceId: entity.spaceId,
            name: '',
            slug: '',
            colorHex: '#FF4500',
            backgroundHex: '#393E46',
            createdAt: entity.createdAt,
          }
        : null,
      title: entity.title,
      slug: entity.slug,
      linkUrl: entity.linkUrl,
      isPinned: entity.isPinned,
      isLocked: entity.isLocked,
      upvotes: entity.upvotesCount,
      downvotes: entity.downvotesCount,
      netScore: entity.upvotesCount - entity.downvotesCount,
      commentsCount: entity.commentCount,
      userVote: 0,
      isSaved: false,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toThreadDetail(entity: ThreadEntity): ThreadDetail {
    return {
      ...this.toThreadSummary(entity),
      contentText: entity.content,
      contentAst: entity.content ? { text: entity.content } : null,
    };
  }

  public async createThread(input: CreateThreadInput, authorId: string): Promise<ThreadDetail> {
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

    return this.toThreadDetail(thread);
  }

  public async getThreadById(id: string): Promise<ThreadDetail | null> {
    const thread = await this.repo.findThreadById(id);
    return thread ? this.toThreadDetail(thread) : null;
  }

  public async getThreadBySlug(slug: string): Promise<ThreadDetail | null> {
    const thread = await this.repo.findThreadBySlug(slug);
    return thread ? this.toThreadDetail(thread) : null;
  }

  public async listSpaceThreads(
    spaceId: string,
    options?: {
      flairId?: string | undefined;
      limit?: number | undefined;
      offset?: number | undefined;
    },
  ): Promise<ThreadSummary[]> {
    const threads = await this.repo.listThreadsBySpace(spaceId, options);
    return threads.map((t) => this.toThreadSummary(t));
  }

  public async searchThreads(spaceId: string, query: string, limit = 20): Promise<ThreadSummary[]> {
    const threads = await this.repo.searchThreadsInSpace(spaceId, query, limit);
    return threads.map((t) => this.toThreadSummary(t));
  }
}
