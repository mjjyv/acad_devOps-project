/**
 * @file community-repository.ts
 * @description Interfaces and In-Memory Repository for Community Subsystem (Spaces, Threads, Comments, Voting, and Feeds).
 */

import { randomUUID } from 'node:crypto';
import { CursorManager } from '../voting/cursor-manager.js';
import { GravityDecayEngine } from '../voting/gravity-decay.js';
import { WilsonScoreEngine } from '../voting/wilson-score.js';

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
  topic: string;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  isPrivate: boolean;
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
  slug: string;
  colorHex: string;
  backgroundHex: string;
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
  contentSnippet?: string | null | undefined;
  linkUrl: string | null;
  threadType: 'TEXT' | 'LINK' | 'MEDIA';
  upvotesCount: number;
  downvotesCount: number;
  commentCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields from spaces, users, space_flairs
  spaceSlug?: string | undefined;
  spaceName?: string | undefined;
  spaceIsPrivate?: boolean | undefined;
  authorUsername?: string | undefined;
  authorAvatarUrl?: string | null | undefined;
  flairName?: string | null | undefined;
  flairSlug?: string | null | undefined;
  flairColorHex?: string | null | undefined;
  flairBackgroundHex?: string | null | undefined;
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
  // Joined fields
  authorUsername?: string | undefined;
  authorAvatarUrl?: string | null | undefined;
  authorKarmaScore?: number | undefined;
  directRepliesCount?: number | undefined;
  totalDescendantsCount?: number | undefined;
}

export interface ThreadCountersEntity {
  threadId: string;
  upvotes: number;
  downvotes: number;
  netScore: number;
  hotScore: number;
  wilsonScore: number;
  commentCount: number;
  updatedAt: Date;
}

export interface FeedFilter {
  sort?: ('hot' | 'new' | 'top' | 'best') | undefined;
  time?: ('day' | 'week' | 'month' | 'year' | 'all') | undefined;
  flairId?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
}

export interface CreateFlairRepoData {
  name: string;
  slug: string;
  colorHex?: string | undefined;
  backgroundHex?: string | undefined;
}

export interface ICommunityRepository {
  /**
   * Cờ đánh dấu DB tự duy trì bộ đếm & Karma qua PostgreSQL Triggers để Service không cộng dồn kép.
   */
  readonly handlesCountersViaDbTriggers?: boolean;

  // Spaces
  createSpace(data: {
    name: string;
    slug: string;
    topic?: string;
    description?: string | null;
    iconUrl?: string | null;
    bannerUrl?: string | null;
    rules?: Array<{ title: string; description: string }>;
    creatorId: string;
    isPrivate?: boolean;
  }): Promise<SpaceEntity>;
  findSpaceBySlug(slug: string): Promise<SpaceEntity | null>;
  findSpaceById(id: string): Promise<SpaceEntity | null>;
  listSpaces(options?: {
    limit?: number;
    offset?: number;
    topic?: string;
    q?: string;
  }): Promise<SpaceEntity[]>;
  joinSpace(
    spaceId: string,
    userId: string,
    role?: 'MEMBER' | 'MODERATOR' | 'CREATOR',
  ): Promise<void>;
  leaveSpace(spaceId: string, userId: string): Promise<void>;
  getMembership(spaceId: string, userId: string): Promise<SpaceMembershipEntity | null>;

  // Flairs
  createFlair(spaceId: string, data: CreateFlairRepoData): Promise<SpaceFlairEntity>;
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

  // Voting & Counters (Phase B3)
  upsertThreadCounters(counters: ThreadCountersEntity[]): Promise<void>;
  getThreadCounters(threadId: string): Promise<ThreadCountersEntity | null>;
  recordVote(
    targetId: string,
    targetType: 'THREAD' | 'COMMENT',
    userId: string,
    direction: number,
  ): Promise<void>;
  getUserVote(targetId: string, targetType: 'THREAD' | 'COMMENT', userId: string): Promise<number>;
  getUserCommentVotes(threadId: string, userId: string): Promise<Record<string, number>>;
  toggleSaveThread(userId: string, threadId: string): Promise<boolean>;
  isThreadSaved(userId: string, threadId: string): Promise<boolean>;
  listSavedThreads(userId: string, limit?: number, offset?: number): Promise<ThreadEntity[]>;
  updateUserKarma(userId: string, delta: number): Promise<void>;
  refreshHotScores?(): Promise<void>;

