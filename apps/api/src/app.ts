import type { AuthService } from '@acad/auth-service';
import { TokenManager } from '@acad/auth-service';
import type { ModerationService } from '@acad/moderation-service';
import express, { type Application } from 'express';
import type { Redis } from 'ioredis';
import type pg from 'pg';
import { authGuard } from './middleware/auth-guard.js';
import { configureCors } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { createAdminRouter } from './routes/admin-router.js';
import { createAuthRouter } from './routes/auth-router.js';
import { type ChatServices, createChatRouter } from './routes/chat-router.js';
import { type CommunityServices, createCommunityRouter } from './routes/community-router.js';
import { createHealthzRouter } from './routes/healthz-router.js';
import { createReportRouter } from './routes/report-router.js';

export interface AppOptions {
  authService: AuthService;
  communityServices?: CommunityServices | undefined;
  chatServices?: ChatServices | undefined;
  moderationService?: ModerationService | undefined;
  jwtSecret?: string | undefined;
  pool?: pg.Pool | undefined;
  redis?: Redis | undefined;
}

export function createApp(options: AppOptions): Application {
  const app = express();
  const jwtSecret = options.jwtSecret ?? TokenManager.DEFAULT_SECRET;

  // 1. Security & Core Middlewares
  app.use(configureCors());
  app.use(requestIdMiddleware());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 2. Health Check Router
  app.use('/', createHealthzRouter({ pool: options.pool, redis: options.redis }));

  // 3. Auth Router mounted on both /auth and /api/v1/auth for OpenAPI compatibility
  const authRouter = createAuthRouter(options.authService, jwtSecret);
  app.use('/auth', authRouter);
  app.use('/api/v1/auth', authRouter);

  // 4. Community Router mounted on both / and /api/v1 for Spaces, Threads, Comments, Media
  if (options.communityServices) {
    const communityRouter = createCommunityRouter(options.communityServices, jwtSecret);
    app.use('/', communityRouter);
    app.use('/api/v1', communityRouter);
  }

  // 5. Chat Router mounted on /chat and /api/v1/chat
  if (options.chatServices) {
    const chatRouter = createChatRouter(options.chatServices, jwtSecret);
    app.use('/chat', chatRouter);
    app.use('/api/v1/chat', chatRouter);
  }

  // 6. Moderation & Admin Routers mounted on /reports, /admin and OpenAPI /api/v1 equivalents
  if (options.moderationService) {
    const reportRouter = createReportRouter(options.moderationService);
    app.use('/reports', authGuard(jwtSecret), reportRouter);
    app.use('/api/v1/reports', authGuard(jwtSecret), reportRouter);

    const adminRouter = createAdminRouter(options.moderationService);
    app.use('/admin', authGuard(jwtSecret), adminRouter);
    app.use('/api/v1/admin', authGuard(jwtSecret), adminRouter);
  }

  // 7. Centralized RFC 7807 Error Handler
  app.use(errorHandler());

  return app;
}
