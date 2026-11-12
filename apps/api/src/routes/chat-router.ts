import { TokenManager } from '@acad/auth-service';
import type { ChatService, PresenceManager, SseManager } from '@acad/chat-service';
import {
  CreateGroupChannelInputSchema,
  RespondChatRequestInputSchema,
  SendMessageInputSchema,
} from '@acad/contracts';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { authGuard } from '../middleware/auth-guard.js';

export interface ChatServices {
  chatService: ChatService;
  sseManager: SseManager;
  presenceManager: PresenceManager;
}

const InitiateDirectChatBodySchema = z.object({
  recipientId: z.string().uuid(),
  initialMessage: z.string().min(1, 'Tin nhắn mở đầu không được rỗng').max(5000),
});

const TypingBodySchema = z.object({
  isTyping: z.boolean(),
});

const MarkReadInputSchema = z.object({
  messageId: z.string().uuid().optional(),
});

const PresenceBatchInputSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
});

function getAuthUserId(req: Request): string {
  const userId = req.user?.sub;
  if (!userId) {
    throw new Error('Unauthorized: thiếu thông tin người dùng phiên đăng nhập');
  }
  return userId;
}

export function createChatRouter(
  services: ChatServices,
  jwtSecret: string = TokenManager.DEFAULT_SECRET,
): Router {
  const router = Router();
  const guard = authGuard(jwtSecret);

  router.get('/channels', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const channels = await services.chatService.listUserChannels(getAuthUserId(req));
      res.status(200).json({ channels });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/channels/direct',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = InitiateDirectChatBodySchema.parse(req.body);
        const result = await services.chatService.initiateDirectChat(
          getAuthUserId(req),
          body.recipientId,
          body.initialMessage,
        );
        res.status(result.isRequest ? 202 : 201).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post('/channels/group', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = CreateGroupChannelInputSchema.parse(req.body);
      const channel = await services.chatService.createGroupChannel(
        getAuthUserId(req),
        body.name,
        body.memberIds,
      );
      res.status(201).json({ channel });
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/channels/:id/messages',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : 50;
        const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
        const parentMessageId =
          typeof req.query.parentMessageId === 'string' ? req.query.parentMessageId : undefined;

        const result = await services.chatService.listMessages(
          req.params.id as string,
          getAuthUserId(req),
          { limit, cursor, parentMessageId },
        );
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/channels/:id/messages',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const channelId = req.params.id as string;
        const body = SendMessageInputSchema.parse({ ...req.body, channelId });
        const message = await services.chatService.sendMessage(getAuthUserId(req), {
          channelId,
          content: body.content,
          parentMessageId: body.parentMessageId,
          attachments: body.attachments,
        });
        res.status(201).json({ message });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/channels/:id/read',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = MarkReadInputSchema.parse(req.body ?? {});
        await services.chatService.markChannelAsRead(
          req.params.id as string,
          getAuthUserId(req),
          body.messageId,
        );
        res.status(200).json({ status: 'ok' });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get('/requests', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawDirection =
        typeof req.query.direction === 'string' ? req.query.direction : 'incoming';
      const direction: 'incoming' | 'sent' | 'all' =
        rawDirection === 'sent' || rawDirection === 'all' ? rawDirection : 'incoming';
      const result = await services.chatService.listRequests(getAuthUserId(req), direction);

      if (direction === 'all') {
        res.status(200).json({
          requests: result.incoming,
          incoming: result.incoming,
          sent: result.sent,
        });
      } else if (direction === 'sent') {
        res.status(200).json({ requests: result.sent });
      } else {
        res.status(200).json({ requests: result.incoming });
      }
    } catch (err) {
      next(err);
    }
  });

  router.patch('/requests/:id', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = RespondChatRequestInputSchema.parse(req.body);
      const result = await services.chatService.respondChatRequest(
        req.params.id as string,
        getAuthUserId(req),
        body.status,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/requests/:id', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      await services.chatService.cancelChatRequest(req.params.id as string, getAuthUserId(req));
      res.status(200).json({ status: 'ok' });
    } catch (err) {
      next(err);
    }
  });

  router.get('/events', (req: Request, res: Response): void => {
    let token: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else if (typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.setHeader('Content-Type', 'application/problem+json');
      res.status(401).json({
        type: 'https://api.acad.vn/errors/unauthorized',
        title: 'Missing Authorization Token',
        status: 401,
        detail: 'A valid access token is required via Authorization header or ?token query string.',
        instance: req.originalUrl || req.url,
        correlationId: req.correlationId,
      });
      return;
    }

    const payload = TokenManager.verifyAccessToken(token, jwtSecret);
    if (!payload?.sub) {
      res.setHeader('Content-Type', 'application/problem+json');
      res.status(401).json({
        type: 'https://api.acad.vn/errors/unauthorized',
        title: 'Invalid or Expired Token',
        status: 401,
        detail: 'The provided access token is invalid or has expired.',
        instance: req.originalUrl || req.url,
        correlationId: req.correlationId,
      });
      return;
    }

    services.sseManager.registerClient(payload.sub, res, req);
    void services.presenceManager.setOnline(payload.sub);
  });

  router.post(
    '/channels/:id/typing',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = TypingBodySchema.parse(req.body);
        await services.chatService.notifyTyping(
          req.params.id as string,
          getAuthUserId(req),
          body.isTyping,
        );
        res.status(200).json({ status: 'ok' });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/presence/heartbeat',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await services.presenceManager.setOnline(getAuthUserId(req));
        res.status(200).json({ status: 'ok', online: true });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post('/presence/batch', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = PresenceBatchInputSchema.parse(req.body);
      const statuses = await services.presenceManager.getOnlineStatusBatch(body.userIds);
      res.status(200).json({ statuses });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
