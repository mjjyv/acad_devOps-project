import { z } from 'zod';

export const SpaceRoleSchema = z.enum(['MEMBER', 'MODERATOR', 'ADMIN']);
export type SpaceRole = z.infer<typeof SpaceRoleSchema>;

export const SpaceRuleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(100),
  description: z.string().max(500),
});
export type SpaceRule = z.infer<typeof SpaceRuleSchema>;

export const CreateSpaceInputSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug phải có tối thiểu 3 ký tự')
    .max(50, 'Slug không được vượt quá 50 ký tự')
    .regex(/^[a-z0-9-]+$/, 'Slug chỉ được chứa chữ thường không dấu, số và dấu gạch ngang'),
  name: z.string().min(3, 'Tên không gian phải có tối thiểu 3 ký tự').max(100),
  description: z.string().max(1000).optional(),
  rules: z.array(SpaceRuleSchema).default([]),
  bannerUrl: z.string().url().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  isPrivate: z.boolean().default(false),
});
export type CreateSpaceInput = z.infer<typeof CreateSpaceInputSchema>;

export const SpaceSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  rules: z.array(SpaceRuleSchema).default([]),
  bannerUrl: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  creatorId: z.string().uuid().nullable().optional(),
  isPrivate: z.boolean(),
  memberCount: z.number().int().default(0),
  threadCount: z.number().int().default(0),
  createdAt: z.string().datetime(),
});
export type Space = z.infer<typeof SpaceSchema>;

export const SpaceMembershipSchema = z.object({
  userId: z.string().uuid(),
  spaceId: z.string().uuid(),
  role: SpaceRoleSchema,
  karmaInSpace: z.number().int().default(0),
  isMuted: z.boolean().default(false),
  mutedUntil: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type SpaceMembership = z.infer<typeof SpaceMembershipSchema>;
