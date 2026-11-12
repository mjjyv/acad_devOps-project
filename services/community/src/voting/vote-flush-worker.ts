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

/**
 * Background Worker flushing dirty Redis vote counters to PostgreSQL thread_counters
 * and periodically recalculating time-decayed Gravity hot_scores.
 */
export class VoteFlushWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly intervalMs: number;
  private refreshTickCount = 0;
  private readonly refreshHotScoreEveryTicks = 12;

  constructor(
    private readonly voteEngine: IVoteStorageEngine,
    private readonly repo: ICommunityRepository,
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
    this.timer.unref();
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flushNow();
  }

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
      const thread = await this.repo.findThreadById(targetId);
      if (!thread) continue;

      const counters = await this.voteEngine.getCounters(targetId);
      countersToUpsert.push({
        threadId: targetId,
        upvotes: counters.upvotes,
        downvotes: counters.downvotes,
        netScore: counters.netScore,
        hotScore: GravityDecayEngine.computeHotScore(counters.netScore, thread.createdAt),
        wilsonScore: WilsonScoreEngine.computeWilsonScore(counters.upvotes, counters.downvotes),
        commentCount: thread.commentCount,
        updatedAt: new Date(),
      });
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
