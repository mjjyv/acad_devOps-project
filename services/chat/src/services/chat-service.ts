import type {
  ChatAttachment,
  ChatChannel,
  ChatMessage,
  ChatRequest,
  SendMessageInput,
} from '@acad/contracts';
import type { PresenceManager } from '../realtime/presence-manager.js';
import type { SseManager } from '../realtime/sse-manager.js';
import type {
  ChatChannelEntity,
  ChatMessageEntity,
  IChatRepository,
  MessageListOptions,
} from '../repository/chat-repository.js';

export class ChatChannelNotFoundError extends Error {
  constructor(channelId: string) {
    super(`Không tìm thấy phòng chat với mã định danh: ${channelId}`);
    this.name = 'ChatChannelNotFoundError';
  }
}

export class ChatRequestNotFoundError extends Error {
  constructor(requestId: string) {
    super(`Không tìm thấy yêu cầu trò chuyện với mã định danh: ${requestId}`);
    this.name = 'ChatRequestNotFoundError';
  }
}

export class ParentMessageNotFoundError extends Error {
  constructor(parentId: string) {
    super(`Không tìm thấy tin nhắn gốc của nhánh thảo luận con: ${parentId}`);
    this.name = 'ParentMessageNotFoundError';
  }
}

export class NotChannelMemberError extends Error {
  constructor() {
    super('Bạn không phải là thành viên của phòng chat này');
    this.name = 'NotChannelMemberError';
  }
}

export class UserBlockedError extends Error {
  constructor() {
    super('Bạn đã bị chặn bởi người dùng này và không thể gửi tin nhắn');
    this.name = 'UserBlockedError';
  }
}

export class DuplicateChatRequestError extends Error {
  constructor() {
    super('Yêu cầu trò chuyện của bạn đã được gửi trước đó và đang chờ phản hồi');
    this.name = 'DuplicateChatRequestError';
  }
}

export class CannotChatWithSelfError extends Error {
  constructor() {
    super('Không thể bắt đầu cuộc trò chuyện với chính mình');
    this.name = 'CannotChatWithSelfError';
  }
}

export class RecipientNotFoundError extends Error {
  constructor(recipientId: string) {
    super(`Không tìm thấy người nhận với mã định danh: ${recipientId}`);
    this.name = 'RecipientNotFoundError';
  }
}

export class CannotCreateSoloGroupError extends Error {
  constructor() {
    super('Phòng chat nhóm cần tối thiểu 1 thành viên khác ngoài người tạo');
    this.name = 'CannotCreateSoloGroupError';
  }
}

export class ChatService {
  constructor(
    private readonly repo: IChatRepository,
    private readonly sseManager: SseManager,
    private readonly presenceManager: PresenceManager,
  ) {}

  public async initiateDirectChat(
    senderId: string,
    recipientId: string,
    initialMessage: string,
  ): Promise<{
    isRequest: boolean;
    channel?: ChatChannel | undefined;
    request?: ChatRequest | undefined;
  }> {
    if (senderId === recipientId) {
      throw new CannotChatWithSelfError();
    }

    const recipient = await this.repo.findUserById(recipientId);
    if (!recipient) {
      throw new RecipientNotFoundError(recipientId);
    }

    const existingReq = await this.repo.findChatRequestBetween(senderId, recipientId);
    if (existingReq?.status === 'BLOCKED') {
      throw new UserBlockedError();
    }

    const existingChannel = await this.repo.findDirectChannelBetween(senderId, recipientId);
    if (existingChannel) {
      await this.sendMessage(senderId, {
        channelId: existingChannel.id,
        content: initialMessage,
      });
      const hydrated = await this.hydrateChannel(existingChannel, senderId);
      return { isRequest: false, channel: hydrated };
    }

    if (existingReq?.status === 'PENDING') {
      if (existingReq.senderId === senderId) {
        throw new DuplicateChatRequestError();
      }
      // Người nhận chủ động gửi tin ngược lại -> tự động ACCEPT luôn
      const accepted = await this.respondChatRequest(existingReq.id, senderId, 'ACCEPTED');
      if (accepted.channel) {
        await this.sendMessage(senderId, {
          channelId: accepted.channel.id,
          content: initialMessage,
        });
        return { isRequest: false, channel: accepted.channel };
      }
    }

    const requestEntity = await this.repo.createChatRequest({
      senderId,
      receiverId: recipientId,
      initialMessage,
    });
    const sender = await this.repo.findUserById(senderId);

    const requestDto: ChatRequest = {
      id: requestEntity.id,
      senderId: requestEntity.senderId,
      senderUsername: sender?.username ?? 'Unknown',
      senderAvatarUrl: sender?.avatarUrl ?? null,
      receiverId: requestEntity.receiverId,
      receiverUsername: recipient.username,
      receiverAvatarUrl: recipient.avatarUrl,
      initialMessage: requestEntity.initialMessage,
      status: requestEntity.status,
      createdAt: requestEntity.createdAt.toISOString(),
      updatedAt: requestEntity.updatedAt.toISOString(),
    };

    this.sseManager.sendToUser(recipientId, 'chat_request:new', requestDto);
    return { isRequest: true, request: requestDto };
  }

