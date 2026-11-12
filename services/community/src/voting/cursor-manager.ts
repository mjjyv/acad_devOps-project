/**
 * Base64URL Composite Keyset Cursor Manager (score:createdAtMs:uuid).
 */

export interface DecodedCursor {
  score: number;
  createdAtMs: number;
  id: string;
}

export class CursorManager {
  public static encode(score: number, createdAtMs: number, id: string): string {
    return Buffer.from(`${score}:${createdAtMs}:${id}`, 'utf8').toString('base64url');
  }

  public static decode(cursor: string): DecodedCursor | null {
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parts = decoded.split(':');
      if (parts.length !== 3) return null;

      const score = Number.parseFloat(parts[0] ?? '');
      const createdAtMs = Number.parseInt(parts[1] ?? '', 10);
      const id = parts[2] ?? '';

      if (Number.isNaN(score) || Number.isNaN(createdAtMs) || !id) {
        return null;
      }
      return { score, createdAtMs, id };
    } catch {
      return null;
    }
  }
}
