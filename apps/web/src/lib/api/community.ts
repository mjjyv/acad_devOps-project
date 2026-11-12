import type {
  CommentTreeResponse,
  CreateFlairInput,
  CreateSpaceInput,
  CreateThreadInput,
  FlatCommentItem,
  SortMode,
  Space,
  SpaceFlair,
  ThreadDetail,
  ThreadListResponse,
  ThreadSummary,
  TimeRange,
  VoteDirection,
  VoteResult,
} from '@acad/contracts';
import { apiJson } from './client';

export interface SpaceTopicStat {
  topic: string;
  spacesCount: number;
  totalMembers: number;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
  provider: 'local' | 's3';
  requiredHeaders: Record<string, string>;
}

/**
 * Chuẩn hóa URL media local để luôn qua Next.js rewrite proxy (/api/v1/media/files/...)
 * tránh lỗi CORS khi truy cập qua localhost:3000 hoặc tên miền Cloudflare Tunnel.
 */
export function resolveRenderableMediaUrl(url: string): string {
  if (typeof window !== 'undefined') {
    try {
      const parsed = new URL(url);
      if (
        (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') &&
        parsed.pathname.startsWith('/api/v1/media/files/')
      ) {
        return parsed.pathname;
      }
    } catch {
      // keep relative path or original string
    }
  }
  return url;
}

export const CommunityApi = {
  async getSpaces(
    limit = 20,
    offset = 0,
    filters?: { topic?: string; q?: string },
  ): Promise<Space[]> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (filters?.topic) params.set('topic', filters.topic);
    if (filters?.q) params.set('q', filters.q);
    const data = await apiJson<{ spaces: Space[] }>(`/api/v1/spaces?${params.toString()}`);
    return Array.isArray(data.spaces) ? data.spaces : [];
  },

  async getTopics(): Promise<SpaceTopicStat[]> {
    const data = await apiJson<{ topics: SpaceTopicStat[] }>('/api/v1/spaces/topics');
    return Array.isArray(data.topics) ? data.topics : [];
  },

  async getSpaceBySlug(slug: string): Promise<Space> {
    return apiJson<Space>(`/api/v1/spaces/${encodeURIComponent(slug)}`);
  },

  async createSpace(input: CreateSpaceInput): Promise<Space> {
    return apiJson<Space>('/api/v1/spaces', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async joinSpace(slug: string): Promise<void> {
    await apiJson(`/api/v1/spaces/${encodeURIComponent(slug)}/join`, { method: 'POST' });
  },

  async leaveSpace(slug: string): Promise<void> {
    await apiJson(`/api/v1/spaces/${encodeURIComponent(slug)}/leave`, { method: 'POST' });
  },

  async getFlairs(slug: string): Promise<SpaceFlair[]> {
    const data = await apiJson<{ flairs: SpaceFlair[] }>(
      `/api/v1/spaces/${encodeURIComponent(slug)}/flairs`,
    );
    return Array.isArray(data.flairs) ? data.flairs : [];
  },

  async createFlair(slug: string, input: CreateFlairInput): Promise<SpaceFlair> {
    return apiJson<SpaceFlair>(`/api/v1/spaces/${encodeURIComponent(slug)}/flairs`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async searchSpaceThreads(slug: string, q: string, limit = 20): Promise<ThreadSummary[]> {
    const qs = new URLSearchParams({ q, limit: String(limit) });
    const data = await apiJson<{ threads: ThreadSummary[] }>(
      `/api/v1/spaces/${encodeURIComponent(slug)}/search?${qs.toString()}`,
    );
    return Array.isArray(data.threads) ? data.threads : [];
  },

  async getHomeFeed(params?: {
    sort?: SortMode;
    time?: TimeRange;
    cursor?: string;
    limit?: number;
  }): Promise<ThreadListResponse> {
    const qs = new URLSearchParams();
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.time) qs.set('time', params.time);
    if (params?.cursor) qs.set('cursor', params.cursor);
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiJson<ThreadListResponse>(`/api/v1/feed/home?${qs.toString()}`);
  },

  async getPopularFeed(params?: {
    sort?: SortMode;
    time?: TimeRange;
    q?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ThreadListResponse> {
    const qs = new URLSearchParams();
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.time) qs.set('time', params.time);
    if (params?.q) qs.set('q', params.q);
    if (params?.cursor) qs.set('cursor', params.cursor);
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiJson<ThreadListResponse>(`/api/v1/feed/popular?${qs.toString()}`);
  },

  async getSpaceThreads(
    slug: string,
    params?: {
      sort?: SortMode;
      time?: TimeRange;
      flairId?: string;
      cursor?: string;
      limit?: number;
    },
  ): Promise<ThreadListResponse> {
    const qs = new URLSearchParams();
    if (params?.sort) qs.set('sort', params.sort);
    if (params?.time) qs.set('time', params.time);
    if (params?.flairId) qs.set('flairId', params.flairId);
    if (params?.cursor) qs.set('cursor', params.cursor);
    if (params?.limit) qs.set('limit', String(params.limit));
    return apiJson<ThreadListResponse>(
      `/api/v1/spaces/${encodeURIComponent(slug)}/threads?${qs.toString()}`,
    );
  },

  async getThread(idOrSlug: string): Promise<ThreadDetail> {
    return apiJson<ThreadDetail>(`/api/v1/threads/${encodeURIComponent(idOrSlug)}`);
  },

  async createThread(
    spaceSlug: string,
    input: Omit<CreateThreadInput, 'spaceId'>,
  ): Promise<ThreadDetail> {
    return apiJson<ThreadDetail>(`/api/v1/spaces/${encodeURIComponent(spaceSlug)}/threads`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async voteThread(threadId: string, direction: VoteDirection): Promise<VoteResult> {
    return apiJson<VoteResult>(`/api/v1/threads/${encodeURIComponent(threadId)}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
  },

  async voteComment(commentId: string, direction: VoteDirection): Promise<VoteResult> {
    return apiJson<VoteResult>(`/api/v1/comments/${encodeURIComponent(commentId)}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction }),
    });
  },

  async deleteComment(commentId: string): Promise<{ status: string }> {
    return apiJson<{ status: string }>(`/api/v1/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
    });
  },

  async toggleSaveThread(threadId: string): Promise<{ isSaved: boolean }> {
    return apiJson<{ isSaved: boolean }>(`/api/v1/threads/${encodeURIComponent(threadId)}/save`, {
      method: 'POST',
    });
  },

  async getSavedThreads(): Promise<ThreadSummary[]> {
    const data = await apiJson<{ items: ThreadSummary[] }>('/api/v1/users/me/saved');
    return Array.isArray(data.items) ? data.items : [];
  },

  async getComments(threadId: string): Promise<CommentTreeResponse> {
    return apiJson<CommentTreeResponse>(`/api/v1/threads/${encodeURIComponent(threadId)}/comments`);
  },

  async createComment(
    threadId: string,
    content: string,
    parentId?: string,
  ): Promise<FlatCommentItem> {
    return apiJson<FlatCommentItem>(`/api/v1/threads/${encodeURIComponent(threadId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content, ...(parentId ? { parentId } : {}) }),
    });
  },

  async uploadMediaFile(file: File): Promise<PresignedUploadResponse> {
    const presign = await apiJson<PresignedUploadResponse>('/api/v1/media/presign', {
      method: 'POST',
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type || 'image/png',
        fileSizeBytes: file.size,
      }),
    });

    let targetUploadUrl = presign.uploadUrl;
    if (presign.provider === 'local' && typeof window !== 'undefined') {
      const parsed = new URL(presign.uploadUrl);
      targetUploadUrl = `${parsed.pathname}${parsed.search}`;
    }

    const putRes = await fetch(targetUploadUrl, {
      method: 'PUT',
      headers: presign.requiredHeaders,
      body: file,
    });
    if (!putRes.ok) {
      throw new Error(`Tải tệp lên thất bại (HTTP ${putRes.status})`);
    }
    return presign;
  },
};
