/**
 * @file community-router.ts
 * @description API Routes for Spaces, Threads CMS, Nested Comments ltree, Media Presigned URLs, Atomic Voting, and Feeds.
 */

import { TokenManager } from '@acad/auth-service';
import type {
  CommentService,
  FeedService,
  SpaceService,
  ThreadService,
  VoteFlushWorker,
  VoteService,
  ZeroHopStorageService,
} from '@acad/community-service';
import {
  CreateFlairInputSchema,
  CreateSpaceInputSchema,
  CreateThreadInputSchema,
} from '@acad/contracts';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { authGuard } from '../middleware/auth-guard.js';

export interface CommunityServices {
  spaceService: SpaceService;
  threadService: ThreadService;
  commentService: CommentService;
  storageService: ZeroHopStorageService;
  voteService: VoteService;
  feedService: FeedService;
  flushWorker?: VoteFlushWorker | undefined;
}

export const CreateCommentBodySchema = z.object({
  content: z.string().min(1, 'Nội dung bình luận không được rỗng').max(10000),
  parentId: z.string().uuid().optional(),
  parentAuthorUsername: z.string().optional(),
});

export const PresignedUrlBodySchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
});

export const VoteBodySchema = z.object({
  direction: z.union([z.literal(1), z.literal(-1)]),
});

// Helper lấy an toàn userId từ AuthGuard
function getAuthUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId) {
    throw new Error('Unauthorized: thiếu thông tin người dùng phiên đăng nhập');
  }
  return userId;
}

// Helper phân giải ID bài viết từ UUID hoặc Slug
async function resolveThreadId(
  services: CommunityServices,
  idOrSlug: string,
  viewerId?: string,
): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  if (isUuid) {
    const thread = await services.threadService.getThreadById(idOrSlug, viewerId);
    return thread ? thread.id : null;
  }
  const thread = await services.threadService.getThreadBySlug(idOrSlug, viewerId);
  return thread ? thread.id : null;
}

// Helper lấy userId tùy chọn từ Bearer token (nếu có)
function getOptionalUserId(req: Request, jwtSecret: string): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const claims = TokenManager.verifyAccessToken(authHeader.slice(7).trim(), jwtSecret);
    if (claims) return claims.sub;
  }
  return undefined;
}

