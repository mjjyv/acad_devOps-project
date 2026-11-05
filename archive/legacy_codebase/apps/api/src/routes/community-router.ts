import { IncomingMessage, ServerResponse } from 'node:http';
import { AuthModule, TokenManager } from '@acad/auth-service';
import { CommunityService } from '@acad/community-service';
import {
  COOKIE_CONFIG,
  CreateSpaceInputSchema,
  CreateThreadInputSchema,
  CreateCommentInputSchema,
  VoteInputSchema,
} from '@acad/contracts';
import { parseCookies, readJsonBody, sendJson } from './auth-router.js';

export interface AuthenticatedUser {
  userId: string;
  role: string;
}

export function getOptionalUser(req: IncomingMessage): AuthenticatedUser | null {
  const authHeader = req.headers.authorization;
  const cookies = parseCookies(req.headers.cookie);
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME]) {
    token = cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME];
  }

  if (!token) return null;
  try {
    const claims = TokenManager.verifyAccessToken(token);
    return {
      userId: claims.sub,
      role: claims.role,
    };
  } catch {
    return null;
  }
}

export function requireUser(
  req: IncomingMessage,
  res: ServerResponse,
): AuthenticatedUser | null {
  const user = getOptionalUser(req);
  if (!user) {
    sendJson(res, 401, {
      error: 'Yêu cầu đăng nhập để thực hiện thao tác này',
      code: 'UNAUTHORIZED',
    });
    return null;
  }
  return user;
}

