import { z } from 'zod';
import { ContentASTSchema } from './threads.js';

export const CreateCommentInputSchema = z.object({
  threadId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  contentAst: ContentASTSchema,
});
export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;

export const CommentAuthorPreviewSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  avatarUrl: z.string().nullable().optional(),
  karmaScore: z.number().int().default(0),
});
export type CommentAuthorPreview = z.infer<typeof CommentAuthorPreviewSchema>;

// ============================================================================
// HỢP ĐỒNG DỮ LIỆU CÂY TRẢI PHẲNG (FLATTENED COMMENT ITEM FOR VIRTUALIZATION)
// ============================================================================

export const FlatCommentItemSchema = z.object({
  id: z.string().uuid(),
  threadId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  path: z.string(), // ltree format: e.g. "0001.000a.0003"
  depth: z.number().int().min(0).max(8),
  hasChildren: z.boolean().default(false),
  childCount: z.number().int().default(0),
  isCollapsed: z.boolean().default(false),
  visible: z.boolean().default(true),
  author: CommentAuthorPreviewSchema,
  contentAst: ContentASTSchema,
  upvotes: z.number().int().default(0),
  downvotes: z.number().int().default(0),
  netScore: z.number().int().default(0),
  userVoteDirection: z.union([z.literal(1), z.literal(-1)]).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type FlatCommentItem = z.infer<typeof FlatCommentItemSchema>;
