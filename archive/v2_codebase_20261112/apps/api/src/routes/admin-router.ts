import type { FullJWTClaims } from '@acad/auth-service';
import {
  AdminUpdateUserRoleInputSchema,
  AdminUpdateUserStatusInputSchema,
  ModReportStatusSchema,
  ModReportTargetTypeSchema,
  ResolveReportInputSchema,
  UserRoleSchema,
  UserStatusSchema,
} from '@acad/contracts';
import type { ModerationService } from '@acad/moderation-service';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { adminGuard } from '../middleware/admin-guard.js';

const PinLockInputSchema = z.object({
  value: z.boolean(),
});

function requireAdmin(req: Request): FullJWTClaims {
  if (!req.user) {
    throw new Error('Unauthorized admin session');
  }
  return req.user;
}

export function createAdminRouter(moderationService: ModerationService): Router {
  const router = Router();

  // All /admin endpoints require ADMIN or GLOBAL_MOD privilege
  router.use(adminGuard);

  // ----------------------------------------------------------------------------
  // 1. SYSTEM METRICS & STATS
  // ----------------------------------------------------------------------------
  router.get('/stats', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const stats = await moderationService.getAdminStats();
      res.status(200).json(stats);
    } catch (err) {
      next(err);
    }
  });

  // ----------------------------------------------------------------------------
  // 2. USER MANAGEMENT
  // ----------------------------------------------------------------------------
  router.get('/users', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const role = req.query.role ? UserRoleSchema.parse(req.query.role) : undefined;
      const status = req.query.status ? UserStatusSchema.parse(req.query.status) : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? Number.parseInt(req.query.offset as string, 10) : 0;

      const result = await moderationService.listUsers({
        role,
        status,
        search,
        limit,
        offset,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/users/:id/role',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const admin = requireAdmin(req);
        const targetUserId = req.params.id as string;
        const input = AdminUpdateUserRoleInputSchema.parse(req.body);

        await moderationService.updateUserRole(
          admin.sub,
          admin.username,
          targetUserId,
          input.role,
          {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        );

        res.status(200).json({ success: true, role: input.role });
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/users/:id/status',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const admin = requireAdmin(req);
        const targetUserId = req.params.id as string;
        const input = AdminUpdateUserStatusInputSchema.parse(req.body);

        await moderationService.updateUserStatus(
          admin.sub,
          admin.username,
          targetUserId,
          input.status,
          input.reason,
          {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        );

        res.status(200).json({ success: true, status: input.status });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/users/:id/revoke-sessions',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const admin = requireAdmin(req);
        const targetUserId = req.params.id as string;

        await moderationService.revokeUserSessions(admin.sub, admin.username, targetUserId, {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        res.status(200).json({ success: true, message: 'All user sessions revoked successfully' });
      } catch (err) {
        next(err);
      }
    },
  );

  // ----------------------------------------------------------------------------
  // 3. SPACES MANAGEMENT
  // ----------------------------------------------------------------------------
  router.get('/spaces', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const spaces = await moderationService.adminListSpaces();
      res.status(200).json(spaces);
    } catch (err) {
      next(err);
    }
  });

  router.delete(
    '/spaces/:id',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const admin = requireAdmin(req);
        const spaceId = req.params.id as string;
        const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;

        await moderationService.deleteSpace(admin.sub, admin.username, spaceId, reason, {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        res.status(200).json({ success: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // ----------------------------------------------------------------------------
  // 4. THREADS MANAGEMENT
  // ----------------------------------------------------------------------------
  router.get('/threads', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const spaceId = typeof req.query.spaceId === 'string' ? req.query.spaceId : undefined;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? Number.parseInt(req.query.offset as string, 10) : 0;

      const result = await moderationService.adminListThreads({
        spaceId,
        search,
        limit,
        offset,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/threads/:id/pin',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const admin = requireAdmin(req);
        const threadId = req.params.id as string;
        const input = PinLockInputSchema.parse(req.body);

        await moderationService.setThreadPinned(admin.sub, admin.username, threadId, input.value, {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        res.status(200).json({ success: true, isPinned: input.value });
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/threads/:id/lock',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const admin = requireAdmin(req);
        const threadId = req.params.id as string;
        const input = PinLockInputSchema.parse(req.body);

        await moderationService.setThreadLocked(admin.sub, admin.username, threadId, input.value, {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        res.status(200).json({ success: true, isLocked: input.value });
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete(
    '/threads/:id',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const admin = requireAdmin(req);
        const threadId = req.params.id as string;
        const reason = typeof req.body?.reason === 'string' ? req.body.reason : undefined;

        await moderationService.deleteThread(admin.sub, admin.username, threadId, reason, {
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        res.status(200).json({ success: true });
      } catch (err) {
        next(err);
      }
    },
  );

  // ----------------------------------------------------------------------------
  // 5. MODERATION QUEUE (MOD REPORTS)
  // ----------------------------------------------------------------------------
  router.get('/reports', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status = req.query.status ? ModReportStatusSchema.parse(req.query.status) : undefined;
      const targetType = req.query.targetType
        ? ModReportTargetTypeSchema.parse(req.query.targetType)
        : undefined;
      const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? Number.parseInt(req.query.offset as string, 10) : 0;

      const result = await moderationService.listReports({
        status,
        targetType,
        limit,
        offset,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.patch(
    '/reports/:id',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const admin = requireAdmin(req);
        const reportId = req.params.id as string;
        const input = ResolveReportInputSchema.parse(req.body);

        const updated = await moderationService.resolveReport(
          admin.sub,
          admin.username,
          reportId,
          input,
          {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        );

        res.status(200).json(updated);
      } catch (err) {
        next(err);
      }
    },
  );

  // ----------------------------------------------------------------------------
  // 6. AUDIT LOGS
  // ----------------------------------------------------------------------------
  router.get(
    '/audit-logs',
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const actorId = typeof req.query.actorId === 'string' ? req.query.actorId : undefined;
        const action = typeof req.query.action === 'string' ? req.query.action : undefined;
        const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;
        const offset = req.query.offset ? Number.parseInt(req.query.offset as string, 10) : 0;

        const result = await moderationService.listAuditLogs({
          actorId,
          action,
          limit,
          offset,
        });

        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
