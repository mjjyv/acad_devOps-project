import { randomUUID } from 'node:crypto';
import { CursorManager } from '../voting/cursor-manager.js';
import { GravityDecayEngine } from '../voting/gravity-decay.js';
import { WilsonScoreEngine } from '../voting/wilson-score.js';
import {
  type CommentEntity,
  type CreateFlairRepoData,
  DuplicateFlairError,
  DuplicateSlugError,
  type FeedFilter,
  type ICommunityRepository,
  type SpaceEntity,
  type SpaceFlairEntity,
  type SpaceMembershipEntity,
  type SpaceMembershipRoleDb,
  type SpaceTopicStats,
  type ThreadCountersEntity,
  type ThreadEntity,
} from './community-repository.js';

/** High-speed isolated In-Memory Repository mirroring PostgreSQL 16 semantics for Unit Tests. */
export class InMemoryCommunityRepository implements ICommunityRepository {
  public readonly handlesCountersViaDbTriggers = false;

  private readonly spaces = new Map<string, SpaceEntity>();
  private readonly memberships = new Map<string, SpaceMembershipEntity>();
  private readonly flairs = new Map<string, SpaceFlairEntity>();
  private readonly threads = new Map<string, ThreadEntity>();
  private readonly comments = new Map<string, CommentEntity>();
  private readonly counters = new Map<string, ThreadCountersEntity>();
  private readonly threadVotes = new Map<string, number>();
  private readonly commentVotes = new Map<string, number>();
  private readonly savedThreads = new Set<string>();
  private readonly userInfo = new Map<
    string,
    { username: string; avatarUrl: string | null; status: string }
  >();

  public registerUserProfile(
    userId: string,
    username: string,
    status = 'ACTIVE',
    avatarUrl: string | null = null,
  ): void {
    this.userInfo.set(userId, { username, avatarUrl, status });
  }

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
    for (const s of this.spaces.values()) {
      if (s.slug.toLowerCase() === slugLower) {
        throw new DuplicateSlugError(`Slug không gian "${data.slug}" đã được sử dụng`);
      }
    }

    const now = new Date().toISOString();
    const space: SpaceEntity = {
      id: randomUUID(),
      name: data.name,
      slug: slugLower,
      topic: data.topic || 'DevOps & SRE',
      description: data.description ?? null,
      iconUrl: data.iconUrl ?? null,
      bannerUrl: data.bannerUrl ?? null,
      rules: data.rules ?? [],
      isPrivate: Boolean(data.isPrivate),
      creatorId: data.creatorId,
      memberCount: 1,
      threadCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.spaces.set(space.id, space);
    this.memberships.set(`${space.id}:${data.creatorId}`, {
      spaceId: space.id,
      userId: data.creatorId,
      role: 'CREATOR',
      joinedAt: now,
    });
    return { ...space };
  }

  public async findSpaceBySlug(slug: string): Promise<SpaceEntity | null> {
    const target = slug.toLowerCase();
    for (const s of this.spaces.values()) {
      if (s.slug.toLowerCase() === target) return { ...s };
    }
    return null;
  }

  public async findSpaceById(id: string): Promise<SpaceEntity | null> {
    const s = this.spaces.get(id);
    return s ? { ...s } : null;
  }

  public async listSpaces(options?: {
    limit?: number;
    offset?: number;
    topic?: string;
    q?: string;
  }): Promise<SpaceEntity[]> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    let items = Array.from(this.spaces.values());

