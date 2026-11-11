import { z } from 'zod';
import { PaginationMetaSchema, SortModeSchema, TimeRangeSchema } from './common.js';
import { SpaceFlairSchema } from './spaces.js';

export const ContentASTSchema = z.record(z.unknown());
export type ContentAST = z.infer<typeof ContentASTSchema>;

export const ThreadCountersSchema = z.object({
  upvotes: z.number().int().default(0),
  downvotes: z.number().int().default(0),
  netScore: z.number().int().default(0),
  commentsCount: z.number().int().default(0),
});
export type ThreadCounters = z.infer<typeof ThreadCountersSchema>;

export const ThreadSummarySchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  spaceSlug: z.string(),
  spaceName: z.string(),
  authorId: z.string().uuid(),
  authorUsername: z.string(),
  authorAvatarUrl: z.string().url().nullable().optional(),
  flair: SpaceFlairSchema.nullable().optional(),
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(350),
  contentSnippet: z.string().nullable().optional(),
  linkUrl: z.string().url().nullable().optional(),
  isPinned: z.boolean().default(false),
  isLocked: z.boolean().default(false),
  upvotes: z.number().int().default(0),
  downvotes: z.number().int().default(0),
  netScore: z.number().int().default(0),
  commentsCount: z.number().int().default(0),
  userVote: z.number().int().min(-1).max(1).default(0), // 1, -1 hoặc 0
  isSaved: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type ThreadSummary = z.infer<typeof ThreadSummarySchema>;

export const ThreadDetailSchema = ThreadSummarySchema.extend({
  contentText: z.string().nullable().optional(),
  contentAst: ContentASTSchema.nullable().optional(),
});
export type ThreadDetail = z.infer<typeof ThreadDetailSchema>;

export const CreateThreadInputSchema = z.object({
  spaceId: z.string().uuid(),
  flairId: z.string().uuid().optional(),
  title: z.string().min(5, 'Tiêu đề phải có tối thiểu 5 ký tự').max(300),
  contentText: z.string().max(40000).optional(),
  contentAst: ContentASTSchema.optional(),
  linkUrl: z.string().url('URL không hợp lệ').optional(),
});
export type CreateThreadInput = z.infer<typeof CreateThreadInputSchema>;

export const ThreadListFilterSchema = z.object({
  spaceSlug: z.string().optional(),
  spaceId: z.string().uuid().optional(),
  sort: SortModeSchema.default('hot'),
  time: TimeRangeSchema.default('all'),
  q: z.string().max(100).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ThreadListFilter = z.infer<typeof ThreadListFilterSchema>;

export const ThreadListResponseSchema = z.object({
  items: z.array(ThreadSummarySchema),
  pagination: PaginationMetaSchema,
});
export type ThreadListResponse = z.infer<typeof ThreadListResponseSchema>;
