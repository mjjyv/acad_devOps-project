// ============================================================================
// THUẬT TOÁN TÍNH ĐIỂM THỊNH HÀNH THEO THỜI GIAN (GRAVITY DECAY FORMULA)
// HotScore = NetScore / ((AgeHours + 2) ^ 1.8)
// ============================================================================

export class GravityDecayEngine {
  public static readonly GRAVITY = 1.8;
  public static readonly TIME_OFFSET_HOURS = 2.0;

  /**
   * Tính toán Hot Score cho một bài viết dựa trên Net Score và thời gian tạo
   */
  public static computeHotScore(
    netScore: number,
    createdAt: Date,
    now: Date = new Date(),
  ): number {
    const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
    const ageHours = ageMs / (1000 * 60 * 60);

    const denominator = Math.pow(ageHours + this.TIME_OFFSET_HOURS, this.GRAVITY);
    if (denominator === 0) return 0;

    const rawScore = netScore / denominator;
    // Làm tròn đến 4 chữ số thập phân
    return Math.round(rawScore * 10000) / 10000;
  }
}
