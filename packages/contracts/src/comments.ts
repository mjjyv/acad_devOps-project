import { z } from 'zod';
import { ContentASTSchema } from './threads.js';

export const CommentAuthorSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  karmaScore: z.number().int().default(0),
});
export type CommentAuthor = z.infer<typeof CommentAuthorSchema>;

export const CreateCommentInputSchema = z.object({
  threadId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  contentAst: ContentASTSchema,
});
export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;

/**
 * Phần tử bình luận trong mảng trải phẳng O(N) được ảo hóa
 * Hỗ trợ Capped Depth 8 biến đổi thành Flat Reply có @mention
 */
export const FlatCommentItemSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  path: z.string().regex(/^[0-9a-z]{4}(\.[0-9a-z]{4})*$/, 'Đường dẫn ltree Base36 không hợp lệ'),
  depth: z.number().int().min(0).max(8),
  isCappedAtMaxDepth: z.boolean().default(false),
  parentAuthorMentionNeeded: z.boolean().default(false),
  parentAuthorUsername: z.string().nullable().optional(),
  contentAst: ContentASTSchema,
  author: CommentAuthorSchema,
  netScore: z.number().int().default(0),
  upvotes: z.number().int().default(0),
  downvotes: z.number().int().default(0),
  userVote: z.number().int().min(-1).max(1).default(0),
  directRepliesCount: z.number().int().default(0),
  totalDescendantsCount: z.number().int().default(0),
  isCollapsed: z.boolean().default(false),
  isDeleted: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type FlatCommentItem = z.infer<typeof FlatCommentItemSchema>;

export const CommentTreeResponseSchema = z.object({
  items: z.array(FlatCommentItemSchema),
  totalCount: z.number().int(),
});
export type CommentTreeResponse = z.infer<typeof CommentTreeResponseSchema>;
