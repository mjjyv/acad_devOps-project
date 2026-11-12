/**
 * Repository interfaces, Entities and Domain Errors for @acad/community-service.
 */

export class DuplicateSlugError extends Error {
  constructor(message = 'Đường dẫn (slug) này đã tồn tại trong hệ thống') {
    super(message);
    this.name = 'DuplicateSlugError';
  }
}

export class DuplicateFlairError extends Error {
  constructor(message = 'Nhãn (Flair) này đã tồn tại trong không gian') {
    super(message);
    this.name = 'DuplicateFlairError';
  }
}

export class CommunityDatabaseError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'CommunityDatabaseError';
  }
}

export type SpaceMembershipRoleDb = 'MEMBER' | 'MODERATOR' | 'CREATOR';

export interface SpaceEntity {
  id: string;
  name: string;
  slug: string;
  topic: string;
  description: string | null;
  iconUrl: string | null;
  bannerUrl: string | null;
  rules: Array<{ title: string; description: string }>;
  isPrivate: boolean;
  creatorId: string;
  memberCount: number;
  threadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpaceTopicStats {
  topic: string;
  spacesCount: number;
  totalMembers: number;
}

export interface SpaceMembershipEntity {
  spaceId: string;
  userId: string;
  role: SpaceMembershipRoleDb;
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
  spaceSlug?: string | undefined;
  spaceName?: string | undefined;
  spaceIsPrivate?: boolean | undefined;
  authorId: string;
  authorUsername?: string | undefined;
  authorAvatarUrl?: string | null | undefined;
  authorStatus?: string | undefined;
  flairId: string | null;
  flairName?: string | null | undefined;
  flairSlug?: string | null | undefined;
  flairColorHex?: string | null | undefined;
  flairBackgroundHex?: string | null | undefined;
  title: string;
  slug: string;
  content: string | null;
  contentSnippet?: string | null | undefined;
  linkUrl: string | null;
  mediaUrls?: string[] | undefined;
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
  authorUsername?: string | undefined;
  authorAvatarUrl?: string | null | undefined;
  authorKarmaScore?: number | undefined;
  parentId: string | null;
  path: string;
  depth: number;
  content: string;
  replyToUserId: string | null;
  replyToUsername?: string | null | undefined;
  upvotesCount: number;
  downvotesCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
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
  sort?: 'hot' | 'new' | 'top' | 'best' | undefined;
  time?: 'day' | 'week' | 'month' | 'year' | 'all' | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
  flairId?: string | undefined;
  q?: string | undefined;
}

export interface CreateFlairRepoData {
  name: string;
  slug: string;
  colorHex: string;
  backgroundHex: string;
}

export interface ICommunityRepository {
  readonly handlesCountersViaDbTriggers?: boolean | undefined;

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
  listSpaceTopics(): Promise<SpaceTopicStats[]>;
  joinSpace(spaceId: string, userId: string, role?: SpaceMembershipRoleDb): Promise<void>;
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
    mediaUrls?: string[] | undefined;
    threadType: 'TEXT' | 'LINK' | 'MEDIA';
  }): Promise<ThreadEntity>;
  findThreadById(id: string): Promise<ThreadEntity | null>;
  findThreadBySlug(slug: string): Promise<ThreadEntity | null>;
  listThreadsBySpace(
    spaceId: string,
    options?: {
      limit?: number | undefined;
      offset?: number | undefined;
      flairId?: string | undefined;
      viewerId?: string | undefined;
    },
  ): Promise<ThreadEntity[]>;
  searchThreadsInSpace(
    spaceId: string,
    query: string,
    limit?: number,
    viewerId?: string,
  ): Promise<ThreadEntity[]>;

  // Comments (ltree)
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

  // Voting & Feeds (Phase B3)
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
  listHomeFeedThreads(
    userId: string,
    options?: FeedFilter,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }>;
  listPopularFeedThreads(
    options?: FeedFilter,
    viewerId?: string,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }>;
  listSpaceFeedThreads(
    spaceId: string,
    options?: FeedFilter,
    viewerId?: string,
  ): Promise<{ items: ThreadEntity[]; nextCursor: string | null }>;
  checkHealth(): Promise<boolean>;
  close?(): Promise<void>;
}
