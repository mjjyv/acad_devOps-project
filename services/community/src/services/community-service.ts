import {
  Space,
  CreateSpaceInput,
  SpaceMembership,
  ThreadSummary,
  ThreadDetail,
  CreateThreadInput,
  FlatCommentItem,
  ContentAST,
} from '@acad/contracts';
import {
  ICommunityRepository,
  ThreadListFilter,
  ThreadListResult,
  AdminThreadListFilter,
  AdminThreadListResult,
  CommunityStats,
} from '../repository/community-repository.js';

export class CommunityService {
  constructor(private readonly repository: ICommunityRepository) {}

  public getRepository(): ICommunityRepository {
    return this.repository;
  }

  public getHealthStatus() {
    return this.repository.getHealthStatus();
  }

  // --- SPACES ---
  public async listSpaces(): Promise<Space[]> {
    return this.repository.listSpaces();
  }

  public async getSpaceBySlug(slug: string): Promise<Space | null> {
    return this.repository.getSpaceBySlug(slug);
  }

  public async getSpaceById(id: string): Promise<Space | null> {
    return this.repository.getSpaceById(id);
  }

  public async createSpace(
    input: CreateSpaceInput,
    creatorId?: string | null,
  ): Promise<Space> {
    return this.repository.createSpace(input, creatorId);
  }

  public async joinSpace(spaceId: string, userId: string): Promise<SpaceMembership> {
    return this.repository.joinSpace(spaceId, userId);
  }

  public async leaveSpace(spaceId: string, userId: string): Promise<boolean> {
    return this.repository.leaveSpace(spaceId, userId);
  }

  // --- THREADS ---
  public async listThreads(filter: ThreadListFilter): Promise<ThreadListResult> {
    return this.repository.listThreads(filter);
  }

  public async getThreadBySlug(
    slug: string,
    userId?: string,
  ): Promise<ThreadDetail | null> {
    return this.repository.getThreadBySlug(slug, userId);
  }

  public async getThreadById(
    id: string,
    userId?: string,
  ): Promise<ThreadDetail | null> {
    return this.repository.getThreadById(id, userId);
  }

  public async createThread(
    input: CreateThreadInput,
    authorId: string,
    authorUsername: string,
    authorAvatarUrl?: string | null,
  ): Promise<ThreadDetail> {
    return this.repository.createThread(input, authorId, authorUsername, authorAvatarUrl);
  }

  public async deleteThread(
    id: string,
    requesterId: string,
    isAdminOrMod: boolean,
  ): Promise<boolean> {
    return this.repository.deleteThread(id, requesterId, isAdminOrMod);
  }

  // --- COMMENTS ---
  public async listComments(
    threadId: string,
    userId?: string,
  ): Promise<FlatCommentItem[]> {
    return this.repository.listComments(threadId, userId);
  }

  public async createComment(input: {
    threadId: string;
    parentId?: string | null;
    contentAst: ContentAST;
    authorId: string;
    authorUsername: string;
    authorAvatarUrl?: string | null;
    karmaScore?: number;
  }): Promise<FlatCommentItem> {
    return this.repository.createComment(input);
  }

  public async deleteComment(
    id: string,
    requesterId: string,
    isAdminOrMod: boolean,
  ): Promise<boolean> {
    return this.repository.deleteComment(id, requesterId, isAdminOrMod);
  }

  // --- VOTING ---
  public async voteThread(
    threadId: string,
    userId: string,
    direction: 1 | -1,
  ): Promise<{ upvotes: number; downvotes: number; netScore: number; userVote: 1 | -1 | null }> {
    return this.repository.voteThread(threadId, userId, direction);
  }

  public async voteComment(
    commentId: string,
    userId: string,
    direction: 1 | -1,
  ): Promise<{ upvotes: number; downvotes: number; netScore: number; userVote: 1 | -1 | null }> {
    return this.repository.voteComment(commentId, userId, direction);
  }

  // --- ADMIN OPERATIONS ---
  public async adminListSpaces(): Promise<Space[]> {
    return this.repository.adminListSpaces();
  }

  public async adminDeleteSpace(id: string): Promise<boolean> {
    return this.repository.adminDeleteSpace(id);
  }

  public async adminListThreads(filter: AdminThreadListFilter): Promise<AdminThreadListResult> {
    return this.repository.adminListThreads(filter);
  }

  public async adminSetThreadPinned(threadId: string, isPinned: boolean): Promise<boolean> {
    return this.repository.adminSetThreadPinned(threadId, isPinned);
  }

  public async adminSetThreadLocked(threadId: string, isLocked: boolean): Promise<boolean> {
    return this.repository.adminSetThreadLocked(threadId, isLocked);
  }

  public async adminDeleteThread(threadId: string): Promise<boolean> {
    return this.repository.adminDeleteThread(threadId);
  }

  public async getUserThreadCounts(): Promise<Record<string, number>> {
    return this.repository.getUserThreadCounts();
  }

  public async getCommunityStats(): Promise<CommunityStats> {
    return this.repository.getCommunityStats();
  }
}
