import type { ChatChannel, ChatMessage, ChatRequest } from '@acad/contracts';
import { apiJson } from './client';

export const ChatApi = {
  async getChannels(): Promise<ChatChannel[]> {
    const data = await apiJson<{ channels: ChatChannel[] }>('/api/v1/chat/channels');
    return Array.isArray(data.channels) ? data.channels : [];
  },

  async initiateDirectChat(
    recipientId: string,
    initialMessage: string,
  ): Promise<{ isRequest: boolean; channel?: ChatChannel; request?: ChatRequest }> {
    return apiJson('/api/v1/chat/channels/direct', {
      method: 'POST',
      body: JSON.stringify({ recipientId, initialMessage }),
    });
  },

  async getRequests(
    direction: 'incoming' | 'sent' | 'all' = 'incoming',
  ): Promise<{ requests: ChatRequest[]; incoming?: ChatRequest[]; sent?: ChatRequest[] }> {
    return apiJson(`/api/v1/chat/requests?direction=${direction}`);
  },

  async respondRequest(
    requestId: string,
    status: 'ACCEPTED' | 'IGNORED' | 'BLOCKED',
  ): Promise<{ request: ChatRequest; channel?: ChatChannel }> {
    return apiJson(`/api/v1/chat/requests/${encodeURIComponent(requestId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getMessages(
    channelId: string,
    cursor?: string,
  ): Promise<{ messages: ChatMessage[]; nextCursor: string | null }> {
    const qs = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return apiJson(`/api/v1/chat/channels/${encodeURIComponent(channelId)}/messages${qs}`);
  },

  async sendMessage(
    channelId: string,
    content: string,
    options?: { parentMessageId?: string; attachments?: ChatMessage['attachments'] },
  ): Promise<{ message: ChatMessage }> {
    return apiJson(`/api/v1/chat/channels/${encodeURIComponent(channelId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content, ...options }),
    });
  },

  async createGroupChannel(name: string, memberIds: string[]): Promise<{ channel: ChatChannel }> {
    return apiJson<{ channel: ChatChannel }>('/api/v1/chat/channels/group', {
      method: 'POST',
      body: JSON.stringify({ name, memberIds }),
    });
  },

  async cancelChatRequest(requestId: string): Promise<{ status: string }> {
    return apiJson<{ status: string }>(`/api/v1/chat/requests/${encodeURIComponent(requestId)}`, {
      method: 'DELETE',
    });
  },

  async markChannelAsRead(channelId: string, messageId?: string): Promise<{ status: string }> {
    return apiJson<{ status: string }>(
      `/api/v1/chat/channels/${encodeURIComponent(channelId)}/read`,
      {
        method: 'POST',
        body: JSON.stringify({ ...(messageId ? { messageId } : {}) }),
      },
    );
  },

  async notifyTyping(channelId: string, isTyping: boolean): Promise<{ status: string }> {
    return apiJson<{ status: string }>(
      `/api/v1/chat/channels/${encodeURIComponent(channelId)}/typing`,
      {
        method: 'POST',
        body: JSON.stringify({ isTyping }),
      },
    );
  },

  async sendPresenceHeartbeat(): Promise<{ status: string; online: boolean }> {
    return apiJson<{ status: string; online: boolean }>('/api/v1/chat/presence/heartbeat', {
      method: 'POST',
    });
  },

  async getPresenceBatch(userIds: string[]): Promise<Record<string, boolean>> {
    if (userIds.length === 0) return {};
    const res = await apiJson<{ statuses: Record<string, boolean> }>(
      '/api/v1/chat/presence/batch',
      {
        method: 'POST',
        body: JSON.stringify({ userIds }),
      },
    );
    return res.statuses || {};
  },

  getSseUrl(token: string): string {
    return `/api/v1/chat/events?token=${encodeURIComponent(token)}`;
  },
};
