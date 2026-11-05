/**
 * @file vote-service.ts
 * @description Service managing Atomic Votes for Threads and Comments, Karma, and Saved Threads.
 */

import type { VoteDirection, VoteResult } from '@acad/contracts';
import type { ICommunityRepository } from '../repository/community-repository.js';
import type { IVoteStorageEngine } from '../voting/lua-vote-engine.js';

export class TargetNotFoundError extends Error {
  constructor(message: string = 'Không tìm thấy mục tiêu yêu cầu để biểu quyết') {
    super(message);
    this.name = 'TargetNotFoundError';
  }
}

export class VoteService {
  constructor(
    private repo: ICommunityRepository,
    private voteEngine: IVoteStorageEngine,
  ) {}

  /**
   * Biểu quyết bài viết nguyên tử (O(1) trên Redis/Memory)
   */
  public async voteThread(
    threadId: string,
    userId: string,
    direction: VoteDirection,
  ): Promise<VoteResult> {
    const thread = await this.repo.findThreadById(threadId);
    if (!thread) {
      throw new TargetNotFoundError('Không tìm thấy bài viết yêu cầu');
    }

    const previousVote = await this.repo.getUserVote(threadId, 'THREAD', userId);
    const voteRes = await this.voteEngine.executeVote(threadId, userId, direction);
    const finalDirection = voteRes.finalDirection;

    // Ghi nhận lịch sử vào repo
    await this.repo.recordVote(threadId, 'THREAD', userId, finalDirection);

    // Tính toán karma delta tác giả bài viết
    const delta = finalDirection - previousVote;
    if (delta !== 0) {
      await this.repo.updateUserKarma(thread.authorId, delta);
    }

    return {
      targetId: threadId,
      targetType: 'THREAD',
      userVote: finalDirection,
      netScore: voteRes.counters.netScore,
      upvotes: voteRes.counters.upvotes,
      downvotes: voteRes.counters.downvotes,
      delta,
    };
  }

  /**
   * Biểu quyết bình luận nguyên tử
   */
  public async voteComment(
    commentId: string,
    userId: string,
    direction: VoteDirection,
  ): Promise<VoteResult> {
    const comment = await this.repo.findCommentById(commentId);
    if (!comment) {
      throw new TargetNotFoundError('Không tìm thấy bình luận yêu cầu');
    }

    const previousVote = await this.repo.getUserVote(commentId, 'COMMENT', userId);
    const voteRes = await this.voteEngine.executeVote(commentId, userId, direction);
    const finalDirection = voteRes.finalDirection;

    await this.repo.recordVote(commentId, 'COMMENT', userId, finalDirection);

    const delta = finalDirection - previousVote;
    if (delta !== 0) {
      await this.repo.updateUserKarma(comment.authorId, delta);
    }

    return {
      targetId: commentId,
      targetType: 'COMMENT',
      userVote: finalDirection,
      netScore: voteRes.counters.netScore,
      upvotes: voteRes.counters.upvotes,
      downvotes: voteRes.counters.downvotes,
      delta,
    };
  }

  /**
   * Đánh dấu lưu / bỏ lưu bài viết
   */
  public async toggleSaveThread(threadId: string, userId: string): Promise<{ isSaved: boolean }> {
    const thread = await this.repo.findThreadById(threadId);
    if (!thread) {
      throw new TargetNotFoundError('Không tìm thấy bài viết yêu cầu');
    }
    const isSaved = await this.repo.toggleSaveThread(userId, threadId);
    return { isSaved };
  }

  /**
   * Lấy danh sách bài viết đã lưu của người dùng
   */
  public async listSavedThreads(userId: string, limit: number = 20, offset: number = 0) {
    const threads = await this.repo.listSavedThreads(userId, limit, offset);
    return threads.map((t) => ({
      id: t.id,
      spaceId: t.spaceId,
      spaceSlug: '',
      spaceName: '',
      authorId: t.authorId,
      authorUsername: '',
      flair: null,
      title: t.title,
      slug: t.slug,
      linkUrl: t.linkUrl,
      isPinned: t.isPinned,
      isLocked: t.isLocked,
      upvotes: t.upvotesCount,
      downvotes: t.downvotesCount,
      netScore: t.upvotesCount - t.downvotesCount,
      commentsCount: t.commentCount,
      userVote: 0,
      isSaved: true,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }
}
