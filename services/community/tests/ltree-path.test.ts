import { describe, expect, it } from 'vitest';
import { decodeBase36, encodeBase36, LtreePathManager, MAX_TREE_DEPTH } from '../src/index.js';

describe('@acad/community-service ltree Base36 & Capped Depth 8', () => {
  it('encodes and decodes 4-character padded Base36 indices cleanly', () => {
    expect(encodeBase36(0)).toBe('0000');
    expect(encodeBase36(35)).toBe('000z');
    expect(encodeBase36(36)).toBe('0010');
    expect(encodeBase36(1679615)).toBe('zzzz');
    expect(decodeBase36('0010')).toBe(36);
    expect(() => encodeBase36(-1)).toThrow();
    expect(() => encodeBase36(1679616)).toThrow();
  });

  it('caps depth at 8 and injects @mention flat reply metadata', () => {
    const root = LtreePathManager.calculateRootPath(0);
    expect(root).toEqual({ path: '0000', depth: 1 });
    expect(LtreePathManager.isValidLtreePath(root.path)).toBe(true);

    const depth7Child = LtreePathManager.calculateChildPath(
      '0000.0000.0000.0000.0000.0000.0000',
      7,
      1,
      'alice',
    );
    expect(depth7Child.depth).toBe(MAX_TREE_DEPTH);
    expect(depth7Child.isCappedAtMaxDepth).toBe(false);
    expect(depth7Child.path).toBe('0000.0000.0000.0000.0000.0000.0000.0001');

    const capped = LtreePathManager.calculateChildPath(depth7Child.path, 8, 0, 'bob');
    expect(capped.depth).toBe(8);
    expect(capped.path).toBe(depth7Child.path);
    expect(capped.isCappedAtMaxDepth).toBe(true);
    expect(capped.parentAuthorMentionNeeded).toBe(true);
    expect(capped.mentionPrefix).toBe('@bob ');
  });
});