  // Feeds & Keyset Cursor Pagination (Phase B3)
  listHomeFeedThreads(
    userId: string,
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }>;
  listPopularFeedThreads(
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }>;
  listSpaceFeedThreads(
    spaceId: string,
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }>;

  checkHealth(): Promise<boolean>;
}

/**
 * InMemoryCommunityRepository: Triển khai trong bộ nhớ phục vụ Unit Test và Fast CI.
 */
export class InMemoryCommunityRepository implements ICommunityRepository {
  public readonly handlesCountersViaDbTriggers = false;
  private spaces = new Map<string, SpaceEntity>();
  private memberships: SpaceMembershipEntity[] = [];
  private flairs = new Map<string, SpaceFlairEntity>();
  private threads = new Map<string, ThreadEntity>();
  private comments = new Map<string, CommentEntity>();

  // Dữ liệu Phase B3
  private threadCounters = new Map<string, ThreadCountersEntity>();
  private threadVotes = new Map<string, Map<string, number>>(); // targetId -> userId -> direction
  private commentVotes = new Map<string, Map<string, number>>(); // targetId -> userId -> direction
  private savedThreads = new Map<string, Set<string>>(); // userId -> Set of threadId
  private userKarma = new Map<string, number>(); // userId -> karmaScore

  // Spaces
  public async createSpace(data: {
    name: string;
    slug: string;
    topic?: string;
    description?: string | null;
    iconUrl?: string | null;
    bannerUrl?: string | null;
    rules?: Array<{ title: string; description: string }>;
    creatorId: string;
    isPrivate?: boolean;
  }): Promise<SpaceEntity> {
    const slugLower = data.slug.toLowerCase();
    for (const space of this.spaces.values()) {
      if (space.slug.toLowerCase() === slugLower) {
        throw new DuplicateSlugError(`Slug không gian "${data.slug}" đã được sử dụng`);
      }
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const space: SpaceEntity = {
      id,
      name: data.name,
      slug: slugLower,
      topic: data.topic ?? 'DevOps & SRE',
      description: data.description ?? null,
      iconUrl: data.iconUrl ?? null,
      bannerUrl: data.bannerUrl ?? null,
      rules: data.rules ?? [],
      creatorId: data.creatorId,
      memberCount: 1,
      threadCount: 0,
      isPrivate: Boolean(data.isPrivate),
      createdAt: now,
      updatedAt: now,
    };

    this.spaces.set(id, space);
    this.memberships.push({
      spaceId: id,
      userId: data.creatorId,
      role: 'CREATOR',
      joinedAt: now,
    });

    return space;
  }

  public async findSpaceBySlug(slug: string): Promise<SpaceEntity | null> {
    const slugLower = slug.toLowerCase();
    for (const space of this.spaces.values()) {
      if (space.slug.toLowerCase() === slugLower) {
        return space;
      }
    }
    return null;
  }

  public async findSpaceById(id: string): Promise<SpaceEntity | null> {
    return this.spaces.get(id) || null;
  }

  public async listSpaces(options?: {
    limit?: number;
    offset?: number;
    topic?: string;
    q?: string;
  }): Promise<SpaceEntity[]> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    const topicFilter = options?.topic?.trim();
    const queryFilter = options?.q?.trim().toLowerCase();

    return Array.from(this.spaces.values())
      .filter((s) => {
        if (topicFilter && s.topic !== topicFilter) return false;
        if (queryFilter) {
          const hay = `${s.name} ${s.slug} ${s.description ?? ''}`.toLowerCase();
          if (!hay.includes(queryFilter)) return false;
        }
        return true;
      })
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(offset, offset + limit);
  }

  public async joinSpace(
    spaceId: string,
    userId: string,
    role: 'MEMBER' | 'MODERATOR' | 'CREATOR' = 'MEMBER',
  ): Promise<void> {
    const existing = this.memberships.find((m) => m.spaceId === spaceId && m.userId === userId);
    if (!existing) {
      this.memberships.push({
        spaceId,
        userId,
        role,
        joinedAt: new Date().toISOString(),
      });
      const space = this.spaces.get(spaceId);
      if (space) {
        space.memberCount++;
      }
    }
  }

