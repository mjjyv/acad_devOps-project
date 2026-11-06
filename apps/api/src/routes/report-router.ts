import { CreateReportInputSchema } from '@acad/contracts';
import type { ModerationService } from '@acad/moderation-service';
import { type NextFunction, type Request, type Response, Router } from 'express';

export function createReportRouter(moderationService: ModerationService): Router {
  const router = Router();

  // POST /reports - Gửi báo cáo vi phạm nội dung
  router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          type: 'https://api.acad.vn/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Yêu cầu đăng nhập để gửi báo cáo vi phạm',
          instance: req.originalUrl,
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

  // GET /reports/my - Danh sách báo cáo do chính người dùng gửi
  router.get('/my', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({
          type: 'https://api.acad.vn/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Yêu cầu đăng nhập để xem danh sách báo cáo của bạn',
          instance: req.originalUrl,
          correlationId: req.correlationId,
        });
        return;
      }

      const reports = await moderationService.listReportsByReporter(user.sub);
      res.status(200).json(reports);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
