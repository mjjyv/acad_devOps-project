import { beforeEach, describe, expect, it } from 'vitest';
import { AtomicVoteEngine } from '../src/voting/lua-vote-engine.js';

describe('Kiểm thử Động cơ Bầu chọn Nguyên tử (Atomic Vote Engine / Lua Equivalence)', () => {
  let engine: AtomicVoteEngine;
  const threadId = 'a1b2c3d4-1111-2222-3333-444455556666';
  const user1 = 'user-uuid-1';
  const user2 = 'user-uuid-2';

  beforeEach(() => {
    engine = new AtomicVoteEngine();
  });

  it('Bầu chọn mới: Upvote làm tăng upvotes và netScore lên 1', () => {
    const res = engine.executeVote(threadId, user1, 1);

    expect(res.finalDirection).toBe(1);
    expect(res.counters.upvotes).toBe(1);
    expect(res.counters.downvotes).toBe(0);
    expect(res.counters.netScore).toBe(1);

    // Xác nhận đã gắn cờ vào dirty registry
    const dirty = engine.popDirtyIds();
    expect(dirty).toContain(threadId);
  });

  it('Hủy vote (Unvote): Người dùng bấm lại nút cũ sẽ hoàn trả trạng thái về 0', () => {
    // Lần 1: Upvote
    engine.executeVote(threadId, user1, 1);

    // Lần 2: Bấm lại Upvote -> Hủy vote
    const resUnvote = engine.executeVote(threadId, user1, 1);
    expect(resUnvote.finalDirection).toBe(0);
    expect(resUnvote.counters.upvotes).toBe(0);
    expect(resUnvote.counters.netScore).toBe(0);
    expect(engine.getUserVote(threadId, user1)).toBe(0);
  });

  it('Đảo chiều vote (Reverse Vote): Chuyển từ Downvote (-1) sang Upvote (+1) tăng netScore lên 2 điểm', () => {
    // Ban đầu: Downvote
    engine.executeVote(threadId, user1, -1);
    expect(engine.getCounters(threadId).netScore).toBe(-1);
    expect(engine.getCounters(threadId).downvotes).toBe(1);

    // Đảo chiều: Bấm Upvote
    const resReverse = engine.executeVote(threadId, user1, 1);
    expect(resReverse.finalDirection).toBe(1);
    expect(resReverse.counters.upvotes).toBe(1);
    expect(resReverse.counters.downvotes).toBe(0);
    expect(resReverse.counters.netScore).toBe(1); // Từ -1 tăng lên +1 (biến thiên +2)
  });

  it('Nhiều người dùng tương tác song song: Tính toán bộ đếm chính xác', () => {
    // User 1 Upvote
    engine.executeVote(threadId, user1, 1);
    // User 2 Downvote
    engine.executeVote(threadId, user2, -1);

    const counters = engine.getCounters(threadId);
    expect(counters.upvotes).toBe(1);
    expect(counters.downvotes).toBe(1);
    expect(counters.netScore).toBe(0);
  });
});
