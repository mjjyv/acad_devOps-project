import { VoteDirection } from '@acad/contracts';

export interface VoteCounterState {
  upvotes: number;
  downvotes: number;
  netScore: number;
}

export interface VoteResult {
  finalDirection: number; // 1, -1, or 0 (unvote)
  counters: VoteCounterState;
  targetId: string;
}

/**
 * AtomicVoteEngine - Hiện thực hóa chính xác máy trạng thái logic của execute_vote.lua
 * Phục vụ unit test và xử lý bộ nhớ đệm nguyên tử O(1)
 */
export class AtomicVoteEngine {
  private voters = new Map<string, Map<string, number>>(); // targetId -> (userId -> direction)
  private counters = new Map<string, VoteCounterState>();  // targetId -> counters
  private dirtyRegistry = new Set<string>();               // dirty targetIds

  public executeVote(
    targetId: string,
    userId: string,
    targetDirection: VoteDirection,
  ): VoteResult {
    let targetVoters = this.voters.get(targetId);
    if (!targetVoters) {
      targetVoters = new Map<string, number>();
      this.voters.set(targetId, targetVoters);
    }

    let targetCounters = this.counters.get(targetId);
    if (!targetCounters) {
      targetCounters = { upvotes: 0, downvotes: 0, netScore: 0 };
      this.counters.set(targetId, targetCounters);
    }

    const currentDirection = targetVoters.get(userId) ?? 0;
    let finalDirection = 0;

    // NHÁNH 1: BẤM LẠI NÚT CŨ -> HỦY VOTE (UNVOTE)
    if (currentDirection === targetDirection) {
      targetVoters.delete(userId);
      if (targetDirection === 1) {
        targetCounters.upvotes -= 1;
        targetCounters.netScore -= 1;
      } else {
        targetCounters.downvotes -= 1;
        targetCounters.netScore += 1;
      }
      finalDirection = 0;

    // NHÁNH 2: BẦU MỚI HOÀN TOÀN HOẶC ĐẢO CHIỀU
    } else {
      targetVoters.set(userId, targetDirection);
      if (currentDirection === 0) {
        // Bầu mới
        if (targetDirection === 1) {
          targetCounters.upvotes += 1;
          targetCounters.netScore += 1;
        } else {
          targetCounters.downvotes += 1;
          targetCounters.netScore -= 1;
        }
      } else {
        // Đảo chiều (-1 sang +1 hoặc +1 sang -1)
        if (targetDirection === 1) {
          targetCounters.upvotes += 1;
          targetCounters.downvotes -= 1;
          targetCounters.netScore += 2;
        } else {
          targetCounters.upvotes -= 1;
          targetCounters.downvotes += 1;
          targetCounters.netScore -= 2;
        }
      }
      finalDirection = targetDirection;
    }

    // Đánh dấu cần flush vào DB
    this.dirtyRegistry.add(targetId);

    return {
      finalDirection,
      counters: { ...targetCounters },
      targetId,
    };
  }

  public getCounters(targetId: string): VoteCounterState {
    const state = this.counters.get(targetId);
    return state ? { ...state } : { upvotes: 0, downvotes: 0, netScore: 0 };
  }

  public getUserVote(targetId: string, userId: string): number {
    return this.voters.get(targetId)?.get(userId) ?? 0;
  }

  public popDirtyIds(limit: number = 100): string[] {
    const batch: string[] = [];
    for (const id of this.dirtyRegistry) {
      batch.push(id);
      this.dirtyRegistry.delete(id);
      if (batch.length >= limit) break;
    }
    return batch;
  }

  public clear(): void {
    this.voters.clear();
    this.counters.clear();
    this.dirtyRegistry.clear();
  }
}
