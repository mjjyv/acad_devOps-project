import { z } from 'zod';

export const ChatChannelTypeSchema = z.enum(['DIRECT', 'GROUP']);
export type ChatChannelType = z.infer<typeof ChatChannelTypeSchema>;

export const ChatRequestStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'IGNORED', 'BLOCKED']);
export type ChatRequestStatus = z.infer<typeof ChatRequestStatusSchema>;

export const ChatAttachmentSchema = z.object({
  type: z.enum(['IMAGE', 'FILE', 'THREAD_CARD', 'CODE_SNIPPET']),
  url: z.string().url().optional(),
  title: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type ChatAttachment = z.infer<typeof ChatAttachmentSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().uuid(),
  senderId: z.string().uuid(),
  senderUsername: z.string(),
  senderAvatarUrl: z.string().url().nullable().optional(),
  parentMessageId: z.string().uuid().nullable().optional(),
  content: z.string().max(5000).default(''),
  attachments: z.array(ChatAttachmentSchema).default([]),
  repliesCount: z.number().int().default(0),
  isDeleted: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatChannelSchema = z.object({
  id: z.string().uuid(),
  type: ChatChannelTypeSchema,
  name: z.string().nullable().optional(),
  creatorId: z.string().uuid(),
  membersCount: z.number().int().default(2),
  lastMessage: ChatMessageSchema.nullable().optional(),
  unreadCount: z.number().int().default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type ChatChannel = z.infer<typeof ChatChannelSchema>;

export const CreateGroupChannelInputSchema = z.object({
  name: z.string().min(2).max(128),
  memberIds: z.array(z.string().uuid()).min(1).max(50),
});
export type CreateGroupChannelInput = z.infer<typeof CreateGroupChannelInputSchema>;

export const SendMessageInputSchema = z
  .object({
    channelId: z.string().uuid().optional(),
    recipientId: z.string().uuid().optional(),
    parentMessageId: z.string().uuid().optional(),
    content: z.string().max(5000).default(''),
    attachments: z.array(ChatAttachmentSchema).max(10).optional(),
  })
  .refine(
    (data) => data.content.trim().length > 0 || (data.attachments && data.attachments.length > 0),
    {
      message: 'Tin nhắn phải có nội dung văn bản hoặc tệp đính kèm',
    },
  );
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const ChatRequestSchema = z.object({
  id: z.string().uuid(),
  senderId: z.string().uuid(),
  senderUsername: z.string(),
  senderAvatarUrl: z.string().url().nullable().optional(),
  receiverId: z.string().uuid(),
  receiverUsername: z.string().optional(),
  receiverAvatarUrl: z.string().url().nullable().optional(),
  initialMessage: z.string(),
  status: ChatRequestStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const RespondChatRequestInputSchema = z.object({
  status: z.enum(['ACCEPTED', 'IGNORED', 'BLOCKED']),
});
export type RespondChatRequestInput = z.infer<typeof RespondChatRequestInputSchema>;

export const PresenceEventSchema = z.object({
  userId: z.string().uuid(),
  isOnline: z.boolean(),
  lastSeenAt: z.string().datetime(),
});
export type PresenceEvent = z.infer<typeof PresenceEventSchema>;

export const TypingIndicatorEventSchema = z.object({
  channelId: z.string().uuid(),
  userId: z.string().uuid(),
  username: z.string(),
  isTyping: z.boolean(),
});
export type TypingIndicatorEvent = z.infer<typeof TypingIndicatorEventSchema>;
