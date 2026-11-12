import { TokenManager } from '@acad/auth-service';
import {
  type CommentService,
  type FeedService,
  SpaceNotFoundError,
  type SpaceService,
  ThreadNotFoundError,
  type ThreadService,
  type VoteFlushWorker,
  type VoteService,
  type ZeroHopStorageService,
} from '@acad/community-service';
import {
  CreateFlairInputSchema,
  CreateSpaceInputSchema,
  CreateThreadInputSchema,
} from '@acad/contracts';
import express, { type NextFunction, type Request, type Response, Router } from 'express';
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

const CreateCommentBodySchema = z.object({
  content: z.string().min(1, 'Nội dung bình luận không được rỗng').max(10000),
  parentId: z.string().uuid().optional(),
  parentAuthorUsername: z.string().optional(),
});

const PresignedUrlBodySchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSizeBytes: z.number().int().positive().optional(),
});

const VoteBodySchema = z.object({
  direction: z.union([z.literal(1), z.literal(-1)]),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getAuthUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId) {
    throw new Error('Unauthorized: thiếu thông tin người dùng phiên đăng nhập');
  }
  return userId;
}

function getOptionalUserId(req: Request, jwtSecret: string): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const claims = TokenManager.verifyAccessToken(authHeader.slice(7).trim(), jwtSecret);
    if (claims) return claims.sub;
  }
  return undefined;
}

async function resolveThreadId(
  services: CommunityServices,
  idOrSlug: string,
  viewerId?: string,
): Promise<string> {
  const thread = UUID_REGEX.test(idOrSlug)
    ? await services.threadService.getThreadById(idOrSlug, viewerId)
    : await services.threadService.getThreadBySlug(idOrSlug, viewerId);
  if (!thread) {
    throw new ThreadNotFoundError();
  }
  return thread.id;
}

async function requireSpaceBySlug(services: CommunityServices, slug: string, viewerId?: string) {
  const space = await services.spaceService.getSpaceBySlug(slug, viewerId);
  if (!space) {
    throw new SpaceNotFoundError(`Không gian thảo luận "${slug}" không tồn tại`);
  }
  return space;
}

