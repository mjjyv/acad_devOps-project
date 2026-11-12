import type { ChatChannelType, ChatRequestStatus } from '@acad/contracts';
import type pg from 'pg';
import {
  type ChatChannelEntity,
  ChatDatabaseError,
  type ChatMemberEntity,
  type ChatMessageEntity,
  type ChatRequestEntity,
  type ChatUserSummary,
  type IChatRepository,
  type MessageListOptions,
} from './chat-repository.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(val: string): boolean {
  return UUID_REGEX.test(val);
}

/** PostgreSQL 16 Chat Repository aligned with migration 000004 & 000007. */
export class PostgresChatRepository implements IChatRepository {
  constructor(private readonly pool: pg.Pool) {}

  private mapChannelRow(row: Record<string, unknown>): ChatChannelEntity {
    return {
      id: String(row.id),
      type: row.type as ChatChannelType,
      name: row.name ? String(row.name) : null,
      creatorId: String(row.creator_id),
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    };
  }

  private mapMessageRow(row: Record<string, unknown>): ChatMessageEntity {
    return {
      id: String(row.id),
      channelId: String(row.channel_id),
      senderId: String(row.sender_id),
      parentMessageId: row.parent_message_id ? String(row.parent_message_id) : null,
      content: String(row.content),
      attachments: Array.isArray(row.attachments) ? (row.attachments as unknown[]) : [],
      isDeleted: Boolean(row.is_deleted),
      createdAt: new Date(String(row.created_at)),
      repliesCount:
        row.replies_count !== undefined ? Number.parseInt(String(row.replies_count), 10) : 0,
    };
  }

  private mapRequestRow(row: Record<string, unknown>): ChatRequestEntity {
    return {
      id: String(row.id),
      senderId: String(row.sender_id),
      receiverId: String(row.receiver_id),
      channelId: row.channel_id ? String(row.channel_id) : null,
      initialMessage: String(row.initial_message),
      status: row.status as ChatRequestStatus,
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    };
  }

  public async createChannel(data: {
    type: ChatChannelType;
    name?: string | null | undefined;
    creatorId: string;
  }): Promise<ChatChannelEntity> {
    try {
      const res = await this.pool.query(
        `INSERT INTO chat_channels (type, name, creator_id)
         VALUES ($1, $2, $3)
         RETURNING *;`,
        [data.type, data.name ?? null, data.creatorId],
      );
      return this.mapChannelRow(res.rows[0]);
    } catch (err) {
      throw new ChatDatabaseError('Lỗi tạo kênh chat trên PostgreSQL', err);
    }
  }

  public async findChannelById(id: string): Promise<ChatChannelEntity | null> {
    if (!isUuid(id)) return null;
    try {
      const res = await this.pool.query('SELECT * FROM chat_channels WHERE id = $1 LIMIT 1;', [id]);
      return res.rows[0] ? this.mapChannelRow(res.rows[0]) : null;
    } catch (err) {
      throw new ChatDatabaseError('Lỗi tìm kênh chat theo id', err);
    }
  }

  public async findDirectChannelBetween(
    user1Id: string,
    user2Id: string,
  ): Promise<ChatChannelEntity | null> {
    if (!isUuid(user1Id) || !isUuid(user2Id)) return null;
    try {
      const res = await this.pool.query(
        `SELECT c.*
         FROM chat_channels c
         INNER JOIN chat_members m1 ON c.id = m1.channel_id AND m1.user_id = $1
         INNER JOIN chat_members m2 ON c.id = m2.channel_id AND m2.user_id = $2
         WHERE c.type = 'DIRECT'
         LIMIT 1;`,
        [user1Id, user2Id],
      );
      return res.rows[0] ? this.mapChannelRow(res.rows[0]) : null;
    } catch (err) {
      throw new ChatDatabaseError('Lỗi tìm kênh direct 1-1', err);
    }
  }

  public async listUserChannels(userId: string): Promise<ChatChannelEntity[]> {
    try {
      const res = await this.pool.query(
        `SELECT c.*
         FROM chat_channels c
         INNER JOIN chat_members m ON c.id = m.channel_id
         WHERE m.user_id = $1
         ORDER BY c.updated_at DESC;`,
        [userId],
      );
      return res.rows.map((r) => this.mapChannelRow(r));
    } catch (err) {
      throw new ChatDatabaseError('Lỗi liệt kê kênh chat của người dùng', err);
    }
  }

