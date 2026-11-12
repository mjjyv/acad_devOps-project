import { z } from 'zod';

export const UserRoleSchema = z.enum(['GUEST', 'USER', 'SPACE_MOD', 'GLOBAL_MOD', 'ADMIN']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'SHADOWBANNED', 'DELETED']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const RegisterInputSchema = z.object({
  username: z
    .string()
    .min(3, 'Tên đăng nhập phải có tối thiểu 3 ký tự')
    .max(32, 'Tên đăng nhập không được vượt quá 32 ký tự')
    .regex(/^[a-zA-Z0-9_]+$/, 'Tên đăng nhập chỉ bao gồm chữ cái, số và dấu gạch dưới (_)'),
  email: z.string().email('Địa chỉ email không hợp lệ').max(255),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
    .max(128, 'Mật khẩu không được vượt quá 128 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số'),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  identifier: z.string().min(1, 'Vui lòng cung cấp username hoặc email'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  fingerprint: z.string().max(255).optional(),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  karmaScore: z.number().int().default(0),
  threadsCount: z.number().int().default(0),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const PublicUserProfileSchema = UserProfileSchema.omit({ email: true });
export type PublicUserProfile = z.infer<typeof PublicUserProfileSchema>;

export const UserSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Từ khóa tìm kiếm không được rỗng').max(64),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});
export type UserSearchQuery = z.infer<typeof UserSearchQuerySchema>;

export const UserSearchResponseSchema = z.object({
  users: z.array(PublicUserProfileSchema),
});
export type UserSearchResponse = z.infer<typeof UserSearchResponseSchema>;

export const SessionInfoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  deviceFingerprint: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  isCurrentSession: z.boolean().default(false),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});
export type SessionInfo = z.infer<typeof SessionInfoSchema>;

export const AuthTokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
});
export type AuthTokenPair = z.infer<typeof AuthTokenPairSchema>;

export const AuthResponseSchema = z.object({
  user: UserProfileSchema,
  sessionId: z.string().uuid().optional(),
  accessToken: z.string().optional(),
  tokens: AuthTokenPairSchema.optional(),
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

export const RevokeSessionInputSchema = z.object({
  sessionId: z.string().uuid(),
});
export type RevokeSessionInput = z.infer<typeof RevokeSessionInputSchema>;
