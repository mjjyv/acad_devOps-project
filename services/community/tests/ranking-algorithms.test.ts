import { describe, expect, it } from 'vitest';
import { CursorManager, GravityDecayEngine, WilsonScoreEngine } from '../src/index.js';

describe('@acad/community-service Gravity Decay, Wilson Score & CursorManager', () => {
  it('computes Hacker News Gravity Decay scores matching SQL formula', () => {
    const now = new Date('2026-11-12T12:00:00Z');
    const created2hAgo = new Date('2026-11-12T10:00:00Z');
    // 10 / (2 + 2)^1.8 = 10 / 4^1.8 = 10 / 12.1257 = 0.8247
    const score = GravityDecayEngine.computeHotScore(10, created2hAgo, now);
    expect(score).toBeCloseTo(0.8247, 3);

    const older = new Date('2026-11-12T00:00:00Z');
    expect(GravityDecayEngine.computeHotScore(10, older, now)).toBeLessThan(score);
  });

  it('computes Wilson lower bound score accurately', () => {
    expect(WilsonScoreEngine.computeWilsonScore(0, 0)).toBe(0);
    const highVotes = WilsonScoreEngine.computeWilsonScore(95, 5);
    const smallVotes = WilsonScoreEngine.computeWilsonScore(1, 0);
    expect(highVotes).toBeGreaterThan(smallVotes);
  });

  it('encodes and decodes Base64URL composite cursors safely', () => {
    const cursor = CursorManager.encode(
      12.3456,
      1794474000000,
      'c0000000-0000-0000-0000-000000000001',
    );
    const decoded = CursorManager.decode(cursor);
    expect(decoded).toEqual({
      score: 12.3456,
      createdAtMs: 1794474000000,
      id: 'c0000000-0000-0000-0000-000000000001',
    });
    expect(CursorManager.decode('invalid-cursor')).toBeNull();
  });
});
