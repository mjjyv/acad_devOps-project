import { describe, expect, it } from 'vitest';
import { flattenCommentTree, RawCommentNode } from '../src/flatten-tree.js';

describe('Kiểm thử Thuật toán Trải phẳng Cây Bình luận (Tree-to-Array Flattening)', () => {
  const dummyAuthor = { id: 'a1', username: 'author1', karmaScore: 10 };
  const dummyAst = { type: 'doc', content: [{ type: 'paragraph', text: 'Hello' }] };
  const now = new Date().toISOString();

  // Tạo cây phân cấp 3 tầng:
  // Root 1 (0001)
  //   ├── Child 1.1 (0001.0001)
  //   │     └── Grandchild 1.1.1 (0001.0001.0001)
  //   └── Child 1.2 (0001.0002)
  // Root 2 (0002)
  const mockNodes: RawCommentNode[] = [
    {
      id: 'c1',
      threadId: 't1',
      path: '0001',
      author: dummyAuthor,
      contentAst: dummyAst,
      upvotes: 5,
      downvotes: 0,
      netScore: 5,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c1-1',
      threadId: 't1',
      path: '0001.0001',
      author: dummyAuthor,
      contentAst: dummyAst,
      upvotes: 2,
      downvotes: 0,
      netScore: 2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c1-1-1',
      threadId: 't1',
      path: '0001.0001.0001',
      author: dummyAuthor,
      contentAst: dummyAst,
      upvotes: 1,
      downvotes: 0,
      netScore: 1,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c1-2',
      threadId: 't1',
      path: '0001.0002',
      author: dummyAuthor,
      contentAst: dummyAst,
      upvotes: 0,
      downvotes: 0,
      netScore: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c2',
      threadId: 't1',
      path: '0002',
      author: dummyAuthor,
      contentAst: dummyAst,
      upvotes: 3,
      downvotes: 0,
      netScore: 3,
      createdAt: now,
      updatedAt: now,
    },
  ];

  it('Trải phẳng toàn bộ cây khi không có nhánh nào bị thu gọn', () => {
    const flattened = flattenCommentTree(mockNodes);

    expect(flattened).toHaveLength(5);
    expect(flattened[0].id).toBe('c1');
    expect(flattened[0].depth).toBe(0);
    expect(flattened[0].hasChildren).toBe(true);
    expect(flattened[0].childCount).toBe(2); // c1-1 và c1-2

    expect(flattened[1].id).toBe('c1-1');
    expect(flattened[1].depth).toBe(1);
    expect(flattened[1].hasChildren).toBe(true);

    expect(flattened[2].id).toBe('c1-1-1');
    expect(flattened[2].depth).toBe(2);
    expect(flattened[2].hasChildren).toBe(false);

    expect(flattened[3].id).toBe('c1-2');
    expect(flattened[3].depth).toBe(1);

    expect(flattened[4].id).toBe('c2');
    expect(flattened[4].depth).toBe(0);
  });

  it('Thu gọn nhánh cha (Collapse c1): Ẩn toàn bộ con và cháu của c1, giữ lại c2', () => {
    // Thu gọn nút "0001"
    const collapsedSet = new Set(['0001']);
    const flattened = flattenCommentTree(mockNodes, collapsedSet);

    // Chỉ còn c1 (ở trạng thái isCollapsed = true) và c2
    expect(flattened).toHaveLength(2);
    expect(flattened[0].id).toBe('c1');
    expect(flattened[0].isCollapsed).toBe(true);
    expect(flattened[1].id).toBe('c2');
    expect(flattened[1].isCollapsed).toBe(false);
  });

  it('Thu gọn nhánh con trung gian (Collapse c1-1): Ẩn cháu c1-1-1, giữ c1-2 và c2', () => {
    // Thu gọn nút "0001.0001"
    const collapsedSet = new Set(['0001.0001']);
    const flattened = flattenCommentTree(mockNodes, collapsedSet);

    expect(flattened).toHaveLength(4);
    expect(flattened.map((f) => f.id)).toEqual(['c1', 'c1-1', 'c1-2', 'c2']);
    expect(flattened[1].id).toBe('c1-1');
    expect(flattened[1].isCollapsed).toBe(true);
  });
});
