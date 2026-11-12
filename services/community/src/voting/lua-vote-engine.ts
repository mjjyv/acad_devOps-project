import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VoteDirection } from '@acad/contracts';
import type { Redis } from 'ioredis';

export interface VoteCounterState {
  upvotes: number;
  downvotes: number;
  netScore: number;
}

export interface LuaVoteResult {
  finalDirection: number; // 1, -1, hoặc 0 (unvote)
  counters: VoteCounterState;
  targetId: string;
}

export interface IVoteStorageEngine {
  executeVote(
    targetId: string,
    userId: string,
    targetDirection: VoteDirection,
  ): Promise<LuaVoteResult>;
  getCounters(targetId: string): Promise<VoteCounterState>;
  getUserVote(targetId: string, userId: string): Promise<number>;
  getDirtyTargetIds(): Promise<string[]>;
  clearDirtyTargetIds(targetIds: string[]): Promise<void>;
  hasCounters(targetId: string): Promise<boolean>;
  ensureUserVoteSeeded(targetId: string, userId: string, direction: number): Promise<void>;
  seedCounters(
    targetId: string,
    counters: VoteCounterState,
    existingUserVote?: { userId: string; direction: number },
  ): Promise<void>;
}

const VOTE_KEY_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * In-memory deterministic FSM matching deploy/redis/execute_vote.lua for fast unit testing.
 */
export class AtomicVoteEngine implements IVoteStorageEngine {
  private readonly voters = new Map<string, Map<string, number>>();
  private readonly counters = new Map<string, VoteCounterState>();
  private readonly dirtyRegistry = new Set<string>();

  public async executeVote(
    targetId: string,
    userId: string,
    targetDirection: VoteDirection,
  ): Promise<LuaVoteResult> {
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
    } else {
      targetVoters.set(userId, targetDirection);
      if (currentDirection === 0) {
        if (targetDirection === 1) {
          targetCounters.upvotes += 1;
          targetCounters.netScore += 1;
        } else {
          targetCounters.downvotes += 1;
          targetCounters.netScore -= 1;
        }
      } else if (targetDirection === 1) {
        targetCounters.upvotes += 1;
        targetCounters.downvotes -= 1;
        targetCounters.netScore += 2;
      } else {
        targetCounters.upvotes -= 1;
        targetCounters.downvotes += 1;
        targetCounters.netScore -= 2;
      }
      finalDirection = targetDirection;
    }

    this.dirtyRegistry.add(targetId);
    return { finalDirection, counters: { ...targetCounters }, targetId };
  }

  public async getCounters(targetId: string): Promise<VoteCounterState> {
    const c = this.counters.get(targetId);
    return c ? { ...c } : { upvotes: 0, downvotes: 0, netScore: 0 };
  }

  public async getUserVote(targetId: string, userId: string): Promise<number> {
    return this.voters.get(targetId)?.get(userId) ?? 0;
  }

  public async getDirtyTargetIds(): Promise<string[]> {
    return Array.from(this.dirtyRegistry);
  }

  public async clearDirtyTargetIds(targetIds: string[]): Promise<void> {
    for (const id of targetIds) {
      this.dirtyRegistry.delete(id);
    }
  }

  public async hasCounters(targetId: string): Promise<boolean> {
    return this.counters.has(targetId);
  }

  public async ensureUserVoteSeeded(
    targetId: string,
    userId: string,
    direction: number,
  ): Promise<void> {
    if (direction === 0) return;
    let targetVoters = this.voters.get(targetId);
    if (!targetVoters) {
      targetVoters = new Map<string, number>();
      this.voters.set(targetId, targetVoters);
    }
    if (!targetVoters.has(userId)) {
      targetVoters.set(userId, direction);
    }
  }

  public async seedCounters(
    targetId: string,
    counters: VoteCounterState,
    existingUserVote?: { userId: string; direction: number },
  ): Promise<void> {
    this.counters.set(targetId, { ...counters });
    if (existingUserVote && existingUserVote.direction !== 0) {
      let targetVoters = this.voters.get(targetId);
      if (!targetVoters) {
        targetVoters = new Map<string, number>();
        this.voters.set(targetId, targetVoters);
      }
      targetVoters.set(existingUserVote.userId, existingUserVote.direction);
    }
  }
}