  public async respondChatRequest(
    requestId: string,
    responderId: string,
    action: 'ACCEPTED' | 'IGNORED' | 'BLOCKED',
  ): Promise<{ request: ChatRequest; channel?: ChatChannel | undefined }> {
    const existing = await this.repo.findChatRequestById(requestId);
    if (!existing) {
      throw new ChatRequestNotFoundError(requestId);
    }
    if (existing.receiverId !== responderId) {
      throw new NotChannelMemberError();
    }

    if (action !== 'ACCEPTED') {
      const updated = await this.repo.updateChatRequestStatus(requestId, action);
      const sender = await this.repo.findUserById(existing.senderId);
      const receiver = await this.repo.findUserById(existing.receiverId);
      const requestDto: ChatRequest = {
        id: existing.id,
        senderId: existing.senderId,
        senderUsername: sender?.username ?? 'Unknown',
        senderAvatarUrl: sender?.avatarUrl ?? null,
        receiverId: existing.receiverId,
        receiverUsername: receiver?.username,
        receiverAvatarUrl: receiver?.avatarUrl ?? null,
        initialMessage: existing.initialMessage,
        status: updated?.status ?? action,
        createdAt: existing.createdAt.toISOString(),
        updatedAt: (updated?.updatedAt ?? new Date()).toISOString(),
      };
      this.sseManager.sendToUser(existing.senderId, 'chat_request:updated', requestDto);
      return { request: requestDto };
    }

    let channel = await this.repo.findDirectChannelBetween(existing.senderId, existing.receiverId);
    if (!channel) {
      channel = await this.repo.createChannel({
        type: 'DIRECT',
        creatorId: existing.senderId,
      });
      await this.repo.addMember(channel.id, existing.senderId);
      await this.repo.addMember(channel.id, existing.receiverId);

      await this.repo.createMessage({
        channelId: channel.id,
        senderId: existing.senderId,
        content: existing.initialMessage,
      });
    }

    const updated = await this.repo.updateChatRequestStatus(requestId, 'ACCEPTED', channel.id);
    const [sender, receiver] = await Promise.all([
      this.repo.findUserById(existing.senderId),
      this.repo.findUserById(existing.receiverId),
    ]);

    const channelForReceiver = await this.hydrateChannel(channel, existing.receiverId);
    const channelForSender = await this.hydrateChannel(channel, existing.senderId);

    const requestDto: ChatRequest = {
      id: existing.id,
      senderId: existing.senderId,
      senderUsername: sender?.username ?? 'Unknown',
      senderAvatarUrl: sender?.avatarUrl ?? null,
      receiverId: existing.receiverId,
      receiverUsername: receiver?.username,
      receiverAvatarUrl: receiver?.avatarUrl ?? null,
      initialMessage: existing.initialMessage,
      status: 'ACCEPTED',
      createdAt: existing.createdAt.toISOString(),
      updatedAt: (updated?.updatedAt ?? new Date()).toISOString(),
    };

    this.sseManager.sendToUser(existing.senderId, 'chat_request:updated', requestDto);
    this.sseManager.sendToUser(existing.senderId, 'channel:created', channelForSender);
    this.sseManager.sendToUser(existing.receiverId, 'channel:created', channelForReceiver);

    return { request: requestDto, channel: channelForReceiver };
  }

