import type { NextFunction, Request, Response } from 'express';

export function requestTimeout(timeoutMs = 25000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Cho phép kết nối SSE dài hạn không bị ngắt bởi HTTP request timeout
    if (req.path.endsWith('/events')) {
      next();
      return;
    }

    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/problem+json');
        res.status(504).json({
          type: 'https://api.acad.vn/errors/gateway-timeout',
          title: 'Gateway Timeout',
          status: 504,
          detail: `Request processing timed out after ${timeoutMs / 1000} seconds.`,
          instance: req.originalUrl || req.url,
          correlationId: req.correlationId,
        });
      }
    }, timeoutMs);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}
