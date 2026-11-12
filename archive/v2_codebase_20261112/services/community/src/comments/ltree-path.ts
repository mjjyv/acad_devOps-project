/**
 * @file ltree-path.ts
 * @description Materialized Path ltree Base36 Generator & Capped Depth 8 Manager.
 */

export const MAX_TREE_DEPTH = 8;
export const BASE36_CHUNK_LENGTH = 4;
export const MAX_CHILDREN_PER_NODE = 36 ** BASE36_CHUNK_LENGTH; // 1,679,616

/**
 * Mã hóa số tự nhiên thành chuỗi Base36 4 ký tự đệm số 0 phía trước
 * Ví dụ: 0 -> "0000", 35 -> "000z", 36 -> "0010"
 */
export function encodeBase36(num: number, length: number = BASE36_CHUNK_LENGTH): string {
  if (num < 0 || !Number.isInteger(num)) {
    throw new Error('Số thứ tự bình luận phải là số nguyên không âm');
  }
  if (num >= 36 ** length) {
    throw new Error(
      `Số thứ tự bình luận ${num} vượt quá giới hạn tối đa của ${length} ký tự Base36`,
    );
  }
  return num.toString(36).toLowerCase().padStart(length, '0');
}

/**
 * Giải mã chuỗi Base36 thành số nguyên
 */
export function decodeBase36(chunk: string): number {
  return parseInt(chunk, 36);
}

export interface ChildPathCalculationResult {
  path: string;
  depth: number;
  isCappedAtMaxDepth: boolean;
  parentAuthorMentionNeeded: boolean;
  parentAuthorUsername?: string | undefined;
  mentionPrefix?: string | undefined;
}

export class LtreePathManager {
  /**
   * Sinh đường dẫn gốc (Root comment: depth = 1)
   */
  public static calculateRootPath(rootIndex: number): { path: string; depth: number } {
    return {
      path: encodeBase36(rootIndex),
      depth: 1,
    };
  }

  /**
   * Tính toán đường dẫn cho bình luận con với cơ chế Capped Depth 8
   * Nếu parentDepth < 8: Tăng 1 bậc depth và nối thêm Base36 chunk vào path
   * Nếu parentDepth >= 8: Giữ nguyên path và depth = 8, chuyển sang chế độ Flat Reply kèm @mention
   */
  public static calculateChildPath(
    parentPath: string,
    parentDepth: number,
    childIndex: number,
    parentAuthorUsername?: string,
  ): ChildPathCalculationResult {
    if (parentDepth < MAX_TREE_DEPTH) {
      const chunk = encodeBase36(childIndex);
      return {
        path: `${parentPath}.${chunk}`,
        depth: parentDepth + 1,
        isCappedAtMaxDepth: false,
        parentAuthorMentionNeeded: false,
      };
    }

    // Đạt hoặc vượt ngưỡng MAX_DEPTH (Capped Depth 8)
    // Giữ nguyên path tại bậc 8, gán cờ flat reply kèm @mention tác giả
    return {
      path: parentPath,
      depth: MAX_TREE_DEPTH,
      isCappedAtMaxDepth: true,
      parentAuthorMentionNeeded: true,
      parentAuthorUsername,
      mentionPrefix: parentAuthorUsername ? `@${parentAuthorUsername} ` : undefined,
    };
  }

  /**
   * Kiểm tra tính hợp lệ của đường dẫn ltree
   */
  public static isValidLtreePath(path: string): boolean {
    return /^[0-9a-z]{4}(\.[0-9a-z]{4})*$/.test(path);
  }
}
