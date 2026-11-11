import type {
  CreateSpaceInput,
  FlatCommentItem,
  PublicUserProfile,
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

export interface FeedPageResult {
  items: ThreadSummary[];
  nextCursor: string | null;
  hasMore: boolean;
  forbidden?: boolean;
}

export type FeedSortOption = 'hot' | 'new' | 'top' | 'best';
export type FeedTimeOption = 'day' | 'week' | 'month' | 'year' | 'all';

export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiHttpError';
  }
}

export class CommunityApi {
  /**
   * Lấy danh sách các Không gian thảo luận (Spaces)
   */
  public static async getSpaces(limit = 20, offset = 0): Promise<Space[]> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/spaces?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
    if (!res.ok) {
      throw new ApiHttpError(res.status, `Lỗi tải danh sách Space: HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.spaces || [];
  }

  /**
   * Tạo mới Không gian thảo luận
   */
  public static async createSpace(input: CreateSpaceInput): Promise<Space> {
    const client = getApiClient();
    const res = await client.request('/api/v1/spaces', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Không thể tạo không gian mới');
    }
    return await res.json();
  }

  /**
   * Lấy thông tin chi tiết một Không gian thảo luận kèm danh sách Flairs thật
   */
  public static async getSpace(slug: string): Promise<SpaceWithFlairs> {
    const client = getApiClient();
    const encodedSlug = encodeURIComponent(slug);
    const [spaceRes, flairsRes] = await Promise.all([
      client.request(`/api/v1/spaces/${encodedSlug}`, { method: 'GET' }),
      client.request(`/api/v1/spaces/${encodedSlug}/flairs`, { method: 'GET' }),
    ]);

    if (!spaceRes.ok) {
      const err = await spaceRes.json().catch(() => ({}));
      throw new ApiHttpError(
        spaceRes.status,
        err.detail || `Không tìm thấy không gian s/${slug} (HTTP ${spaceRes.status})`,
      );
    }

    const space: Space = await spaceRes.json();
    const flairsPayload = flairsRes.ok
      ? await flairsRes.json().catch(() => ({ flairs: [] }))
      : { flairs: [] };

    return {
      space,
      flairs: Array.isArray(flairsPayload.flairs) ? flairsPayload.flairs : [],
    };
  }

  /**
   * Tham gia một Không gian thảo luận
   */
  public static async joinSpace(slug: string): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/spaces/${encodeURIComponent(slug)}/join`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Không thể tham gia không gian này');
    }
  }

