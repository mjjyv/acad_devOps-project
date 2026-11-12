import type { NextFunction, Request, Response } from 'express';

export function adminGuard(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;

  if (!user) {
    res.setHeader('Content-Type', 'application/problem+json');
    res.status(401).json({
      type: 'https://api.acad.vn/errors/unauthorized',
      title: 'Missing Authorization Token',
      status: 401,
      detail: 'A valid Bearer access token is required to access administrative resources.',
      instance: req.originalUrl || req.url,
      correlationId: req.correlationId,
    });
    return;
  }

  if (user.role !== 'ADMIN' && user.role !== 'GLOBAL_MOD') {
    res.setHeader('Content-Type', 'application/problem+json');
    res.status(403).json({
      type: 'https://api.acad.vn/errors/forbidden',
      title: 'Forbidden Administrative Access',
      status: 403,
      detail: 'Yêu cầu quyền ADMIN hoặc GLOBAL_MOD để truy cập tài nguyên quản trị này.',
      instance: req.originalUrl || req.url,
      correlationId: req.correlationId,
    });
    return;
  }

  next();
}
