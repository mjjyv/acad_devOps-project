/**
 * Wilson Score Lower Bound Ranking Engine (95% Confidence Interval, z = 1.96).
 * Matches PostgreSQL calculate_wilson_score(p_upvotes, p_downvotes).
 */
export class WilsonScoreEngine {
  public static readonly Z = 1.96;
  private static readonly Z_SQUARED = 3.8416;

  public static computeWilsonScore(upvotes: number, downvotes: number): number {
    const safeUp = Math.max(0, upvotes);
    const safeDown = Math.max(0, downvotes);
    const n = safeUp + safeDown;
    if (n <= 0) return 0;

    const z = WilsonScoreEngine.Z;
    const z2 = WilsonScoreEngine.Z_SQUARED;
    const phat = safeUp / n;

    const numerator =
      phat + z2 / (2 * n) - z * Math.sqrt((phat * (1 - phat)) / n + z2 / (4 * n * n));
    const denominator = 1 + z2 / n;
    return Number((numerator / denominator).toFixed(4));
  }
}
