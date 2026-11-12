import type { ChatChannelType, ChatRequestStatus } from '@acad/contracts';

export class ChatDatabaseError extends Error {
  constructor(
    message: string,
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ChatDatabaseError';
  }
}

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

export interface ChatUserSummary {
  id: string;
  username: string;
  avatarUrl: string | null;
}

export interface MessageListOptions {
  limit?: number | undefined;
  cursor?: string | undefined;
  parentMessageId?: string | null | undefined;
}

export interface IChatRepository {
  createChannel(data: {
    type: ChatChannelType;
    name?: string | null | undefined;
    creatorId: string;
  }): Promise<ChatChannelEntity>;
  findChannelById(id: string): Promise<ChatChannelEntity | null>;
  findDirectChannelBetween(user1Id: string, user2Id: string): Promise<ChatChannelEntity | null>;
  listUserChannels(userId: string): Promise<ChatChannelEntity[]>;

  addMember(channelId: string, userId: string): Promise<void>;
  removeMember(channelId: string, userId: string): Promise<void>;
  isMember(channelId: string, userId: string): Promise<boolean>;
  getChannelMembers(channelId: string): Promise<ChatMemberEntity[]>;
  updateLastRead(channelId: string, userId: string, messageId: string): Promise<void>;
  countUnreadMessages(channelId: string, userId: string): Promise<number>;

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

  findUserById(userId: string): Promise<ChatUserSummary | null>;
  findUserByUsername(username: string): Promise<ChatUserSummary | null>;
}