  public async leaveSpace(spaceId: string, userId: string): Promise<void> {
    const idx = this.memberships.findIndex((m) => m.spaceId === spaceId && m.userId === userId);
    if (idx !== -1) {
      this.memberships.splice(idx, 1);
      const space = this.spaces.get(spaceId);
      if (space && space.memberCount > 0) {
        space.memberCount--;
      }
    }
  }

  public async getMembership(
    spaceId: string,
    userId: string,
  ): Promise<SpaceMembershipEntity | null> {
    const found = this.memberships.find((m) => m.spaceId === spaceId && m.userId === userId);
    return found || null;
  }

  // Flairs
  public async createFlair(spaceId: string, data: CreateFlairRepoData): Promise<SpaceFlairEntity> {
    const slugLower = data.slug.toLowerCase();
    for (const flair of this.flairs.values()) {
      if (flair.spaceId === spaceId && flair.slug.toLowerCase() === slugLower) {
        throw new DuplicateFlairError(`Flair "${data.name}" đã tồn tại trong không gian này`);
      }
    }

    const id = randomUUID();
    const flair: SpaceFlairEntity = {
      id,
      spaceId,
      name: data.name,
      slug: slugLower,
      colorHex: data.colorHex ?? '#E1D9BC',
      backgroundHex: data.backgroundHex ?? '#30364F',
      createdAt: new Date().toISOString(),
    };
    this.flairs.set(id, flair);
    return flair;
  }

  public async listFlairs(spaceId: string): Promise<SpaceFlairEntity[]> {
    return Array.from(this.flairs.values()).filter((f) => f.spaceId === spaceId);
  }

  // Threads
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
    const space = this.spaces.get(data.spaceId);
    const flair = data.flairId ? this.flairs.get(data.flairId) : undefined;
    const contentText = data.content ?? null;
    const thread: ThreadEntity = {
      id,
      spaceId: data.spaceId,
      authorId: data.authorId,
      flairId: data.flairId ?? null,
      title: data.title,
      slug: data.slug,
      content: contentText,
      contentSnippet: contentText ? contentText.slice(0, 220) : null,
      linkUrl: data.linkUrl ?? null,
      threadType: data.threadType ?? 'TEXT',
      upvotesCount: 0,
      downvotesCount: 0,
      commentCount: 0,
      isPinned: false,
      isLocked: false,
      createdAt: now,
      updatedAt: now,
      spaceSlug: space?.slug,
      spaceName: space?.name,
      spaceIsPrivate: space?.isPrivate ?? false,
      flairName: flair?.name ?? null,
      flairSlug: flair?.slug ?? null,
      flairColorHex: flair?.colorHex ?? null,
      flairBackgroundHex: flair?.backgroundHex ?? null,
    };

    this.threads.set(id, thread);

