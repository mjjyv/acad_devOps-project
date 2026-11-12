import { type FullJWTClaims, TokenManager } from '@acad/auth-service';
import type { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: FullJWTClaims;
    }
  }
}

export function authGuard(jwtSecret: string = TokenManager.DEFAULT_SECRET) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.setHeader('Content-Type', 'application/problem+json');
      res.status(401).json({
        type: 'https://api.acad.vn/errors/unauthorized',
        title: 'Missing Authorization Token',
        status: 401,
        detail: 'A valid Bearer access token is required in the Authorization header.',
        instance: req.originalUrl || req.url,
        correlationId: req.correlationId,
      });
      return;
    }

    const token = authHeader.slice(7).trim();
    const payload = TokenManager.verifyAccessToken(token, jwtSecret);

    if (!payload) {
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

    req.user = payload;
    next();
  };
}
