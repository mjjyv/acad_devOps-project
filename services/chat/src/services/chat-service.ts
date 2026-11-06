/**
 * @file chat-service.ts
 * @description Core Reddit Realtime Chat Service coordinating direct chats, group channels, requests queue, and threads.
 */

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

// ==============================================================================
// CUSTOM DOMAIN EXCEPTIONS (Ánh xạ chuẩn RFC 7807)
// ==============================================================================
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
    super(`Không tìm thấy tin nhắn gốc của nhánh thảo luận con (Thread): ${parentId}`);
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
    super('Yêu cầu trò chuyện của bạn đã được gửi trước đó và đang chờ người nhận phản hồi');
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

export class ChatService {
  constructor(
    private repo: IChatRepository,
    private sseManager: SseManager,
    private presenceManager: PresenceManager,
  ) {}

  /**
   * Bắt đầu trò chuyện trực tiếp 1-1
   * Nếu là người lạ -> Tạo ChatRequest (status: PENDING)
   * Nếu đã có kênh DIRECT -> Gửi tin nhắn thẳng vào kênh
   */
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

    const sender = await this.repo.findUserById(senderId);

    // 1. Kiểm tra xem người nhận có đang chặn người gửi không
    const existingRequest = await this.repo.findChatRequestBetween(senderId, recipientId);
    if (existingRequest) {
      if (existingRequest.status === 'BLOCKED') {
        throw new UserBlockedError();
      }
      if (existingRequest.status === 'PENDING') {
        throw new DuplicateChatRequestError();
      }
    }

    // 2. Kiểm tra xem kênh DIRECT giữa 2 người đã tồn tại chưa
    const existingChannel = await this.repo.findDirectChannelBetween(senderId, recipientId);
    if (existingChannel) {
      // Đã có kênh -> Gửi tin nhắn trực tiếp
      const msg = await this.sendMessage(senderId, {
        channelId: existingChannel.id,
        content: initialMessage,
      });
      const channelDto = await this.enrichChannelDto(existingChannel, senderId, msg);
      return { isRequest: false, channel: channelDto };
    }

    // 3. Nếu chưa có kênh -> Tạo yêu cầu Chat Request (hàng đợi người lạ)
    const reqEntity = await this.repo.createChatRequest({
      senderId,
      receiverId: recipientId,
      initialMessage,
    });

    const requestDto: ChatRequest = {
      id: reqEntity.id,
      senderId: reqEntity.senderId,
      senderUsername: sender?.username ?? 'Anonymous',
      senderAvatarUrl: sender?.avatarUrl ?? null,
      receiverId: reqEntity.receiverId,
      initialMessage: reqEntity.initialMessage,
      status: reqEntity.status,
      createdAt: reqEntity.createdAt.toISOString(),
      updatedAt: reqEntity.updatedAt.toISOString(),
    };

    // Đẩy thông báo SSE thời gian thực cho người nhận
    this.sseManager.sendToUser(recipientId, 'chat_request:new', requestDto);

