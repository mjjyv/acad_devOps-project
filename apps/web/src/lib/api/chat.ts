import type { ChatChannel, ChatMessage, ChatRequest } from '@acad/contracts';
import { getApiClient, STORAGE_KEY_ACCESS_TOKEN } from '@/lib/api/client';

export class ChatApi {
  public static async listChannels(): Promise<ChatChannel[]> {
    const client = getApiClient();
    const res = await client.request('/api/v1/chat/channels', { method: 'GET' });
    if (!res.ok) {
      throw new Error(`Không thể tải danh sách kênh chat (HTTP ${res.status})`);
    }
    const data = await res.json();
    return Array.isArray(data.channels) ? data.channels : [];
  }

  public static async listMessages(
    channelId: string,
    options: { limit?: number; cursor?: string; parentMessageId?: string | null } = {},
  ): Promise<{ messages: ChatMessage[]; nextCursor: string | null }> {
    const client = getApiClient();
    const params = new URLSearchParams();
    params.set('limit', String(options.limit ?? 50));
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.parentMessageId === null) params.set('parentMessageId', 'null');
    else if (options.parentMessageId) params.set('parentMessageId', options.parentMessageId);

    const res = await client.request(
      `/api/v1/chat/channels/${encodeURIComponent(channelId)}/messages?${params.toString()}`,
      { method: 'GET' },
    );
    if (!res.ok) {
      throw new Error(`Không thể tải tin nhắn (HTTP ${res.status})`);
    }
    const data = await res.json();
    return {
      messages: Array.isArray(data.messages) ? data.messages : [],
      nextCursor: data.nextCursor ?? null,
    };
  }

  public static async sendMessage(
    channelId: string,
    content: string,
    parentMessageId?: string,
  ): Promise<ChatMessage> {
    const client = getApiClient();
    const res = await client.request(
      `/api/v1/chat/channels/${encodeURIComponent(channelId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content, ...(parentMessageId ? { parentMessageId } : {}) }),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể gửi tin nhắn');
    }
    const data = await res.json();
    return data.message || data;
  }

  public static async listRequests(): Promise<ChatRequest[]> {
    const client = getApiClient();
    const res = await client.request('/api/v1/chat/requests', { method: 'GET' });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return Array.isArray(data.requests) ? data.requests : [];
  }

  public static async respondRequest(
    requestId: string,
    status: 'ACCEPTED' | 'IGNORED' | 'BLOCKED',
  ): Promise<{ request: ChatRequest; channel?: ChatChannel }> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/chat/requests/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể xử lý yêu cầu trò chuyện');
    }
    return await res.json();
  }

  public static openEventStream(): EventSource | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
    if (!token) return null;
    return new EventSource(`/api/v1/chat/events?token=${encodeURIComponent(token)}`);
  }
}
