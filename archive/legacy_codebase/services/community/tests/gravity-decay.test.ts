import { describe, expect, it } from 'vitest';
import { GravityDecayEngine } from '../src/voting/gravity-decay.js';

describe('Kiểm thử Thuật toán Tính điểm Thịnh hành (Gravity Decay)', () => {
  it('Bài viết mới tạo có cùng NetScore sẽ có điểm HotScore cao hơn bài viết cũ', () => {
    const now = new Date('2026-09-25T12:00:00Z');
    const createdJustNow = new Date('2026-09-25T11:50:00Z'); // 10 phút trước
    const created12HoursAgo = new Date('2026-09-25T00:00:00Z'); // 12 tiếng trước
    const created2DaysAgo = new Date('2026-09-23T12:00:00Z'); // 48 tiếng trước

    const scoreNew = GravityDecayEngine.computeHotScore(100, createdJustNow, now);
    const score12h = GravityDecayEngine.computeHotScore(100, created12HoursAgo, now);
    const score2d = GravityDecayEngine.computeHotScore(100, created2DaysAgo, now);

    // Điểm suy giảm mạnh theo thời gian
    expect(scoreNew).toBeGreaterThan(score12h);
    expect(score12h).toBeGreaterThan(score2d);
  });

  it('Bài viết điểm cao hơn trong cùng thời điểm sẽ có HotScore cao hơn', () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 tiếng trước

    const scoreHigh = GravityDecayEngine.computeHotScore(500, createdAt, now);
    const scoreLow = GravityDecayEngine.computeHotScore(50, createdAt, now);

    expect(scoreHigh).toBeGreaterThan(scoreLow);
    expect(scoreHigh / scoreLow).toBeCloseTo(10, 1);
  });
});