  public async addMember(channelId: string, userId: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO chat_members (channel_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (channel_id, user_id) DO NOTHING;`,
        [channelId, userId],
      );
    } catch (err) {
      throw new ChatDatabaseError('Lỗi thêm thành viên phòng chat', err);
    }
  }

  public async removeMember(channelId: string, userId: string): Promise<void> {
    try {
      await this.pool.query('DELETE FROM chat_members WHERE channel_id = $1 AND user_id = $2;', [
        channelId,
        userId,
      ]);
    } catch (err) {
      throw new ChatDatabaseError('Lỗi xóa thành viên phòng chat', err);
    }
  }

  public async isMember(channelId: string, userId: string): Promise<boolean> {
    if (!isUuid(channelId) || !isUuid(userId)) return false;
    try {
      const res = await this.pool.query(
        'SELECT 1 FROM chat_members WHERE channel_id = $1 AND user_id = $2 LIMIT 1;',
        [channelId, userId],
      );
      return res.rows.length > 0;
    } catch (err) {
      throw new ChatDatabaseError('Lỗi kiểm tra thành viên phòng chat', err);
    }
  }

  public async getChannelMembers(channelId: string): Promise<ChatMemberEntity[]> {
    try {
      const res = await this.pool.query('SELECT * FROM chat_members WHERE channel_id = $1;', [
        channelId,
      ]);
      return res.rows.map((r) => ({
        channelId: String(r.channel_id),
        userId: String(r.user_id),
        lastReadMessageId: r.last_read_message_id ? String(r.last_read_message_id) : null,
        joinedAt: new Date(String(r.joined_at)),
      }));
    } catch (err) {
      throw new ChatDatabaseError('Lỗi liệt kê thành viên phòng chat', err);
    }
  }

  public async updateLastRead(channelId: string, userId: string, messageId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE chat_members SET last_read_message_id = $1 WHERE channel_id = $2 AND user_id = $3;',
        [messageId, channelId, userId],
      );
    } catch (err) {
      throw new ChatDatabaseError('Lỗi cập nhật trạng thái đã đọc', err);
    }
  }

  public async countUnreadMessages(channelId: string, userId: string): Promise<number> {
    try {
      const res = await this.pool.query(
        `WITH member_read AS (
           SELECT last_read_message_id
           FROM chat_members
           WHERE channel_id = $1 AND user_id = $2
           LIMIT 1
         ),
         read_ts AS (
           SELECT COALESCE(
             (SELECT created_at FROM chat_messages WHERE id = (SELECT last_read_message_id FROM member_read)),
             TO_TIMESTAMP(0)
           ) AS ts
         )
         SELECT COUNT(*)::int AS unread
         FROM chat_messages
         WHERE channel_id = $1
           AND is_deleted = FALSE
           AND parent_message_id IS NULL
           AND sender_id <> $2
           AND created_at > (SELECT ts FROM read_ts);`,
        [channelId, userId],
      );
      return Number.parseInt(String(res.rows[0]?.unread ?? 0), 10);
    } catch (err) {
      throw new ChatDatabaseError('Lỗi đếm tin nhắn chưa đọc', err);
    }
  }

  public async createMessage(data: {
    channelId: string;
    senderId: string;
    parentMessageId?: string | null | undefined;
    content: string;
    attachments?: unknown[] | undefined;
  }): Promise<ChatMessageEntity> {
    try {
      const res = await this.pool.query(
        `INSERT INTO chat_messages (channel_id, sender_id, parent_message_id, content, attachments)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING *, 0 AS replies_count;`,
        [
          data.channelId,
          data.senderId,
          data.parentMessageId ?? null,
          data.content,
          JSON.stringify(data.attachments ?? []),
        ],
      );
      return this.mapMessageRow(res.rows[0]);
    } catch (err) {
      throw new ChatDatabaseError('Lỗi tạo tin nhắn mới', err);
    }
  }

  public async findMessageById(id: string): Promise<ChatMessageEntity | null> {
    if (!isUuid(id)) return null;
    try {
      const res = await this.pool.query(
        `SELECT m.*,
                (SELECT COUNT(*)::int FROM chat_messages r WHERE r.parent_message_id = m.id AND r.is_deleted = FALSE) AS replies_count
         FROM chat_messages m
         WHERE m.id = $1 AND m.is_deleted = FALSE
         LIMIT 1;`,
        [id],
      );
      return res.rows[0] ? this.mapMessageRow(res.rows[0]) : null;
    } catch (err) {
      throw new ChatDatabaseError('Lỗi tìm tin nhắn theo id', err);
    }
  }

  public async listMessages(
    channelId: string,
    options?: MessageListOptions | undefined,
  ): Promise<ChatMessageEntity[]> {
    try {
      const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
      const parentId = options?.parentMessageId ?? null;
      const params: unknown[] = [channelId, limit];
      const conditions = ['m.channel_id = $1', 'm.is_deleted = FALSE'];

      if (parentId) {
        if (!isUuid(parentId)) return [];
        params.push(parentId);
        conditions.push(`m.parent_message_id = $${params.length}`);
      } else {
        conditions.push('m.parent_message_id IS NULL');
      }

      if (options?.cursor) {
        try {
          const decoded = Buffer.from(options.cursor, 'base64url').toString('utf8');
          const [tsStr, id] = decoded.split(':');
          const ts = Number.parseInt(tsStr ?? '', 10);
          if (!Number.isNaN(ts) && id && isUuid(id)) {
            params.push(new Date(ts));
            const tsParam = params.length;
            params.push(id);
            const idParam = params.length;
            conditions.push(
              `(m.created_at < $${tsParam} OR (m.created_at = $${tsParam} AND m.id < $${idParam}::uuid))`,
            );
          }
        } catch {
          // ignore malformed cursor
        }
      }

      const orderBy = parentId
        ? 'ORDER BY m.created_at ASC, m.id ASC'
        : 'ORDER BY m.created_at DESC, m.id DESC';

      const res = await this.pool.query(
        `SELECT m.*,
                (SELECT COUNT(*)::int FROM chat_messages r WHERE r.parent_message_id = m.id AND r.is_deleted = FALSE) AS replies_count
         FROM chat_messages m
         WHERE ${conditions.join(' AND ')}
         ${orderBy}
         LIMIT $2;`,
        params,
      );
      return res.rows.map((r) => this.mapMessageRow(r));
    } catch (err) {
      throw new ChatDatabaseError('Lỗi liệt kê tin nhắn kênh chat', err);
    }
  }

  public async getLatestMessage(channelId: string): Promise<ChatMessageEntity | null> {
    try {
      const res = await this.pool.query(
        `SELECT *, 0 AS replies_count
         FROM chat_messages
         WHERE channel_id = $1 AND is_deleted = FALSE AND parent_message_id IS NULL
         ORDER BY created_at DESC, id DESC
         LIMIT 1;`,
        [channelId],
      );
      return res.rows[0] ? this.mapMessageRow(res.rows[0]) : null;
    } catch (err) {
      throw new ChatDatabaseError('Lỗi lấy tin nhắn mới nhất', err);
    }
  }

  public async createChatRequest(data: {
    senderId: string;
    receiverId: string;
    initialMessage: string;
  }): Promise<ChatRequestEntity> {
    try {
      const res = await this.pool.query(
        `INSERT INTO chat_requests (sender_id, receiver_id, initial_message, status)
         VALUES ($1, $2, $3, 'PENDING')
         ON CONFLICT (sender_id, receiver_id) DO UPDATE
           SET initial_message = EXCLUDED.initial_message,
               status = 'PENDING',
               updated_at = NOW()
         RETURNING *;`,
        [data.senderId, data.receiverId, data.initialMessage],
      );
      return this.mapRequestRow(res.rows[0]);
    } catch (err) {
      throw new ChatDatabaseError('Lỗi tạo yêu cầu trò chuyện', err);
    }
  }

  public async findChatRequestById(id: string): Promise<ChatRequestEntity | null> {
    if (!isUuid(id)) return null;
    try {
      const res = await this.pool.query('SELECT * FROM chat_requests WHERE id = $1 LIMIT 1;', [id]);
      return res.rows[0] ? this.mapRequestRow(res.rows[0]) : null;
    } catch (err) {
      throw new ChatDatabaseError('Lỗi tìm yêu cầu chat theo id', err);
    }
  }

  public async findChatRequestBetween(
    senderId: string,
    receiverId: string,
  ): Promise<ChatRequestEntity | null> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM chat_requests
         WHERE (sender_id = $1 AND receiver_id = $2)
            OR (sender_id = $2 AND receiver_id = $1)
         ORDER BY updated_at DESC
         LIMIT 1;`,
        [senderId, receiverId],
      );
      return res.rows[0] ? this.mapRequestRow(res.rows[0]) : null;
    } catch (err) {
      throw new ChatDatabaseError('Lỗi tìm yêu cầu chat giữa hai người dùng', err);
    }
  }

  public async updateChatRequestStatus(
    id: string,
    status: ChatRequestStatus,
    channelId?: string | null | undefined,
  ): Promise<ChatRequestEntity | null> {
    try {
      const res = await this.pool.query(
        `UPDATE chat_requests
         SET status = $2,
             channel_id = COALESCE($3, channel_id),
             updated_at = NOW()
         WHERE id = $1
         RETURNING *;`,
        [id, status, channelId ?? null],
      );
      return res.rows[0] ? this.mapRequestRow(res.rows[0]) : null;
    } catch (err) {
      throw new ChatDatabaseError('Lỗi cập nhật trạng thái yêu cầu chat', err);
    }
  }

  public async listPendingRequestsForReceiver(receiverId: string): Promise<ChatRequestEntity[]> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM chat_requests
         WHERE receiver_id = $1 AND status = 'PENDING'
         ORDER BY created_at DESC;`,
        [receiverId],
      );
      return res.rows.map((r) => this.mapRequestRow(r));
    } catch (err) {
      throw new ChatDatabaseError('Lỗi liệt kê yêu cầu chat đến', err);
    }
  }

  public async listPendingRequestsForSender(senderId: string): Promise<ChatRequestEntity[]> {
    try {
      const res = await this.pool.query(
        `SELECT * FROM chat_requests
         WHERE sender_id = $1 AND status = 'PENDING'
         ORDER BY created_at DESC;`,
        [senderId],
      );
      return res.rows.map((r) => this.mapRequestRow(r));
    } catch (err) {
      throw new ChatDatabaseError('Lỗi liệt kê yêu cầu chat đã gửi', err);
    }
  }

  public async deleteChatRequest(id: string): Promise<boolean> {
    if (!isUuid(id)) return false;
    try {
      const res = await this.pool.query('DELETE FROM chat_requests WHERE id = $1;', [id]);
      return (res.rowCount ?? 0) > 0;
    } catch (err) {
      throw new ChatDatabaseError('Lỗi hủy yêu cầu chat', err);
    }
  }

  public async findUserById(userId: string): Promise<ChatUserSummary | null> {
    if (!isUuid(userId)) return null;
    try {
      const res = await this.pool.query(
        'SELECT id, username, avatar_url FROM users WHERE id = $1 LIMIT 1;',
        [userId],
      );
      if (!res.rows[0]) return null;
      return {
        id: String(res.rows[0].id),
        username: String(res.rows[0].username),
        avatarUrl: res.rows[0].avatar_url ? String(res.rows[0].avatar_url) : null,
      };
    } catch (err) {
      throw new ChatDatabaseError('Lỗi tra cứu thông tin user trong chat', err);
    }
  }

  public async findUserByUsername(username: string): Promise<ChatUserSummary | null> {
    try {
      const res = await this.pool.query(
        'SELECT id, username, avatar_url FROM users WHERE LOWER(username) = LOWER($1) LIMIT 1;',
        [username],
      );
      if (!res.rows[0]) return null;
      return {
        id: String(res.rows[0].id),
        username: String(res.rows[0].username),
        avatarUrl: res.rows[0].avatar_url ? String(res.rows[0].avatar_url) : null,
      };
    } catch (err) {
      throw new ChatDatabaseError('Lỗi tra cứu user theo username trong chat', err);
    }
  }
}
