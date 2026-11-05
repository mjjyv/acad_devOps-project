import { IncomingMessage, ServerResponse } from 'node:http';
import { AuthModule, TokenManager } from '@acad/auth-service';
import { CommunityService } from '@acad/community-service';
import {
  AdminUpdateRoleSchema,
  AdminUpdateStatusSchema,
  COOKIE_CONFIG,
  UserRole,
  UserStatus,
} from '@acad/contracts';
import { parseCookies, readJsonBody, sendJson } from './auth-router.js';

export function createAdminRouter(authModule: AuthModule, communityService?: CommunityService) {
  const { sessionStore, userRepo } = authModule;

  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    const pathname = url.pathname;
    const method = req.method?.toUpperCase();

    if (!pathname.startsWith('/api/v1/admin')) {
      return false;
    }

    // =========================================================================
    // XÁC THỰC QUYỀN ADMIN (GUARD)
    // =========================================================================
    const authHeader = req.headers.authorization;
    const cookies = parseCookies(req.headers.cookie);
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME]) {
      token = cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME];
    }

    if (!token) {
      sendJson(res, 401, { error: 'Yêu cầu không có quyền truy cập (Thiếu token)' });
      return true;
    }

    let claims;
    try {
      claims = TokenManager.verifyAccessToken(token);
    } catch (err: any) {
      sendJson(res, 401, { error: err.message || 'Token không hợp lệ hoặc đã hết hạn' });
      return true;
    }

    // Kiểm tra role ADMIN
    if (claims.role !== 'ADMIN') {
      sendJson(res, 403, {
        error: 'Truy cập bị từ chối: Yêu cầu quyền Quản trị viên (ADMIN)',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return true;
    }

    // =========================================================================
    // 1. GET /api/v1/admin/stats - Thống kê hệ thống
    // =========================================================================
    if (method === 'GET' && pathname === '/api/v1/admin/stats') {
      try {
        const stats = await userRepo.getStats();
        const commStats = communityService
          ? await communityService.getCommunityStats()
          : { spacesCount: 0, threadsCount: 0, commentsCount: 0 };

        sendJson(res, 200, {
          ...stats,
          ...commStats,
        });
        return true;
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Không thể lấy dữ liệu thống kê' });
        return true;
      }
    }

    // =========================================================================
    // 2. GET /api/v1/admin/users - Danh sách người dùng
    // =========================================================================
    if (method === 'GET' && pathname === '/api/v1/admin/users') {
      try {
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
        const role = (url.searchParams.get('role') || undefined) as UserRole | undefined;
        const status = (url.searchParams.get('status') || undefined) as UserStatus | undefined;
        const search = url.searchParams.get('search') || undefined;

        const offset = (page - 1) * limit;
        const [result, userThreadCounts] = await Promise.all([
          userRepo.listUsers({
            role,
            status,
            search,
            limit,
            offset,
          }),
          communityService
            ? communityService.getUserThreadCounts()
            : Promise.resolve<Record<string, number>>({}),
        ]);

        const threadCounts = userThreadCounts as Record<string, number>;
        const sanitizedUsers = result.users.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          status: u.status,
          karmaScore: u.karmaScore,
          threadsCount: threadCounts[u.id] || 0,
          avatarUrl: u.avatarUrl ?? null,
          bio: u.bio ?? null,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        }));

        sendJson(res, 200, {
          users: sanitizedUsers,
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        });
        return true;
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Không thể tải danh sách người dùng' });
        return true;
      }
    }

    // =========================================================================
    // 3. PATCH /api/v1/admin/users/:id/role - Cập nhật vai trò
    // =========================================================================
    const roleMatch = pathname.match(/^\/api\/v1\/admin\/users\/([0-9a-fA-F-]+)\/role$/);
    if (method === 'PATCH' && roleMatch) {
      try {
        const targetUserId = roleMatch[1];
        const body = await readJsonBody(req);
        const parsed = AdminUpdateRoleSchema.safeParse(body);

        if (!parsed.success) {
          sendJson(res, 400, { error: 'Dữ liệu không hợp lệ', details: parsed.error.issues });
          return true;
        }

        const updated = await userRepo.updateRole(targetUserId, parsed.data.role);

        // Thu hồi các phiên hiện có để ép người dùng nhận JWT có role mới
        await sessionStore.revokeAllUserSessions(targetUserId);

        sendJson(res, 200, {
          message: `Cập nhật vai trò thành công cho ${updated.username}`,
          user: {
            id: updated.id,
            username: updated.username,
            role: updated.role,
            status: updated.status,
            updatedAt: updated.updatedAt.toISOString(),
          },
        });
        return true;
      } catch (err: any) {
        sendJson(res, 400, { error: err.message || 'Cập nhật vai trò thất bại' });
        return true;
      }
    }

    // =========================================================================
    // 4. PATCH /api/v1/admin/users/:id/status - Khóa / Mở khóa tài khoản
    // =========================================================================
    const statusMatch = pathname.match(/^\/api\/v1\/admin\/users\/([0-9a-fA-F-]+)\/status$/);
    if (method === 'PATCH' && statusMatch) {
      try {
        const targetUserId = statusMatch[1];
        const body = await readJsonBody(req);
        const parsed = AdminUpdateStatusSchema.safeParse(body);

        if (!parsed.success) {
          sendJson(res, 400, { error: 'Dữ liệu không hợp lệ', details: parsed.error.issues });
          return true;
        }

        const updated = await userRepo.updateStatus(targetUserId, parsed.data.status);

        // Nếu bị khóa tài khoản hoặc cấm, lập tức thu hồi toàn bộ phiên
        if (parsed.data.status === 'SUSPENDED' || parsed.data.status === 'DELETED') {
          await sessionStore.revokeAllUserSessions(targetUserId);
        }

        sendJson(res, 200, {
          message: `Cập nhật trạng thái thành công cho ${updated.username}`,
          user: {
            id: updated.id,
            username: updated.username,
            role: updated.role,
            status: updated.status,
            updatedAt: updated.updatedAt.toISOString(),
          },
        });
        return true;
      } catch (err: any) {
        sendJson(res, 400, { error: err.message || 'Cập nhật trạng thái thất bại' });
        return true;
      }
    }

    // =========================================================================
    // 5. POST /api/v1/admin/users/:id/revoke-sessions - Cưỡng chế thu hồi phiên
    // =========================================================================
    const revokeMatch = pathname.match(/^\/api\/v1\/admin\/users\/([0-9a-fA-F-]+)\/revoke-sessions$/);
    if (method === 'POST' && revokeMatch) {
      try {
        const targetUserId = revokeMatch[1];
        await sessionStore.revokeAllUserSessions(targetUserId);
        sendJson(res, 200, {
          message: 'Đã thu hồi thành công toàn bộ phiên đăng nhập của người dùng',
          userId: targetUserId,
        });
        return true;
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Thu hồi phiên thất bại' });
        return true;
      }
    }

    // =========================================================================
    // 6. GET /api/v1/admin/spaces - Danh sách Không Gian Quản Trị
    // =========================================================================
    if (method === 'GET' && pathname === '/api/v1/admin/spaces') {
      try {
        const spaces = communityService ? await communityService.adminListSpaces() : [];
        sendJson(res, 200, { spaces });
        return true;
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Không thể tải danh sách không gian' });
        return true;
      }
    }

    // =========================================================================
    // 7. DELETE /api/v1/admin/spaces/:id - Xóa Không Gian Thảo Luận
    // =========================================================================
    const spaceDeleteMatch = pathname.match(/^\/api\/v1\/admin\/spaces\/([0-9a-fA-F-]+)$/);
    if (method === 'DELETE' && spaceDeleteMatch) {
      try {
        const targetSpaceId = spaceDeleteMatch[1];
        if (!communityService) {
          sendJson(res, 500, { error: 'Community service không khả dụng' });
          return true;
        }
        const success = await communityService.adminDeleteSpace(targetSpaceId);
        if (!success) {
          sendJson(res, 404, { error: 'Không tìm thấy không gian hoặc không thể xóa' });
          return true;
        }
        sendJson(res, 200, {
          message: 'Đã xóa không gian thảo luận thành công',
          spaceId: targetSpaceId,
        });
        return true;
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Xóa không gian thất bại' });
        return true;
      }
    }

    // =========================================================================
    // 8. GET /api/v1/admin/threads - Danh Sách Bài Viết Quản Trị
    // =========================================================================
    if (method === 'GET' && pathname === '/api/v1/admin/threads') {
      try {
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));
        const spaceId = url.searchParams.get('spaceId') || undefined;
        const search = url.searchParams.get('search') || undefined;

        if (!communityService) {
          sendJson(res, 200, { threads: [], total: 0, page, limit, totalPages: 0 });
          return true;
        }

        const result = await communityService.adminListThreads({ page, limit, spaceId, search });
        sendJson(res, 200, {
          threads: result.threads,
          total: result.total,
          page,
          limit,
          totalPages: Math.ceil(result.total / limit),
        });
        return true;
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Không thể tải danh sách bài viết' });
        return true;
      }
    }

    // =========================================================================
    // 9. PATCH /api/v1/admin/threads/:id/pin - Ghim / Bỏ Ghim Bài Viết
    // =========================================================================
    const pinMatch = pathname.match(/^\/api\/v1\/admin\/threads\/([0-9a-fA-F-]+)\/pin$/);
    if (method === 'PATCH' && pinMatch) {
      try {
        const threadId = pinMatch[1];
        const body = await readJsonBody(req);
        const isPinned = Boolean(body?.isPinned);
        if (!communityService) {
          sendJson(res, 500, { error: 'Community service không khả dụng' });
          return true;
        }
        await communityService.adminSetThreadPinned(threadId, isPinned);
        sendJson(res, 200, {
          message: isPinned ? 'Đã ghim bài viết lên đầu trang' : 'Đã bỏ ghim bài viết',
          isPinned,
        });
        return true;
      } catch (err: any) {
        sendJson(res, 400, { error: err.message || 'Thao tác ghim bài thất bại' });
        return true;
      }
    }

    // =========================================================================
    // 10. PATCH /api/v1/admin/threads/:id/lock - Khóa / Mở Khóa Bình Luận
    // =========================================================================
    const lockMatch = pathname.match(/^\/api\/v1\/admin\/threads\/([0-9a-fA-F-]+)\/lock$/);
    if (method === 'PATCH' && lockMatch) {
      try {
        const threadId = lockMatch[1];
        const body = await readJsonBody(req);
        const isLocked = Boolean(body?.isLocked);
        if (!communityService) {
          sendJson(res, 500, { error: 'Community service không khả dụng' });
          return true;
        }
        await communityService.adminSetThreadLocked(threadId, isLocked);
        sendJson(res, 200, {
          message: isLocked ? 'Đã khóa bình luận của bài viết' : 'Đã mở khóa bình luận',
          isLocked,
        });
        return true;
      } catch (err: any) {
        sendJson(res, 400, { error: err.message || 'Thao tác khóa bài thất bại' });
        return true;
      }
    }

    // =========================================================================
    // 11. DELETE /api/v1/admin/threads/:id - Xóa Bài Viết Quản Trị (Admin Override)
    // =========================================================================
    const threadDeleteMatch = pathname.match(/^\/api\/v1\/admin\/threads\/([0-9a-fA-F-]+)$/);
    if (method === 'DELETE' && threadDeleteMatch) {
      try {
        const threadId = threadDeleteMatch[1];
        if (!communityService) {
          sendJson(res, 500, { error: 'Community service không khả dụng' });
          return true;
        }
        const success = await communityService.adminDeleteThread(threadId);
        if (!success) {
          sendJson(res, 404, { error: 'Không tìm thấy bài viết hoặc bài viết đã bị xóa' });
          return true;
        }
        sendJson(res, 200, {
          message: 'Đã xóa bài viết vi phạm thành công',
          threadId,
        });
        return true;
      } catch (err: any) {
        sendJson(res, 500, { error: err.message || 'Xóa bài viết thất bại' });
        return true;
      }
    }

    return false;
  };
}
