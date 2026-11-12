import type { ThreadSummary, VoteDirection, VoteResult } from '@acad/contracts';
import type { ICommunityRepository } from '../repository/community-repository.js';
import { GravityDecayEngine } from '../voting/gravity-decay.js';
import type { IVoteStorageEngine } from '../voting/lua-vote-engine.js';
import { WilsonScoreEngine } from '../voting/wilson-score.js';
import {
  assertSpaceMembershipIfPrivate,
  mapEntityToThreadSummary,
  resolveViewerThreadState,
} from './thread-mapper.js';

export class TargetNotFoundError extends Error {
  constructor(message = 'Không tìm thấy mục tiêu yêu cầu để biểu quyết') {
    super(message);
    this.name = 'TargetNotFoundError';
  }
}

export class VoteService {
  constructor(
    private readonly repo: ICommunityRepository,
    private readonly voteEngine: IVoteStorageEngine,
  ) {}

  private async prepareTargetCounters(
    targetId: string,
    upvotes: number,
    downvotes: number,
    userId: string,
    previousVote: number,
  ): Promise<void> {
    const hasCounters = await this.voteEngine.hasCounters(targetId);
    if (!hasCounters) {
      await this.voteEngine.seedCounters(
        targetId,
        { upvotes, downvotes, netScore: upvotes - downvotes },
        { userId, direction: previousVote },
      );
      return;
    }

    if (previousVote !== 0) {
      await this.voteEngine.ensureUserVoteSeeded(targetId, userId, previousVote);
    }
  }

  /**
   * Biểu quyết bài viết nguyên tử (O(1) trên Redis Lua) kèm đồng bộ tức thì vào thread_counters
   * (fix triệt để độ trễ 5s khi reload hoặc sắp xếp feed).
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

    await this.repo.recordVote(threadId, 'THREAD', userId, finalDirection);

    // Write-through HOT upsert ngay lập tức để Postgres threads & thread_counters không có cửa sổ trễ 5s
    await this.repo.upsertThreadCounters([
      {
        threadId,
        upvotes: voteRes.counters.upvotes,
        downvotes: voteRes.counters.downvotes,
        netScore: voteRes.counters.netScore,
        hotScore: GravityDecayEngine.computeHotScore(voteRes.counters.netScore, thread.createdAt),
        wilsonScore: WilsonScoreEngine.computeWilsonScore(
          voteRes.counters.upvotes,
          voteRes.counters.downvotes,
        ),
        commentCount: thread.commentCount,
        updatedAt: new Date(),
      },
    ]);

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

  public async toggleSaveThread(threadId: string, userId: string): Promise<{ isSaved: boolean }> {
    const thread = await this.repo.findThreadById(threadId);
    if (!thread) {
      throw new TargetNotFoundError('Không tìm thấy bài viết yêu cầu');
    }
    await assertSpaceMembershipIfPrivate(this.repo, thread.spaceId, thread.spaceIsPrivate, userId);
    const isSaved = await this.repo.toggleSaveThread(userId, threadId);
    return { isSaved };
  }

  public async listSavedThreads(userId: string, limit = 20, offset = 0): Promise<ThreadSummary[]> {
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
