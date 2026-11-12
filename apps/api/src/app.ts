import { type AuthService, TokenManager } from '@acad/auth-service';
import type { ModerationService } from '@acad/moderation-service';
import express, { type Application } from 'express';
import type { Redis } from 'ioredis';
import type pg from 'pg';
import { authGuard } from './middleware/auth-guard.js';
import { configureCors } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';
import {
  authRateLimiter,
  globalRateLimiter,
  interactionRateLimiter,
} from './middleware/rate-limiter.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { requestTimeout } from './middleware/request-timeout.js';
import { securityHeaders } from './middleware/security-headers.js';
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
  disableRateLimit?: boolean | undefined;
}

export function createApp(options: AppOptions): Application {
  const app = express();
  const jwtSecret = options.jwtSecret ?? TokenManager.DEFAULT_SECRET;
  const isTest = process.env.NODE_ENV === 'test';
  const shouldRateLimit =
    options.disableRateLimit !== undefined ? !options.disableRateLimit : !isTest;

  app.disable('x-powered-by');
  app.use(securityHeaders());
  app.use(requestTimeout(25000));
  app.use(configureCors());
  app.use(requestIdMiddleware());

  if (shouldRateLimit) {
    app.use(globalRateLimiter(options.redis));
  }

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  const healthzRouter = createHealthzRouter({ pool: options.pool, redis: options.redis });
  app.use('/', healthzRouter);
  app.use('/api/v1', healthzRouter);

  const authRouter = createAuthRouter(options.authService, jwtSecret);
  if (shouldRateLimit) {
    const authLimiter = authRateLimiter(options.redis);
    app.use('/auth', authLimiter, authRouter);
    app.use('/api/v1/auth', authLimiter, authRouter);
  } else {
    app.use('/auth', authRouter);
    app.use('/api/v1/auth', authRouter);
  }

  if (options.communityServices) {
    const communityRouter = createCommunityRouter(options.communityServices, jwtSecret);
    app.use('/', communityRouter);
    app.use('/api/v1', communityRouter);
  }

  if (options.chatServices) {
    const chatRouter = createChatRouter(options.chatServices, jwtSecret);
    app.use('/chat', chatRouter);
    app.use('/api/v1/chat', chatRouter);
  }

  if (options.moderationService) {
    const guard = authGuard(jwtSecret);
    const reportRouter = createReportRouter(options.moderationService);
    if (shouldRateLimit) {
      const reportLimiter = interactionRateLimiter(options.redis);
      app.use('/reports', guard, reportLimiter, reportRouter);
      app.use('/api/v1/reports', guard, reportLimiter, reportRouter);
    } else {
      app.use('/reports', guard, reportRouter);
      app.use('/api/v1/reports', guard, reportRouter);
    }

    const adminRouter = createAdminRouter(options.moderationService);
    app.use('/admin', guard, adminRouter);
    app.use('/api/v1/admin', guard, adminRouter);
  }

  app.use(errorHandler());

  return app;
}