  public async cancelChatRequest(requestId: string, senderId: string): Promise<void> {
    const existing = await this.repo.findChatRequestById(requestId);
    if (!existing) {
      throw new ChatRequestNotFoundError(requestId);
    }
    if (existing.senderId !== senderId) {
      throw new NotChannelMemberError();
    }
    await this.repo.deleteChatRequest(requestId);
  }

  public async listRequests(
    userId: string,
    direction: 'incoming' | 'sent' | 'all' = 'incoming',
  ): Promise<{ incoming: ChatRequest[]; sent: ChatRequest[] }> {
    const [incomingEntities, sentEntities] = await Promise.all([
      direction === 'sent' ? Promise.resolve([]) : this.repo.listPendingRequestsForReceiver(userId),
      direction === 'incoming'
        ? Promise.resolve([])
        : this.repo.listPendingRequestsForSender(userId),
    ]);

    const hydrateList = async (
      entities: Awaited<ReturnType<IChatRepository['listPendingRequestsForReceiver']>>,
    ) =>
      Promise.all(
        entities.map(async (req) => {
          const [sender, receiver] = await Promise.all([
            this.repo.findUserById(req.senderId),
            this.repo.findUserById(req.receiverId),
          ]);
          return {
            id: req.id,
            senderId: req.senderId,
            senderUsername: sender?.username ?? 'Unknown',
            senderAvatarUrl: sender?.avatarUrl ?? null,
            receiverId: req.receiverId,
            receiverUsername: receiver?.username,
            receiverAvatarUrl: receiver?.avatarUrl ?? null,
            initialMessage: req.initialMessage,
            status: req.status,
            createdAt: req.createdAt.toISOString(),
            updatedAt: req.updatedAt.toISOString(),
          } satisfies ChatRequest;
        }),
      );

    const [incoming, sent] = await Promise.all([
      hydrateList(incomingEntities),
      hydrateList(sentEntities),
    ]);
    return { incoming, sent };
  }

  public async createGroupChannel(
    creatorId: string,
    name: string,
    memberIds: string[],
  ): Promise<ChatChannel> {
    const uniqueOtherIds = Array.from(new Set(memberIds.filter((id) => id !== creatorId)));
    if (uniqueOtherIds.length === 0) {
      throw new CannotCreateSoloGroupError();
    }

    const validOtherIds: string[] = [];
    for (const uid of uniqueOtherIds) {
      const user = await this.repo.findUserById(uid);
      if (!user) throw new RecipientNotFoundError(uid);
      validOtherIds.push(uid);
    }

    const channel = await this.repo.createChannel({
      type: 'GROUP',
      name: name.trim(),
      creatorId,
    });

    const allMembers = [creatorId, ...validOtherIds];
    for (const uid of allMembers) {
      await this.repo.addMember(channel.id, uid);
    }

    const dto = await this.hydrateChannel(channel, creatorId);
    for (const uid of validOtherIds) {
      const memberDto = await this.hydrateChannel(channel, uid);
      this.sseManager.sendToUser(uid, 'channel:created', memberDto);
    }
    return dto;
  }

  public async listUserChannels(userId: string): Promise<ChatChannel[]> {
    const channels = await this.repo.listUserChannels(userId);
    return Promise.all(channels.map((ch) => this.hydrateChannel(ch, userId)));
  }

  public async sendMessage(senderId: string, input: SendMessageInput): Promise<ChatMessage> {
    if (!input.channelId) {
      throw new ChatChannelNotFoundError('missing');
    }

    const channel = await this.repo.findChannelById(input.channelId);
    if (!channel) {
      throw new ChatChannelNotFoundError(input.channelId);
    }

    const isMember = await this.repo.isMember(channel.id, senderId);
    if (!isMember) {
      throw new NotChannelMemberError();
    }

    if (channel.type === 'DIRECT') {
      const members = await this.repo.getChannelMembers(channel.id);
      const other = members.find((m) => m.userId !== senderId);
      if (other) {
        const req = await this.repo.findChatRequestBetween(senderId, other.userId);
        if (req?.status === 'BLOCKED') {
          throw new UserBlockedError();
        }
      }
    }

    if (input.parentMessageId) {
      const parent = await this.repo.findMessageById(input.parentMessageId);
      if (!parent || parent.channelId !== channel.id) {
        throw new ParentMessageNotFoundError(input.parentMessageId);
      }
    }

    const entity = await this.repo.createMessage({
      channelId: channel.id,
      senderId,
      parentMessageId: input.parentMessageId,
      content: input.content,
      attachments: input.attachments,
    });

    await this.repo.updateLastRead(channel.id, senderId, entity.id);

    const dto = await this.mapMessageToDto(entity);
    const members = await this.repo.getChannelMembers(channel.id);
    this.sseManager.broadcastToChannel(
      members.map((m) => m.userId),
      'message:new',
      dto,
    );

    return dto;
  }

