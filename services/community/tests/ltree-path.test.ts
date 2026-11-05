import { describe, expect, it } from 'vitest';
import {
  decodeBase36,
  encodeBase36,
  LtreePathManager,
  MAX_CHILDREN_PER_NODE,
  MAX_TREE_DEPTH,
} from '../src/comments/ltree-path.js';

describe('Động cơ Cây Bình Luận ltree Base36 & Capped Depth (@acad/community-service)', () => {
  describe('1. Bộ mã hóa Base36 4 ký tự', () => {
    it('Phải mã hóa chính xác các số nguyên tự nhiên thành chuỗi 4 ký tự Base36 đệm số 0', () => {
      expect(encodeBase36(0)).toBe('0000');
      expect(encodeBase36(1)).toBe('0001');
      expect(encodeBase36(9)).toBe('0009');
      expect(encodeBase36(10)).toBe('000a');
      expect(encodeBase36(35)).toBe('000z');
      expect(encodeBase36(36)).toBe('0010');
      expect(encodeBase36(1295)).toBe('00zz');
      expect(encodeBase36(MAX_CHILDREN_PER_NODE - 1)).toBe('zzzz');
    });

    it('Phải giải mã chính xác chuỗi Base36 ngược về số nguyên', () => {
      expect(decodeBase36('0000')).toBe(0);
      expect(decodeBase36('0001')).toBe(1);
      expect(decodeBase36('000z')).toBe(35);
      expect(decodeBase36('0010')).toBe(36);
      expect(decodeBase36('zzzz')).toBe(1679615);
    });

    it('Phải từ chối số âm hoặc số vượt quá giới hạn 4 ký tự (1.67 triệu)', () => {
      expect(() => encodeBase36(-1)).toThrow();
      expect(() => encodeBase36(MAX_CHILDREN_PER_NODE)).toThrow();
    });
  });

  describe('2. Quản lý đường dẫn phân cấp ltree & Capped Depth 8', () => {
    it('Phải sinh đường dẫn gốc (Root Path) chính xác tại depth = 1', () => {
      const root1 = LtreePathManager.calculateRootPath(0);
      expect(root1.path).toBe('0000');
      expect(root1.depth).toBe(1);

      const root2 = LtreePathManager.calculateRootPath(1);
      expect(root2.path).toBe('0001');
      expect(root2.depth).toBe(1);
    });

    it('Phải tăng bậc depth và nối dài đường dẫn khi depth < 8', () => {
      const child1 = LtreePathManager.calculateChildPath('0001', 1, 0);
      expect(child1.path).toBe('0001.0000');
      expect(child1.depth).toBe(2);
      expect(child1.isCappedAtMaxDepth).toBe(false);

      const child2 = LtreePathManager.calculateChildPath('0001.0000', 2, 5);
      expect(child2.path).toBe('0001.0000.0005');
      expect(child2.depth).toBe(3);
      expect(child2.isCappedAtMaxDepth).toBe(false);
    });

    it('Capped Depth 8: Khi đạt độ sâu cấp 8, tự động kích hoạt Flat Reply kèm @mention', () => {
      // Giả lập bình luận cha đang ở cấp 8
      const pathLevel8 = '0001.0000.0001.0002.0003.0004.0005.0006';
      const childAtLevel9 = LtreePathManager.calculateChildPath(
        pathLevel8,
        MAX_TREE_DEPTH,
        1,
        'linus_torvalds',
      );

      // Đường dẫn không được nối dài thêm
      expect(childAtLevel9.path).toBe(pathLevel8);
      // Độ sâu bị chốt cứng ở mức 8
      expect(childAtLevel9.depth).toBe(MAX_TREE_DEPTH);
      // Cờ Capped Depth được bật
      expect(childAtLevel9.isCappedAtMaxDepth).toBe(true);
      expect(childAtLevel9.parentAuthorMentionNeeded).toBe(true);
      expect(childAtLevel9.parentAuthorUsername).toBe('linus_torvalds');
      expect(childAtLevel9.mentionPrefix).toBe('@linus_torvalds ');
    });

    it('Kiểm tra regex xác thực tính hợp lệ của đường dẫn ltree', () => {
      expect(LtreePathManager.isValidLtreePath('0001')).toBe(true);
      expect(LtreePathManager.isValidLtreePath('0001.000a.001z')).toBe(true);
      expect(LtreePathManager.isValidLtreePath('001')).toBe(false); // Chỉ có 3 ký tự
      expect(LtreePathManager.isValidLtreePath('0001..0002')).toBe(false); // Hai dấu chấm liên tiếp
      expect(LtreePathManager.isValidLtreePath('0001.000@')).toBe(false); // Ký tự đặc biệt không hợp lệ
    });
  });
});
