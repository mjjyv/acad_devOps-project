/**
 * @file community-router.ts
 * @description API Routes for Spaces, Threads CMS, Nested Comments ltree, and Media Presigned URLs.
 */

import { TokenManager } from '@acad/auth-service';
import type {
  CommentService,
  SpaceService,
  ThreadService,
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

// Helper lấy an toàn userId từ AuthGuard
function getAuthUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId) {
    throw new Error('Unauthorized: thiếu thông tin người dùng phiên đăng nhập');
  }
  return userId;
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
      const spaces = await services.spaceService.listSpaces({ limit, offset });
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
      // Trích xuất userId nếu có token Bearer gửi kèm (optional)
      let userId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const claims = TokenManager.verifyAccessToken(authHeader.slice(7).trim(), jwtSecret);
        if (claims) userId = claims.sub;
      }

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

  // POST /spaces/:slug/leave - Rời không gian (AuthGuard)
  router.post(
    '/spaces/:slug/leave',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
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
    },
  );

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

  // GET /spaces/:slug/threads - Danh sách bài viết trong không gian
  router.get('/spaces/:slug/threads', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug as string;
      const space = await services.spaceService.getSpaceBySlug(slug);
      if (!space) {
        res.status(404).json({ title: 'Not Found', status: 404 });
        return;
      }
      const flairId = req.query.flairId as string | undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : 0;
      const threads = await services.threadService.listSpaceThreads(space.id, {
        flairId,
        limit,
        offset,
      });
      res.status(200).json({ threads });
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
      let thread = await services.threadService.getThreadById(idOrSlug);
      if (!thread) {
        thread = await services.threadService.getThreadBySlug(idOrSlug);
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
      const space = await services.spaceService.getSpaceBySlug(slug);
      if (!space) {
        res.status(404).json({ title: 'Not Found', status: 404 });
        return;
      }
      const query = String(req.query.q || '');
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const threads = await services.threadService.searchThreads(space.id, query, limit);
      res.status(200).json({ threads });
    } catch (err) {
      next(err);
    }
  });

  // ===========================================================================
  // 3. COMMENTS ENDPOINTS (ltree & Capped Depth)
  // ===========================================================================

  // GET /threads/:threadId/comments - Lấy toàn bộ cây bình luận đã sắp xếp
  router.get(
    '/threads/:threadId/comments',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const threadId = req.params.threadId as string;
        const tree = await services.commentService.getThreadComments(threadId);
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
        const threadId = req.params.threadId as string;
        const body = CreateCommentBodySchema.parse(req.body);

        const comment = await services.commentService.createComment({
          threadId,
          authorId: getAuthUserId(req),
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
  // 4. MEDIA STORAGE ENDPOINTS (Presigned PUT URL)
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
