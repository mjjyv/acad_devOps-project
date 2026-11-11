/**
 * @file vote-service.ts
 * @description Service managing Atomic Votes for Threads and Comments, Karma, and Saved Threads.
 */

import type { ThreadSummary, VoteDirection, VoteResult } from '@acad/contracts';
import type { ICommunityRepository } from '../repository/community-repository.js';
import type { IVoteStorageEngine } from '../voting/lua-vote-engine.js';
import {
  assertSpaceMembershipIfPrivate,
  mapEntityToThreadSummary,
  resolveViewerThreadState,
} from './thread-mapper.js';

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

  private async prepareTargetCounters(
    targetId: string,
    upvotes: number,
    downvotes: number,
    userId: string,
    previousVote: number,
  ): Promise<void> {
    // Lazy-seed Redis counters hoặc đồng bộ HSETNX phiếu cá nhân từ PostgreSQL
    const hasCounters = await this.voteEngine.hasCounters(targetId);
    if (!hasCounters) {
      await this.voteEngine.seedCounters(
        targetId,
        {
          upvotes,
          downvotes,
          netScore: upvotes - downvotes,
        },
        {
          userId,
          direction: previousVote,
        },
      );
      return;
    }

    if (previousVote !== 0) {
      await this.voteEngine.ensureUserVoteSeeded(targetId, userId, previousVote);
    }
  }

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

    await assertSpaceMembershipIfPrivate(this.repo, thread.spaceId, thread.spaceIsPrivate, userId);

    const previousVote = await this.repo.getUserVote(threadId, 'THREAD', userId);
    await this.prepareTargetCounters(
      threadId,
      thread.upvotesCount,
      thread.downvotesCount,
      userId,
      previousVote,
    );

    const voteRes = await this.voteEngine.executeVote(threadId, userId, direction);
    const finalDirection = voteRes.finalDirection;

    // Ghi nhận lịch sử vào repo (DB Trigger tự cập nhật Karma nếu handlesCountersViaDbTriggers = true)
    await this.repo.recordVote(threadId, 'THREAD', userId, finalDirection);

    const delta = finalDirection - previousVote;
    if (delta !== 0 && !this.repo.handlesCountersViaDbTriggers) {
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

    const thread = await this.repo.findThreadById(comment.threadId);
    if (thread) {
      await assertSpaceMembershipIfPrivate(
        this.repo,
        thread.spaceId,
        thread.spaceIsPrivate,
        userId,
      );
    }

    const previousVote = await this.repo.getUserVote(commentId, 'COMMENT', userId);
    await this.prepareTargetCounters(
      commentId,
      comment.upvotesCount,
      comment.downvotesCount,
      userId,
      previousVote,
    );

    const voteRes = await this.voteEngine.executeVote(commentId, userId, direction);
    const finalDirection = voteRes.finalDirection;

    await this.repo.recordVote(commentId, 'COMMENT', userId, finalDirection);

    const delta = finalDirection - previousVote;
    if (delta !== 0 && !this.repo.handlesCountersViaDbTriggers) {
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
    await assertSpaceMembershipIfPrivate(this.repo, thread.spaceId, thread.spaceIsPrivate, userId);
    const isSaved = await this.repo.toggleSaveThread(userId, threadId);
    return { isSaved };
  }

  /**
   * Lấy danh sách bài viết đã lưu của người dùng
   */
  public async listSavedThreads(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<ThreadSummary[]> {
    const threads = await this.repo.listSavedThreads(userId, limit, offset);
    return Promise.all(
      threads.map(async (t) => {
        const viewerState = await resolveViewerThreadState(
          this.repo,
          this.voteEngine,
          t.id,
          userId,
          { preSaved: true },
        );
        return mapEntityToThreadSummary(t, viewerState);
      }),
    );
  }
}