    // Khởi tạo bộ đếm mặc định cho thread
    this.threadCounters.set(id, {
      threadId: id,
      upvotes: 0,
      downvotes: 0,
      netScore: 0,
      hotScore: 0,
      wilsonScore: 0,
      commentCount: 0,
      updatedAt: new Date(now),
    });

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
    options?: {
      flairId?: string | undefined;
      limit?: number | undefined;
      offset?: number | undefined;
    },
  ): Promise<ThreadEntity[]> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    return Array.from(this.threads.values())
      .filter((t) => t.spaceId === spaceId && (!options?.flairId || t.flairId === options.flairId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);
  }

  public async searchThreadsInSpace(
    spaceId: string,
    query: string,
    limit: number = 20,
  ): Promise<ThreadEntity[]> {
    const q = query.toLowerCase();
    return Array.from(this.threads.values())
      .filter(
        (t) =>
          t.spaceId === spaceId &&
          (t.title.toLowerCase().includes(q) || t.content?.toLowerCase().includes(q)),
      )
      .slice(0, limit);
  }

  // Comments
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
    const threadComments = Array.from(this.comments.values())
      .filter((c) => c.threadId === threadId)
      .sort((a, b) => a.path.localeCompare(b.path));

    return threadComments.map((c) => {
      const directRepliesCount = threadComments.filter((r) => r.parentId === c.id).length;
      const totalDescendantsCount = threadComments.filter(
        (d) => d.id !== c.id && (d.path === c.path || d.path.startsWith(`${c.path}.`)),
      ).length;
      return {
        ...c,
        directRepliesCount,
        totalDescendantsCount,
      };
    });
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

  // Voting & Counters (Phase B3)
  public async upsertThreadCounters(counters: ThreadCountersEntity[]): Promise<void> {
    for (const c of counters) {
      this.threadCounters.set(c.threadId, { ...c });
      const thread = this.threads.get(c.threadId);
      if (thread) {
        thread.upvotesCount = c.upvotes;
        thread.downvotesCount = c.downvotes;
        thread.updatedAt = new Date().toISOString();
      }
    }
  }

  public async getThreadCounters(threadId: string): Promise<ThreadCountersEntity | null> {
    const existing = this.threadCounters.get(threadId);
    if (existing) return existing;
    const thread = this.threads.get(threadId);
    if (thread) {
      const fallback: ThreadCountersEntity = {
        threadId,
        upvotes: thread.upvotesCount,
        downvotes: thread.downvotesCount,
        netScore: thread.upvotesCount - thread.downvotesCount,
        hotScore: 0,
        wilsonScore: 0,
        commentCount: thread.commentCount,
        updatedAt: new Date(thread.updatedAt),
      };
      this.threadCounters.set(threadId, fallback);
      return fallback;
    }
    return null;
  }

  public async recordVote(
    targetId: string,
    targetType: 'THREAD' | 'COMMENT',
    userId: string,
    direction: number,
  ): Promise<void> {
    const targetMap = targetType === 'THREAD' ? this.threadVotes : this.commentVotes;
    let voters = targetMap.get(targetId);
    if (!voters) {
      voters = new Map<string, number>();
      targetMap.set(targetId, voters);
    }
    if (direction === 0) {
      voters.delete(userId);
    } else {
      voters.set(userId, direction);
    }
  }

  public async getUserVote(
    targetId: string,
    targetType: 'THREAD' | 'COMMENT',
    userId: string,
  ): Promise<number> {
    const targetMap = targetType === 'THREAD' ? this.threadVotes : this.commentVotes;
    return targetMap.get(targetId)?.get(userId) ?? 0;
  }

  public async getUserCommentVotes(
    threadId: string,
    userId: string,
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const c of this.comments.values()) {
      if (c.threadId === threadId) {
        const dir = this.commentVotes.get(c.id)?.get(userId);
        if (dir) {
          result[c.id] = dir;
        }
      }
    }
    return result;
  }

  public async toggleSaveThread(userId: string, threadId: string): Promise<boolean> {
    let saved = this.savedThreads.get(userId);
    if (!saved) {
      saved = new Set<string>();
      this.savedThreads.set(userId, saved);
    }
    if (saved.has(threadId)) {
      saved.delete(threadId);
      return false;
    }
    saved.add(threadId);
    return true;
  }

  public async isThreadSaved(userId: string, threadId: string): Promise<boolean> {
    return this.savedThreads.get(userId)?.has(threadId) ?? false;
  }

  public async listSavedThreads(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<ThreadEntity[]> {
    const saved = this.savedThreads.get(userId);
    if (!saved || saved.size === 0) return [];
    const list: ThreadEntity[] = [];
    for (const threadId of saved) {
      const t = this.threads.get(threadId);
      if (t) list.push(t);
    }
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(offset, offset + limit);
  }

  public async updateUserKarma(userId: string, delta: number): Promise<void> {
    const current = this.userKarma.get(userId) ?? 0;
    this.userKarma.set(userId, current + delta);
  }

  // Feeds (Phase B3)
  public async listHomeFeedThreads(
    userId: string,
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    const joinedSpaceIds = this.memberships
      .filter((m) => m.userId === userId)
      .map((m) => m.spaceId);

    if (joinedSpaceIds.length === 0) {
      return { items: [], nextCursor: null };
    }

    const eligible = Array.from(this.threads.values()).filter((t) =>
      joinedSpaceIds.includes(t.spaceId),
    );
    return this.filterAndSortThreads(eligible, options);
  }

  public async listPopularFeedThreads(
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    const eligible = Array.from(this.threads.values()).filter((t) => {
      const space = this.spaces.get(t.spaceId);
      return !space?.isPrivate;
    });
    return this.filterAndSortThreads(eligible, options);
  }

  public async listSpaceFeedThreads(
    spaceId: string,
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    const eligible = Array.from(this.threads.values()).filter((t) => t.spaceId === spaceId);
    return this.filterAndSortThreads(eligible, options);
  }

  private filterAndSortThreads(
    threads: ThreadEntity[],
    options?: FeedFilter,
  ): { items: ThreadEntity[]; nextCursor: string | null } {
    const sort = options?.sort ?? 'hot';
    const time = options?.time ?? 'all';
    const limit = options?.limit ?? 20;
    const now = Date.now();

    let filtered = threads;
    if (options?.flairId) {
      filtered = filtered.filter((t) => t.flairId === options.flairId);
    }

    // 1. Lọc thời gian cho chế độ "top"
    if (sort === 'top' && time !== 'all') {
      const windowMs: Record<string, number> = {
        day: 24 * 3600 * 1000,
        week: 7 * 24 * 3600 * 1000,
        month: 30 * 24 * 3600 * 1000,
        year: 365 * 24 * 3600 * 1000,
      };
      const cutoff = now - (windowMs[time] ?? 0);
      filtered = filtered.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
    }

    // 2. Tính toán điểm số sắp xếp cho từng bài
    interface ScoredThread {
      thread: ThreadEntity;
      score: number;
      createdAtMs: number;
      id: string;
    }

    const scoredList: ScoredThread[] = filtered.map((t) => {
      const counters = this.threadCounters.get(t.id) ?? {
        threadId: t.id,
        upvotes: t.upvotesCount,
        downvotes: t.downvotesCount,
        netScore: t.upvotesCount - t.downvotesCount,
        hotScore: 0,
        wilsonScore: 0,
        commentCount: t.commentCount,
        updatedAt: new Date(t.updatedAt),
      };

      const createdAtMs = new Date(t.createdAt).getTime();
      let score = 0;

      if (sort === 'hot') {
        score = GravityDecayEngine.computeHotScore(counters.netScore, new Date(t.createdAt));
      } else if (sort === 'best') {
        score = WilsonScoreEngine.computeWilsonScore(counters.upvotes, counters.downvotes);
      } else if (sort === 'top') {
        score = counters.netScore;
      } else {
        // 'new'
        score = createdAtMs;
      }

      return { thread: t, score, createdAtMs, id: t.id };
    });

    // 3. Sắp xếp giảm dần theo Score -> Thời gian -> ID
    scoredList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs;
      return b.id.localeCompare(a.id);
    });

    // 4. Áp dụng con trỏ phân trang (Keyset Cursor)
    let startIndex = 0;
    if (options?.cursor) {
      const decoded = CursorManager.decode(options.cursor);
      if (decoded) {
        const foundIdx = scoredList.findIndex((item) => {
          if (item.score < decoded.score) return true;
          if (item.score === decoded.score && item.createdAtMs < decoded.createdAtMs) return true;
          if (
            item.score === decoded.score &&
            item.createdAtMs === decoded.createdAtMs &&
            item.id < decoded.id
          ) {
            return true;
          }
          return false;
        });
        if (foundIdx !== -1) {
          startIndex = foundIdx;
        } else {
          startIndex = scoredList.length; // Cursor vượt quá danh sách
        }
      }
    }

    const pageItems = scoredList.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < scoredList.length;
    let nextCursor: string | null = null;

    if (hasMore && pageItems.length > 0) {
      const last = pageItems[pageItems.length - 1];
      if (last) {
        nextCursor = CursorManager.encode(last.score, last.createdAtMs, last.id);
      }
    }

    return {
      items: pageItems.map((p) => p.thread),
      nextCursor,
    };
  }

  public async checkHealth(): Promise<boolean> {
    return true;
  }

  public clear(): void {
    this.spaces.clear();
    this.memberships = [];
    this.flairs.clear();
    this.threads.clear();
    this.comments.clear();
    this.threadCounters.clear();
    this.threadVotes.clear();
    this.commentVotes.clear();
    this.savedThreads.clear();
    this.userKarma.clear();
  }
}
