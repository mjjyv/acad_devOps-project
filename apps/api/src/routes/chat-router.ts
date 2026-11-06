/**
 * @file chat-router.ts
 * @description API Routes for Reddit Realtime Chat Subsystem, Chat Requests Queue, Threads, Presence, and SSE.
 */

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
  presenceManager: PresenceManager;
  sseManager: SseManager;
}

export const DirectChatInputSchema = z.object({
  recipientId: z.string().uuid('Mã định danh người nhận không hợp lệ'),
  initialMessage: z.string().min(1, 'Nội dung tin nhắn không được rỗng').max(5000),
});

export const TypingInputSchema = z.object({
  isTyping: z.boolean().default(true),
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

  // ============================================================================
  // 1. KÊNH CHAT & TIN NHẮN (CHANNELS & MESSAGES)
  // ============================================================================

  // GET /chat/channels: Danh sách phòng chat của người dùng kèm unreadCount và tin nhắn mới nhất
  router.get('/channels', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const channels = await services.chatService.listChannels(userId);
      res.status(200).json({ channels });
    } catch (err) {
      next(err);
    }
  });

  // POST /chat/channels/direct: Khởi tạo nhắn tin 1-1 (Người lạ -> Chat Request PENDING; Bạn bè -> Trả về kênh)
  router.post(
    '/channels/direct',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const body = DirectChatInputSchema.parse(req.body);

        const result = await services.chatService.initiateDirectChat(
          userId,
          body.recipientId,
          body.initialMessage,
        );

        if (result.isRequest) {
          res.status(201).json({
            isRequest: true,
            request: result.request,
          });
        } else {
          res.status(200).json({
            isRequest: false,
            channel: result.channel,
          });
        }
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /chat/channels/group: Tạo phòng chat nhóm (Reddit Group Chat)
  router.post('/channels/group', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const body = CreateGroupChannelInputSchema.parse(req.body);

      const channel = await services.chatService.createGroupChannel(
        userId,
        body.name,
        body.memberIds,
      );

      res.status(201).json({ channel });
    } catch (err) {
      next(err);
    }
  });

  // GET /chat/channels/:id/messages: Lấy lịch sử tin nhắn kèm Keyset Cursor & Chat Threads filter
  router.get(
    '/channels/:id/messages',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const channelId = req.params.id as string;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
        const cursor = req.query.cursor as string | undefined;
        let parentMessageId: string | null | undefined;

        if (req.query.parentMessageId === 'null') {
          parentMessageId = null;
        } else if (typeof req.query.parentMessageId === 'string') {
          parentMessageId = req.query.parentMessageId;
        }

        const messages = await services.chatService.listMessages(channelId, userId, {
          limit,
          cursor,
          parentMessageId,
        });

        // Tạo Keyset nextCursor từ tin nhắn cũ nhất trong trang
        let nextCursor: string | null = null;
        if (messages.length === limit) {
          const oldest = messages[messages.length - 1];
          if (oldest) {
            const timeMs = new Date(oldest.createdAt).getTime();
            nextCursor = Buffer.from(`${timeMs}:${oldest.id}`).toString('base64url');
          }
        }

        res.status(200).json({
          messages,
          nextCursor,
        });
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /chat/channels/:id/messages: Gửi tin nhắn mới hoặc phản hồi Chat Thread
  router.post(
    '/channels/:id/messages',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const channelId = req.params.id as string;
        const body = SendMessageInputSchema.parse({
          ...req.body,
          channelId,
        });

        const message = await services.chatService.sendMessage(userId, {
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

  // ============================================================================
  // 2. HÀNG ĐỢI YÊU CẦU TIN NHẮN TỪ NGƯỜI LẠ (STRANGER REQUESTS QUEUE)
  // ============================================================================

  // GET /chat/requests: Danh sách yêu cầu tin nhắn đang chờ duyệt (PENDING)
  router.get('/requests', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const requests = await services.chatService.listPendingRequests(userId);
      res.status(200).json({ requests });
    } catch (err) {
      next(err);
    }
  });

  // PATCH /chat/requests/:id: Phê duyệt (ACCEPTED), bỏ qua (IGNORED), hoặc chặn (BLOCKED)
  router.patch('/requests/:id', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = getAuthUserId(req);
      const requestId = req.params.id as string;
      const body = RespondChatRequestInputSchema.parse(req.body);

      const result = await services.chatService.respondChatRequest(requestId, userId, body.status);

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  // ============================================================================
  // 3. THỜI GIAN THỰC: SSE GATEWAY & TRẠNG THÁI HIỆN DIỆN (PRESENCE & TYPING)
  // ============================================================================

  // GET /chat/events: Kênh Server-Sent Events (SSE) theo chuẩn RFC 8895
  // Hỗ trợ cả Authorization header và ?token= query string (phục vụ Native EventSource trình duyệt)
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
      });
      return;
    }

    // Đăng ký client vào SSE Gateway và đánh dấu online
    services.sseManager.registerClient(payload.sub, res);
    void services.presenceManager.setOnline(payload.sub);
  });

  // POST /chat/channels/:id/typing: Phát tín hiệu đang gõ tin nhắn (Typing Indicator)
  router.post(
    '/channels/:id/typing',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        const channelId = req.params.id as string;
        const body = TypingInputSchema.parse(req.body);

        await services.chatService.setTyping(channelId, userId, body.isTyping);

        res.status(200).json({ status: 'ok' });
      } catch (err) {
        next(err);
      }
    },
  );

  // POST /chat/presence/heartbeat: Cập nhật nhịp tim trực tuyến (TTL 15s)
  router.post(
    '/presence/heartbeat',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = getAuthUserId(req);
        await services.presenceManager.setOnline(userId);
        res.status(200).json({ status: 'ok', isOnline: true });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
