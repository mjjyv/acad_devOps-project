import type { NextFunction, Request, Response } from 'express';

/**
 * ==============================================================================
 * REQUEST TIMEOUT MIDDLEWARE - SLOWLORIS & HANGING SOCKET DEFENSE
 * Hủy các request bị treo quá ngưỡng quy định để giải phóng tài nguyên
 * ==============================================================================
 */
export function requestTimeout(timeoutMs = 25000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        const correlationId = (req as unknown as { correlationId?: string }).correlationId || '';
        res.status(504).json({
          type: 'https://httpstatuses.com/504',
          title: 'Gateway Timeout',
          status: 504,
          detail: `Request processing timed out after ${timeoutMs / 1000} seconds.`,
          correlationId,
        });
      }
    }, timeoutMs);

    // Xóa bộ đếm khi response kết thúc
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}
