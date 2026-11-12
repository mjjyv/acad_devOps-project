/**
 * @file cursor-manager.ts
 * @description Keyset Cursor Encoder/Decoder for Infinite Feeds.
 * Format: base64url(score : createdAtMs : itemId)
 */

export interface DecodedCursor {
  score: number;
  createdAtMs: number;
  id: string;
}

export class CursorManager {
  /**
   * Mã hóa con trỏ phân trang sang chuỗi Base64URL
   */
  public static encode(score: number, createdAtMs: number, id: string): string {
    const raw = `${score}:${createdAtMs}:${id}`;
    return Buffer.from(raw, 'utf-8').toString('base64url');
  }

  /**
   * Giải mã chuỗi con trỏ Base64URL
   * Trả về null nếu định dạng không hợp lệ
   */
  public static decode(cursorStr: string): DecodedCursor | null {
    if (!cursorStr || typeof cursorStr !== 'string') {
      return null;
    }

    try {
      const raw = Buffer.from(cursorStr, 'base64url').toString('utf-8');
      const parts = raw.split(':');
      if (parts.length !== 3) {
        return null;
      }

      const score = parseFloat(parts[0] ?? '');
      const createdAtMs = parseInt(parts[1] ?? '', 10);
      const id = parts[2];

      if (Number.isNaN(score) || Number.isNaN(createdAtMs) || !id) {
        return null;
      }

      return { score, createdAtMs, id };
    } catch {
      return null;
    }
  }
}
