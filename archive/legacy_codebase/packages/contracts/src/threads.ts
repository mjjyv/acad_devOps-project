import { z } from 'zod';

// ============================================================================
// 1. KIỂM ĐỊNH CẤU TRÚC JSON ABSTRACT SYNTAX TREE (TIPTAP AST)
// Ngăn chặn tiêm mã độc HTML/SVG trước khi ghi vào Database
// ============================================================================

export const TiptapNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.enum([
      'doc',
      'paragraph',
      'heading',
      'codeBlock',
      'blockquote',
      'bulletList',
      'orderedList',
      'listItem',
      'image',
      'mention',
      'text',
      'horizontalRule',
    ]),
    attrs: z.record(z.any()).optional(),
    content: z.array(TiptapNodeSchema).optional(),
    marks: z
      .array(
        z.object({
          type: z.enum(['bold', 'italic', 'strike', 'code', 'link']),
          attrs: z.record(z.any()).optional(),
        }),
      )
      .optional(),
    text: z.string().max(65536).optional(),
  }),
);

export const ContentASTSchema = z.object({
  type: z.literal('doc'),
  content: z.array(TiptapNodeSchema).min(1, 'Bài viết không được để trống nội dung'),
});
export type ContentAST = z.infer<typeof ContentASTSchema>;

// ============================================================================
// 2. SCHEMAS ĐẦU VÀO TẠO BÀI VIẾT (THREAD INPUTS)
// ============================================================================

export const CreateThreadInputSchema = z.object({
  spaceId: z.string().uuid('Space ID không hợp lệ'),
  title: z
    .string()
    .min(5, 'Tiêu đề bài viết phải có ít nhất 5 ký tự')
    .max(255, 'Tiêu đề bài viết không được vượt quá 255 ký tự'),
  contentAst: ContentASTSchema,
  mediaKeys: z.array(z.string()).default([]),
});
export type CreateThreadInput = z.infer<typeof CreateThreadInputSchema>;

export const VoteDirectionSchema = z.union([z.literal(1), z.literal(-1)]);
export type VoteDirection = z.infer<typeof VoteDirectionSchema>;

export const VoteInputSchema = z.object({
  direction: VoteDirectionSchema,
});
export type VoteInput = z.infer<typeof VoteInputSchema>;

// ============================================================================
// 3. SCHEMAS HIỂN THỊ BÀI VIẾT (THREAD OUTPUTS & COUNTERS)
// ============================================================================

export const ThreadCountersSchema = z.object({
  upvotes: z.number().int().default(0),
  downvotes: z.number().int().default(0),
  netScore: z.number().int().default(0),
  commentCount: z.number().int().default(0),
  viewCount: z.number().int().default(0),
  hotScore: z.number().default(0),
});
export type ThreadCounters = z.infer<typeof ThreadCountersSchema>;

export const ThreadSummarySchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  spaceSlug: z.string(),
  spaceName: z.string(),
  authorId: z.string().uuid(),
  authorUsername: z.string(),
  authorAvatarUrl: z.string().nullable().optional(),
  slug: z.string(),
  title: z.string(),
  snippet: z.string(),
  counters: ThreadCountersSchema,
  userVoteDirection: VoteDirectionSchema.nullable().optional(),
  isPinned: z.boolean().default(false),
  isLocked: z.boolean().default(false),
  createdAt: z.string().datetime(),
});
export type ThreadSummary = z.infer<typeof ThreadSummarySchema>;

export const ThreadDetailSchema = ThreadSummarySchema.extend({
  contentAst: ContentASTSchema,
  updatedAt: z.string().datetime(),
});
export type ThreadDetail = z.infer<typeof ThreadDetailSchema>;

// ============================================================================
// 4. HỢP ĐỒNG PHÂN TRANG CON TRỎ BẢNG TIN (CURSOR ENCODING / DECODING)
// Định dạng: Base64("{score}:{timestamp_epoch}:{thread_id}")
// ============================================================================

export interface FeedCursorData {
  score: number;
  timestampEpoch: number;
  threadId: string;
}

export class FeedCursorHelper {
  public static encode(data: FeedCursorData): string {
    const raw = `${data.score}:${data.timestampEpoch}:${data.threadId}`;
    return Buffer.from(raw, 'utf8').toString('base64url');
  }

  public static decode(cursorStr: string): FeedCursorData | null {
    try {
      const raw = Buffer.from(cursorStr, 'base64url').toString('utf8');
      const parts = raw.split(':');
      if (parts.length !== 3) return null;
      return {
        score: parseFloat(parts[0]),
        timestampEpoch: parseInt(parts[1], 10),
        threadId: parts[2],
      };
    } catch {
      return null;
    }
  }
}

export const FeedQuerySchema = z.object({
  sort: z.enum(['hot', 'new', 'top']).default('hot'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  spaceSlug: z.string().optional(),
});
export type FeedQuery = z.infer<typeof FeedQuerySchema>;
