/**
 * @file gravity-decay.ts
 * @description Hacker News Gravity Decay Algorithm for "Hot" Feed Ranking.
 * Formula: HotScore = NetScore / ((AgeHours + 2.0) ^ 1.8)
 */

export class GravityDecayEngine {
  public static readonly GRAVITY = 1.8;
  public static readonly TIME_OFFSET_HOURS = 2.0;

  /**
   * Tính toán Hot Score cho một bài viết dựa trên Net Score và thời điểm tạo.
   * @param netScore Điểm số biểu quyết ròng (upvotes - downvotes)
   * @param createdAt Thời điểm tạo bài viết
   * @param now Thời điểm tham chiếu (mặc định là hiện tại)
   */
  public static computeHotScore(netScore: number, createdAt: Date, now: Date = new Date()): number {
    const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
    const ageHours = ageMs / (1000 * 60 * 60);

    const denominator =
      (ageHours + GravityDecayEngine.TIME_OFFSET_HOURS) ** GravityDecayEngine.GRAVITY;
    if (denominator === 0) return 0;

    const rawScore = netScore / denominator;
    return Math.round(rawScore * 10000) / 10000;
  }
}
