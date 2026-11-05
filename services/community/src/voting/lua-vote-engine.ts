/**
 * @file lua-vote-engine.ts
 * @description Atomic O(1) Vote Processing Engine with Redis Lua & In-Memory State Machine.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VoteDirection } from '@acad/contracts';
import type { Redis } from 'ioredis';

export interface VoteCounterState {
  upvotes: number;
  downvotes: number;
  netScore: number;
}

export interface VoteResult {
  finalDirection: number; // 1, -1, hoặc 0 (unvote)
  counters: VoteCounterState;
  targetId: string;
}

export interface IVoteStorageEngine {
  executeVote(
    targetId: string,
    userId: string,
    targetDirection: VoteDirection,
  ): Promise<VoteResult>;
  getCounters(targetId: string): Promise<VoteCounterState>;
  getUserVote(targetId: string, userId: string): Promise<number>;
  getDirtyTargetIds(): Promise<string[]>;
  clearDirtyTargetIds(targetIds: string[]): Promise<void>;
}

/**
 * AtomicVoteEngine: Hiện thực hóa chính xác máy trạng thái logic của execute_vote.lua
 * Phục vụ Unit Tests tốc độ cao trong 1ms và vận hành không phụ thuộc Redis daemon.
 */
export class AtomicVoteEngine implements IVoteStorageEngine {
  private voters = new Map<string, Map<string, number>>(); // targetId -> (userId -> direction)
  private counters = new Map<string, VoteCounterState>(); // targetId -> counters
  private dirtyRegistry = new Set<string>(); // dirty targetIds

  public async executeVote(
    targetId: string,
    userId: string,
    targetDirection: VoteDirection,
  ): Promise<VoteResult> {
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

    // TRƯỜNG HỢP 1: BẤM LẠI CÙNG NÚT -> HỦY VOTE (UNVOTE)
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

      // TRƯỜNG HỢP 2: BẦU MỚI HOÀN TOÀN HOẶC ĐẢO CHIỀU (UPVOTE <-> DOWNVOTE)
    } else {
      targetVoters.set(userId, targetDirection);
      if (currentDirection === 0) {
        // Bầu mới hoàn toàn
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

    // Gắn cờ cần flush vào DB
    this.dirtyRegistry.add(targetId);

    return {
      finalDirection,
      counters: { ...targetCounters },
      targetId,
    };
  }

  public async getCounters(targetId: string): Promise<VoteCounterState> {
    const state = this.counters.get(targetId);
    return state ? { ...state } : { upvotes: 0, downvotes: 0, netScore: 0 };
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

  /**
   * Helper nạp trước bộ đếm ban đầu cho target (phục vụ đồng bộ từ CSDL)
   */
  public seedCounters(targetId: string, counters: VoteCounterState): void {
    this.counters.set(targetId, { ...counters });
  }
}

/**
 * RedisVoteEngine: Chạy trực tiếp kịch bản Lua execute_vote.lua trên cụm Redis sản xuất
 */
export class RedisVoteEngine implements IVoteStorageEngine {
  private luaScript: string;
  private DIRTY_KEY = 'dirty:votes';

  constructor(
    private redis: Redis,
    luaScriptOverride?: string,
  ) {
    if (luaScriptOverride) {
      this.luaScript = luaScriptOverride;
    } else {
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        // Tìm đường dẫn tới deploy/redis/execute_vote.lua
        const luaPath = join(__dirname, '../../../../deploy/redis/execute_vote.lua');
        this.luaScript = readFileSync(luaPath, 'utf-8');
      } catch {
        // Fallback inline script nếu không đọc được file ngoài
        this.luaScript = `
          local voters_key = KEYS[1]
          local counters_key = KEYS[2]
          local dirty_registry_key = KEYS[3]
          local user_id = ARGV[1]
          local target_direction = tonumber(ARGV[2])
          local target_id = ARGV[3]
          local current_raw = redis.call('HGET', voters_key, user_id)
          local current_direction = current_raw and tonumber(current_raw) or 0
          local final_direction = 0
          if current_direction == target_direction then
            redis.call('HDEL', voters_key, user_id)
            if target_direction == 1 then
              redis.call('HINCRBY', counters_key, 'upvotes', -1)
              redis.call('HINCRBY', counters_key, 'net_score', -1)
            else
              redis.call('HINCRBY', counters_key, 'downvotes', -1)
              redis.call('HINCRBY', counters_key, 'net_score', 1)
            end
          else
            redis.call('HSET', voters_key, user_id, target_direction)
            if current_direction == 0 then
              if target_direction == 1 then
                redis.call('HINCRBY', counters_key, 'upvotes', 1)
                redis.call('HINCRBY', counters_key, 'net_score', 1)
              else
                redis.call('HINCRBY', counters_key, 'downvotes', 1)
                redis.call('HINCRBY', counters_key, 'net_score', -1)
              end
            else
              if target_direction == 1 then
                redis.call('HINCRBY', counters_key, 'upvotes', 1)
                redis.call('HINCRBY', counters_key, 'downvotes', -1)
                redis.call('HINCRBY', counters_key, 'net_score', 2)
              else
                redis.call('HINCRBY', counters_key, 'upvotes', -1)
                redis.call('HINCRBY', counters_key, 'downvotes', 1)
                redis.call('HINCRBY', counters_key, 'net_score', -2)
              end
            end
            final_direction = target_direction
          end
          redis.call('SADD', dirty_registry_key, target_id)
          local upvotes = tonumber(redis.call('HGET', counters_key, 'upvotes') or '0')
          local downvotes = tonumber(redis.call('HGET', counters_key, 'downvotes') or '0')
          local net_score = tonumber(redis.call('HGET', counters_key, 'net_score') or '0')
          return { final_direction, upvotes, downvotes, net_score }
        `;
      }
    }
  }

  public async executeVote(
    targetId: string,
    userId: string,
    targetDirection: VoteDirection,
  ): Promise<VoteResult> {
    const votersKey = `target:${targetId}:voters`;
    const countersKey = `target:${targetId}:counters`;

    const result = (await this.redis.eval(
      this.luaScript,
      3,
      votersKey,
      countersKey,
      this.DIRTY_KEY,
      userId,
      targetDirection.toString(),
      targetId,
    )) as [number, number, number, number];

    return {
      finalDirection: Number(result[0]),
      counters: {
        upvotes: Number(result[1]),
        downvotes: Number(result[2]),
        netScore: Number(result[3]),
      },
      targetId,
    };
  }

  public async getCounters(targetId: string): Promise<VoteCounterState> {
    const countersKey = `target:${targetId}:counters`;
    const [upvotes, downvotes, netScore] = await this.redis.hmget(
      countersKey,
      'upvotes',
      'downvotes',
      'net_score',
    );
    return {
      upvotes: upvotes ? parseInt(upvotes, 10) : 0,
      downvotes: downvotes ? parseInt(downvotes, 10) : 0,
      netScore: netScore ? parseInt(netScore, 10) : 0,
    };
  }

  public async getUserVote(targetId: string, userId: string): Promise<number> {
    const votersKey = `target:${targetId}:voters`;
    const dir = await this.redis.hget(votersKey, userId);
    return dir ? parseInt(dir, 10) : 0;
  }

  public async getDirtyTargetIds(): Promise<string[]> {
    try {
      return await this.redis.smembers(this.DIRTY_KEY);
    } catch {
      return [];
    }
  }

  public async clearDirtyTargetIds(targetIds: string[]): Promise<void> {
    if (targetIds.length > 0) {
      await this.redis.srem(this.DIRTY_KEY, ...targetIds);
    }
  }
}
