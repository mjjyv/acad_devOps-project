import { z } from 'zod';

export const SpaceMembershipRoleSchema = z.enum(['MEMBER', 'MODERATOR', 'ADMIN']);
export type SpaceMembershipRole = z.infer<typeof SpaceMembershipRoleSchema>;

export const SpaceFlairSchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid(),
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Mã màu Hex không hợp lệ')
    .default('#DFD0B8'),
  backgroundHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Mã màu Hex không hợp lệ')
    .default('#393E46'),
  createdAt: z.string().datetime(),
});
export type SpaceFlair = z.infer<typeof SpaceFlairSchema>;

export const CreateFlairInputSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50),
  colorHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#DFD0B8'),
  backgroundHex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default('#393E46'),
});
export type CreateFlairInput = z.infer<typeof CreateFlairInputSchema>;

export const SpaceRuleItemSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500),
});
export type SpaceRuleItem = z.infer<typeof SpaceRuleItemSchema>;

export const SpaceSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9_-]+$/, 'Slug chỉ gồm chữ thường, số, dấu gạch ngang và gạch dưới'),
  name: z.string().min(2).max(128),
  topic: z.string().min(2).max(64).default('DevOps & SRE'),
  description: z.string().max(1000).nullable().optional(),
  rules: z.array(SpaceRuleItemSchema).default([]),
  bannerUrl: z.string().url().nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  isPrivate: z.boolean().default(false),
  creatorId: z.string().uuid(),
  membersCount: z.number().int().default(0),
  threadsCount: z.number().int().default(0),
  isJoined: z.boolean().default(false),
  myRole: SpaceMembershipRoleSchema.nullable().optional(),
  flairs: z.array(SpaceFlairSchema).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type Space = z.infer<typeof SpaceSchema>;

export const CreateSpaceInputSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(64)
    .regex(/^[a-z0-9_-]+$/),
  name: z.string().min(2).max(128),
  topic: z.string().min(2).max(64).default('DevOps & SRE').optional(),
  description: z.string().max(1000).optional(),
  rules: z.array(SpaceRuleItemSchema).optional(),
  isPrivate: z.boolean().default(false),
});
export type CreateSpaceInput = z.infer<typeof CreateSpaceInputSchema>;

export const UpdateSpaceInputSchema = z.object({
  name: z.string().min(2).max(128).optional(),
  topic: z.string().min(2).max(64).optional(),
  description: z.string().max(1000).optional(),
  rules: z.array(SpaceRuleItemSchema).optional(),
  bannerUrl: z.string().url().nullable().optional(),
  iconUrl: z.string().url().nullable().optional(),
  isPrivate: z.boolean().optional(),
});
export type UpdateSpaceInput = z.infer<typeof UpdateSpaceInputSchema>;

export const SpaceMembershipSchema = z.object({
  userId: z.string().uuid(),
  spaceId: z.string().uuid(),
  role: SpaceMembershipRoleSchema,
  joinedAt: z.string().datetime(),
});
export type SpaceMembership = z.infer<typeof SpaceMembershipSchema>;
