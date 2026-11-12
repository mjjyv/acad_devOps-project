import { z } from 'zod';

/**
 * Chuẩn phản hồi báo lỗi RFC 7807 (Problem Details for HTTP APIs)
 */
export const ProblemDetailsSchema = z.object({
  type: z.string().url().default('about:blank'),
  title: z.string(),
  status: z.number().int().min(100).max(599),
  detail: z.string(),
  code: z.string().optional(),
  instance: z.string().optional(),
  correlationId: z.string().optional(),
  invalidParams: z
    .array(
      z.object({
        path: z.string().optional(),
        name: z.string().optional(),
        message: z.string().optional(),
        reason: z.string().optional(),
        code: z.string().optional(),
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
 * Chuẩn phân trang bằng con trỏ Base64URL tổng hợp
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

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  timestamp: z.string().datetime(),
  uptime: z.number().nonnegative(),
  version: z.string(),
  services: z.object({
    database: z.enum(['ok', 'down']),
    redis: z.enum(['ok', 'down']),
  }),
});
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;
