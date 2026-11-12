/**
 * @file vote-flush-worker.ts
 * @description Background Worker flushing dirty votes from Redis to PostgreSQL every 5 seconds.
 */

import type {
  ICommunityRepository,
  ThreadCountersEntity,
} from '../repository/community-repository.js';
import { GravityDecayEngine } from './gravity-decay.js';
import type { IVoteStorageEngine } from './lua-vote-engine.js';
import { WilsonScoreEngine } from './wilson-score.js';

export interface VoteFlushWorkerOptions {
  intervalMs?: number | undefined;
}

export class VoteFlushWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private intervalMs: number;
  private refreshTickCount = 0;
  private readonly refreshHotScoreEveryTicks = 12;

  constructor(
    private voteEngine: IVoteStorageEngine,
    private repo: ICommunityRepository,
    options: VoteFlushWorkerOptions = {},
  ) {
    this.intervalMs = options.intervalMs ?? 5000;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.timer = setInterval(() => {
      this.flushNow().catch((err) => {
        console.warn('[VOTE FLUSH WORKER DEFERRED]:', err?.message || err);
      });
    }, this.intervalMs);
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Xả lần cuối trước khi tắt tiến trình hoàn toàn
    await this.flushNow();
  }

  /**
   * Thực thi xả dữ liệu dồn ngay lập tức (phục vụ Unit Test & Shutdown)
   */
  public async flushNow(): Promise<number> {
    this.refreshTickCount += 1;
    const shouldRefreshHotScores = this.refreshTickCount >= this.refreshHotScoreEveryTicks;
    if (shouldRefreshHotScores) {
      this.refreshTickCount = 0;
    }

    const dirtyIds = await this.voteEngine.getDirtyTargetIds();
    if (dirtyIds.length === 0) {
      if (shouldRefreshHotScores && this.repo.refreshHotScores) {
        await this.repo.refreshHotScores();
      }
      return 0;
    }

    const countersToUpsert: ThreadCountersEntity[] = [];

    for (const targetId of dirtyIds) {
      // 1. Kiểm tra xem targetId có phải là Thread không
      const thread = await this.repo.findThreadById(targetId);
      if (thread) {
        const counters = await this.voteEngine.getCounters(targetId);
        const hotScore = GravityDecayEngine.computeHotScore(
          counters.netScore,
          new Date(thread.createdAt),
        );
        const wilsonScore = WilsonScoreEngine.computeWilsonScore(
          counters.upvotes,
          counters.downvotes,
        );

        countersToUpsert.push({
          threadId: targetId,
          upvotes: counters.upvotes,
          downvotes: counters.downvotes,
          netScore: counters.netScore,
          hotScore,
          wilsonScore,
          commentCount: thread.commentCount,
          updatedAt: new Date(),
        });
      }
    }

    if (countersToUpsert.length > 0) {
      await this.repo.upsertThreadCounters(countersToUpsert);
    }

    await this.voteEngine.clearDirtyTargetIds(dirtyIds);
    if (shouldRefreshHotScores && this.repo.refreshHotScores) {
      await this.repo.refreshHotScores();
    }
    return dirtyIds.length;
  }
}
