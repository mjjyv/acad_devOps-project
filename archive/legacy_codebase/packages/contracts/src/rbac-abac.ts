import { z } from 'zod';
import { UserRole, UserRoleSchema } from './auth.js';

// ==========================================
// 1. CÁC HÀNH ĐỘNG HỆ THỐNG (ACTIONS)
// ==========================================

export const ActionTypeSchema = z.enum([
  // Nhóm Bài viết
  'post:read',
  'post:create',
  'post:edit',
  'post:delete',
  'post:pin',
  'post:lock',
  
  // Nhóm Bình luận
  'comment:create',
  'comment:reply',
  'comment:attach_media',
  'comment:collapse_other',
  
  // Nhóm Tương tác
  'vote:up',
  'vote:down',
  'report:create',
  
  // Nhóm Không gian
  'space:create',
  'space:edit_rules',
  'space:delete',
  'space:assign_mod',
  
  // Nhóm Kiểm duyệt
  'mod:view_queue',
  'mod:mute_user',
  'mod:shadowban',
  'mod:ban_user',
  
  // Nhóm Hệ thống
  'system:view_logs',
  'system:maintenance',
]);
export type ActionType = z.infer<typeof ActionTypeSchema>;

// ==========================================
// 2. THỰC THỂ TÀI NGUYÊN (RESOURCES)
// ==========================================

export const ResourceTypeSchema = z.enum([
  'POST',
  'COMMENT',
  'SPACE',
  'USER_PROFILE',
  'MODERATION_QUEUE',
  'SYSTEM_CONFIG',
]);
export type ResourceType = z.infer<typeof ResourceTypeSchema>;

export interface ABACSubject {
  userId: string;
  role: UserRole;
  accountAgeDays: number;
  karmaScore: number;
  isShadowbanned?: boolean;
  isMutedInSpace?: boolean;
  spaceRoles?: Record<string, UserRole>; // spaceId -> role
}

export interface ABACResource {
  type: ResourceType;
  id: string;
  authorId?: string;
  spaceId?: string;
  createdAt?: Date;
  isLocked?: boolean;
  isDeleted?: boolean;
}

export interface ABACDecision {
  allowed: boolean;
  reason?: string;
  code?: 
    | 'INSUFFICIENT_ROLE'
    | 'ACCOUNT_TOO_NEW'
    | 'INSUFFICIENT_KARMA'
    | 'EDIT_WINDOW_EXPIRED'
    | 'NOT_RESOURCE_OWNER'
    | 'OUTSIDE_SPACE_BOUNDARY'
    | 'RESOURCE_LOCKED'
    | 'SHADOWBANNED'
    | 'MUTED';
}
