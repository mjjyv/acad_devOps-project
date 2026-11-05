/**
 * @file community-repository.ts
 * @description Interfaces and In-Memory Repository for Community Subsystem (Spaces, Threads, Comments).
 */

import { randomUUID } from 'node:crypto';

export class DuplicateSlugError extends Error {
  constructor(message: string = 'Slug không gian thảo luận đã tồn tại') {
    super(message);
    this.name = 'DuplicateSlugError';
  }
}

export class DuplicateFlairError extends Error {
  constructor(message: string = 'Tên Flair đã tồn tại trong không gian này') {
    super(message);
    this.name = 'DuplicateFlairError';
  }
}

export class DatabaseConnectionError extends Error {
  constructor(
    message: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'DatabaseConnectionError';
  }
}

export interface SpaceEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  rules: Array<{ title: string; description: string }>;
  creatorId: string;
  memberCount: number;
  threadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceMembershipEntity {
  spaceId: string;
  userId: string;
  role: 'MEMBER' | 'MODERATOR' | 'CREATOR';
  joinedAt: string;
}

export interface SpaceFlairEntity {
  id: string;
  spaceId: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface ThreadEntity {
  id: string;
  spaceId: string;
  authorId: string;
  flairId: string | null;
  title: string;
  slug: string;
  content: string | null;
  linkUrl: string | null;
  threadType: 'TEXT' | 'LINK' | 'MEDIA';
  upvotesCount: number;
  downvotesCount: number;
  commentCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommentEntity {
  id: string;
  threadId: string;
  authorId: string;
  parentId: string | null;
  path: string;
  depth: number;
  content: string;
  replyToUserId: string | null;
  upvotesCount: number;
  downvotesCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICommunityRepository {
  // Spaces
  createSpace(data: {
    name: string;
    slug: string;
    description?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    rules?: Array<{ title: string; description: string }>;
    creatorId: string;
  }): Promise<SpaceEntity>;
  findSpaceBySlug(slug: string): Promise<SpaceEntity | null>;
  findSpaceById(id: string): Promise<SpaceEntity | null>;
  listSpaces(options?: { limit?: number; offset?: number }): Promise<SpaceEntity[]>;
  joinSpace(
    spaceId: string,
    userId: string,
    role?: 'MEMBER' | 'MODERATOR' | 'CREATOR',
  ): Promise<void>;
  leaveSpace(spaceId: string, userId: string): Promise<void>;
  getMembership(spaceId: string, userId: string): Promise<SpaceMembershipEntity | null>;

  // Flairs
  createFlair(spaceId: string, name: string, color?: string): Promise<SpaceFlairEntity>;
  listFlairs(spaceId: string): Promise<SpaceFlairEntity[]>;

  // Threads
  createThread(data: {
    spaceId: string;
    authorId: string;
    flairId?: string | null;
    title: string;
    slug: string;
    content?: string | null;
    linkUrl?: string | null;
    threadType?: 'TEXT' | 'LINK' | 'MEDIA';
  }): Promise<ThreadEntity>;
  findThreadById(id: string): Promise<ThreadEntity | null>;
  findThreadBySlug(slug: string): Promise<ThreadEntity | null>;
  listThreadsBySpace(
    spaceId: string,
    options?:
      | { flairId?: string | undefined; limit?: number | undefined; offset?: number | undefined }
      | undefined,
  ): Promise<ThreadEntity[]>;
  searchThreadsInSpace(spaceId: string, query: string, limit?: number): Promise<ThreadEntity[]>;

  // Comments
  createComment(data: {
    threadId: string;
    authorId: string;
    parentId?: string | null;
    path: string;
    depth: number;
    content: string;
    replyToUserId?: string | null;
  }): Promise<CommentEntity>;
  findCommentById(id: string): Promise<CommentEntity | null>;
  listCommentsByThread(threadId: string): Promise<CommentEntity[]>;
  countChildrenByParent(threadId: string, parentId?: string | null): Promise<number>;
  softDeleteComment(commentId: string, authorId: string): Promise<void>;

  checkHealth(): Promise<boolean>;
}

/**
 * InMemoryCommunityRepository for lightning fast, isolated unit testing.
 */
export class InMemoryCommunityRepository implements ICommunityRepository {
  public spaces = new Map<string, SpaceEntity>();
  public memberships = new Map<string, SpaceMembershipEntity>(); // key: `${spaceId}:${userId}`
  public flairs = new Map<string, SpaceFlairEntity>();
  public threads = new Map<string, ThreadEntity>();
  public comments = new Map<string, CommentEntity>();

  public async createSpace(data: {
    name: string;
    slug: string;
    description?: string | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    rules?: Array<{ title: string; description: string }>;
    creatorId: string;
  }): Promise<SpaceEntity> {
    const slugLower = data.slug.toLowerCase();
    for (const s of this.spaces.values()) {
      if (s.slug.toLowerCase() === slugLower) {
        throw new DuplicateSlugError(`Slug không gian "${data.slug}" đã được sử dụng`);
      }
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const space: SpaceEntity = {
      id,
      name: data.name,
      slug: slugLower,
      description: data.description ?? null,
      avatarUrl: data.avatarUrl ?? null,
      bannerUrl: data.bannerUrl ?? null,
      rules: data.rules ?? [],
      creatorId: data.creatorId,
      memberCount: 1,
      threadCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.spaces.set(id, space);
    // Tự động thêm creator vào memberships với role CREATOR
    await this.joinSpace(id, data.creatorId, 'CREATOR');
    return space;
  }

  public async findSpaceBySlug(slug: string): Promise<SpaceEntity | null> {
    const slugLower = slug.toLowerCase();
    for (const s of this.spaces.values()) {
      if (s.slug.toLowerCase() === slugLower) {
        return s;
      }
    }
    return null;
  }

  public async findSpaceById(id: string): Promise<SpaceEntity | null> {
    return this.spaces.get(id) || null;
  }

  public async listSpaces(options?: { limit?: number; offset?: number }): Promise<SpaceEntity[]> {
    const list = Array.from(this.spaces.values()).sort((a, b) => b.memberCount - a.memberCount);
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    return list.slice(offset, offset + limit);
  }

  public async joinSpace(
    spaceId: string,
    userId: string,
    role: 'MEMBER' | 'MODERATOR' | 'CREATOR' = 'MEMBER',
  ): Promise<void> {
    const key = `${spaceId}:${userId}`;
    const isNew = !this.memberships.has(key);
    this.memberships.set(key, {
      spaceId,
      userId,
      role,
      joinedAt: new Date().toISOString(),
    });

    if (isNew) {
      const space = this.spaces.get(spaceId);
      if (space && role !== 'CREATOR') {
        space.memberCount++;
      }
    }
  }

  public async leaveSpace(spaceId: string, userId: string): Promise<void> {
    const key = `${spaceId}:${userId}`;
    if (this.memberships.has(key)) {
      this.memberships.delete(key);
      const space = this.spaces.get(spaceId);
      if (space && space.memberCount > 1) {
        space.memberCount--;
      }
    }
  }

  public async getMembership(
    spaceId: string,
    userId: string,
  ): Promise<SpaceMembershipEntity | null> {
    return this.memberships.get(`${spaceId}:${userId}`) || null;
  }

  public async createFlair(
    spaceId: string,
    name: string,
    color: string = '#FF4500',
  ): Promise<SpaceFlairEntity> {
    for (const f of this.flairs.values()) {
      if (f.spaceId === spaceId && f.name.toLowerCase() === name.toLowerCase()) {
        throw new DuplicateFlairError(`Flair "${name}" đã tồn tại trong không gian này`);
      }
    }

    const id = randomUUID();
    const flair: SpaceFlairEntity = {
      id,
      spaceId,
      name,
      color,
      createdAt: new Date().toISOString(),
    };
    this.flairs.set(id, flair);
    return flair;
  }

  public async listFlairs(spaceId: string): Promise<SpaceFlairEntity[]> {
    return Array.from(this.flairs.values()).filter((f) => f.spaceId === spaceId);
  }

  public async createThread(data: {
    spaceId: string;
    authorId: string;
    flairId?: string | null;
    title: string;
    slug: string;
    content?: string | null;
    linkUrl?: string | null;
    threadType?: 'TEXT' | 'LINK' | 'MEDIA';
  }): Promise<ThreadEntity> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const thread: ThreadEntity = {
      id,
      spaceId: data.spaceId,
      authorId: data.authorId,
      flairId: data.flairId ?? null,
      title: data.title,
      slug: data.slug,
      content: data.content ?? null,
      linkUrl: data.linkUrl ?? null,
      threadType: data.threadType || 'TEXT',
      upvotesCount: 0,
      downvotesCount: 0,
      commentCount: 0,
      isPinned: false,
      isLocked: false,
      createdAt: now,
      updatedAt: now,
    };

    this.threads.set(id, thread);
    const space = this.spaces.get(data.spaceId);
    if (space) {
      space.threadCount++;
    }
    return thread;
  }

  public async findThreadById(id: string): Promise<ThreadEntity | null> {
    return this.threads.get(id) || null;
  }

  public async findThreadBySlug(slug: string): Promise<ThreadEntity | null> {
    for (const t of this.threads.values()) {
      if (t.slug === slug) return t;
    }
    return null;
  }

  public async listThreadsBySpace(
    spaceId: string,
    options?:
      | { flairId?: string | undefined; limit?: number | undefined; offset?: number | undefined }
      | undefined,
  ): Promise<ThreadEntity[]> {
    let list = Array.from(this.threads.values()).filter((t) => t.spaceId === spaceId);
    if (options?.flairId) {
      list = list.filter((t) => t.flairId === options.flairId);
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const offset = options?.offset || 0;
    const limit = options?.limit || 20;
    return list.slice(offset, offset + limit);
  }

  public async searchThreadsInSpace(
    spaceId: string,
    query: string,
    limit = 20,
  ): Promise<ThreadEntity[]> {
    const qLower = query.toLowerCase();
    return Array.from(this.threads.values())
      .filter((t) => t.spaceId === spaceId && t.title.toLowerCase().includes(qLower))
      .slice(0, limit);
  }

  public async createComment(data: {
    threadId: string;
    authorId: string;
    parentId?: string | null;
    path: string;
    depth: number;
    content: string;
    replyToUserId?: string | null;
  }): Promise<CommentEntity> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const comment: CommentEntity = {
      id,
      threadId: data.threadId,
      authorId: data.authorId,
      parentId: data.parentId ?? null,
      path: data.path,
      depth: data.depth,
      content: data.content,
      replyToUserId: data.replyToUserId ?? null,
      upvotesCount: 0,
      downvotesCount: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    this.comments.set(id, comment);
    const thread = this.threads.get(data.threadId);
    if (thread) {
      thread.commentCount++;
    }
    return comment;
  }

  public async findCommentById(id: string): Promise<CommentEntity | null> {
    return this.comments.get(id) || null;
  }

  public async listCommentsByThread(threadId: string): Promise<CommentEntity[]> {
    // Sắp xếp theo path ltree tăng dần: đảm bảo thứ tự cha - con - cháu đúng thứ bậc
    return Array.from(this.comments.values())
      .filter((c) => c.threadId === threadId)
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  public async countChildrenByParent(threadId: string, parentId?: string | null): Promise<number> {
    let count = 0;
    for (const c of this.comments.values()) {
      if (c.threadId === threadId) {
        if (!parentId && !c.parentId) {
          count++;
        } else if (parentId && c.parentId === parentId) {
          count++;
        }
      }
    }
    return count;
  }

  public async softDeleteComment(commentId: string, _authorId: string): Promise<void> {
    const comment = this.comments.get(commentId);
    if (comment) {
      comment.isDeleted = true;
      comment.content = '[Bình luận đã bị xóa bởi tác giả]';
      comment.updatedAt = new Date().toISOString();
    }
  }

  public async checkHealth(): Promise<boolean> {
    return true;
  }

  public clear(): void {
    this.spaces.clear();
    this.memberships.clear();
    this.flairs.clear();
    this.threads.clear();
    this.comments.clear();
  }
}
