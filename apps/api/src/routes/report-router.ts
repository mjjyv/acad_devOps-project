import { CreateReportInputSchema } from '@acad/contracts';
import type { ModerationService } from '@acad/moderation-service';
import { type NextFunction, type Request, type Response, Router } from 'express';

export function createReportRouter(moderationService: ModerationService): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.setHeader('Content-Type', 'application/problem+json');
        res.status(401).json({
          type: 'https://api.acad.vn/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authentication required to submit a moderation report.',
          instance: req.originalUrl || req.url,
          correlationId: req.correlationId,
        });
        return;
      }

      const input = CreateReportInputSchema.parse(req.body);
      const report = await moderationService.submitReport(user.sub, user.username, input);
      res.status(201).json(report);
    } catch (err) {
      next(err);
    }
  });

  router.get('/my', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.setHeader('Content-Type', 'application/problem+json');
        res.status(401).json({
          type: 'https://api.acad.vn/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authentication required.',
          instance: req.originalUrl || req.url,
          correlationId: req.correlationId,
        });
        return;
      }

      const reports = await moderationService.listReportsByReporter(user.sub);
      res.status(200).json({ reports });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
