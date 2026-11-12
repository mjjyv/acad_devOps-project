import type { ChatChannel, ChatMessage, ChatRequest, PublicUserProfile } from '@acad/contracts';
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

  public static async searchUsers(query: string, limit = 10): Promise<PublicUserProfile[]> {
    const clean = query.trim();
    if (!clean) return [];
    const client = getApiClient();
    const res = await client.request(
      `/api/v1/auth/users/search?q=${encodeURIComponent(clean)}&limit=${limit}`,
      { method: 'GET' },
    );
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return Array.isArray(data.users) ? data.users : [];
  }

  public static async listRequests(
    direction: 'incoming' | 'sent' = 'incoming',
  ): Promise<ChatRequest[]> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/chat/requests?direction=${direction}`, {
      method: 'GET',
    });
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return Array.isArray(data.requests) ? data.requests : [];
  }

  public static async listAllRequests(): Promise<{
    incoming: ChatRequest[];
    sent: ChatRequest[];
  }> {
    const client = getApiClient();
    const res = await client.request('/api/v1/chat/requests?direction=all', {
      method: 'GET',
    });
    if (!res.ok) {
      return { incoming: [], sent: [] };
    }
    const data = await res.json();
    return {
      incoming: Array.isArray(data.incoming) ? data.incoming : [],
      sent: Array.isArray(data.sent) ? data.sent : [],
    };
  }

  public static async cancelRequest(requestId: string): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/chat/requests/${encodeURIComponent(requestId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể thu hồi yêu cầu trò chuyện');
    }
  }

  public static async markChannelRead(channelId: string, messageId?: string): Promise<void> {
    const client = getApiClient();
    await client
      .request(`/api/v1/chat/channels/${encodeURIComponent(channelId)}/read`, {
        method: 'POST',
        body: JSON.stringify(messageId ? { messageId } : {}),
      })
      .catch(() => undefined);
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

  public static async initiateDirectChat(
    recipientId: string,
    initialMessage?: string,
  ): Promise<
    { isRequest: true; request: ChatRequest } | { isRequest: false; channel: ChatChannel }
  > {
    const client = getApiClient();
    const res = await client.request('/api/v1/chat/channels/direct', {
      method: 'POST',
      body: JSON.stringify({
        recipientId,
        ...(initialMessage ? { initialMessage } : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể khởi tạo cuộc trò chuyện');
    }
    return await res.json();
  }

  public static async createGroupChannel(name: string, memberIds: string[]): Promise<ChatChannel> {
    const client = getApiClient();
    const res = await client.request('/api/v1/chat/channels/group', {
      method: 'POST',
      body: JSON.stringify({ name, memberIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Không thể tạo nhóm chat');
    }
    const data = await res.json();
    return data.channel || data;
  }

  public static async sendTyping(channelId: string, isTyping: boolean): Promise<void> {
    const client = getApiClient();
    await client
      .request(`/api/v1/chat/channels/${encodeURIComponent(channelId)}/typing`, {
        method: 'POST',
        body: JSON.stringify({ isTyping }),
      })
      .catch(() => undefined);
  }

  public static async sendPresenceHeartbeat(): Promise<void> {
    const client = getApiClient();
    await client
      .request('/api/v1/chat/presence/heartbeat', {
        method: 'POST',
      })
      .catch(() => undefined);
  }

  public static openEventStream(): EventSource | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN);
    if (!token) return null;
    return new EventSource(`/api/v1/chat/events?token=${encodeURIComponent(token)}`);
  }
}
