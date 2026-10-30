import {
  Space,
  CreateSpaceInput,
  SpaceMembership,
  ThreadSummary,
  ThreadDetail,
  CreateThreadInput,
  FlatCommentItem,
  ContentAST,
} from '@acad/contracts';
import { webAuth } from './auth-client.js';

function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.endsWith('.onrender.com')) {
      if (!envUrl || envUrl.includes('localhost') || envUrl === 'acad-core-api' || !envUrl.includes('.')) {
        return 'https://acad-core-api.onrender.com';
      }
    }
  }

  if (!envUrl) return 'http://localhost:8080';

  if (envUrl === 'acad-core-api' || (!envUrl.includes('.') && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1'))) {
    return `https://${envUrl.replace(/^https?:\/\//, '')}.onrender.com`;
  }

  if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    const domainPart = cleanUrl.replace(/^https?:\/\//, '');
    if (!domainPart.includes('.') && !domainPart.includes('localhost') && !domainPart.includes(':')) {
      return `https://${domainPart}.onrender.com`;
    }
    return cleanUrl;
  }

  return `https://${envUrl.replace(/\/+$/, '')}`;
}

const API_BASE_URL = getApiBaseUrl();

class CommunityClient {
  private getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = webAuth.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // --- SPACES ---
  public async fetchSpaces(): Promise<Space[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/spaces`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Không thể tải danh sách không gian thảo luận');
      const data = await res.json();
      return data.spaces || [];
    } catch (err) {
      console.warn('[CommunityClient] fetchSpaces error:', err);
      return [];
    }
  }

  public async getSpace(slug: string): Promise<Space | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/spaces/${slug}`, {
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.space || null;
    } catch (err) {
      console.warn('[CommunityClient] getSpace error:', err);
      return null;
    }
  }

  public async createSpace(input: CreateSpaceInput): Promise<Space> {
    const res = await fetch(`${API_BASE_URL}/api/v1/spaces`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi khi tạo không gian mới');
    }
    return data.space;
  }

  public async joinSpace(slug: string): Promise<SpaceMembership> {
    const res = await fetch(`${API_BASE_URL}/api/v1/spaces/${slug}/join`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi khi tham gia không gian');
    return data.membership;
  }

  public async leaveSpace(slug: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/v1/spaces/${slug}/leave`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    return Boolean(data.success);
  }

  // --- THREADS ---
  public async fetchThreads(options?: {
    spaceSlug?: string;
    sort?: 'hot' | 'new' | 'top';
    limit?: number;
    cursor?: string;
  }): Promise<{ items: ThreadSummary[]; nextCursor: string | null }> {
    const params = new URLSearchParams();
    if (options?.spaceSlug) params.set('spaceSlug', options.spaceSlug);
    if (options?.sort) params.set('sort', options.sort);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);

    const res = await fetch(`${API_BASE_URL}/api/v1/threads?${params.toString()}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Không thể tải bảng tin bài viết');
    }
    return res.json();
  }

  public async fetchThread(slugOrId: string): Promise<ThreadDetail | null> {
    const res = await fetch(`${API_BASE_URL}/api/v1/threads/${slugOrId}`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.thread || null;
  }

  public async createThread(input: {
    spaceId: string;
    title: string;
    contentAst: ContentAST;
    mediaKeys?: string[];
  }): Promise<ThreadDetail> {
    const res = await fetch(`${API_BASE_URL}/api/v1/threads`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi khi đăng bài viết mới');
    }
    return data.thread;
  }

  public async deleteThread(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/v1/threads/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    return Boolean(data.success);
  }

  // --- COMMENTS ---
  public async fetchComments(threadIdOrSlug: string): Promise<FlatCommentItem[]> {
    const res = await fetch(`${API_BASE_URL}/api/v1/threads/${threadIdOrSlug}/comments`, {
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.comments || [];
  }

  public async createComment(input: {
    threadId: string;
    parentId?: string | null;
    contentAst: ContentAST;
  }): Promise<FlatCommentItem> {
    const res = await fetch(`${API_BASE_URL}/api/v1/threads/${input.threadId}/comments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({
        parentId: input.parentId || null,
        contentAst: input.contentAst,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Lỗi khi gửi bình luận');
    }
    return data.comment;
  }

  public async deleteComment(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE_URL}/api/v1/comments/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
    });
    const data = await res.json();
    return Boolean(data.success);
  }

  // --- VOTING ---
  public async voteThread(
    threadId: string,
    direction: 1 | -1,
  ): Promise<{ upvotes: number; downvotes: number; netScore: number; userVote: 1 | -1 | null }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/threads/${threadId}/vote`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ direction }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi khi vote bài viết');
    return data;
  }

  public async voteComment(
    commentId: string,
    direction: 1 | -1,
  ): Promise<{ upvotes: number; downvotes: number; netScore: number; userVote: 1 | -1 | null }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/comments/${commentId}/vote`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ direction }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi khi vote bình luận');
    return data;
  }
}

export const communityClient = new CommunityClient();