    if (options?.topic?.trim()) {
      const targetTopic = options.topic.trim();
      items = items.filter((s) => s.topic === targetTopic);
    }
    if (options?.q?.trim()) {
      const q = options.q.trim().toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q) ||
          (s.description ?? '').toLowerCase().includes(q),
      );
    }

    return items
      .sort((a, b) => b.memberCount - a.memberCount)
      .slice(offset, offset + limit)
      .map((s) => ({ ...s }));
  }

  public async listSpaceTopics(): Promise<SpaceTopicStats[]> {
    const stats = new Map<string, SpaceTopicStats>();
    for (const s of this.spaces.values()) {
      if (s.isPrivate) continue;
      const existing = stats.get(s.topic) ?? {
        topic: s.topic,
        spacesCount: 0,
        totalMembers: 0,
      };
      existing.spacesCount += 1;
      existing.totalMembers += s.memberCount;
      stats.set(s.topic, existing);
    }
    return Array.from(stats.values()).sort((a, b) => b.totalMembers - a.totalMembers);
  }

  public async joinSpace(
    spaceId: string,
    userId: string,
    role: SpaceMembershipRoleDb = 'MEMBER',
  ): Promise<void> {
    const key = `${spaceId}:${userId}`;
    if (!this.memberships.has(key)) {
      this.memberships.set(key, {
        spaceId,
        userId,
        role,
        joinedAt: new Date().toISOString(),
      });
      const space = this.spaces.get(spaceId);
      if (space) space.memberCount += 1;
    }
  }

  public async leaveSpace(spaceId: string, userId: string): Promise<void> {
    const key = `${spaceId}:${userId}`;
    if (this.memberships.delete(key)) {
      const space = this.spaces.get(spaceId);
      if (space && space.memberCount > 0) space.memberCount -= 1;
    }
  }

  public async getMembership(
    spaceId: string,
    userId: string,
  ): Promise<SpaceMembershipEntity | null> {
    return this.memberships.get(`${spaceId}:${userId}`) ?? null;
  }

  public async createFlair(spaceId: string, data: CreateFlairRepoData): Promise<SpaceFlairEntity> {
    const slugLower = data.slug.toLowerCase();
    for (const f of this.flairs.values()) {
      if (f.spaceId === spaceId && f.slug.toLowerCase() === slugLower) {
        throw new DuplicateFlairError(`Flair "${data.slug}" đã tồn tại trong không gian này`);
      }
    }
    const flair: SpaceFlairEntity = {
      id: randomUUID(),
      spaceId,
      name: data.name,
      slug: slugLower,
      colorHex: data.colorHex,
      backgroundHex: data.backgroundHex,
      createdAt: new Date().toISOString(),
    };
    this.flairs.set(flair.id, flair);
    return { ...flair };
  }

  public async listFlairs(spaceId: string): Promise<SpaceFlairEntity[]> {
    return Array.from(this.flairs.values())
      .filter((f) => f.spaceId === spaceId)
      .map((f) => ({ ...f }));
  }

  public async createThread(data: {
    spaceId: string;
    authorId: string;
    flairId?: string | null;
    title: string;
    slug: string;
    content?: string | null;
    linkUrl?: string | null;
    mediaUrls?: string[] | undefined;
    threadType: 'TEXT' | 'LINK' | 'MEDIA';
  }): Promise<ThreadEntity> {
    const now = new Date().toISOString();
    const space = this.spaces.get(data.spaceId);
    const author = this.userInfo.get(data.authorId);
    const flair = data.flairId ? this.flairs.get(data.flairId) : null;

    const thread: ThreadEntity = {
      id: randomUUID(),
      spaceId: data.spaceId,
      spaceSlug: space?.slug,
      spaceName: space?.name,
      spaceIsPrivate: space?.isPrivate ?? false,
      authorId: data.authorId,
      authorUsername: author?.username ?? 'user',
      authorAvatarUrl: author?.avatarUrl ?? null,
      authorStatus: author?.status ?? 'ACTIVE',
      flairId: data.flairId ?? null,
      flairName: flair?.name ?? null,
      flairSlug: flair?.slug ?? null,
      flairColorHex: flair?.colorHex ?? null,
      flairBackgroundHex: flair?.backgroundHex ?? null,
      title: data.title,
      slug: data.slug,
      content: data.content ?? null,
      linkUrl: data.linkUrl ?? null,
      mediaUrls: data.mediaUrls ?? [],
      threadType: data.threadType,
      upvotesCount: 0,
      downvotesCount: 0,
      commentCount: 0,
      isPinned: false,
      isLocked: false,
      createdAt: now,
      updatedAt: now,
    };

    this.threads.set(thread.id, thread);
    if (space) space.threadCount += 1;

    this.counters.set(thread.id, {
      threadId: thread.id,
      upvotes: 0,
      downvotes: 0,
      netScore: 0,
      hotScore: 0,
      wilsonScore: 0,
      commentCount: 0,
      updatedAt: new Date(now),
    });

    return { ...thread };
  }

  private enrichThread(t: ThreadEntity): ThreadEntity {
    const space = this.spaces.get(t.spaceId);
    const author = this.userInfo.get(t.authorId);
    const c = this.counters.get(t.id);
    return {
      ...t,
      spaceSlug: space?.slug ?? t.spaceSlug,
      spaceName: space?.name ?? t.spaceName,
      spaceIsPrivate: space?.isPrivate ?? t.spaceIsPrivate ?? false,
      authorUsername: author?.username ?? t.authorUsername,
      authorAvatarUrl: author?.avatarUrl ?? t.authorAvatarUrl,
      authorStatus: author?.status ?? t.authorStatus ?? 'ACTIVE',
      upvotesCount: c ? c.upvotes : t.upvotesCount,
      downvotesCount: c ? c.downvotes : t.downvotesCount,
    };
  }

  private isVisibleToViewer(t: ThreadEntity, viewerId?: string): boolean {
    const authorStatus = this.userInfo.get(t.authorId)?.status ?? t.authorStatus ?? 'ACTIVE';
    if (authorStatus === 'SHADOWBANNED' && t.authorId !== viewerId) {
      return false;
    }
    return true;
  }

  public async findThreadById(id: string): Promise<ThreadEntity | null> {
    const t = this.threads.get(id);
    return t ? this.enrichThread(t) : null;
  }

  public async findThreadBySlug(slug: string): Promise<ThreadEntity | null> {
    for (const t of this.threads.values()) {
      if (t.slug === slug) return this.enrichThread(t);
    }
    return null;
  }

  public async listThreadsBySpace(
    spaceId: string,
    options?: {
      limit?: number | undefined;
      offset?: number | undefined;
      flairId?: string | undefined;
      viewerId?: string | undefined;
    },
  ): Promise<ThreadEntity[]> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    let items = Array.from(this.threads.values()).filter(
      (t) =>
        t.spaceId === spaceId &&
        this.isVisibleToViewer(t, options?.viewerId) &&
        (!options?.flairId || t.flairId === options.flairId),
    );
    items = items.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
    return items.slice(offset, offset + limit).map((t) => this.enrichThread(t));
  }

  public async searchThreadsInSpace(
    spaceId: string,
    query: string,
    limit = 20,
    viewerId?: string,
  ): Promise<ThreadEntity[]> {
    const q = query.trim().toLowerCase();
    return Array.from(this.threads.values())
      .filter(
        (t) =>
          t.spaceId === spaceId &&
          this.isVisibleToViewer(t, viewerId) &&
          (t.title.toLowerCase().includes(q) || (t.content ?? '').toLowerCase().includes(q)),
      )
      .slice(0, limit)
      .map((t) => this.enrichThread(t));
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
    const now = new Date().toISOString();
    const author = this.userInfo.get(data.authorId);
    const replyUser = data.replyToUserId ? this.userInfo.get(data.replyToUserId) : undefined;
    const comment: CommentEntity = {
      id: randomUUID(),
      threadId: data.threadId,
      authorId: data.authorId,
      authorUsername: author?.username ?? 'user',
      authorAvatarUrl: author?.avatarUrl ?? null,
      authorKarmaScore: 0,
      parentId: data.parentId ?? null,
      path: data.path,
      depth: data.depth,
      content: data.content,
      replyToUserId: data.replyToUserId ?? null,
      replyToUsername: replyUser?.username ?? null,
      upvotesCount: 0,
      downvotesCount: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      directRepliesCount: 0,
      totalDescendantsCount: 0,
    };

    this.comments.set(comment.id, comment);
    const thread = this.threads.get(data.threadId);
    if (thread) thread.commentCount += 1;
    const tc = this.counters.get(data.threadId);
    if (tc) tc.commentCount += 1;

    return { ...comment };
  }

  public async findCommentById(id: string): Promise<CommentEntity | null> {
    const c = this.comments.get(id);
    if (!c) return null;
    const author = this.userInfo.get(c.authorId);
    const replyUser = c.replyToUserId ? this.userInfo.get(c.replyToUserId) : undefined;
    return {
      ...c,
      authorUsername: author?.username ?? c.authorUsername,
      replyToUsername: replyUser?.username ?? c.replyToUsername,
    };
  }

  public async listCommentsByThread(threadId: string): Promise<CommentEntity[]> {
    const all = Array.from(this.comments.values()).filter((c) => c.threadId === threadId);
    all.sort((a, b) => a.path.localeCompare(b.path) || a.createdAt.localeCompare(b.createdAt));

    return all.map((c) => {
      const author = this.userInfo.get(c.authorId);
      const replyUser = c.replyToUserId ? this.userInfo.get(c.replyToUserId) : undefined;
      const directRepliesCount = all.filter((other) => other.parentId === c.id).length;
      const totalDescendantsCount = all.filter(
        (other) =>
          other.id !== c.id &&
          ((other.path.startsWith(`${c.path}.`) && other.depth > c.depth) ||
            other.parentId === c.id),
      ).length;
      return {
        ...c,
        authorUsername: author?.username ?? c.authorUsername,
        authorAvatarUrl: author?.avatarUrl ?? c.authorAvatarUrl,
        replyToUsername: replyUser?.username ?? c.replyToUsername,
        directRepliesCount,
        totalDescendantsCount,
      };
    });
  }

  public async countChildrenByParent(threadId: string, parentId?: string | null): Promise<number> {
    return Array.from(this.comments.values()).filter(
      (c) => c.threadId === threadId && (parentId ? c.parentId === parentId : c.parentId === null),
    ).length;
  }

  public async softDeleteComment(commentId: string, _authorId: string): Promise<void> {
    const c = this.comments.get(commentId);
    if (!c || c.isDeleted) return;
    c.isDeleted = true;
    c.content = '[Bình luận đã bị xóa bởi tác giả]';
    c.updatedAt = new Date().toISOString();

    const thread = this.threads.get(c.threadId);
    if (thread && thread.commentCount > 0) thread.commentCount -= 1;
    const tc = this.counters.get(c.threadId);
    if (tc && tc.commentCount > 0) tc.commentCount -= 1;
  }

  public async upsertThreadCounters(counters: ThreadCountersEntity[]): Promise<void> {
    for (const c of counters) {
      this.counters.set(c.threadId, { ...c });
      const thread = this.threads.get(c.threadId);
      if (thread) {
        thread.upvotesCount = c.upvotes;
        thread.downvotesCount = c.downvotes;
      }
    }
  }

  public async getThreadCounters(threadId: string): Promise<ThreadCountersEntity | null> {
    return this.counters.get(threadId) ?? null;
  }

  public async recordVote(
    targetId: string,
    targetType: 'THREAD' | 'COMMENT',
    userId: string,
    direction: number,
  ): Promise<void> {
    const store = targetType === 'THREAD' ? this.threadVotes : this.commentVotes;
    const key = `${targetId}:${userId}`;
    const prev = store.get(key) ?? 0;

    if (direction === 0) {
      store.delete(key);
    } else {
      store.set(key, direction);
    }

    if (targetType === 'COMMENT') {
      const comment = this.comments.get(targetId);
      if (comment && prev !== direction) {
        if (prev === 1) comment.upvotesCount = Math.max(0, comment.upvotesCount - 1);
        if (prev === -1) comment.downvotesCount = Math.max(0, comment.downvotesCount - 1);
        if (direction === 1) comment.upvotesCount += 1;
        if (direction === -1) comment.downvotesCount += 1;
      }
    }
  }

  public async getUserVote(
    targetId: string,
    targetType: 'THREAD' | 'COMMENT',
    userId: string,
  ): Promise<number> {
    const store = targetType === 'THREAD' ? this.threadVotes : this.commentVotes;
    return store.get(`${targetId}:${userId}`) ?? 0;
  }

  public async getUserCommentVotes(
    threadId: string,
    userId: string,
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};
    for (const c of this.comments.values()) {
      if (c.threadId !== threadId) continue;
      const v = this.commentVotes.get(`${c.id}:${userId}`);
      if (v) result[c.id] = v;
    }
    return result;
  }

  public async toggleSaveThread(userId: string, threadId: string): Promise<boolean> {
    const key = `${userId}:${threadId}`;
    if (this.savedThreads.has(key)) {
      this.savedThreads.delete(key);
      return false;
    }
    this.savedThreads.add(key);
    return true;
  }

  public async isThreadSaved(userId: string, threadId: string): Promise<boolean> {
    return this.savedThreads.has(`${userId}:${threadId}`);
  }

  public async listSavedThreads(userId: string, limit = 20, offset = 0): Promise<ThreadEntity[]> {
    const items: ThreadEntity[] = [];
    for (const key of this.savedThreads) {
      const [uid, tid] = key.split(':');
      if (uid === userId && tid) {
        const t = this.threads.get(tid);
        if (t && this.isVisibleToViewer(t, userId)) items.push(this.enrichThread(t));
      }
    }
    return items.slice(offset, offset + limit);
  }

  public async updateUserKarma(_userId: string, _delta: number): Promise<void> {
    // Tracked cleanly via DB triggers in production Postgres
  }

  public async refreshHotScores(): Promise<void> {
    for (const tc of this.counters.values()) {
      const t = this.threads.get(tc.threadId);
      if (t) {
        tc.hotScore = GravityDecayEngine.computeHotScore(tc.netScore, t.createdAt);
      }
    }
  }

  private computeFeedScore(thread: ThreadEntity, sort: string): number {
    const c = this.counters.get(thread.id);
    const up = c ? c.upvotes : thread.upvotesCount;
    const down = c ? c.downvotes : thread.downvotesCount;
    const net = c ? c.netScore : up - down;

    if (sort === 'top') return net;
    if (sort === 'best') return WilsonScoreEngine.computeWilsonScore(up, down);
    if (sort === 'new') return new Date(thread.createdAt).getTime();
    return GravityDecayEngine.computeHotScore(net, thread.createdAt);
  }

  private paginateFeed(
    threads: ThreadEntity[],
    options?: FeedFilter,
  ): { items: ThreadEntity[]; nextCursor: string | null } {
    const sort = options?.sort ?? 'hot';
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 50);

    let filtered = [...threads];
    if (sort === 'top' && options?.time && options.time !== 'all') {
      const msMap: Record<string, number> = {
        day: 86400000,
        week: 7 * 86400000,
        month: 30 * 86400000,
        year: 365 * 86400000,
      };
      const cutoff = Date.now() - (msMap[options.time] ?? 86400000);
      filtered = filtered.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
    }

    const scored = filtered.map((t) => ({
      thread: this.enrichThread(t),
      score: this.computeFeedScore(t, sort),
      createdAtMs: new Date(t.createdAt).getTime(),
    }));

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.createdAtMs !== a.createdAtMs) return b.createdAtMs - a.createdAtMs;
      return b.thread.id.localeCompare(a.thread.id);
    });

    const decoded = options?.cursor ? CursorManager.decode(options.cursor) : null;
    const afterCursor = decoded
      ? scored.filter(
          (entry) =>
            entry.score < decoded.score ||
            (entry.score === decoded.score && entry.createdAtMs < decoded.createdAtMs) ||
            (entry.score === decoded.score &&
              entry.createdAtMs === decoded.createdAtMs &&
              entry.thread.id < decoded.id),
        )
      : scored;

    const hasMore = afterCursor.length > limit;
    const page = hasMore ? afterCursor.slice(0, limit) : afterCursor;
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last ? CursorManager.encode(last.score, last.createdAtMs, last.thread.id) : null;

    return {
      items: page.map((p) => p.thread),
      nextCursor,
    };
  }

  public async listHomeFeedThreads(
    userId: string,
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    const joinedSpaceIds = new Set<string>();
    for (const m of this.memberships.values()) {
      if (m.userId === userId) joinedSpaceIds.add(m.spaceId);
    }
    const items = Array.from(this.threads.values()).filter(
      (t) => joinedSpaceIds.has(t.spaceId) && this.isVisibleToViewer(t, userId),
    );
    return this.paginateFeed(items, options);
  }

  public async listPopularFeedThreads(
    options?: FeedFilter,
    viewerId?: string,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    const items = Array.from(this.threads.values()).filter((t) => {
      const space = this.spaces.get(t.spaceId);
      return !space?.isPrivate && this.isVisibleToViewer(t, viewerId);
    });
    return this.paginateFeed(items, options);
  }

  public async listSpaceFeedThreads(
    spaceId: string,
    options?: FeedFilter,
    viewerId?: string,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }> {
    const items = Array.from(this.threads.values()).filter(
      (t) =>
        t.spaceId === spaceId &&
        this.isVisibleToViewer(t, viewerId) &&
        (!options?.flairId || t.flairId === options.flairId),
    );
    return this.paginateFeed(items, options);
  }

  public async checkHealth(): Promise<boolean> {
    return true;
  }
}
