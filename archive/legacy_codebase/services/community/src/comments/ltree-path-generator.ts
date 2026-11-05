// ============================================================================
// THUẬT TOÁN SINH ĐƯỜNG DẪN PHÂN CẤP LTREE THEO CHUẨN BASE36
// Định dạng: 4 ký tự mỗi cấp, ngăn cách bởi dấu chấm (e.g., "0001.000a.0003")
// ============================================================================

export interface GeneratedPathResult {
  path: string;
  depth: number;
  isCappedAtMaxDepth: boolean;
  parentAuthorMentionNeeded?: boolean;
}

export class LtreePathGenerator {
  public static readonly MAX_DEPTH = 8;
  public static readonly TOKEN_LENGTH = 4;

  /**
   * Chuyển đổi số nguyên thành chuỗi Base36 có độ dài cố định 4 ký tự (0-padded)
   * Ví dụ: 1 -> "0001", 10 -> "000a", 35 -> "000z", 36 -> "0010"
   */
  public static encodeToken(index: number): string {
    if (index < 1) {
      throw new Error('Chỉ số token phải lớn hơn hoặc bằng 1');
    }
    const base36 = index.toString(36).toLowerCase();
    if (base36.length > this.TOKEN_LENGTH) {
      throw new Error(`Chỉ số ${index} vượt quá giới hạn 4 ký tự Base36 (tối đa 1.679.615 nút con)`);
    }
    return base36.padStart(this.TOKEN_LENGTH, '0');
  }

  /**
   * Giải mã token 4 ký tự Base36 về số nguyên
   */
  public static decodeToken(token: string): number {
    return parseInt(token, 36);
  }

  /**
   * Sinh đường dẫn mới cho bình luận
   * @param parentPath Đường dẫn của bình luận cha (null nếu là bình luận gốc cấp 0)
   * @param currentMaxChildIndex Chỉ số lớn nhất hiện tại của các bình luận con trực tiếp (0 nếu chưa có)
   */
  public static generateNextPath(
    parentPath: string | null | undefined,
    currentMaxChildIndex: number = 0,
  ): GeneratedPathResult {
    const nextToken = this.encodeToken(currentMaxChildIndex + 1);

    // Trường hợp 1: Bình luận gốc (Depth = 0)
    if (!parentPath) {
      return {
        path: nextToken,
        depth: 0,
        isCappedAtMaxDepth: false,
      };
    }

    const currentDepth = parentPath.split('.').length;

    // Trường hợp 2: Vượt quá giới hạn độ sâu tối đa (Depth >= 8)
    // Tự động chuyển đổi thành Flat Reply ở cấp 8 (không phân nhánh sâu thêm)
    if (currentDepth >= this.MAX_DEPTH) {
      return {
        path: parentPath, // Giữ nguyên đường dẫn cha ở cấp 8
        depth: this.MAX_DEPTH,
        isCappedAtMaxDepth: true,
        parentAuthorMentionNeeded: true,
      };
    }

    // Trường hợp 3: Phân nhánh bình thường
    const newPath = `${parentPath}.${nextToken}`;
    return {
      path: newPath,
      depth: currentDepth, // 1-indexed for child depth
      isCappedAtMaxDepth: false,
    };
  }
}