export function createCommunityRouter(
  services: CommunityServices,
  jwtSecret: string = TokenManager.DEFAULT_SECRET,
): Router {
  const router = Router();
  const guard = authGuard(jwtSecret);

  // ===========================================================================
  // 1. SPACES ENDPOINTS (/spaces)
  // ===========================================================================

  // GET /spaces - Danh sách không gian thảo luận
  router.get('/spaces', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
      const userId = getOptionalUserId(req, jwtSecret);
      const spaces = await services.spaceService.listSpaces({ limit, offset }, userId);
      res.status(200).json({ spaces });
    } catch (err) {
      next(err);
    }
  });

  // POST /spaces - Tạo không gian thảo luận mới (AuthGuard)
  router.post('/spaces', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedInput = CreateSpaceInputSchema.parse(req.body);
      const space = await services.spaceService.createSpace(validatedInput, getAuthUserId(req));
      res.status(201).json(space);
    } catch (err) {
      next(err);
    }
  });

  // GET /spaces/:slug - Thông tin chi tiết không gian
  router.get('/spaces/:slug', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug as string;
      const userId = getOptionalUserId(req, jwtSecret);

      const space = await services.spaceService.getSpaceBySlug(slug, userId);
      if (!space) {
        res.status(404).json({
          type: 'https://api.acad.vn/errors/not-found',
          title: 'Space Not Found',
          status: 404,
          detail: `Không gian thảo luận "${slug}" không tồn tại.`,
          instance: req.originalUrl || req.url,
        });
        return;
      }
      res.status(200).json(space);
    } catch (err) {
      next(err);
    }
  });

  // POST /spaces/:slug/join - Tham gia không gian (AuthGuard)
  router.post(
    '/spaces/:slug/join',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const slug = req.params.slug as string;
        const space = await services.spaceService.getSpaceBySlug(slug);
        if (!space) {
          res.status(404).json({ title: 'Not Found', status: 404 });
          return;
        }
        await services.spaceService.joinSpace(space.id, getAuthUserId(req));
        res.status(200).json({ message: 'Tham gia không gian thành công' });
      } catch (err) {
        next(err);
      }
    },
  );

  const handleLeaveSpace = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug as string;
      const space = await services.spaceService.getSpaceBySlug(slug);
      if (!space) {
        res.status(404).json({ title: 'Not Found', status: 404 });
        return;
      }
      await services.spaceService.leaveSpace(space.id, getAuthUserId(req));
      res.status(200).json({ message: 'Rời không gian thành công' });
    } catch (err) {
      next(err);
    }
  };

  // POST /spaces/:slug/leave & DELETE /spaces/:slug/leave - Rời không gian (AuthGuard)
  router.post('/spaces/:slug/leave', guard, handleLeaveSpace);
  router.delete('/spaces/:slug/leave', guard, handleLeaveSpace);

  // GET /spaces/:slug/flairs - Danh sách Flairs của không gian
  router.get('/spaces/:slug/flairs', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug as string;
      const space = await services.spaceService.getSpaceBySlug(slug);
      if (!space) {
        res.status(404).json({ title: 'Not Found', status: 404 });
        return;
      }
      const flairs = await services.spaceService.listFlairs(space.id);
      res.status(200).json({ flairs });
    } catch (err) {
      next(err);
    }
  });

  // POST /spaces/:slug/flairs - Tạo Flair mới (Creator/Mod only)
  router.post(
    '/spaces/:slug/flairs',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const slug = req.params.slug as string;
        const space = await services.spaceService.getSpaceBySlug(slug);
        if (!space) {
          res.status(404).json({ title: 'Not Found', status: 404 });
          return;
        }
        const validatedInput = CreateFlairInputSchema.parse(req.body);
        const flair = await services.spaceService.createFlair(
          space.id,
          validatedInput,
          getAuthUserId(req),
        );
        res.status(201).json(flair);
      } catch (err) {
        next(err);
      }
    },
  );

  // ===========================================================================
  // 2. THREADS ENDPOINTS (/threads)
  // ===========================================================================

  // GET /spaces/:slug/threads - Danh sách bài viết trong không gian (Feed & Keyset Cursor)
  router.get('/spaces/:slug/threads', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug as string;
      const userId = getOptionalUserId(req, jwtSecret);
      const sort = req.query.sort as 'hot' | 'new' | 'top' | 'best' | undefined;
      const time = req.query.time as 'day' | 'week' | 'month' | 'year' | 'all' | undefined;
      const flairId = req.query.flairId as string | undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const cursor = req.query.cursor as string | undefined;

      const feed = await services.feedService.getSpaceFeed(slug, userId, {
        sort,
        time,
        flairId,
        limit,
        cursor,
      });
      res.status(200).json(feed);
    } catch (err) {
      next(err);
    }
  });

  // POST /spaces/:slug/threads - Đăng bài viết mới vào không gian (AuthGuard)
  router.post(
    '/spaces/:slug/threads',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const slug = req.params.slug as string;
        const space = await services.spaceService.getSpaceBySlug(slug);
        if (!space) {
          res.status(404).json({ title: 'Not Found', status: 404 });
          return;
        }
        const validatedInput = CreateThreadInputSchema.parse({
          ...req.body,
          spaceId: space.id,
        });
        const thread = await services.threadService.createThread(
          validatedInput,
          getAuthUserId(req),
        );
        res.status(201).json(thread);
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /threads/:id - Chi tiết bài viết theo UUID hoặc Slug
  router.get('/threads/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idOrSlug = req.params.id as string;
      const userId = getOptionalUserId(req, jwtSecret);
      let thread = await services.threadService.getThreadById(idOrSlug, userId);
      if (!thread) {
        thread = await services.threadService.getThreadBySlug(idOrSlug, userId);
      }
      if (!thread) {
        res.status(404).json({
          type: 'https://api.acad.vn/errors/not-found',
          title: 'Thread Not Found',
          status: 404,
          detail: 'Không tìm thấy bài viết yêu cầu.',
          instance: req.originalUrl || req.url,
        });
        return;
      }
      res.status(200).json(thread);
    } catch (err) {
      next(err);
    }
  });

  // GET /spaces/:slug/search - Tìm kiếm bài viết trong không gian (In-Space Search)
  router.get('/spaces/:slug/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug as string;
      const userId = getOptionalUserId(req, jwtSecret);
      const space = await services.spaceService.getSpaceBySlug(slug);
      if (!space) {
        res.status(404).json({ title: 'Not Found', status: 404 });
        return;
      }
      const query = String(req.query.q || '');
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const threads = await services.threadService.searchThreads(space.id, query, limit, userId);
      res.status(200).json({ threads });
    } catch (err) {
      next(err);
    }
  });

  // ===========================================================================
  // 3. VOTING & SAVED THREADS ENDPOINTS (Phase B3)
  // ===========================================================================

  // POST /threads/:id/vote - Bầu chọn bài viết (AuthGuard)
  router.post(
    '/threads/:id/vote',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const idParam = req.params.id as string;
        const threadId = await resolveThreadId(services, idParam, userId);
        if (!threadId) {
          res.status(404).json({
            type: 'https://api.acad.vn/errors/not-found',
            title: 'Resource Not Found',
            status: 404,
            detail: 'Không tìm thấy bài viết yêu cầu',
            instance: req.originalUrl || req.url,
          });
          return;
        }
        const body = VoteBodySchema.parse(req.body);

        const result = await services.voteService.voteThread(threadId, userId, body.direction);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /comments/:id/vote - Bầu chọn bình luận (AuthGuard)
  router.post(
    '/comments/:id/vote',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const commentId = req.params.id as string;
        const body = VoteBodySchema.parse(req.body);
        const userId = getAuthUserId(req);

        const result = await services.voteService.voteComment(commentId, userId, body.direction);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /threads/:id/save - Đánh dấu lưu / bỏ lưu bài viết (AuthGuard)
  router.post(
    '/threads/:id/save',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const idParam = req.params.id as string;
        const threadId = await resolveThreadId(services, idParam, userId);
        if (!threadId) {
          res.status(404).json({
            type: 'https://api.acad.vn/errors/not-found',
            title: 'Resource Not Found',
            status: 404,
            detail: 'Không tìm thấy bài viết yêu cầu',
            instance: req.originalUrl || req.url,
          });
          return;
        }

        const result = await services.voteService.toggleSaveThread(threadId, userId);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  // GET /users/me/saved - Danh sách bài viết đã lưu của tôi (AuthGuard)
  router.get('/users/me/saved', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;

      const items = await services.voteService.listSavedThreads(userId, limit, offset);
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  });

  // ===========================================================================
  // 4. FEEDS ENDPOINTS (/feed/home, /feed/popular) (Phase B3)
  // ===========================================================================

  // GET /feed/home - Bảng tin trang chủ (các Spaces đã tham gia)
  router.get('/feed/home', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getOptionalUserId(req, jwtSecret);
      const sort = req.query.sort as 'hot' | 'new' | 'top' | 'best' | undefined;
      const time = req.query.time as 'day' | 'week' | 'month' | 'year' | 'all' | undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const cursor = req.query.cursor as string | undefined;

      const feed = await services.feedService.getHomeFeed(userId, { sort, time, limit, cursor });
      res.status(200).json(feed);
    } catch (err) {
      next(err);
    }
  });

  // GET /feed/popular - Bảng tin thịnh hành toàn cầu
  router.get('/feed/popular', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getOptionalUserId(req, jwtSecret);
      const sort = req.query.sort as 'hot' | 'new' | 'top' | 'best' | undefined;
      const time = req.query.time as 'day' | 'week' | 'month' | 'year' | 'all' | undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const cursor = req.query.cursor as string | undefined;

      const feed = await services.feedService.getPopularFeed(userId, {
        sort,
        time,
        limit,
        cursor,
      });
      res.status(200).json(feed);
    } catch (err) {
      next(err);
    }
  });

  // ===========================================================================
  // 5. COMMENTS ENDPOINTS (ltree & Capped Depth)
  // ===========================================================================

  // GET /threads/:threadId/comments - Lấy toàn bộ cây bình luận đã sắp xếp
  router.get(
    '/threads/:threadId/comments',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const threadIdParam = req.params.threadId as string;
        const userId = getOptionalUserId(req, jwtSecret);
        const threadId = await resolveThreadId(services, threadIdParam, userId);
        if (!threadId) {
          res.status(200).json({ items: [], totalCount: 0 });
          return;
        }
        const tree = await services.commentService.getThreadComments(threadId, userId);
        res.status(200).json(tree);
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /threads/:threadId/comments - Thêm bình luận gốc hoặc trả lời con (AuthGuard)
  router.post(
    '/threads/:threadId/comments',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const threadIdParam = req.params.threadId as string;
        const threadId = await resolveThreadId(services, threadIdParam, userId);
        if (!threadId) {
          res.status(404).json({
            type: 'https://api.acad.vn/errors/not-found',
            title: 'Resource Not Found',
            status: 404,
            detail: 'Không tìm thấy bài viết yêu cầu',
            instance: req.originalUrl || req.url,
          });
          return;
        }
        const body = CreateCommentBodySchema.parse(req.body);

        const comment = await services.commentService.createComment({
          threadId,
          authorId: userId,
          content: body.content,
          parentId: body.parentId,
          parentAuthorUsername: body.parentAuthorUsername,
        });

        res.status(201).json(comment);
      } catch (err) {
        next(err);
      }
    },
  );

  // DELETE /comments/:commentId - Xóa mềm bình luận (AuthGuard)
  router.delete(
    '/comments/:commentId',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const commentId = req.params.commentId as string;
        await services.commentService.softDeleteComment(commentId, getAuthUserId(req));
        res.status(200).json({ message: 'Xóa bình luận thành công' });
      } catch (err) {
        next(err);
      }
    },
  );

  // ===========================================================================
  // 6. MEDIA STORAGE ENDPOINTS (Presigned PUT URL)
  // ===========================================================================

  // POST /media/presigned-url - Cấp Presigned PUT URL tải ảnh Zero-hop (AuthGuard)
  router.post(
    '/media/presigned-url',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = PresignedUrlBodySchema.parse(req.body);
        const result = await services.storageService.generatePresignedUploadUrl({
          fileName: body.fileName,
          fileType: body.fileType,
          userId: getAuthUserId(req),
        });
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
