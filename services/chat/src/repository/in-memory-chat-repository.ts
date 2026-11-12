import { randomUUID } from 'node:crypto';
import type { ChatChannelType, ChatRequestStatus } from '@acad/contracts';
import type {
  ChatChannelEntity,
  ChatMemberEntity,
  ChatMessageEntity,
  ChatRequestEntity,
  ChatUserSummary,
  IChatRepository,
  MessageListOptions,
} from './chat-repository.js';

/** High-speed isolated In-Memory Chat Repository for Unit Testing. */
export class InMemoryChatRepository implements IChatRepository {
  private readonly channels = new Map<string, ChatChannelEntity>();
  private readonly members = new Map<string, ChatMemberEntity>();
  private readonly messages = new Map<string, ChatMessageEntity>();
  private readonly requests = new Map<string, ChatRequestEntity>();
  private readonly users = new Map<string, ChatUserSummary>();

  public registerUser(user: ChatUserSummary): void {
    this.users.set(user.id, user);
  }

  public async createChannel(data: {
    type: ChatChannelType;
    name?: string | null | undefined;
    creatorId: string;
  }): Promise<ChatChannelEntity> {
    const now = new Date();
    const channel: ChatChannelEntity = {
      id: randomUUID(),
      type: data.type,
      name: data.name ?? null,
      creatorId: data.creatorId,
      createdAt: now,
      updatedAt: now,
    };
    this.channels.set(channel.id, channel);
    return channel;
  }

  public async findChannelById(id: string): Promise<ChatChannelEntity | null> {
    return this.channels.get(id) ?? null;
  }

  public async findDirectChannelBetween(
    user1Id: string,
    user2Id: string,
  ): Promise<ChatChannelEntity | null> {
    for (const channel of this.channels.values()) {
      if (channel.type !== 'DIRECT') continue;
      const u1 = this.members.has(`${channel.id}:${user1Id}`);
      const u2 = this.members.has(`${channel.id}:${user2Id}`);
      if (u1 && u2) return channel;
    }
    return null;
  }

  public async listUserChannels(userId: string): Promise<ChatChannelEntity[]> {
    const result: ChatChannelEntity[] = [];
    for (const member of this.members.values()) {
      if (member.userId === userId) {
        const ch = this.channels.get(member.channelId);
        if (ch) result.push(ch);
      }
    }
    return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  public async addMember(channelId: string, userId: string): Promise<void> {
    const key = `${channelId}:${userId}`;
    if (!this.members.has(key)) {
      this.members.set(key, {
        channelId,
        userId,
        lastReadMessageId: null,
        joinedAt: new Date(),
      });
    }
  }

  public async removeMember(channelId: string, userId: string): Promise<void> {
    this.members.delete(`${channelId}:${userId}`);
  }

  public async isMember(channelId: string, userId: string): Promise<boolean> {
    return this.members.has(`${channelId}:${userId}`);
  }

  public async getChannelMembers(channelId: string): Promise<ChatMemberEntity[]> {
    return Array.from(this.members.values()).filter((m) => m.channelId === channelId);
  }

  public async updateLastRead(channelId: string, userId: string, messageId: string): Promise<void> {
    const m = this.members.get(`${channelId}:${userId}`);
    if (m) m.lastReadMessageId = messageId;
  }

  public async countUnreadMessages(channelId: string, userId: string): Promise<number> {
    const m = this.members.get(`${channelId}:${userId}`);
    if (!m) return 0;

    let lastReadAt = 0;
    if (m.lastReadMessageId) {
      const readMsg = this.messages.get(m.lastReadMessageId);
      if (readMsg) lastReadAt = readMsg.createdAt.getTime();
    }

    let count = 0;
    for (const msg of this.messages.values()) {
      if (
        msg.channelId === channelId &&
        !msg.isDeleted &&
        msg.senderId !== userId &&
        msg.createdAt.getTime() > lastReadAt
      ) {
        count += 1;
      }
    }
    return count;
  }

  public async createMessage(data: {
    channelId: string;
    senderId: string;
    parentMessageId?: string | null | undefined;
    content: string;
    attachments?: unknown[] | undefined;
  }): Promise<ChatMessageEntity> {
    const now = new Date();
    const message: ChatMessageEntity = {
      id: randomUUID(),
      channelId: data.channelId,
      senderId: data.senderId,
      parentMessageId: data.parentMessageId ?? null,
      content: data.content,
      attachments: data.attachments ?? [],
      isDeleted: false,
      createdAt: now,
      repliesCount: 0,
    };
    this.messages.set(message.id, message);

    const ch = this.channels.get(data.channelId);
    if (ch) ch.updatedAt = now;
    return message;
  }

  public async findMessageById(id: string): Promise<ChatMessageEntity | null> {
    return this.messages.get(id) ?? null;
  }

  public async listMessages(
    channelId: string,
    options?: MessageListOptions | undefined,
  ): Promise<ChatMessageEntity[]> {
    const limit = options?.limit ?? 50;
    const parentIdFilter = options?.parentMessageId ?? null;

    let msgs = Array.from(this.messages.values()).filter((m) => {
      if (m.channelId !== channelId || m.isDeleted) return false;
      if (parentIdFilter !== null) return m.parentMessageId === parentIdFilter;
      return m.parentMessageId === null;
    });

    if (parentIdFilter !== null) {
      msgs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } else {
      msgs.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id),
      );
    }

