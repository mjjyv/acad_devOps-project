import type {
  AdminStats,
  AdminUpdateUserStatusInput,
  AdminUserListItem,
  AuditLog,
  CreateReportInput,
  ModReport,
  ModReportStatus,
  ModReportTargetType,
  ResolveReportInput,
  Space,
  UserRole,
  UserStatus,
} from '@acad/contracts';
import { apiJson } from './client';

export interface AdminThreadItem {
  id: string;
  spaceId: string;
  spaceSlug?: string;
  spaceName?: string;
  authorId: string;
  authorUsername?: string;
  flairId?: string | null;
  title: string;
  slug: string;
  content?: string | null;
  linkUrl?: string | null;
  threadType: 'TEXT' | 'LINK' | 'MEDIA';
  upvotesCount: number;
  downvotesCount: number;
  commentCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') {
      sp.set(k, String(v));
    }
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export const ModerationApi = {
  // User-facing report endpoints
  async submitReport(input: CreateReportInput): Promise<ModReport> {
    return apiJson<ModReport>('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async getMyReports(): Promise<ModReport[]> {
    const res = await apiJson<{ reports: ModReport[] }>('/api/v1/reports/my');
    return Array.isArray(res.reports) ? res.reports : [];
  },

  // Admin / Global Mod Hub endpoints (/api/v1/admin/*)
  async getAdminStats(): Promise<AdminStats> {
    return apiJson<AdminStats>('/api/v1/admin/stats');
  },

  async getReports(options?: {
    status?: ModReportStatus;
    targetType?: ModReportTargetType;
    limit?: number;
    offset?: number;
  }): Promise<{ reports: ModReport[]; total: number }> {
    const qs = buildQuery({
      status: options?.status,
      targetType: options?.targetType,
      limit: options?.limit,
      offset: options?.offset,
    });
    return apiJson<{ reports: ModReport[]; total: number }>(`/api/v1/admin/reports${qs}`);
  },

  async resolveReport(reportId: string, input: ResolveReportInput): Promise<ModReport> {
    return apiJson<ModReport>(`/api/v1/admin/reports/${encodeURIComponent(reportId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  async getUsers(options?: {
    role?: UserRole;
    status?: UserStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: AdminUserListItem[]; total: number }> {
    const qs = buildQuery({
      role: options?.role,
      status: options?.status,
      search: options?.search,
      limit: options?.limit,
      offset: options?.offset,
    });
    return apiJson<{ users: AdminUserListItem[]; total: number }>(`/api/v1/admin/users${qs}`);
  },

  async updateUserRole(
    userId: string,
    role: UserRole,
  ): Promise<{ success: boolean; role: UserRole }> {
    return apiJson<{ success: boolean; role: UserRole }>(
      `/api/v1/admin/users/${encodeURIComponent(userId)}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      },
    );
  },

  async updateUserStatus(
    userId: string,
    status: AdminUpdateUserStatusInput['status'],
    reason?: string,
  ): Promise<{ success: boolean; status: UserStatus }> {
    return apiJson<{ success: boolean; status: UserStatus }>(
      `/api/v1/admin/users/${encodeURIComponent(userId)}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status, ...(reason?.trim() ? { reason: reason.trim() } : {}) }),
      },
    );
  },

  async revokeUserSessions(userId: string): Promise<{ success: boolean }> {
    return apiJson<{ success: boolean }>(
      `/api/v1/admin/users/${encodeURIComponent(userId)}/revoke-sessions`,
      {
        method: 'POST',
      },
    );
  },

  async getSpaces(): Promise<Space[]> {
    const res = await apiJson<{ spaces: Space[] }>('/api/v1/admin/spaces');
    return Array.isArray(res.spaces) ? res.spaces : [];
  },

  async deleteSpace(spaceId: string): Promise<{ success: boolean }> {
    return apiJson<{ success: boolean }>(`/api/v1/admin/spaces/${encodeURIComponent(spaceId)}`, {
      method: 'DELETE',
    });
  },

  async getThreads(options?: {
    spaceId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ threads: AdminThreadItem[]; total: number }> {
    const qs = buildQuery({
      spaceId: options?.spaceId,
      search: options?.search,
      limit: options?.limit,
      offset: options?.offset,
    });
    return apiJson<{ threads: AdminThreadItem[]; total: number }>(`/api/v1/admin/threads${qs}`);
  },

  async setThreadPinned(
    threadId: string,
    value: boolean,
  ): Promise<{ success: boolean; isPinned: boolean }> {
    return apiJson<{ success: boolean; isPinned: boolean }>(
      `/api/v1/admin/threads/${encodeURIComponent(threadId)}/pin`,
      {
        method: 'PATCH',
        body: JSON.stringify({ value }),
      },
    );
  },

  async setThreadLocked(
    threadId: string,
    value: boolean,
  ): Promise<{ success: boolean; isLocked: boolean }> {
    return apiJson<{ success: boolean; isLocked: boolean }>(
      `/api/v1/admin/threads/${encodeURIComponent(threadId)}/lock`,
      {
        method: 'PATCH',
        body: JSON.stringify({ value }),
      },
    );
  },

  async deleteThread(threadId: string): Promise<{ success: boolean }> {
    return apiJson<{ success: boolean }>(`/api/v1/admin/threads/${encodeURIComponent(threadId)}`, {
      method: 'DELETE',
    });
  },

  async getAuditLogs(options?: {
    actorId?: string;
    action?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> {
    const qs = buildQuery({
      actorId: options?.actorId,
      action: options?.action,
      limit: options?.limit,
      offset: options?.offset,
    });
    return apiJson<{ logs: AuditLog[]; total: number }>(`/api/v1/admin/audit-logs${qs}`);
  },
};
