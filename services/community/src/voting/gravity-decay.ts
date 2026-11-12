/**
 * Hacker News Gravity Decay Ranking Engine (G = 1.8).
 * Matches PostgreSQL calculate_hot_score(p_net_score, p_created_at, p_now).
 */
export class GravityDecayEngine {
  public static readonly GRAVITY = 1.8;
  public static readonly AGE_OFFSET_HOURS = 2.0;

  public static computeHotScore(
    netScore: number,
    createdAt: Date | string,
    now: Date = new Date(),
  ): number {
    const createdDate = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const diffMs = Math.max(0, now.getTime() - createdDate.getTime());
    const ageHours = diffMs / 3600000;
    const denominator =
      (ageHours + GravityDecayEngine.AGE_OFFSET_HOURS) ** GravityDecayEngine.GRAVITY;
    if (denominator === 0) return 0;
    return Number((netScore / denominator).toFixed(4));
  }
}
