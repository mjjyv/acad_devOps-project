import { z } from 'zod';
import { CommentAuthorPreviewSchema } from './comments.js';
import { ContentASTSchema } from './threads.js';

// ============================================================================
// HỢP ĐỒNG SỰ KIỆN THỜI GIAN THỰC SERVER-SENT EVENTS (SSE)
// ============================================================================

export const ThreadStatsEventSchema = z.object({
  threadId: z.string().uuid(),
  upvotes: z.number().int(),
  downvotes: z.number().int(),
  netScore: z.number().int(),
  commentCount: z.number().int(),
  viewCount: z.number().int().optional(),
  timestamp: z.number().int(),
});
export type ThreadStatsEvent = z.infer<typeof ThreadStatsEventSchema>;

export const NewCommentNodeEventSchema = z.object({
  threadId: z.string().uuid(),
  commentId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  path: z.string(),
  depth: z.number().int(),
  authorPreview: CommentAuthorPreviewSchema,
  contentAst: ContentASTSchema,
  createdAt: z.string().datetime(),
});
export type NewCommentNodeEvent = z.infer<typeof NewCommentNodeEventSchema>;

export const NotificationTypeSchema = z.enum([
  'UPVOTE_AGGREGATED',
  'COMMENT_REPLY',
  'THREAD_MENTION',
  'MODERATION_WARNING',
]);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const UserNotificationEventSchema = z.object({
  notificationId: z.string().uuid(),
  type: NotificationTypeSchema,
  targetUrl: z.string(),
  messageText: z.string(),
  actorAvatars: z.array(z.string()).max(3).default([]),
  totalActors: z.number().int().default(1),
  createdAt: z.string().datetime(),
});
export type UserNotificationEvent = z.infer<typeof UserNotificationEventSchema>;

// ============================================================================
// HỢP ĐỒNG TẢI LÊN ĐA PHƯƠNG TIỆN ZERO-HOP (PRESIGNED UPLOAD PIPELINE)
// ============================================================================

export const PresignUploadInputSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().max(10 * 1024 * 1024, 'Kích thước tệp tối đa là 10MB'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  blurhash: z.string().min(6).max(64),
});
export type PresignUploadInput = z.infer<typeof PresignUploadInputSchema>;

export const PresignUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  fileKey: z.string().uuid(),
  blurhash: z.string(),
});
export type PresignUploadResponse = z.infer<typeof PresignUploadResponseSchema>;
