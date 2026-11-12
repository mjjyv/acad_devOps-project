import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export function requestIdMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      crypto.randomUUID();

    req.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
    next();
  };
}
