import { z } from 'zod';
import { UserRoleSchema, UserStatusSchema } from './auth.js';

export const AdminStatsSchema = z.object({
  activeUsersCount: z.number().int(),
  activeSessionsCount: z.number().int(),
  spacesCount: z.number().int(),
  threadsCount: z.number().int(),
  commentsCount: z.number().int(),
  pendingReportsCount: z.number().int(),
});
export type AdminStats = z.infer<typeof AdminStatsSchema>;

export const AdminUserListItemSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  karmaScore: z.number().int(),
  threadsCount: z.number().int(),
  sessionsCount: z.number().int(),
  avatarUrl: z.string().url().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type AdminUserListItem = z.infer<typeof AdminUserListItemSchema>;

export const AdminUpdateUserStatusInputSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'SHADOWBANNED']),
  reason: z.string().max(255).optional(),
});
export type AdminUpdateUserStatusInput = z.infer<typeof AdminUpdateUserStatusInputSchema>;

export const AdminUpdateUserRoleInputSchema = z.object({
  role: z.enum(['USER', 'SPACE_MOD', 'GLOBAL_MOD', 'ADMIN']),
});
export type AdminUpdateUserRoleInput = z.infer<typeof AdminUpdateUserRoleInputSchema>;

export const AdminThreadActionInputSchema = z.object({
  action: z.enum(['PIN', 'UNPIN', 'LOCK', 'UNLOCK', 'DELETE']),
  reason: z.string().max(255).optional(),
});
export type AdminThreadActionInput = z.infer<typeof AdminThreadActionInputSchema>;

export const ModReportStatusSchema = z.enum(['PENDING', 'RESOLVED', 'DISMISSED']);
export type ModReportStatus = z.infer<typeof ModReportStatusSchema>;

export const ModReportTargetTypeSchema = z.enum(['THREAD', 'COMMENT']);
export type ModReportTargetType = z.infer<typeof ModReportTargetTypeSchema>;

export const ModReportSchema = z.object({
  id: z.string().uuid(),
  reporterId: z.string().uuid(),
  reporterUsername: z.string(),
  targetType: ModReportTargetTypeSchema,
  targetId: z.string().uuid(),
  reason: z.string().min(1).max(255),
  status: ModReportStatusSchema,
  resolvedBy: z.string().uuid().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type ModReport = z.infer<typeof ModReportSchema>;

export const CreateReportInputSchema = z.object({
  targetType: ModReportTargetTypeSchema,
  targetId: z.string().uuid(),
  reason: z.string().min(3).max(255),
});
export type CreateReportInput = z.infer<typeof CreateReportInputSchema>;

export const ResolveReportInputSchema = z.object({
  status: z.enum(['RESOLVED', 'DISMISSED']),
  note: z.string().max(255).optional(),
});
export type ResolveReportInput = z.infer<typeof ResolveReportInputSchema>;

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().uuid(),
  actorUsername: z.string(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).default({}),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;