  /**
   * Rời khỏi một Không gian thảo luận
   */
  public static async leaveSpace(slug: string): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/spaces/${encodeURIComponent(slug)}/leave`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Không thể rời không gian');
    }
  }

  /**
   * Lấy danh sách bài viết thuộc một Không gian thảo luận (hỗ trợ sort, cursor, flairId)
   */
  public static async getSpaceThreads(
    slug: string,
    options: {
      sort?: FeedSortOption;
      time?: FeedTimeOption;
      limit?: number;
      cursor?: string;
      flairId?: string;
    } = {},
  ): Promise<FeedPageResult> {
    const client = getApiClient();
    const params = new URLSearchParams();
    params.set('sort', options.sort ?? 'hot');
    params.set('limit', String(options.limit ?? 25));
    if (options.time) params.set('time', options.time);
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.flairId) params.set('flairId', options.flairId);

    const res = await client.request(
      `/api/v1/spaces/${encodeURIComponent(slug)}/threads?${params.toString()}`,
      { method: 'GET' },
    );

    if (res.status === 403) {
      return { items: [], nextCursor: null, hasMore: false, forbidden: true };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Lỗi tải bài viết của không gian');
    }

    const data = await res.json();
    return {
      items: data.items || [],
      nextCursor: data.pagination?.nextCursor ?? null,
      hasMore: Boolean(data.pagination?.hasMore),
    };
  }

  /**
   * Tìm kiếm bài viết trong không gian
   */
  public static async searchSpaceThreads(
    slug: string,
    q: string,
    limit = 20,
  ): Promise<ThreadSummary[]> {
    const client = getApiClient();
    const res = await client.request(
      `/api/v1/spaces/${encodeURIComponent(slug)}/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      { method: 'GET' },
    );
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.threads || [];
  }

  /**
   * Lấy Home Feed (chỉ bài viết từ Spaces người dùng đã tham gia)
   */
  public static async getHomeFeed(
    options: { sort?: FeedSortOption; time?: FeedTimeOption; limit?: number; cursor?: string } = {},
  ): Promise<FeedPageResult> {
    const client = getApiClient();
    const params = new URLSearchParams();
    params.set('sort', options.sort ?? 'hot');
    params.set('limit', String(options.limit ?? 20));
    if (options.time) params.set('time', options.time);
    if (options.cursor) params.set('cursor', options.cursor);

    const res = await client.request(`/api/v1/feed/home?${params.toString()}`, { method: 'GET' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Lỗi tải bảng tin trang chủ');
    }
    const data = await res.json();
    return {
      items: data.items || [],
      nextCursor: data.pagination?.nextCursor ?? null,
      hasMore: Boolean(data.pagination?.hasMore),
    };
  }

  /**
   * Lấy bảng tin thịnh hành toàn cầu (Popular Feed)
   */
  public static async getPopularFeed(
    options: { sort?: FeedSortOption; time?: FeedTimeOption; limit?: number; cursor?: string } = {},
  ): Promise<FeedPageResult> {
    const client = getApiClient();
    const params = new URLSearchParams();
    params.set('sort', options.sort ?? 'hot');
    params.set('limit', String(options.limit ?? 20));
    if (options.time) params.set('time', options.time);
    if (options.cursor) params.set('cursor', options.cursor);

    const res = await client.request(`/api/v1/feed/popular?${params.toString()}`, {
      method: 'GET',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Lỗi tải bảng tin Popular');
    }
    const data = await res.json();
    return {
      items: data.items || [],
      nextCursor: data.pagination?.nextCursor ?? null,
      hasMore: Boolean(data.pagination?.hasMore),
    };
  }

  /**
   * Lấy chi tiết bài viết và nội dung đầy đủ
   */
  public static async getThread(id: string): Promise<ThreadDetail> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/threads/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(
        res.status,
        err.detail || `Không thể truy cập bài viết (HTTP ${res.status})`,
      );
    }
    const data = await res.json();
    return data.thread || data;
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
    const res = await client.request(`/api/v1/spaces/${encodeURIComponent(spaceSlug)}/threads`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Không thể tạo bài viết');
    }
    return await res.json();
  }

  /**
   * Bỏ phiếu bầu cho bài viết (Upvote 1, Downvote -1)
   */
  public static async voteThread(
    threadId: string,
    direction: 1 | -1,
  ): Promise<{ netScore: number; userVote: number; upvotes?: number; downvotes?: number }> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/threads/${encodeURIComponent(threadId)}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Lỗi cập nhật phiếu bầu');
    }
    return await res.json();
  }

  /**
   * Lưu / bỏ lưu bài viết
   */
  public static async toggleSaveThread(threadId: string): Promise<{ isSaved: boolean }> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/threads/${encodeURIComponent(threadId)}/save`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Không thể lưu bài viết');
    }
    return await res.json();
  }

  /**
   * Danh sách bài viết đã lưu của người dùng hiện tại
   */
  public static async getSavedThreads(limit = 20, offset = 0): Promise<ThreadSummary[]> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/users/me/saved?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.items || [];
  }

  /**
   * Lấy toàn bộ cây bình luận đa tầng ltree của bài viết
   */
  public static async getThreadComments(threadId: string): Promise<CommentTreeData> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/threads/${encodeURIComponent(threadId)}/comments`, {
      method: 'GET',
    });
    if (!res.ok) {
      return { items: [], totalCount: 0 };
    }
    const data = await res.json();
    return data.items ? data : { items: data, totalCount: Array.isArray(data) ? data.length : 0 };
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
    const res = await client.request(`/api/v1/threads/${encodeURIComponent(threadId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        parentId,
        parentAuthorUsername,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Không thể gửi bình luận');
    }
    const data = await res.json();
    return data.comment || data;
  }

  /**
   * Xóa mềm bình luận
   */
  public static async deleteComment(commentId: string): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Không thể xóa bình luận');
    }
  }

  /**
   * Bỏ phiếu bầu cho bình luận
   */
  public static async voteComment(
    commentId: string,
    direction: 1 | -1,
  ): Promise<{ netScore: number; userVote: number }> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/comments/${encodeURIComponent(commentId)}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Lỗi cập nhật phiếu bầu bình luận');
    }
    return await res.json();
  }

  /**
   * Lấy hồ sơ công khai (không PII email) của một người dùng theo username
   */
  public static async getPublicUserProfile(username: string): Promise<PublicUserProfile | null> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/auth/users/${encodeURIComponent(username)}`, {
      method: 'GET',
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Không thể tải hồ sơ người dùng');
    }
    return await res.json();
  }

  /**
   * Xin Presigned PUT URL để tải ảnh Zero-hop
   */
  public static async getPresignedUploadUrl(
    fileName: string,
    fileType: string,
  ): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
    const client = getApiClient();
    const res = await client.request('/api/v1/media/presigned-url', {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new ApiHttpError(res.status, err.detail || 'Không thể cấp Presigned URL');
    }
    return await res.json();
  }
}