    return { isRequest: true, request: requestDto };
  }

  /**
   * Phản hồi yêu cầu tin nhắn từ người lạ (ACCEPTED, IGNORED, BLOCKED)
   */
  public async respondChatRequest(
    requestId: string,
    receiverId: string,
    status: 'ACCEPTED' | 'IGNORED' | 'BLOCKED',
  ): Promise<{ request: ChatRequest; channel?: ChatChannel | undefined }> {
    const reqEntity = await this.repo.findChatRequestById(requestId);
    if (!reqEntity || reqEntity.receiverId !== receiverId) {
      throw new ChatRequestNotFoundError(requestId);
    }

    let channelDto: ChatChannel | undefined;

    if (status === 'ACCEPTED') {
      // 1. Tạo kênh DIRECT mới nếu chưa có
      let channel = await this.repo.findDirectChannelBetween(
        reqEntity.senderId,
        reqEntity.receiverId,
      );
      if (!channel) {
        channel = await this.repo.createChannel({
          type: 'DIRECT',
          creatorId: reqEntity.senderId,
        });
        await this.repo.addMember(channel.id, reqEntity.senderId);
        await this.repo.addMember(channel.id, reqEntity.receiverId);
      }

      // 2. Chuyển tin nhắn ban đầu thành ChatMessage đầu tiên
      const firstMsg = await this.repo.createMessage({
        channelId: channel.id,
        senderId: reqEntity.senderId,
        content: reqEntity.initialMessage,
      });

      // 3. Cập nhật trạng thái Request
      await this.repo.updateChatRequestStatus(requestId, 'ACCEPTED', channel.id);

      channelDto = await this.enrichChannelDto(
        channel,
        receiverId,
        await this.mapMessageDto(firstMsg),
      );

      // Phát sự kiện SSE cho cả 2 người
      this.sseManager.sendToUser(reqEntity.senderId, 'channel:created', channelDto);
      this.sseManager.sendToUser(reqEntity.receiverId, 'channel:created', channelDto);
    } else {
      await this.repo.updateChatRequestStatus(requestId, status);
    }

    const sender = await this.repo.findUserById(reqEntity.senderId);
    const updatedDto: ChatRequest = {
      id: reqEntity.id,
      senderId: reqEntity.senderId,
      senderUsername: sender?.username ?? 'Anonymous',
      senderAvatarUrl: sender?.avatarUrl ?? null,
      receiverId: reqEntity.receiverId,
      initialMessage: reqEntity.initialMessage,
      status,
      createdAt: reqEntity.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.sseManager.sendToUser(reqEntity.senderId, 'chat_request:updated', updatedDto);
    return { request: updatedDto, channel: channelDto };
  }

  /**
   * Tạo phòng chat nhóm (Group Chat)
   */
  public async createGroupChannel(
    creatorId: string,
    name: string,
    memberIds: string[],
  ): Promise<ChatChannel> {
    const channelEntity = await this.repo.createChannel({
      type: 'GROUP',
      name,
      creatorId,
    });

    const uniqueMembers = Array.from(new Set([creatorId, ...memberIds]));
    for (const uid of uniqueMembers) {
      await this.repo.addMember(channelEntity.id, uid);
    }

    const channelDto = await this.enrichChannelDto(channelEntity, creatorId);

    // Phát sự kiện SSE tới tất cả thành viên trong nhóm
    this.sseManager.broadcastToUsers(uniqueMembers, 'channel:created', channelDto);

    return channelDto;
  }

  /**
   * Gửi tin nhắn mới trong phòng chat (hoặc trả lời trong Chat Thread)
   */
  public async sendMessage(senderId: string, input: SendMessageInput): Promise<ChatMessage> {
    const channelId = input.channelId;
    if (!channelId) {
      throw new Error('channelId là bắt buộc khi gửi tin nhắn');
    }

    const channel = await this.repo.findChannelById(channelId);
    if (!channel) {
      throw new ChatChannelNotFoundError(channelId);
    }

    const isMember = await this.repo.isMember(channelId, senderId);
    if (!isMember) {
      throw new NotChannelMemberError();
    }

    // Nếu trả lời trong Chat Thread -> kiểm tra tin nhắn cha
    if (input.parentMessageId) {
      const parentMsg = await this.repo.findMessageById(input.parentMessageId);
      if (!parentMsg || parentMsg.channelId !== channelId) {
        throw new ParentMessageNotFoundError(input.parentMessageId);
      }
    }

    const msgEntity = await this.repo.createMessage({
      channelId,
      senderId,
      parentMessageId: input.parentMessageId ?? null,
      content: input.content,
      attachments: input.attachments ?? [],
    });

    const msgDto = await this.mapMessageDto(msgEntity);

    // Phát sóng tin nhắn tới các thành viên đang kết nối SSE trong phòng
    const members = await this.repo.getChannelMembers(channelId);
    const memberIds = members.map((m) => m.userId);
    this.sseManager.broadcastToUsers(memberIds, 'message:new', msgDto);

    return msgDto;
  }

  /**
   * Lấy danh sách tin nhắn trong phòng (hỗ trợ phân trang cursor & Chat Threads)
   */
  public async listMessages(
    channelId: string,
    userId: string,
    options: MessageListOptions = {},
  ): Promise<ChatMessage[]> {
    const isMember = await this.repo.isMember(channelId, userId);
    if (!isMember) {
      throw new NotChannelMemberError();
    }

    const msgEntities = await this.repo.listMessages(channelId, options);

    // Cập nhật last_read_message_id nếu có tin nhắn mới
    if (msgEntities.length > 0 && msgEntities[0]) {
      const latestMessageId = msgEntities[0].id;
      await this.repo.updateLastRead(channelId, userId, latestMessageId);
    }

    const dtos: ChatMessage[] = [];
    for (const m of msgEntities) {
      dtos.push(await this.mapMessageDto(m));
    }
    return dtos;
  }

  /**
   * Lấy danh sách kênh chat của người dùng
   */
  public async listChannels(userId: string): Promise<ChatChannel[]> {
    const channelEntities = await this.repo.listUserChannels(userId);
    const result: ChatChannel[] = [];

    for (const ch of channelEntities) {
      const latestMsg = await this.repo.getLatestMessage(ch.id);
      const latestDto = latestMsg ? await this.mapMessageDto(latestMsg) : null;
      result.push(await this.enrichChannelDto(ch, userId, latestDto));
    }
    return result;
  }

  /**
   * Lấy danh sách yêu cầu chat đang chờ duyệt
   */
  public async listPendingRequests(receiverId: string): Promise<ChatRequest[]> {
    const reqs = await this.repo.listPendingRequestsForReceiver(receiverId);
    const result: ChatRequest[] = [];

    for (const r of reqs) {
      const sender = await this.repo.findUserById(r.senderId);
      result.push({
        id: r.id,
        senderId: r.senderId,
        senderUsername: sender?.username ?? 'Anonymous',
        senderAvatarUrl: sender?.avatarUrl ?? null,
        receiverId: r.receiverId,
        initialMessage: r.initialMessage,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      });
    }
    return result;
  }

  /**
   * Gửi trạng thái đang gõ phím (Typing Indicator)
   */
  public async setTyping(channelId: string, userId: string, isTyping: boolean): Promise<void> {
    const isMember = await this.repo.isMember(channelId, userId);
    if (!isMember) return;

    const user = await this.repo.findUserById(userId);
    const username = user?.username ?? 'Anonymous';

    await this.presenceManager.setTyping(channelId, userId, username, isTyping);

    const members = await this.repo.getChannelMembers(channelId);
    const recipientIds = members.map((m) => m.userId).filter((id) => id !== userId);

    this.sseManager.broadcastToUsers(recipientIds, 'typing:update', {
      channelId,
      userId,
      username,
      isTyping,
    });
  }

  // --- Helper Methods ---
  private async mapMessageDto(entity: ChatMessageEntity): Promise<ChatMessage> {
    const sender = await this.repo.findUserById(entity.senderId);
    return {
      id: entity.id,
      channelId: entity.channelId,
      senderId: entity.senderId,
      senderUsername: sender?.username ?? 'Anonymous',
      senderAvatarUrl: sender?.avatarUrl ?? null,
      parentMessageId: entity.parentMessageId ?? null,
      content: entity.content,
      attachments: (entity.attachments as ChatAttachment[]) ?? [],
      repliesCount: entity.repliesCount ?? 0,
      isDeleted: entity.isDeleted,
      createdAt: entity.createdAt.toISOString(),
    };
  }

  private async enrichChannelDto(
    entity: ChatChannelEntity,
    currentUserId: string,
    lastMessage?: ChatMessage | null | undefined,
  ): Promise<ChatChannel> {
    const members = await this.repo.getChannelMembers(entity.id);
    let channelName = entity.name;

    // Nếu là DIRECT channel và chưa có tên -> đặt tên theo người kia
    if (entity.type === 'DIRECT' && !channelName) {
      const otherMember = members.find((m) => m.userId !== currentUserId);
      if (otherMember) {
        const otherUser = await this.repo.findUserById(otherMember.userId);
        channelName = otherUser?.username ?? null;
      }
    }

    const unreadCount = await this.repo.countUnreadMessages(entity.id, currentUserId);

    return {
      id: entity.id,
      type: entity.type,
      name: channelName ?? null,
      creatorId: entity.creatorId,
      membersCount: members.length,
      lastMessage: lastMessage ?? null,
      unreadCount,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    };
  }
}