    if (options?.cursor) {
      try {
        const decoded = Buffer.from(options.cursor, 'base64url').toString('utf8');
        const [tsStr, id] = decoded.split(':');
        const ts = Number.parseInt(tsStr ?? '', 10);
        if (!Number.isNaN(ts) && id) {
          msgs = msgs.filter(
            (m) => m.createdAt.getTime() < ts || (m.createdAt.getTime() === ts && m.id < id),
          );
        }
      } catch {
        // ignore invalid cursor
      }
    }

    const sliced = msgs.slice(0, limit);
    for (const msg of sliced) {
      let replies = 0;
      for (const candidate of this.messages.values()) {
        if (candidate.parentMessageId === msg.id && !candidate.isDeleted) replies += 1;
      }
      msg.repliesCount = replies;
    }
    return sliced;
  }

  public async getLatestMessage(channelId: string): Promise<ChatMessageEntity | null> {
    const msgs = Array.from(this.messages.values())
      .filter((m) => m.channelId === channelId && !m.isDeleted && m.parentMessageId === null)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return msgs[0] ?? null;
  }

  public async createChatRequest(data: {
    senderId: string;
    receiverId: string;
    initialMessage: string;
  }): Promise<ChatRequestEntity> {
    const now = new Date();
    for (const existing of this.requests.values()) {
      if (existing.senderId === data.senderId && existing.receiverId === data.receiverId) {
        existing.initialMessage = data.initialMessage;
        existing.status = 'PENDING';
        existing.updatedAt = now;
        return existing;
      }
    }
    const req: ChatRequestEntity = {
      id: randomUUID(),
      senderId: data.senderId,
      receiverId: data.receiverId,
      channelId: null,
      initialMessage: data.initialMessage,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };
    this.requests.set(req.id, req);
    return req;
  }

  public async findChatRequestById(id: string): Promise<ChatRequestEntity | null> {
    return this.requests.get(id) ?? null;
  }

  public async findChatRequestBetween(
    senderId: string,
    receiverId: string,
  ): Promise<ChatRequestEntity | null> {
    for (const req of this.requests.values()) {
      if (
        (req.senderId === senderId && req.receiverId === receiverId) ||
        (req.senderId === receiverId && req.receiverId === senderId)
      ) {
        return req;
      }
    }
    return null;
  }

  public async updateChatRequestStatus(
    id: string,
    status: ChatRequestStatus,
    channelId?: string | null | undefined,
  ): Promise<ChatRequestEntity | null> {
    const req = this.requests.get(id);
    if (!req) return null;
    req.status = status;
    if (channelId !== undefined) req.channelId = channelId;
    req.updatedAt = new Date();
    return req;
  }

  public async listPendingRequestsForReceiver(receiverId: string): Promise<ChatRequestEntity[]> {
    return Array.from(this.requests.values())
      .filter((r) => r.receiverId === receiverId && r.status === 'PENDING')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async listPendingRequestsForSender(senderId: string): Promise<ChatRequestEntity[]> {
    return Array.from(this.requests.values())
      .filter((r) => r.senderId === senderId && r.status === 'PENDING')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async deleteChatRequest(id: string): Promise<boolean> {
    return this.requests.delete(id);
  }

  public async findUserById(userId: string): Promise<ChatUserSummary | null> {
    return this.users.get(userId) ?? null;
  }

  public async findUserByUsername(username: string): Promise<ChatUserSummary | null> {
    const lower = username.toLowerCase();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === lower) return u;
    }
    return null;
  }
}