export function createCommunityRouter(
  services: CommunityServices,
  jwtSecret: string = TokenManager.DEFAULT_SECRET,
): Router {
  const router = Router();
  const guard = authGuard(jwtSecret);

  // ===========================================================================
  // 1. SPACES & TOPICS (/spaces)
  // ===========================================================================

  router.get('/spaces/topics', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const topics = await services.spaceService.listSpaceTopics();
      res.status(200).json({ topics });
    } catch (err) {
      next(err);
    }
  });

  router.get('/spaces', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20;
      const offset = req.query.offset ? Number.parseInt(String(req.query.offset), 10) : 0;
      const topic =
        typeof req.query.topic === 'string' && req.query.topic.trim()
          ? req.query.topic.trim()
          : undefined;
      const q =
        typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
      const userId = getOptionalUserId(req, jwtSecret);

      const spaces = await services.spaceService.listSpaces(
        { limit, offset, ...(topic ? { topic } : {}), ...(q ? { q } : {}) },
        userId,
      );
      res.status(200).json({ spaces });
    } catch (err) {
      next(err);
    }
  });

  router.post('/spaces', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedInput = CreateSpaceInputSchema.parse(req.body);
      const space = await services.spaceService.createSpace(validatedInput, getAuthUserId(req));
      res.status(201).json(space);
    } catch (err) {
      next(err);
    }
  });

  router.get('/spaces/:slug', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getOptionalUserId(req, jwtSecret);
      const space = await requireSpaceBySlug(services, req.params.slug as string, userId);
      res.status(200).json(space);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/spaces/:slug/join',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const space = await requireSpaceBySlug(services, req.params.slug as string, userId);
        await services.spaceService.joinSpace(space.id, userId);
        res.status(200).json({ status: 'ok', spaceId: space.id });
      } catch (err) {
        next(err);
      }
    },
  );

  const handleLeaveSpace = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const space = await requireSpaceBySlug(services, req.params.slug as string, userId);
      await services.spaceService.leaveSpace(space.id, userId);
      res.status(200).json({ status: 'ok', spaceId: space.id });
    } catch (err) {
      next(err);
    }
  };
  router.post('/spaces/:slug/leave', guard, handleLeaveSpace);
  router.delete('/spaces/:slug/leave', guard, handleLeaveSpace);

  router.get('/spaces/:slug/flairs', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getOptionalUserId(req, jwtSecret);
      const space = await requireSpaceBySlug(services, req.params.slug as string, userId);
      const flairs = await services.spaceService.listFlairs(space.id);
      res.status(200).json({ flairs });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/spaces/:slug/flairs',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const space = await requireSpaceBySlug(services, req.params.slug as string, userId);
        const input = CreateFlairInputSchema.parse(req.body);
        const flair = await services.spaceService.createFlair(space.id, input, userId);
        res.status(201).json(flair);
      } catch (err) {
        next(err);
      }
    },
  );

  // ===========================================================================
  // 2. THREADS CMS & SEARCH
  // ===========================================================================

  router.get('/spaces/:slug/threads', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getOptionalUserId(req, jwtSecret);
      const sort = req.query.sort as 'hot' | 'new' | 'top' | 'best' | undefined;
      const time = req.query.time as 'day' | 'week' | 'month' | 'year' | 'all' | undefined;
      const flairId = typeof req.query.flairId === 'string' ? req.query.flairId : undefined;
      const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

      const feed = await services.feedService.getSpaceFeed(req.params.slug as string, userId, {
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

  router.post(
    '/spaces/:slug/threads',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const space = await requireSpaceBySlug(services, req.params.slug as string, userId);
        const validatedInput = CreateThreadInputSchema.parse({
          ...req.body,
          spaceId: space.id,
        });
        const thread = await services.threadService.createThread(validatedInput, userId);
        res.status(201).json(thread);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/spaces/:slug/search', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getOptionalUserId(req, jwtSecret);
      const query = String(req.query.q || '');
      const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20;
      const threads = await services.threadService.searchThreadsInSpace(
        req.params.slug as string,
        query,
        limit,
        userId,
      );
      res.status(200).json({ threads });
    } catch (err) {
      next(err);
    }
  });

  router.get('/threads/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idOrSlug = req.params.id as string;
      const userId = getOptionalUserId(req, jwtSecret);
      const thread = UUID_REGEX.test(idOrSlug)
        ? await services.threadService.getThreadById(idOrSlug, userId)
        : await services.threadService.getThreadBySlug(idOrSlug, userId);
      if (!thread) {
        throw new ThreadNotFoundError();
      }
      res.status(200).json(thread);
    } catch (err) {
      next(err);
    }
  });

  // ===========================================================================
  // 3. VOTING & SAVED BOOKMARKS
  // ===========================================================================

  router.post(
    '/threads/:id/vote',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const threadId = await resolveThreadId(services, req.params.id as string, userId);
        const body = VoteBodySchema.parse(req.body);
        const result = await services.voteService.voteThread(threadId, userId, body.direction);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/comments/:id/vote',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const body = VoteBodySchema.parse(req.body);
        const result = await services.voteService.voteComment(
          req.params.id as string,
          userId,
          body.direction,
        );
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/threads/:id/save',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const threadId = await resolveThreadId(services, req.params.id as string, userId);
        const result = await services.voteService.toggleSaveThread(threadId, userId);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/users/me/saved', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20;
      const offset = req.query.offset ? Number.parseInt(String(req.query.offset), 10) : 0;
      const items = await services.voteService.listSavedThreads(userId, limit, offset);
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  });

  // ===========================================================================
  // 4. FEEDS (/feed/home, /feed/popular)
  // ===========================================================================

  router.get('/feed/home', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getOptionalUserId(req, jwtSecret);
      const sort = req.query.sort as 'hot' | 'new' | 'top' | 'best' | undefined;
      const time = req.query.time as 'day' | 'week' | 'month' | 'year' | 'all' | undefined;
      const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const feed = await services.feedService.getHomeFeed(userId, { sort, time, limit, cursor });
      res.status(200).json(feed);
    } catch (err) {
      next(err);
    }
  });

  router.get('/feed/popular', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getOptionalUserId(req, jwtSecret);
      const sort = req.query.sort as 'hot' | 'new' | 'top' | 'best' | undefined;
      const time = req.query.time as 'day' | 'week' | 'month' | 'year' | 'all' | undefined;
      const q =
        typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
      const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 20;
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const feed = await services.feedService.getPopularFeed(userId, {
        sort,
        time,
        q,
        limit,
        cursor,
      });
      res.status(200).json(feed);
    } catch (err) {
      next(err);
    }
  });

  // ===========================================================================
  // 5. COMMENTS (ltree Base36) & MEDIA PRESIGN
  // ===========================================================================

  router.get(
    '/threads/:threadId/comments',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getOptionalUserId(req, jwtSecret);
        const resolvedId = await resolveThreadId(services, req.params.threadId as string, userId);
        const tree = await services.commentService.getCommentTree(resolvedId, userId);
        res.status(200).json(tree);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/threads/:threadId/comments',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const resolvedId = await resolveThreadId(services, req.params.threadId as string, userId);
        const body = CreateCommentBodySchema.parse(req.body);
        const comment = await services.commentService.createComment({
          threadId: resolvedId,
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

  router.delete('/comments/:id', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await services.commentService.softDeleteComment(req.params.id as string, getAuthUserId(req));
      res.status(200).json({ status: 'ok' });
    } catch (err) {
      next(err);
    }
  });

  const resolveBaseUrl = (req: Request): string | undefined => {
    if (process.env.API_PUBLIC_URL) return process.env.API_PUBLIC_URL;
    const host = req.get('host');
    return host ? `${req.protocol}://${host}` : undefined;
  };

  router.post('/media/presign', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = PresignedUrlBodySchema.parse(req.body);
      const result = await services.storageService.generatePresignedUploadUrl({
        fileName: body.fileName,
        fileType: body.fileType,
        fileSizeBytes: body.fileSizeBytes,
        userId: getAuthUserId(req),
        baseUrl: resolveBaseUrl(req),
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.put(
    '/media/upload',
    express.raw({ type: '*/*', limit: '10mb' }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const key = typeof req.query.key === 'string' ? req.query.key : '';
        const exp = Number.parseInt(String(req.query.exp ?? '0'), 10);
        const mime = typeof req.query.mime === 'string' ? req.query.mime : '';
        const max = Number.parseInt(String(req.query.max ?? '0'), 10);
        const uid = typeof req.query.uid === 'string' ? req.query.uid : '';
        const sig = typeof req.query.sig === 'string' ? req.query.sig : '';
        const contentType =
          typeof req.headers['content-type'] === 'string' ? req.headers['content-type'] : mime;
        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

        const uploaded = await services.storageService.saveLocalUpload(
          { key, exp, mime, max, uid, sig, contentType, body },
          resolveBaseUrl(req),
        );
        res.status(200).json(uploaded);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/media/files/*', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wildcard = (req.params as Record<string, string | undefined>)[0] ?? '';
      const key = decodeURIComponent(wildcard);
      const file = await services.storageService.readLocalFile(key);
      if (!file) {
        res.setHeader('Content-Type', 'application/problem+json');
        res.status(404).json({
          type: 'https://api.acad.vn/errors/not-found',
          title: 'Media File Not Found',
          status: 404,
          detail: 'Không tìm thấy tệp phương tiện yêu cầu.',
          instance: req.originalUrl || req.url,
          correlationId: req.correlationId,
        });
        return;
      }

      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.status(200).send(file.buffer);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
