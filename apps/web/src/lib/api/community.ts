import type {
  FlatCommentItem,
  Space,
  SpaceFlair,
  ThreadDetail,
  ThreadSummary,
} from '@acad/contracts';
import { getApiClient } from '@/lib/api/client';

export interface SpaceWithFlairs {
  space: Space;
  flairs: SpaceFlair[];
}

export interface CommentTreeData {
  items: FlatCommentItem[];
  totalCount: number;
}

export class CommunityApi {
  /**
   * Lấy danh sách các Không gian thảo luận (Spaces)
   */
  public static async getSpaces(limit = 20, offset = 0): Promise<Space[]> {
    const client = getApiClient();
    const res = await client.request(`/spaces?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
    if (!res.ok) {
      throw new Error(`Lỗi tải danh sách Space: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.spaces || [];
  }

  /**
   * Lấy thông tin chi tiết một Không gian thảo luận theo slug
   */
  public static async getSpace(slug: string): Promise<SpaceWithFlairs> {
    const client = getApiClient();
    const res = await client.request(`/spaces/${encodeURIComponent(slug)}`, {
      method: 'GET',
    });
    if (!res.ok) {
      throw new Error(`Không tìm thấy không gian s/${slug} (HTTP ${res.status})`);
    }
    return await res.json();
  }

  /**
   * Tham gia một Không gian thảo luận
   */
  public static async joinSpace(slug: string): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/spaces/${encodeURIComponent(slug)}/join`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể tham gia không gian này');
    }
  }

  /**
   * Rời khỏi một Không gian thảo luận
   */
  public static async leaveSpace(slug: string): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/spaces/${encodeURIComponent(slug)}/leave`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể rời không gian');
    }
  }

  /**
   * Lấy danh sách bài viết thuộc một Không gian thảo luận
   */
  public static async getSpaceThreads(
    slug: string,
    sort: 'hot' | 'new' | 'top' = 'hot',
    limit = 25,
  ): Promise<ThreadSummary[]> {
    const client = getApiClient();
    const res = await client.request(
      `/feeds/${sort}?spaceSlug=${encodeURIComponent(slug)}&limit=${limit}`,
      { method: 'GET' },
    );
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.items || [];
  }

  /**
   * Lấy chi tiết bài viết và nội dung đầy đủ
   */
  public static async getThread(id: string): Promise<ThreadDetail> {
    const client = getApiClient();
    const res = await client.request(`/threads/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
    if (!res.ok) {
      throw new Error(`Không tìm thấy bài viết (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.thread;
  }

  /**
   * Tạo bài viết mới trong Không gian
   */
  public static async createThread(
    spaceSlug: string,
    payload: {
      title: string;
      contentText?: string;
      linkUrl?: string;
      flairId?: string;
    },
  ): Promise<ThreadSummary> {
    const client = getApiClient();
    const res = await client.request(`/spaces/${encodeURIComponent(spaceSlug)}/threads`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể tạo bài viết');
    }
    return await res.json();
  }

  /**
   * Bỏ phiếu bầu cho bài viết (Upvote 1, Downvote -1)
   */
  public static async voteThread(
    threadId: string,
    direction: 1 | -1,
  ): Promise<{ netScore: number; userVote: number }> {
    const client = getApiClient();
    const res = await client.request(`/threads/${encodeURIComponent(threadId)}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      throw new Error('Lỗi cập nhật phiếu bầu');
    }
    return await res.json();
  }

  /**
   * Lấy toàn bộ cây bình luận đa tầng ltree của bài viết
   */
  public static async getThreadComments(threadId: string): Promise<CommentTreeData> {
    const client = getApiClient();
    const res = await client.request(`/threads/${encodeURIComponent(threadId)}/comments`, {
      method: 'GET',
    });
    if (!res.ok) {
      return { items: [], totalCount: 0 };
    }
    return await res.json();
  }

  /**
   * Gửi bình luận (cấp gốc hoặc trả lời con ltree)
   */
  public static async createComment(
    threadId: string,
    content: string,
    parentId?: string,
    parentAuthorUsername?: string,
  ): Promise<FlatCommentItem> {
    const client = getApiClient();
    const res = await client.request(`/threads/${encodeURIComponent(threadId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        parentId,
        parentAuthorUsername,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể gửi bình luận');
    }
    const data = await res.json();
    return data.comment;
  }

  /**
   * Bỏ phiếu bầu cho bình luận
   */
  public static async voteComment(
    commentId: string,
    direction: 1 | -1,
  ): Promise<{ netScore: number; userVote: number }> {
    const client = getApiClient();
    const res = await client.request(`/comments/${encodeURIComponent(commentId)}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      throw new Error('Lỗi cập nhật phiếu bầu bình luận');
    }
    return await res.json();
  }
}
