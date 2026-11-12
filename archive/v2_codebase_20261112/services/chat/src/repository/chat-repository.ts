/**
 * @file chat-repository.ts
 * @description Data Access Layer for Reddit Realtime Chat Subsystem.
 */

import { randomUUID } from 'node:crypto';
import type { ChatChannelType, ChatRequestStatus } from '@acad/contracts';
import type pg from 'pg';

export interface ChatChannelEntity {
  id: string;
  type: ChatChannelType;
  name: string | null;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMemberEntity {
  channelId: string;
  userId: string;
  lastReadMessageId: string | null;
  joinedAt: Date;
}

export interface ChatMessageEntity {
  id: string;
  channelId: string;
  senderId: string;
  parentMessageId: string | null;
  content: string;
  attachments: unknown[];
  isDeleted: boolean;
  createdAt: Date;
  repliesCount?: number | undefined;
}

export interface ChatRequestEntity {
  id: string;
  senderId: string;
  receiverId: string;
  channelId: string | null;
  initialMessage: string;
  status: ChatRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSummary {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface MessageListOptions {
  limit?: number | undefined;
  cursor?: string | undefined; // Base64URL(createdAtMs:id)
  parentMessageId?: string | null | undefined;
}

export interface IChatRepository {
  // Channels
  createChannel(data: {
    type: ChatChannelType;
    name?: string | null | undefined;
    creatorId: string;
  }): Promise<ChatChannelEntity>;
  findChannelById(id: string): Promise<ChatChannelEntity | null>;
  findDirectChannelBetween(user1Id: string, user2Id: string): Promise<ChatChannelEntity | null>;
  listUserChannels(userId: string): Promise<ChatChannelEntity[]>;

  // Members
  addMember(channelId: string, userId: string): Promise<void>;
  removeMember(channelId: string, userId: string): Promise<void>;
  isMember(channelId: string, userId: string): Promise<boolean>;
  getChannelMembers(channelId: string): Promise<ChatMemberEntity[]>;
  updateLastRead(channelId: string, userId: string, messageId: string): Promise<void>;
  countUnreadMessages(channelId: string, userId: string): Promise<number>;

  // Messages
  createMessage(data: {
    channelId: string;
    senderId: string;
    parentMessageId?: string | null | undefined;
    content: string;
    attachments?: unknown[] | undefined;
  }): Promise<ChatMessageEntity>;
  findMessageById(id: string): Promise<ChatMessageEntity | null>;
  listMessages(
    channelId: string,
    options?: MessageListOptions | undefined,
  ): Promise<ChatMessageEntity[]>;
  getLatestMessage(channelId: string): Promise<ChatMessageEntity | null>;

  // Chat Requests
  createChatRequest(data: {
    senderId: string;
    receiverId: string;
    initialMessage: string;
  }): Promise<ChatRequestEntity>;
  findChatRequestById(id: string): Promise<ChatRequestEntity | null>;
  findChatRequestBetween(senderId: string, receiverId: string): Promise<ChatRequestEntity | null>;
  updateChatRequestStatus(
    id: string,
    status: ChatRequestStatus,
    channelId?: string | null | undefined,
  ): Promise<ChatRequestEntity | null>;
  listPendingRequestsForReceiver(receiverId: string): Promise<ChatRequestEntity[]>;
  listPendingRequestsForSender(senderId: string): Promise<ChatRequestEntity[]>;
  deleteChatRequest(id: string): Promise<boolean>;

  // User details
  findUserById(userId: string): Promise<UserSummary | null>;
  findUserByUsername(username: string): Promise<UserSummary | null>;
}

/**
 * InMemoryChatRepository: Triển khai cô lập trong bộ nhớ tốc độ cao cho Unit Test.
 */
export class InMemoryChatRepository implements IChatRepository {
  private channels = new Map<string, ChatChannelEntity>();
  private members = new Map<string, ChatMemberEntity[]>(); // channelId -> members
  private messages = new Map<string, ChatMessageEntity>();
  private chatRequests = new Map<string, ChatRequestEntity>();
  private users = new Map<string, UserSummary>();
  private lastMessageTime = 0;

  constructor(
    private userLookup?:
      | {
          findById(id: string): Promise<{
            id: string;
            username: string;
            avatarUrl?: string | null | undefined;
          } | null>;
        }
      | undefined,
  ) {}

  public seedUser(user: UserSummary): void {
    this.users.set(user.id, user);
  }

  // --- Channels ---
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
    this.members.set(channel.id, []);
    return channel;
  }

  public async findChannelById(id: string): Promise<ChatChannelEntity | null> {
    return this.channels.get(id) ?? null;
  }

  public async findDirectChannelBetween(
    user1Id: string,
    user2Id: string,
  ): Promise<ChatChannelEntity | null> {
    for (const [channelId, channel] of this.channels.entries()) {
      if (channel.type === 'DIRECT') {
        const mems = this.members.get(channelId) ?? [];
        const memberIds = mems.map((m) => m.userId);
        if (memberIds.includes(user1Id) && memberIds.includes(user2Id)) {
          return channel;
        }
      }
    }
    return null;
  }

  public async listUserChannels(userId: string): Promise<ChatChannelEntity[]> {
    const userChannelIds = new Set<string>();
    for (const [channelId, mems] of this.members.entries()) {
      if (mems.some((m) => m.userId === userId)) {
        userChannelIds.add(channelId);
      }
    }
    const result: ChatChannelEntity[] = [];
    for (const id of userChannelIds) {
      const ch = this.channels.get(id);
      if (ch) result.push(ch);
    }
    return result.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  // --- Members ---
  public async addMember(channelId: string, userId: string): Promise<void> {
    const mems = this.members.get(channelId) ?? [];
    if (!mems.some((m) => m.userId === userId)) {
      mems.push({
        channelId,
        userId,
        lastReadMessageId: null,
        joinedAt: new Date(),
      });
      this.members.set(channelId, mems);
    }
  }

  public async removeMember(channelId: string, userId: string): Promise<void> {
    const mems = this.members.get(channelId) ?? [];
    this.members.set(
      channelId,
      mems.filter((m) => m.userId !== userId),
    );
  }

  public async isMember(channelId: string, userId: string): Promise<boolean> {
    const mems = this.members.get(channelId) ?? [];
    return mems.some((m) => m.userId === userId);
  }

  public async getChannelMembers(channelId: string): Promise<ChatMemberEntity[]> {
    return this.members.get(channelId) ?? [];
  }

  public async updateLastRead(channelId: string, userId: string, messageId: string): Promise<void> {
    const mems = this.members.get(channelId) ?? [];
    const member = mems.find((m) => m.userId === userId);
    if (member) {
      member.lastReadMessageId = messageId;
    }
  }

  public async countUnreadMessages(channelId: string, userId: string): Promise<number> {
    const mems = this.members.get(channelId) ?? [];
    const member = mems.find((m) => m.userId === userId);
    if (!member) return 0;

    const msgs = Array.from(this.messages.values()).filter(
      (m) => m.channelId === channelId && !m.isDeleted,
    );

    if (!member.lastReadMessageId) {
      return msgs.filter((m) => m.senderId !== userId).length;
    }

    const lastReadMsg = this.messages.get(member.lastReadMessageId);
    if (!lastReadMsg) {
      return msgs.filter((m) => m.senderId !== userId).length;
    }

    return msgs.filter(
      (m) => m.senderId !== userId && m.createdAt.getTime() > lastReadMsg.createdAt.getTime(),
    ).length;
  }

  // --- Messages ---
  public async createMessage(data: {
    channelId: string;
    senderId: string;
    parentMessageId?: string | null | undefined;
    content: string;
    attachments?: unknown[] | undefined;
  }): Promise<ChatMessageEntity> {
    const nowMs = Math.max(Date.now(), this.lastMessageTime + 1);
    this.lastMessageTime = nowMs;
    const now = new Date(nowMs);
    const msg: ChatMessageEntity = {
      id: randomUUID(),
      channelId: data.channelId,
      senderId: data.senderId,
      parentMessageId: data.parentMessageId ?? null,
      content: data.content,
      attachments: data.attachments ?? [],
      isDeleted: false,
      createdAt: now,
    };
    this.messages.set(msg.id, msg);

    // Cập nhật updatedAt của channel
    const channel = this.channels.get(data.channelId);
    if (channel) {
      channel.updatedAt = now;
    }

    return msg;
  }

  public async findMessageById(id: string): Promise<ChatMessageEntity | null> {
    const msg = this.messages.get(id);
    if (!msg || msg.isDeleted) return null;

    // Tính số replies nếu là tin nhắn cha
    const repliesCount = Array.from(this.messages.values()).filter(
      (m) => m.parentMessageId === id && !m.isDeleted,
    ).length;

    return { ...msg, repliesCount };
  }

  public async listMessages(
    channelId: string,
    options: MessageListOptions = {},
  ): Promise<ChatMessageEntity[]> {
    const limit = options.limit ?? 50;
    let msgs = Array.from(this.messages.values()).filter(
      (m) => m.channelId === channelId && !m.isDeleted,
    );

    // Lọc theo parentMessageId nếu được chỉ định (phục vụ Chat Threads)
    if (options.parentMessageId !== undefined) {
      msgs = msgs.filter((m) => m.parentMessageId === options.parentMessageId);
    }

    // Sắp xếp thời gian giảm dần (tin nhắn mới nhất trước)
    msgs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Keyset cursor decode: Base64(createdAtMs:id)
    if (options.cursor) {
      try {
        const decoded = Buffer.from(options.cursor, 'base64url').toString('utf-8');
        const [timeMsStr, id] = decoded.split(':');
        const timeMs = parseInt(timeMsStr ?? '0', 10);
        msgs = msgs.filter((m) => {
          const mTime = m.createdAt.getTime();
          return mTime < timeMs || (mTime === timeMs && m.id < (id ?? ''));
        });
      } catch {
        // Cursor không hợp lệ -> bỏ qua
      }
    }

    const sliced = msgs.slice(0, limit);

    // Tính repliesCount cho mỗi tin nhắn
    return sliced.map((m) => {
      const repliesCount = Array.from(this.messages.values()).filter(
        (reply) => reply.parentMessageId === m.id && !reply.isDeleted,
      ).length;
      return { ...m, repliesCount };
    });
  }

  public async getLatestMessage(channelId: string): Promise<ChatMessageEntity | null> {
    const msgs = Array.from(this.messages.values()).filter(
      (m) => m.channelId === channelId && !m.isDeleted,
    );
    if (msgs.length === 0) return null;
    msgs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return msgs[0] ?? null;
  }

  // --- Chat Requests ---
  public async createChatRequest(data: {
    senderId: string;
    receiverId: string;
    initialMessage: string;
  }): Promise<ChatRequestEntity> {
    const now = new Date();
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
    this.chatRequests.set(req.id, req);
    return req;
  }

  public async findChatRequestById(id: string): Promise<ChatRequestEntity | null> {
    return this.chatRequests.get(id) ?? null;
  }

  public async findChatRequestBetween(
    senderId: string,
    receiverId: string,
  ): Promise<ChatRequestEntity | null> {
    for (const req of this.chatRequests.values()) {
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
    const req = this.chatRequests.get(id);
    if (!req) return null;

    req.status = status;
    req.updatedAt = new Date();
    if (channelId !== undefined) {
      req.channelId = channelId;
    }
    return req;
  }

  public async listPendingRequestsForReceiver(receiverId: string): Promise<ChatRequestEntity[]> {
    return Array.from(this.chatRequests.values())
      .filter((r) => r.receiverId === receiverId && r.status === 'PENDING')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async listPendingRequestsForSender(senderId: string): Promise<ChatRequestEntity[]> {
    return Array.from(this.chatRequests.values())
      .filter((r) => r.senderId === senderId && r.status === 'PENDING')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async deleteChatRequest(id: string): Promise<boolean> {
    return this.chatRequests.delete(id);
  }

  // --- User details ---
  public async findUserById(userId: string): Promise<UserSummary | null> {
    const cached = this.users.get(userId);
    if (cached) return cached;
    if (this.userLookup) {
      const u = await this.userLookup.findById(userId);
      if (u) {
        const summary: UserSummary = {
          id: u.id,
          username: u.username,
          avatarUrl: u.avatarUrl ?? null,
        };
        this.users.set(u.id, summary);
        return summary;
      }
    }
    return null;
  }

  public async findUserByUsername(username: string): Promise<UserSummary | null> {
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        return u;
      }
    }
    return null;
  }
}

/**
 * PostgresChatRepository: Triển khai CSDL PostgreSQL 16 sản xuất.
 */
export class PostgresChatRepository implements IChatRepository {
  constructor(private pool: pg.Pool) {}

  public async createChannel(data: {
    type: ChatChannelType;
    name?: string | null | undefined;
    creatorId: string;
  }): Promise<ChatChannelEntity> {
    const query = `
      INSERT INTO chat_channels (type, name, creator_id)
      VALUES ($1, $2, $3)
      RETURNING id, type, name, creator_id, created_at, updated_at
    `;
    const res = await this.pool.query(query, [data.type, data.name ?? null, data.creatorId]);
    const row = res.rows[0];
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      creatorId: row.creator_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  public async findChannelById(id: string): Promise<ChatChannelEntity | null> {
    const query = `
      SELECT id, type, name, creator_id, created_at, updated_at
      FROM chat_channels
      WHERE id = $1
    `;
    const res = await this.pool.query(query, [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      creatorId: row.creator_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  public async findDirectChannelBetween(
    user1Id: string,
    user2Id: string,
  ): Promise<ChatChannelEntity | null> {
    const query = `
      SELECT c.id, c.type, c.name, c.creator_id, c.created_at, c.updated_at
      FROM chat_channels c
      JOIN chat_members m1 ON c.id = m1.channel_id AND m1.user_id = $1
      JOIN chat_members m2 ON c.id = m2.channel_id AND m2.user_id = $2
      WHERE c.type = 'DIRECT'
      LIMIT 1
    `;
    const res = await this.pool.query(query, [user1Id, user2Id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      creatorId: row.creator_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  public async listUserChannels(userId: string): Promise<ChatChannelEntity[]> {
    const query = `
      SELECT c.id, c.type, c.name, c.creator_id, c.created_at, c.updated_at
      FROM chat_channels c
      JOIN chat_members m ON c.id = m.channel_id
      WHERE m.user_id = $1
      ORDER BY c.updated_at DESC
    `;
    const res = await this.pool.query(query, [userId]);
    return res.rows.map((row) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      creatorId: row.creator_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  public async addMember(channelId: string, userId: string): Promise<void> {
    const query = `
      INSERT INTO chat_members (channel_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (channel_id, user_id) DO NOTHING
    `;
    await this.pool.query(query, [channelId, userId]);
  }

  public async removeMember(channelId: string, userId: string): Promise<void> {
    await this.pool.query('DELETE FROM chat_members WHERE channel_id = $1 AND user_id = $2', [
      channelId,
      userId,
    ]);
  }

  public async isMember(channelId: string, userId: string): Promise<boolean> {
    const res = await this.pool.query(
      'SELECT 1 FROM chat_members WHERE channel_id = $1 AND user_id = $2 LIMIT 1',
      [channelId, userId],
    );
    return res.rows.length > 0;
  }

  public async getChannelMembers(channelId: string): Promise<ChatMemberEntity[]> {
    const query = `
      SELECT channel_id, user_id, last_read_message_id, joined_at
      FROM chat_members
      WHERE channel_id = $1
    `;
    const res = await this.pool.query(query, [channelId]);
    return res.rows.map((r) => ({
      channelId: r.channel_id,
      userId: r.user_id,
      lastReadMessageId: r.last_read_message_id,
      joinedAt: new Date(r.joined_at),
    }));
  }

  public async updateLastRead(channelId: string, userId: string, messageId: string): Promise<void> {
    await this.pool.query(
      'UPDATE chat_members SET last_read_message_id = $1 WHERE channel_id = $2 AND user_id = $3',
      [messageId, channelId, userId],
    );
  }

  public async countUnreadMessages(channelId: string, userId: string): Promise<number> {
    const query = `
      WITH user_member AS (
        SELECT last_read_message_id FROM chat_members WHERE channel_id = $1 AND user_id = $2
      ),
      last_read AS (
        SELECT created_at FROM chat_messages WHERE id = (SELECT last_read_message_id FROM user_member)
      )
      SELECT COUNT(*)::int AS unread_count
      FROM chat_messages
      WHERE channel_id = $1
        AND sender_id != $2
        AND is_deleted = false
        AND (
          (SELECT created_at FROM last_read) IS NULL
          OR created_at > (SELECT created_at FROM last_read)
        )
    `;
    const res = await this.pool.query(query, [channelId, userId]);
    return res.rows[0]?.unread_count ?? 0;
  }

  public async createMessage(data: {
    channelId: string;
    senderId: string;
    parentMessageId?: string | null | undefined;
    content: string;
    attachments?: unknown[] | undefined;
  }): Promise<ChatMessageEntity> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const insertQuery = `
        INSERT INTO chat_messages (channel_id, sender_id, parent_message_id, content, attachments)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING id, channel_id, sender_id, parent_message_id, content, attachments, is_deleted, created_at
      `;
      const res = await client.query(insertQuery, [
        data.channelId,
        data.senderId,
        data.parentMessageId ?? null,
        data.content,
        JSON.stringify(data.attachments ?? []),
      ]);

      await client.query('UPDATE chat_channels SET updated_at = NOW() WHERE id = $1', [
        data.channelId,
      ]);

      await client.query('COMMIT');
      const row = res.rows[0];
      return {
        id: row.id,
        channelId: row.channel_id,
        senderId: row.sender_id,
        parentMessageId: row.parent_message_id,
        content: row.content,
        attachments: row.attachments ?? [],
        isDeleted: row.is_deleted,
        createdAt: new Date(row.created_at),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async findMessageById(id: string): Promise<ChatMessageEntity | null> {
    const query = `
      SELECT m.id, m.channel_id, m.sender_id, m.parent_message_id, m.content, m.attachments, m.is_deleted, m.created_at,
             (SELECT COUNT(*)::int FROM chat_messages r WHERE r.parent_message_id = m.id AND r.is_deleted = false) AS replies_count
      FROM chat_messages m
      WHERE m.id = $1 AND m.is_deleted = false
    `;
    const res = await this.pool.query(query, [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      channelId: row.channel_id,
      senderId: row.sender_id,
      parentMessageId: row.parent_message_id,
      content: row.content,
      attachments: row.attachments ?? [],
      isDeleted: row.is_deleted,
      createdAt: new Date(row.created_at),
      repliesCount: row.replies_count,
    };
  }

  public async listMessages(
    channelId: string,
    options: MessageListOptions = {},
  ): Promise<ChatMessageEntity[]> {
    const limit = options.limit ?? 50;
    const params: unknown[] = [channelId, limit];
    let whereClause = 'WHERE m.channel_id = $1 AND m.is_deleted = false';

    if (options.parentMessageId !== undefined) {
      if (options.parentMessageId === null) {
        whereClause += ' AND m.parent_message_id IS NULL';
      } else {
        params.push(options.parentMessageId);
        whereClause += ` AND m.parent_message_id = $${params.length}`;
      }
    }

    if (options.cursor) {
      try {
        const decoded = Buffer.from(options.cursor, 'base64url').toString('utf-8');
        const [timeMsStr, cursorId] = decoded.split(':');
        const timeDate = new Date(parseInt(timeMsStr ?? '0', 10));
        params.push(timeDate, cursorId);
        whereClause += ` AND (m.created_at < $${params.length - 1} OR (m.created_at = $${params.length - 1} AND m.id < $${params.length}))`;
      } catch {
        // Cursor không hợp lệ
      }
    }

    const query = `
      SELECT m.id, m.channel_id, m.sender_id, m.parent_message_id, m.content, m.attachments, m.is_deleted, m.created_at,
             (SELECT COUNT(*)::int FROM chat_messages r WHERE r.parent_message_id = m.id AND r.is_deleted = false) AS replies_count
      FROM chat_messages m
      ${whereClause}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT $2
    `;
    const res = await this.pool.query(query, params);
    return res.rows.map((row) => ({
      id: row.id,
      channelId: row.channel_id,
      senderId: row.sender_id,
      parentMessageId: row.parent_message_id,
      content: row.content,
      attachments: row.attachments ?? [],
      isDeleted: row.is_deleted,
      createdAt: new Date(row.created_at),
      repliesCount: row.replies_count,
    }));
  }

  public async getLatestMessage(channelId: string): Promise<ChatMessageEntity | null> {
    const query = `
      SELECT id, channel_id, sender_id, parent_message_id, content, attachments, is_deleted, created_at
      FROM chat_messages
      WHERE channel_id = $1 AND is_deleted = false
      ORDER BY created_at DESC
      LIMIT 1
    `;
    const res = await this.pool.query(query, [channelId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      channelId: row.channel_id,
      senderId: row.sender_id,
      parentMessageId: row.parent_message_id,
      content: row.content,
      attachments: row.attachments ?? [],
      isDeleted: row.is_deleted,
      createdAt: new Date(row.created_at),
    };
  }

  public async createChatRequest(data: {
    senderId: string;
    receiverId: string;
    initialMessage: string;
  }): Promise<ChatRequestEntity> {
    const query = `
      INSERT INTO chat_requests (sender_id, receiver_id, initial_message, status)
      VALUES ($1, $2, $3, 'PENDING')
      RETURNING id, sender_id, receiver_id, channel_id, initial_message, status, created_at, updated_at
    `;
    const res = await this.pool.query(query, [data.senderId, data.receiverId, data.initialMessage]);
    const row = res.rows[0];
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      channelId: row.channel_id,
      initialMessage: row.initial_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  public async findChatRequestById(id: string): Promise<ChatRequestEntity | null> {
    const query = `
      SELECT id, sender_id, receiver_id, channel_id, initial_message, status, created_at, updated_at
      FROM chat_requests
      WHERE id = $1
    `;
    const res = await this.pool.query(query, [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      channelId: row.channel_id,
      initialMessage: row.initial_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  public async findChatRequestBetween(
    senderId: string,
    receiverId: string,
  ): Promise<ChatRequestEntity | null> {
    const query = `
      SELECT id, sender_id, receiver_id, channel_id, initial_message, status, created_at, updated_at
      FROM chat_requests
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      LIMIT 1
    `;
    const res = await this.pool.query(query, [senderId, receiverId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      channelId: row.channel_id,
      initialMessage: row.initial_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  public async updateChatRequestStatus(
    id: string,
    status: ChatRequestStatus,
    channelId?: string | null | undefined,
  ): Promise<ChatRequestEntity | null> {
    const query = `
      UPDATE chat_requests
      SET status = $1, channel_id = COALESCE($2, channel_id), updated_at = NOW()
      WHERE id = $3
      RETURNING id, sender_id, receiver_id, channel_id, initial_message, status, created_at, updated_at
    `;
    const res = await this.pool.query(query, [status, channelId ?? null, id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      channelId: row.channel_id,
      initialMessage: row.initial_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  public async listPendingRequestsForReceiver(receiverId: string): Promise<ChatRequestEntity[]> {
    const query = `
      SELECT id, sender_id, receiver_id, channel_id, initial_message, status, created_at, updated_at
      FROM chat_requests
      WHERE receiver_id = $1 AND status = 'PENDING'
      ORDER BY created_at DESC
    `;
    const res = await this.pool.query(query, [receiverId]);
    return res.rows.map((row) => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      channelId: row.channel_id,
      initialMessage: row.initial_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  public async listPendingRequestsForSender(senderId: string): Promise<ChatRequestEntity[]> {
    const query = `
      SELECT id, sender_id, receiver_id, channel_id, initial_message, status, created_at, updated_at
      FROM chat_requests
      WHERE sender_id = $1 AND status = 'PENDING'
      ORDER BY created_at DESC
    `;
    const res = await this.pool.query(query, [senderId]);
    return res.rows.map((row) => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      channelId: row.channel_id,
      initialMessage: row.initial_message,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  public async deleteChatRequest(id: string): Promise<boolean> {
    const res = await this.pool.query('DELETE FROM chat_requests WHERE id = $1', [id]);
    return (res.rowCount ?? 0) > 0;
  }

  public async findUserById(userId: string): Promise<UserSummary | null> {
    const query = 'SELECT id, username, avatar_url FROM users WHERE id = $1';
    const res = await this.pool.query(query, [userId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      username: row.username,
      avatarUrl: row.avatar_url,
    };
  }

  public async findUserByUsername(username: string): Promise<UserSummary | null> {
    const query = 'SELECT id, username, avatar_url FROM users WHERE LOWER(username) = LOWER($1)';
    const res = await this.pool.query(query, [username]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      username: row.username,
      avatarUrl: row.avatar_url,
    };
  }
}
