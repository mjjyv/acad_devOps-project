import type {
  AdminStats,
  AdminUserListItem,
  AuditLog,
  CreateReportInput,
  ModReport,
  ModReportStatus,
  ModReportTargetType,
  ResolveReportInput,
  UserRole,
  UserStatus,
} from '@acad/contracts';
import { getApiClient } from '@/lib/api/client';
import { ApiHttpError } from '@/lib/api/community';

export interface AdminSpaceItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isPrivate: boolean;
  memberCount: number;
  threadCount: number;
  createdAt: string;
}

export interface AdminThreadItem {
  id: string;
  spaceId: string;
  authorId: string;
  title: string;
  slug: string;
  upvotesCount: number;
  downvotesCount: number;
  commentCount: number;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: string;
}

async function parseErrorDetail(res: Response, fallback: string): Promise<string> {
  const err = await res.json().catch(() => ({}));
  return err.detail || err.message || fallback;
}

export class ModerationApi {
  public static async submitReport(input: CreateReportInput): Promise<ModReport> {
    const client = getApiClient();
    const res = await client.request('/api/v1/reports', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const detail = await parseErrorDetail(res, 'Không thể gửi báo cáo vi phạm');
      throw new ApiHttpError(res.status, detail);
    }
    return await res.json();
  }

  public static async getMyReports(): Promise<ModReport[]> {
    const client = getApiClient();
    const res = await client.request('/api/v1/reports/my', { method: 'GET' });
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Lỗi tải báo cáo của bạn'));
    }
    return await res.json();
  }

  public static async getStats(): Promise<AdminStats> {
    const client = getApiClient();
    const res = await client.request('/api/v1/admin/stats', { method: 'GET' });
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Không thể tải thống kê'));
    }
    return await res.json();
  }

  public static async listUsers(
    params: {
      role?: UserRole;
      status?: UserStatus;
      search?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ users: AdminUserListItem[]; total: number }> {
    const client = getApiClient();
    const qs = new URLSearchParams();
    if (params.role) qs.set('role', params.role);
    if (params.status) qs.set('status', params.status);
    if (params.search) qs.set('search', params.search);
    qs.set('limit', String(params.limit ?? 50));
    qs.set('offset', String(params.offset ?? 0));

    const res = await client.request(`/api/v1/admin/users?${qs.toString()}`, { method: 'GET' });
    if (!res.ok) {
      throw new ApiHttpError(
        res.status,
        await parseErrorDetail(res, 'Lỗi tải danh sách người dùng'),
      );
    }
    return await res.json();
  }

  public static async updateUserRole(
    userId: string,
    role: 'USER' | 'SPACE_MOD' | 'GLOBAL_MOD' | 'ADMIN',
  ): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/admin/users/${encodeURIComponent(userId)}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Không thể cập nhật vai trò'));
    }
  }

  public static async updateUserStatus(
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'SHADOWBANNED',
    reason?: string,
  ): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/admin/users/${encodeURIComponent(userId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
    });
    if (!res.ok) {
      throw new ApiHttpError(
        res.status,
        await parseErrorDetail(res, 'Không thể cập nhật trạng thái'),
      );
    }
  }

  public static async revokeUserSessions(userId: string): Promise<void> {
    const client = getApiClient();
    const res = await client.request(
      `/api/v1/admin/users/${encodeURIComponent(userId)}/revoke-sessions`,
      { method: 'POST' },
    );
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Không thể thu hồi phiên'));
    }
  }

  public static async listSpaces(): Promise<AdminSpaceItem[]> {
    const client = getApiClient();
    const res = await client.request('/api/v1/admin/spaces', { method: 'GET' });
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Lỗi tải danh sách Spaces'));
    }
    return await res.json();
  }

  public static async deleteSpace(spaceId: string, reason?: string): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/admin/spaces/${encodeURIComponent(spaceId)}`, {
      method: 'DELETE',
      body: JSON.stringify({ ...(reason ? { reason } : {}) }),
    });
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Không thể xóa Space'));
    }
  }

  public static async listThreads(
    params: { spaceId?: string; search?: string; limit?: number; offset?: number } = {},
  ): Promise<{ threads: AdminThreadItem[]; total: number }> {
    const client = getApiClient();
    const qs = new URLSearchParams();
    if (params.spaceId) qs.set('spaceId', params.spaceId);
    if (params.search) qs.set('search', params.search);
    qs.set('limit', String(params.limit ?? 50));
    qs.set('offset', String(params.offset ?? 0));

    const res = await client.request(`/api/v1/admin/threads?${qs.toString()}`, { method: 'GET' });
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Lỗi tải bài viết'));
    }
    return await res.json();
  }

  public static async setThreadPinned(threadId: string, value: boolean): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/admin/threads/${encodeURIComponent(threadId)}/pin`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      throw new ApiHttpError(
        res.status,
        await parseErrorDetail(res, 'Không thể cập nhật ghim bài'),
      );
    }
  }

  public static async setThreadLocked(threadId: string, value: boolean): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/admin/threads/${encodeURIComponent(threadId)}/lock`, {
      method: 'PATCH',
      body: JSON.stringify({ value }),
    });
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Không thể khóa bài viết'));
    }
  }

  public static async deleteThread(threadId: string, reason?: string): Promise<void> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/admin/threads/${encodeURIComponent(threadId)}`, {
      method: 'DELETE',
      body: JSON.stringify({ ...(reason ? { reason } : {}) }),
    });
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Không thể xóa bài viết'));
    }
  }

  public static async listReports(
    params: {
      status?: ModReportStatus;
      targetType?: ModReportTargetType;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ reports: ModReport[]; total: number }> {
    const client = getApiClient();
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.targetType) qs.set('targetType', params.targetType);
    qs.set('limit', String(params.limit ?? 50));
    qs.set('offset', String(params.offset ?? 0));

    const res = await client.request(`/api/v1/admin/reports?${qs.toString()}`, { method: 'GET' });
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Lỗi tải hàng đợi báo cáo'));
    }
    return await res.json();
  }

  public static async resolveReport(
    reportId: string,
    input: ResolveReportInput,
  ): Promise<ModReport> {
    const client = getApiClient();
    const res = await client.request(`/api/v1/admin/reports/${encodeURIComponent(reportId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Không thể xử lý báo cáo'));
    }
    return await res.json();
  }

  public static async listAuditLogs(
    params: { actorId?: string; action?: string; limit?: number; offset?: number } = {},
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const client = getApiClient();
    const qs = new URLSearchParams();
    if (params.actorId) qs.set('actorId', params.actorId);
    if (params.action) qs.set('action', params.action);
    qs.set('limit', String(params.limit ?? 50));
    qs.set('offset', String(params.offset ?? 0));

    const res = await client.request(`/api/v1/admin/audit-logs?${qs.toString()}`, {
      method: 'GET',
    });
    if (!res.ok) {
      throw new ApiHttpError(res.status, await parseErrorDetail(res, 'Lỗi tải nhật ký kiểm toán'));
    }
    return await res.json();
  }
}