/**
 * Redis Lua O(1) Vote Engine loading deploy/redis/execute_vote.lua directly.
 */
export class RedisLuaVoteEngine implements IVoteStorageEngine {
  private readonly luaScript: string;

  constructor(
    private readonly redis: Redis,
    scriptPath?: string,
  ) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const candidates = [
      scriptPath,
      join(__dirname, '../../../../deploy/redis/execute_vote.lua'),
      join(process.cwd(), 'deploy/redis/execute_vote.lua'),
      join(process.cwd(), '../../deploy/redis/execute_vote.lua'),
    ].filter((p): p is string => Boolean(p));

    const found = candidates.find((p) => existsSync(p));
    if (!found) {
      throw new Error('Không tìm thấy tệp kịch bản Redis Lua deploy/redis/execute_vote.lua');
    }
    this.luaScript = readFileSync(found, 'utf8');
  }

  private votersKey(targetId: string): string {
    return `target:${targetId}:voters`;
  }

  private countersKey(targetId: string): string {
    return `target:${targetId}:counters`;
  }

  public async executeVote(
    targetId: string,
    userId: string,
    targetDirection: VoteDirection,
  ): Promise<LuaVoteResult> {
    const votersKey = this.votersKey(targetId);
    const countersKey = this.countersKey(targetId);

    const res = (await this.redis.eval(
      this.luaScript,
      3,
      votersKey,
      countersKey,
      'dirty:votes',
      userId,
      String(targetDirection),
      targetId,
    )) as [number, number, number, number];

    await Promise.all([
      this.redis.expire(votersKey, VOTE_KEY_TTL_SECONDS),
      this.redis.expire(countersKey, VOTE_KEY_TTL_SECONDS),
    ]);

    return {
      finalDirection: Number(res[0]),
      counters: {
        upvotes: Number(res[1]),
        downvotes: Number(res[2]),
        netScore: Number(res[3]),
      },
      targetId,
    };
  }

  public async getCounters(targetId: string): Promise<VoteCounterState> {
    const raw = await this.redis.hgetall(this.countersKey(targetId));
    if (!raw || Object.keys(raw).length === 0) {
      return { upvotes: 0, downvotes: 0, netScore: 0 };
    }
    return {
      upvotes: Number.parseInt(raw.upvotes || '0', 10),
      downvotes: Number.parseInt(raw.downvotes || '0', 10),
      netScore: Number.parseInt(raw.net_score || '0', 10),
    };
  }

  public async getUserVote(targetId: string, userId: string): Promise<number> {
    const val = await this.redis.hget(this.votersKey(targetId), userId);
    return val ? Number.parseInt(val, 10) : 0;
  }

  public async getDirtyTargetIds(): Promise<string[]> {
    return this.redis.smembers('dirty:votes');
  }

  public async clearDirtyTargetIds(targetIds: string[]): Promise<void> {
    if (targetIds.length === 0) return;
    await this.redis.srem('dirty:votes', ...targetIds);
  }

  public async hasCounters(targetId: string): Promise<boolean> {
    const exists = await this.redis.exists(this.countersKey(targetId));
    return exists === 1;
  }

  public async ensureUserVoteSeeded(
    targetId: string,
    userId: string,
    direction: number,
  ): Promise<void> {
    if (direction === 0) return;
    const votersKey = this.votersKey(targetId);
    await this.redis.hsetnx(votersKey, userId, String(direction));
    await this.redis.expire(votersKey, VOTE_KEY_TTL_SECONDS);
  }

  public async seedCounters(
    targetId: string,
    counters: VoteCounterState,
    existingUserVote?: { userId: string; direction: number },
  ): Promise<void> {
    const countersKey = this.countersKey(targetId);
    const votersKey = this.votersKey(targetId);
    const pipeline = this.redis.pipeline();
    pipeline.hset(
      countersKey,
      'upvotes',
      String(counters.upvotes),
      'downvotes',
      String(counters.downvotes),
      'net_score',
      String(counters.netScore),
    );
    pipeline.expire(countersKey, VOTE_KEY_TTL_SECONDS);
    if (existingUserVote && existingUserVote.direction !== 0) {
      pipeline.hsetnx(votersKey, existingUserVote.userId, String(existingUserVote.direction));
      pipeline.expire(votersKey, VOTE_KEY_TTL_SECONDS);
    }
    await pipeline.exec();
  }
}
