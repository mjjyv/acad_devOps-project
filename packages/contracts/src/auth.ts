import { z } from 'zod';

// ==========================================
// 1. CÁC ĐỊNH DANH VAI TRÒ & TRẠNG THÁI (ENUMS)
// ==========================================

export const UserRoleSchema = z.enum([
  'GUEST',
  'USER',
  'SPACE_MOD',
  'GLOBAL_MOD',
  'ADMIN',
]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum([
  'ACTIVE',
  'SUSPENDED',
  'SHADOWBANNED',
  'DELETED',
]);
export type UserStatus = z.infer<typeof UserStatusSchema>;

// ==========================================
// 2. SCHEMAS ĐẦU VÀO XÁC THỰC (INPUT SCHEMAS)
// ==========================================

export const RegisterInputSchema = z.object({
  email: z
    .string()
    .email('Định dạng email không hợp lệ')
    .max(255, 'Email không được vượt quá 255 ký tự'),
  username: z
    .string()
    .min(3, 'Tên người dùng phải có tối thiểu 3 ký tự')
    .max(32, 'Tên người dùng không được vượt quá 32 ký tự')
    .regex(
      /^[a-zA-Z0-9_]+$/,
      'Tên người dùng chỉ được chứa chữ cái, số và dấu gạch dưới',
    ),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có tối thiểu 8 ký tự')
    .max(128, 'Mật khẩu không được vượt quá 128 ký tự')
    .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
    .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ thường')
    .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số'),
  deviceFingerprint: z
    .string()
    .min(8, 'Device fingerprint không hợp lệ')
    .max(128)
    .optional()
    .default('unknown_device'),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  login: z
    .string()
    .min(3, 'Vui lòng nhập Email hoặc Username hợp lệ')
    .max(255),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  deviceFingerprint: z
    .string()
    .min(8)
    .max(128)
    .optional()
    .default('unknown_device'),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const RefreshInputSchema = z.object({
  refreshToken: z.string().min(32, 'Refresh token không hợp lệ'),
  deviceFingerprint: z.string().min(8).max(128),
});
export type RefreshInput = z.infer<typeof RefreshInputSchema>;

// ==========================================
// 3. SCHEMAS ĐẦU RA & THÔNG TIN PHIÊN (OUTPUT & SESSION SCHEMAS)
// ==========================================

export const SpacePermissionSchema = z.object({
  spaceId: z.string().uuid(),
  role: UserRoleSchema,
});
export type SpacePermission = z.infer<typeof SpacePermissionSchema>;

export const JWTClaimsSchema = z.object({
  iss: z.literal('acad-community-auth'),
  sub: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  karmaScore: z.number().int(),
  accountAgeDays: z.number().int(),
  tokenVersion: z.number().int(),
  spacePermissions: z.array(SpacePermissionSchema).default([]),
  iat: z.number().int(),
  exp: z.number().int(),
});
export type JWTClaims = z.infer<typeof JWTClaimsSchema>;

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  email: z.string().email(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  karmaScore: z.number().int(),
  avatarUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  accountAgeDays: z.number().int(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const SessionInfoSchema = z.object({
  sessionId: z.string().uuid(),
  familyId: z.string().uuid(),
  userId: z.string().uuid(),
  deviceFingerprint: z.string(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  isCurrent: z.boolean().default(false),
});
export type SessionInfo = z.infer<typeof SessionInfoSchema>;

export const AuthResponseSchema = z.object({
  user: UserProfileSchema,
  accessToken: z.string(),
  expiresIn: z.number().int(), // seconds (900s)
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// ==========================================
// 4. QUY CHUẨN THUỘC TÍNH COOKIE BẢO MẬT
// ==========================================

export const COOKIE_CONFIG = {
  ACCESS_TOKEN: {
    NAME: 'access_token',
    HTTP_ONLY: true,
    SECURE: process.env.NODE_ENV === 'production',
    SAME_SITE: 'lax' as const,
    PATH: '/',
    MAX_AGE: 15 * 60, // 15 phút (900s)
  },
  REFRESH_TOKEN: {
    NAME: 'refresh_token',
    HTTP_ONLY: true,
    SECURE: process.env.NODE_ENV === 'production',
    SAME_SITE: 'strict' as const,
    PATH: '/api/v1/auth/refresh',
    MAX_AGE: 7 * 24 * 60 * 60, // 7 ngày (604800s)
  },
} as const;

// ==========================================
// 5. CÁC ĐẶC TẢ QUẢN TRỊ ADMIN (ADMIN OPERATIONS)
// ==========================================

export const AdminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: UserRoleSchema.optional(),
  status: UserStatusSchema.optional(),
  search: z.string().optional(),
});
export type AdminUserListQuery = z.infer<typeof AdminUserListQuerySchema>;

export const AdminUpdateRoleSchema = z.object({
  role: UserRoleSchema,
});
export type AdminUpdateRoleInput = z.infer<typeof AdminUpdateRoleSchema>;

export const AdminUpdateStatusSchema = z.object({
  status: UserStatusSchema,
});
export type AdminUpdateStatusInput = z.infer<typeof AdminUpdateStatusSchema>;

export const AdminSystemStatsSchema = z.object({
  totalUsers: z.number().int(),
  activeUsers: z.number().int(),
  suspendedUsers: z.number().int(),
  adminUsers: z.number().int(),
  moderatorUsers: z.number().int(),
});
export type AdminSystemStats = z.infer<typeof AdminSystemStatsSchema>;