export function createCommunityRouter(
  communityService: CommunityService,
  authModule: AuthModule,
) {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
  ): Promise<boolean> => {
    const pathname = url.pathname;
    const method = req.method?.toUpperCase();

    // Check if path matches community resources
    const isCommunityPath =
      pathname.startsWith('/api/v1/spaces') ||
      pathname.startsWith('/api/v1/threads') ||
      pathname.startsWith('/api/v1/comments');

    if (!isCommunityPath) {
      return false;
    }

    try {
      // =======================================================================
      // SPACES ENDPOINTS
      // =======================================================================

      // 1. GET /api/v1/spaces - Danh sách không gian
      if (pathname === '/api/v1/spaces' && method === 'GET') {
        const spaces = await communityService.listSpaces();
        sendJson(res, 200, { spaces });
        return true;
      }

      // 2. POST /api/v1/spaces - Tạo không gian mới
      if (pathname === '/api/v1/spaces' && method === 'POST') {
        const user = requireUser(req, res);
        if (!user) return true;

        const body = await readJsonBody(req);
        const parsed = CreateSpaceInputSchema.safeParse(body);
        if (!parsed.success) {
          sendJson(res, 400, {
            error: 'Dữ liệu không gian không hợp lệ',
            details: parsed.error.issues,
          });
          return true;
        }

        const space = await communityService.createSpace(parsed.data, user.userId);
        sendJson(res, 201, { space });
        return true;
      }

      // 3. POST /api/v1/spaces/:slug/join - Gia nhập không gian
      const spaceJoinMatch = pathname.match(/^\/api\/v1\/spaces\/([a-zA-Z0-9_-]+)\/join$/);
      if (spaceJoinMatch && method === 'POST') {
        const user = requireUser(req, res);
        if (!user) return true;

        const slug = spaceJoinMatch[1];
        const space = await communityService.getSpaceBySlug(slug);
        if (!space) {
          sendJson(res, 404, { error: 'Không gian không tồn tại' });
          return true;
        }

        const membership = await communityService.joinSpace(space.id, user.userId);
        sendJson(res, 200, { membership });
        return true;
      }

      // 4. POST /api/v1/spaces/:slug/leave - Rời không gian
      const spaceLeaveMatch = pathname.match(/^\/api\/v1\/spaces\/([a-zA-Z0-9_-]+)\/leave$/);
      if (spaceLeaveMatch && method === 'POST') {
        const user = requireUser(req, res);
        if (!user) return true;

        const slug = spaceLeaveMatch[1];
        const space = await communityService.getSpaceBySlug(slug);
        if (!space) {
          sendJson(res, 404, { error: 'Không gian không tồn tại' });
          return true;
        }

        const success = await communityService.leaveSpace(space.id, user.userId);
        sendJson(res, 200, { success });
        return true;
      }

      // 5. GET /api/v1/spaces/:slug - Chi tiết không gian
      const spaceGetMatch = pathname.match(/^\/api\/v1\/spaces\/([a-zA-Z0-9_-]+)$/);
      if (spaceGetMatch && method === 'GET') {
        const slug = spaceGetMatch[1];
        const space = await communityService.getSpaceBySlug(slug);
        if (!space) {
          sendJson(res, 404, { error: 'Không gian thảo luận không tồn tại' });
          return true;
        }
        sendJson(res, 200, { space });
        return true;
      }

      // =======================================================================
      // THREADS ENDPOINTS
      // =======================================================================

      // 6. GET /api/v1/threads - Bảng tin cộng đồng (Feed)
      if (pathname === '/api/v1/threads' && method === 'GET') {
        const optUser = getOptionalUser(req);
        const sort = (url.searchParams.get('sort') || 'hot') as 'hot' | 'new' | 'top';
        const spaceSlug = url.searchParams.get('spaceSlug') || url.searchParams.get('space') || undefined;
        const q = url.searchParams.get('q') || undefined;
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        const cursor = url.searchParams.get('cursor') || undefined;

        const result = await communityService.listThreads({
          sort: ['hot', 'new', 'top'].includes(sort) ? sort : 'hot',
          spaceSlug,
          q,
          limit: Math.min(Math.max(1, limit), 50),
          cursor,
          userId: optUser?.userId,
        });

        sendJson(res, 200, result);
        return true;
      }

      // 7. POST /api/v1/threads - Tạo bài viết mới
      if (pathname === '/api/v1/threads' && method === 'POST') {
        const user = requireUser(req, res);
        if (!user) return true;

        const body = await readJsonBody(req);
        const parsed = CreateThreadInputSchema.safeParse(body);
        if (!parsed.success) {
          sendJson(res, 400, {
            error: 'Dữ liệu bài viết không hợp lệ',
            details: parsed.error.issues,
          });
          return true;
        }

        // Lấy thông tin user hiện tại
        const userRec = await authModule.userRepo.findById(user.userId);
        const username = userRec?.username || 'member';
        const avatarUrl = userRec?.avatarUrl || null;

        const thread = await communityService.createThread(
          parsed.data,
          user.userId,
          username,
          avatarUrl,
        );

        sendJson(res, 201, { thread });
        return true;
      }

      // 8. GET /api/v1/threads/:idOrSlug/comments - Danh sách bình luận
      const threadCommentsMatch = pathname.match(/^\/api\/v1\/threads\/([a-zA-Z0-9_.-]+)\/comments$/);
      if (threadCommentsMatch && method === 'GET') {
        const optUser = getOptionalUser(req);
        const idOrSlug = threadCommentsMatch[1];

        let threadId = idOrSlug;
        // Nếu idOrSlug không phải UUID thì lookup theo slug
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)) {
          const t = await communityService.getThreadBySlug(idOrSlug);
          if (!t) {
            sendJson(res, 404, { error: 'Bài viết không tồn tại' });
            return true;
          }
          threadId = t.id;
        }

        const comments = await communityService.listComments(threadId, optUser?.userId);
        sendJson(res, 200, { comments });
        return true;
      }

      // 9. POST /api/v1/threads/:idOrSlug/comments - Tạo bình luận mới
      if (threadCommentsMatch && method === 'POST') {
        const user = requireUser(req, res);
        if (!user) return true;

        const idOrSlug = threadCommentsMatch[1];
        let threadId = idOrSlug;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)) {
          const t = await communityService.getThreadBySlug(idOrSlug);
          if (!t) {
            sendJson(res, 404, { error: 'Bài viết không tồn tại' });
            return true;
          }
          threadId = t.id;
        }

        const body = await readJsonBody(req);
        const commentData = { ...body, threadId };
        const parsed = CreateCommentInputSchema.safeParse(commentData);
        if (!parsed.success) {
          sendJson(res, 400, {
            error: 'Dữ liệu bình luận không hợp lệ',
            details: parsed.error.issues,
          });
          return true;
        }

        const userRec = await authModule.userRepo.findById(user.userId);
        const username = userRec?.username || 'member';
        const avatarUrl = userRec?.avatarUrl || null;
        const karmaScore = userRec?.karmaScore || 0;

        const comment = await communityService.createComment({
          threadId,
          parentId: parsed.data.parentId || null,
          contentAst: parsed.data.contentAst,
          authorId: user.userId,
          authorUsername: username,
          authorAvatarUrl: avatarUrl,
          karmaScore,
        });

        sendJson(res, 201, { comment });
        return true;
      }

      // 10. POST /api/v1/threads/:id/vote - Upvote / Downvote bài viết
      const threadVoteMatch = pathname.match(/^\/api\/v1\/threads\/([a-zA-Z0-9_-]+)\/vote$/);
      if (threadVoteMatch && method === 'POST') {
        const user = requireUser(req, res);
        if (!user) return true;

        const idOrSlug = threadVoteMatch[1];
        let threadId = idOrSlug;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)) {
          const t = await communityService.getThreadBySlug(idOrSlug);
          if (!t) {
            sendJson(res, 404, { error: 'Bài viết không tồn tại' });
            return true;
          }
          threadId = t.id;
        }

        const body = await readJsonBody(req);
        const parsed = VoteInputSchema.safeParse(body);
        if (!parsed.success) {
          sendJson(res, 400, { error: 'Hướng vote không hợp lệ (+1 hoặc -1)' });
          return true;
        }

        const voteRes = await communityService.voteThread(threadId, user.userId, parsed.data.direction);
        sendJson(res, 200, voteRes);
        return true;
      }

      // 11. DELETE /api/v1/threads/:id - Xóa bài viết
      const threadDeleteMatch = pathname.match(/^\/api\/v1\/threads\/([a-zA-Z0-9_-]+)$/);
      if (threadDeleteMatch && method === 'DELETE') {
        const user = requireUser(req, res);
        if (!user) return true;

        const id = threadDeleteMatch[1];
        const isAdminOrMod = user.role === 'ADMIN' || user.role === 'MODERATOR';
        const deleted = await communityService.deleteThread(id, user.userId, isAdminOrMod);
        sendJson(res, 200, { success: deleted });
        return true;
      }

      // 12. GET /api/v1/threads/:idOrSlug - Chi tiết bài viết
      if (threadDeleteMatch && method === 'GET') {
        const optUser = getOptionalUser(req);
        const idOrSlug = threadDeleteMatch[1];

        let thread: any = null;
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)) {
          thread = await communityService.getThreadById(idOrSlug, optUser?.userId);
        } else {
          thread = await communityService.getThreadBySlug(idOrSlug, optUser?.userId);
        }

        if (!thread) {
          sendJson(res, 404, { error: 'Bài viết không tồn tại' });
          return true;
        }

        sendJson(res, 200, { thread });
        return true;
      }

      // =======================================================================
      // COMMENTS ENDPOINTS
      // =======================================================================

      // 13. POST /api/v1/comments/:id/vote - Upvote / Downvote bình luận
      const commentVoteMatch = pathname.match(/^\/api\/v1\/comments\/([a-zA-Z0-9_-]+)\/vote$/);
      if (commentVoteMatch && method === 'POST') {
        const user = requireUser(req, res);
        if (!user) return true;

        const commentId = commentVoteMatch[1];
        const body = await readJsonBody(req);
        const parsed = VoteInputSchema.safeParse(body);
        if (!parsed.success) {
          sendJson(res, 400, { error: 'Hướng vote không hợp lệ (+1 hoặc -1)' });
          return true;
        }

        const voteRes = await communityService.voteComment(commentId, user.userId, parsed.data.direction);
        sendJson(res, 200, voteRes);
        return true;
      }

      // 14. DELETE /api/v1/comments/:id - Xóa bình luận
      const commentDeleteMatch = pathname.match(/^\/api\/v1\/comments\/([a-zA-Z0-9_-]+)$/);
      if (commentDeleteMatch && method === 'DELETE') {
        const user = requireUser(req, res);
        if (!user) return true;

        const commentId = commentDeleteMatch[1];
        const isAdminOrMod = user.role === 'ADMIN' || user.role === 'MODERATOR';
        const deleted = await communityService.deleteComment(commentId, user.userId, isAdminOrMod);
        sendJson(res, 200, { success: deleted });
        return true;
      }

      return false;
    } catch (err: any) {
      console.error('[CommunityRouter Error]:', err);
      sendJson(res, 500, {
        error: err.message || 'Lỗi xử lý nội bộ máy chủ',
      });
      return true;
    }
  };
}
