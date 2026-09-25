import { describe, expect, it } from 'vitest';
import { LtreePathGenerator } from '../src/comments/ltree-path-generator.js';

describe('Kiểm thử Thuật toán Sinh Đường dẫn Cây Bình luận (LtreePathGenerator Base36)', () => {
  it('Mã hóa token Base36 đúng chuẩn độ dài 4 ký tự với số 0 đệm đầu', () => {
    expect(LtreePathGenerator.encodeToken(1)).toBe('0001');
    expect(LtreePathGenerator.encodeToken(10)).toBe('000a');
    expect(LtreePathGenerator.encodeToken(35)).toBe('000z');
    expect(LtreePathGenerator.encodeToken(36)).toBe('0010');
    expect(LtreePathGenerator.encodeToken(1295)).toBe('00zz');
  });

  it('Giải mã token Base36 về số nguyên chính xác', () => {
    expect(LtreePathGenerator.decodeToken('0001')).toBe(1);
    expect(LtreePathGenerator.decodeToken('000a')).toBe(10);
    expect(LtreePathGenerator.decodeToken('0010')).toBe(36);
  });

  it('Sinh đường dẫn cho bình luận gốc (Root Comments - Depth 0)', () => {
    const root1 = LtreePathGenerator.generateNextPath(null, 0);
    expect(root1.path).toBe('0001');
    expect(root1.depth).toBe(0);

    const root2 = LtreePathGenerator.generateNextPath(null, 1);
    expect(root2.path).toBe('0002');
  });

  it('Sinh đường dẫn phân cấp cho bình luận con (Child Comments)', () => {
    // Bình luận con đầu tiên của root 0001
    const child1 = LtreePathGenerator.generateNextPath('0001', 0);
    expect(child1.path).toBe('0001.0001');
    expect(child1.depth).toBe(1);

    // Bình luận con thứ hai của root 0001
    const child2 = LtreePathGenerator.generateNextPath('0001', 1);
    expect(child2.path).toBe('0001.0002');

    // Bình luận cháu (Depth 2)
    const grandChild = LtreePathGenerator.generateNextPath('0001.0001', 0);
    expect(grandChild.path).toBe('0001.0001.0001');
    expect(grandChild.depth).toBe(2);
  });

  it('Giới hạn độ sâu tối đa 8 cấp: Khi chạm Depth 8, tự động chuyển đổi thành Flat Reply', () => {
    // Đường dẫn đã có 8 cấp: 1.2.3.4.5.6.7.8
    const maxDepthPath = '0001.0002.0003.0004.0005.0006.0007.0008';
    expect(maxDepthPath.split('.')).toHaveLength(8);

    const replyAtMax = LtreePathGenerator.generateNextPath(maxDepthPath, 0);
    expect(replyAtMax.isCappedAtMaxDepth).toBe(true);
    expect(replyAtMax.parentAuthorMentionNeeded).toBe(true);
    expect(replyAtMax.path).toBe(maxDepthPath); // Không phân nhánh thêm cấp 9
    expect(replyAtMax.depth).toBe(8);
  });
});
