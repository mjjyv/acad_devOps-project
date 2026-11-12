import { z } from 'zod';

export const VoteDirectionSchema = z.union([z.literal(1), z.literal(-1)]);
export type VoteDirection = z.infer<typeof VoteDirectionSchema>;

export const VoteTargetTypeSchema = z.enum(['THREAD', 'COMMENT']);
export type VoteTargetType = z.infer<typeof VoteTargetTypeSchema>;

export const VoteInputSchema = z.object({
  targetId: z.string().uuid(),
  targetType: VoteTargetTypeSchema,
  direction: VoteDirectionSchema,
});
export type VoteInput = z.infer<typeof VoteInputSchema>;

export const VoteResultSchema = z.object({
  targetId: z.string().uuid(),
  targetType: VoteTargetTypeSchema,
  userVote: z.number().int().min(-1).max(1),
  netScore: z.number().int(),
  upvotes: z.number().int(),
  downvotes: z.number().int(),
  delta: z.number().int(),
});
export type VoteResult = z.infer<typeof VoteResultSchema>;

export const SaveThreadInputSchema = z.object({
  threadId: z.string().uuid(),
});
export type SaveThreadInput = z.infer<typeof SaveThreadInputSchema>;