  public async listMessages(
    channelId: string,
    userId: string,
    options?: MessageListOptions,
  ): Promise<{ messages: ChatMessage[]; nextCursor: string | null }> {
    const channel = await this.repo.findChannelById(channelId);
    if (!channel) {
      throw new ChatChannelNotFoundError(channelId);
    }
    const isMember = await this.repo.isMember(channelId, userId);
    if (!isMember) {
      throw new NotChannelMemberError();
    }

    const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);
    const raw = await this.repo.listMessages(channelId, { ...options, limit: limit + 1 });
    const hasMore = raw.length > limit;
    const page = hasMore ? raw.slice(0, limit) : raw;

    const messages = await Promise.all(page.map((m) => this.mapMessageToDto(m)));
    const last = page[page.length - 1];
    const nextCursor =
      hasMore && last
        ? Buffer.from(`${last.createdAt.getTime()}:${last.id}`, 'utf8').toString('base64url')
        : null;

    return { messages, nextCursor };
  }

  public async markChannelAsRead(
    channelId: string,
    userId: string,
    messageId?: string,
  ): Promise<void> {
    const channel = await this.repo.findChannelById(channelId);
    if (!channel) throw new ChatChannelNotFoundError(channelId);

    const isMember = await this.repo.isMember(channelId, userId);
    if (!isMember) throw new NotChannelMemberError();

    const targetMessageId = messageId ?? (await this.repo.getLatestMessage(channelId))?.id;
    if (targetMessageId) {
      await this.repo.updateLastRead(channelId, userId, targetMessageId);
    }
  }

  public async notifyTyping(channelId: string, userId: string, isTyping: boolean): Promise<void> {
    const isMember = await this.repo.isMember(channelId, userId);
    if (!isMember) throw new NotChannelMemberError();

    await this.presenceManager.setTyping(channelId, userId, isTyping);
    const user = await this.repo.findUserById(userId);
    const members = await this.repo.getChannelMembers(channelId);
    const otherIds = members.map((m) => m.userId).filter((uid) => uid !== userId);

    this.sseManager.broadcastToChannel(otherIds, 'typing:update', {
      channelId,
      userId,
      username: user?.username ?? 'Unknown',
      isTyping,
    });
  }

  private async hydrateChannel(channel: ChatChannelEntity, viewerId: string): Promise<ChatChannel> {
    const [members, latestMsg, unreadCount] = await Promise.all([
      this.repo.getChannelMembers(channel.id),
      this.repo.getLatestMessage(channel.id),
      this.repo.countUnreadMessages(channel.id, viewerId),
    ]);

    let resolvedName = channel.name;
    if (channel.type === 'DIRECT' && !resolvedName) {
      const other = members.find((m) => m.userId !== viewerId);
      if (other) {
        const otherUser = await this.repo.findUserById(other.userId);
        resolvedName = otherUser?.username ?? null;
      }
    }

    return {
      id: channel.id,
      type: channel.type,
      name: resolvedName,
      creatorId: channel.creatorId,
      membersCount: members.length,
      lastMessage: latestMsg ? await this.mapMessageToDto(latestMsg) : null,
      unreadCount,
      createdAt: channel.createdAt.toISOString(),
      updatedAt: channel.updatedAt.toISOString(),
    };
  }

  private async mapMessageToDto(entity: ChatMessageEntity): Promise<ChatMessage> {
    const sender = await this.repo.findUserById(entity.senderId);
    return {
      id: entity.id,
      channelId: entity.channelId,
      senderId: entity.senderId,
      senderUsername: sender?.username ?? 'Unknown',
      senderAvatarUrl: sender?.avatarUrl ?? null,
      parentMessageId: entity.parentMessageId,
      content: entity.content,
      attachments: (entity.attachments ?? []) as ChatAttachment[],
      repliesCount: entity.repliesCount ?? 0,
      isDeleted: entity.isDeleted,
      createdAt: entity.createdAt.toISOString(),
    };
  }
}
