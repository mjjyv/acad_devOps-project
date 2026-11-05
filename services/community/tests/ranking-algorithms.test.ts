import { describe, expect, it } from 'vitest';
import { CursorManager } from '../src/voting/cursor-manager.js';
import { GravityDecayEngine } from '../src/voting/gravity-decay.js';
import { WilsonScoreEngine } from '../src/voting/wilson-score.js';

describe('Động Cơ Thuật Toán Xếp Hạng & Con Trỏ Phân Trang (Ranking & Cursors)', () => {
  describe('1. Thuật Toán Hacker News Gravity Decay Engine', () => {
    it('Phải tính HotScore cao hơn cho bài viết mới hơn khi có cùng NetScore', () => {
      const now = new Date('2026-11-06T12:00:00Z');
      const postNew = new Date('2026-11-06T11:00:00Z'); // 1 giờ trước
      const postOld = new Date('2026-11-06T00:00:00Z'); // 12 giờ trước

      const scoreNew = GravityDecayEngine.computeHotScore(100, postNew, now);
      const scoreOld = GravityDecayEngine.computeHotScore(100, postOld, now);

      expect(scoreNew).toBeGreaterThan(scoreOld);
      expect(scoreNew).toBeCloseTo(13.84, 1);
      expect(scoreOld).toBeCloseTo(0.86, 1);
    });

    it('Phải trả về 0 hoặc điểm âm khi NetScore <= 0', () => {
      const now = new Date();
      const scoreZero = GravityDecayEngine.computeHotScore(0, now, now);
      const scoreNegative = GravityDecayEngine.computeHotScore(-10, now, now);

      expect(scoreZero).toBe(0);
      expect(scoreNegative).toBeLessThan(0);
    });
  });

  describe('2. Thuật Toán Wilson Score Confidence Interval', () => {
    it('Phải trả về 0 khi bài viết chưa có lượt vote nào (n = 0)', () => {
      const score = WilsonScoreEngine.computeWilsonScore(0, 0);
      expect(score).toBe(0);
    });

    it('Phải ưu tiên bài viết có lượng mẫu lớn (100/100 upvotes) cao hơn bài chỉ có 1/1 upvote', () => {
      const scoreFewVotes = WilsonScoreEngine.computeWilsonScore(1, 0); // 1 vote, 100% up
      const scoreManyVotes = WilsonScoreEngine.computeWilsonScore(100, 0); // 100 votes, 100% up

      expect(scoreManyVotes).toBeGreaterThan(scoreFewVotes);
      // Với 1 vote, cận dưới khoảng 0.2
      expect(scoreFewVotes).toBeLessThan(0.3);
      // Với 100 votes, cận dưới khoảng > 0.95
      expect(scoreManyVotes).toBeGreaterThan(0.95);
    });

    it('Phải xếp hạng bài viết 95/100 (95%) cao hơn bài viết 50/100 (50%)', () => {
      const scoreHigh = WilsonScoreEngine.computeWilsonScore(95, 5);
      const scoreLow = WilsonScoreEngine.computeWilsonScore(50, 50);

      expect(scoreHigh).toBeGreaterThan(scoreLow);
      expect(scoreHigh).toBeGreaterThan(0.85);
      expect(scoreLow).toBeCloseTo(0.4, 1);
    });
  });

  describe('3. Keyset Cursor Manager', () => {
    it('Phải mã hóa và giải mã chính xác chuỗi con trỏ Base64URL', () => {
      const score = 15.6789;
      const createdAtMs = 1762412400000;
      const id = '8d2c2d4a-5f11-4763-9d10-8b170e9a1111';

      const encoded = CursorManager.encode(score, createdAtMs, id);
      expect(encoded).toBeTruthy();
      expect(encoded).not.toContain('+');
      expect(encoded).not.toContain('/');

      const decoded = CursorManager.decode(encoded);
      expect(decoded).not.toBeNull();
      expect(decoded?.score).toBe(score);
      expect(decoded?.createdAtMs).toBe(createdAtMs);
      expect(decoded?.id).toBe(id);
    });

    it('Phải trả về null khi con trỏ sai định dạng hoặc bị giả mạo', () => {
      expect(CursorManager.decode('')).toBeNull();
      expect(CursorManager.decode('invalid-cursor-string')).toBeNull();
      expect(CursorManager.decode(Buffer.from('score-only').toString('base64url'))).toBeNull();
    });
  });
});
