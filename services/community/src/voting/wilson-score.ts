/**
 * @file wilson-score.ts
 * @description Wilson Score Confidence Interval Algorithm for "Best" Feed Ranking.
 * Calculates the lower bound of the 95% Wilson confidence interval for a Bernoulli parameter.
 */

export class WilsonScoreEngine {
  // z = 1.96 tương ứng với độ tin cậy 95% (alpha = 0.05)
  public static readonly Z = 1.96;

  /**
   * Tính cận dưới Wilson Score cho tỷ lệ upvote
   * @param upvotes Số lượng phiếu thuận (>= 0)
   * @param downvotes Số lượng phiếu nghịch (>= 0)
   */
  public static computeWilsonScore(upvotes: number, downvotes: number): number {
    const u = Math.max(0, upvotes);
    const d = Math.max(0, downvotes);
    const n = u + d;

    if (n === 0) {
      return 0;
    }

    const z = WilsonScoreEngine.Z;
    const z2 = z * z;
    const p = u / n;

    const numerator = p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
    const denominator = 1 + z2 / n;

    const score = numerator / denominator;
    return Math.round(score * 10000) / 10000;
  }
}
