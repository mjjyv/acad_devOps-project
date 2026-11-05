import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryCommunityRepository } from '../src/repository/community-repository.js';
import { AtomicVoteEngine } from '../src/voting/lua-vote-engine.js';
import { VoteFlushWorker } from '../src/voting/vote-flush-worker.js';

describe('Động Cơ Biểu Quyết Nguyên Tử (AtomicVoteEngine & FlushWorker)', () => {
  let engine: AtomicVoteEngine;
  let repo: InMemoryCommunityRepository;

  const TARGET_ID = '11111111-2222-3333-4444-555555555555';
  const USER_1 = 'user-001';
  const USER_2 = 'user-002';

  beforeEach(() => {
    engine = new AtomicVoteEngine();
    repo = new InMemoryCommunityRepository();
  });

  describe('1. Máy Trạng Thái Biểu Quyết (State Machine O(1))', () => {
    it('Phải ghi nhận Upvote mới (+1) khi người dùng chưa từng vote', async () => {
      const res = await engine.executeVote(TARGET_ID, USER_1, 1);
      expect(res.finalDirection).toBe(1);
      expect(res.counters.upvotes).toBe(1);
      expect(res.counters.downvotes).toBe(0);
      expect(res.counters.netScore).toBe(1);

      const userVote = await engine.getUserVote(TARGET_ID, USER_1);
      expect(userVote).toBe(1);
    });

    it('Phải hủy vote (Unvote -> 0) khi bấm lại cùng nút', async () => {
      // Vote lần 1: +1
      await engine.executeVote(TARGET_ID, USER_1, 1);
      // Bấm lại +1 -> Hủy vote
      const res = await engine.executeVote(TARGET_ID, USER_1, 1);

      expect(res.finalDirection).toBe(0);
      expect(res.counters.upvotes).toBe(0);
      expect(res.counters.downvotes).toBe(0);
      expect(res.counters.netScore).toBe(0);

      const userVote = await engine.getUserVote(TARGET_ID, USER_1);
      expect(userVote).toBe(0);
    });

    it('Phải đảo chiều vote (-1 sang +1) với độ dịch chuyển NetScore = +2', async () => {
      // Ban đầu Downvote: -1
      await engine.executeVote(TARGET_ID, USER_1, -1);
      const counters = await engine.getCounters(TARGET_ID);
      expect(counters.downvotes).toBe(1);
      expect(counters.netScore).toBe(-1);

      // Đảo chiều sang Upvote: +1
      const res = await engine.executeVote(TARGET_ID, USER_1, 1);
      expect(res.finalDirection).toBe(1);
      expect(res.counters.upvotes).toBe(1);
      expect(res.counters.downvotes).toBe(0);
      expect(res.counters.netScore).toBe(1);
    });

    it('Phải tổng hợp chính xác biểu quyết từ nhiều người dùng đồng thời', async () => {
      await engine.executeVote(TARGET_ID, USER_1, 1); // +1
      await engine.executeVote(TARGET_ID, USER_2, -1); // -1

      const counters = await engine.getCounters(TARGET_ID);
      expect(counters.upvotes).toBe(1);
      expect(counters.downvotes).toBe(1);
      expect(counters.netScore).toBe(0);

      // USER_2 đảo chiều sang +1
      await engine.executeVote(TARGET_ID, USER_2, 1);
      const updatedCounters = await engine.getCounters(TARGET_ID);
      expect(updatedCounters.upvotes).toBe(2);
      expect(updatedCounters.downvotes).toBe(0);
      expect(updatedCounters.netScore).toBe(2);
    });

    it('Phải ghi nhận ID vào tập hợp dirty registry khi có tương tác vote', async () => {
      await engine.executeVote(TARGET_ID, USER_1, 1);
      const dirty = await engine.getDirtyTargetIds();
      expect(dirty).toContain(TARGET_ID);

      await engine.clearDirtyTargetIds([TARGET_ID]);
      const emptyDirty = await engine.getDirtyTargetIds();
      expect(emptyDirty).not.toContain(TARGET_ID);
    });
  });

  describe('2. Background Flush Worker', () => {
    it('Phải xả dữ liệu dồn từ dirty registry vào repository khi chạy flushNow()', async () => {
      const space = await repo.createSpace({
        name: 'DevOps',
        slug: 'devops',
        creatorId: USER_1,
      });

      const thread = await repo.createThread({
        spaceId: space.id,
        authorId: USER_1,
        title: 'Thực thi Lua Script trong Redis',
        slug: 'thuc-thi-lua-script-trong-redis',
      });

      // Vote cho thread
      await engine.executeVote(thread.id, USER_2, 1);

      const worker = new VoteFlushWorker(engine, repo, { intervalMs: 1000 });
      const flushedCount = await worker.flushNow();
      expect(flushedCount).toBe(1);

      // Sau khi flush, dirty registry phải rỗng
      const remainingDirty = await engine.getDirtyTargetIds();
      expect(remainingDirty.length).toBe(0);

      // CSDL phải nhận được counters mới
      const updatedCounters = await repo.getThreadCounters(thread.id);
      expect(updatedCounters).not.toBeNull();
      expect(updatedCounters?.upvotes).toBe(1);
      expect(updatedCounters?.netScore).toBe(1);
      expect(updatedCounters?.hotScore).toBeGreaterThan(0);
    });
  });
});
