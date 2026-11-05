import { z } from 'zod';

/**
 * Chuẩn phản hồi báo lỗi RFC 7807 (Problem Details for HTTP APIs)
 */
export const ProblemDetailsSchema = z.object({
  type: z.string().url().default('about:blank'),
  title: z.string(),
  status: z.number().int().min(100).max(599),
  detail: z.string(),
  code: z.string(),
  instance: z.string().optional(),
  invalidParams: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string(),
      }),
    )
    .optional(),
});

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

/**
 * Chế độ sắp xếp bảng tin
 */
export const SortModeSchema = z.enum(['hot', 'new', 'top', 'best']);
export type SortMode = z.infer<typeof SortModeSchema>;

/**
 * Khoảng thời gian cho bộ lọc Top Feed
 */
export const TimeRangeSchema = z.enum(['day', 'week', 'month', 'year', 'all']);
export type TimeRange = z.infer<typeof TimeRangeSchema>;

/**
 * Chuẩn phân trang bằng con trỏ Base64 tổng hợp
 * Cursor = base64(sort_score : timestamp : item_id)
 */
export const CursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CursorPaginationQuery = z.infer<typeof CursorPaginationQuerySchema>;

export const PaginationMetaSchema = z.object({
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
  limit: z.number().int(),
  totalCount: z.number().int().optional(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;
