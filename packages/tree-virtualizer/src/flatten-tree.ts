import { FlatCommentItem } from '@acad/contracts';

export interface RawCommentNode {
  id: string;
  threadId: string;
  parentId?: string | null;
  path: string; // "0001", "0001.0001", etc.
  author: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    karmaScore?: number;
  };
  contentAst: any;
  upvotes: number;
  downvotes: number;
  netScore: number;
  childCount?: number;
  userVoteDirection?: 1 | -1 | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Thuật toán Trải phẳng Cây bình luận sang Mảng một chiều (Tree-to-Array Flattening)
 * Độ phức tạp thời gian: O(N) tuyến tính
 * Phục vụ hiển thị danh sách lớn với DOM ảo hóa (@tanstack/react-virtual)
 */
export function flattenCommentTree(
  rawNodes: RawCommentNode[],
  collapsedPathsSet: Set<string> = new Set<string>(),
): FlatCommentItem[] {
  const displayArray: FlatCommentItem[] = [];
  let skipPrefix: string | null = null;

  // Tạo map đếm con để gán hasChildren chính xác
  const pathPrefixCount = new Map<string, number>();
  for (const node of rawNodes) {
    const parentDotIndex = node.path.lastIndexOf('.');
    if (parentDotIndex !== -1) {
      const parentPath = node.path.substring(0, parentDotIndex);
      pathPrefixCount.set(parentPath, (pathPrefixCount.get(parentPath) || 0) + 1);
    }
  }

  for (const node of rawNodes) {
    // Bước 1: Bỏ qua nếu thuộc nhánh cha đang bị thu gọn
    if (skipPrefix !== null) {
      if (node.path.startsWith(skipPrefix)) {
        continue; // Bỏ qua không nạp vào mảng hiển thị
      } else {
        skipPrefix = null; // Đã ra khỏi nhánh bị thu gọn
      }
    }

    // Bước 2: Xác định độ sâu (Depth = số dấu chấm trong path)
    const depth = (node.path.match(/\./g) || []).length;
    const isCollapsed = collapsedPathsSet.has(node.path);
    const directChildren = pathPrefixCount.get(node.path) || 0;

    const item: FlatCommentItem = {
      id: node.id,
      threadId: node.threadId,
      parentId: node.parentId ?? null,
      path: node.path,
      depth,
      hasChildren: directChildren > 0 || (node.childCount ?? 0) > 0,
      childCount: directChildren || (node.childCount ?? 0),
      isCollapsed,
      visible: true,
      author: {
        id: node.author.id,
        username: node.author.username,
        avatarUrl: node.author.avatarUrl ?? null,
        karmaScore: node.author.karmaScore ?? 0,
      },
      contentAst: node.contentAst,
      upvotes: node.upvotes,
      downvotes: node.downvotes,
      netScore: node.netScore,
      userVoteDirection: node.userVoteDirection ?? null,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };

    displayArray.push(item);

    // Bước 3: Kích hoạt cờ chặn cho toàn bộ các nút con phía sau nếu nút này bị thu gọn
    if (isCollapsed) {
      skipPrefix = `${node.path}.`;
    }
  }

  return displayArray;
}
