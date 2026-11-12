import { type Request, type Response, Router } from 'express';
import type { Redis } from 'ioredis';
import type pg from 'pg';

export interface HealthCheckOptions {
  pool?: pg.Pool | undefined;
  redis?: Redis | undefined;
}

export function createHealthzRouter(options: HealthCheckOptions = {}): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Acad DevOps Core API Gateway',
      version: '2.0.0',
      documentation: '/api/v1/openapi.yaml',
      healthz: '/healthz',
      status: 'running',
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/healthz', async (_req: Request, res: Response) => {
    const checks: Record<string, string> = {};
    let isHealthy = true;

    // 1. Check PostgreSQL Database
    if (options.pool) {
      try {
        await options.pool.query('SELECT 1');
        checks.database = 'ok';
      } catch (_err) {
        checks.database = 'down';
        isHealthy = false;
      }
    } else {
      checks.database = 'not_configured';
    }

    // 2. Check Redis Session Cache
    if (options.redis) {
      try {
        const ping = await options.redis.ping();
        checks.redis = ping === 'PONG' ? 'ok' : 'degraded';
      } catch (_err) {
        checks.redis = 'down';
        isHealthy = false;
      }
    } else {
      checks.redis = 'not_configured';
    }

    const payload = {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '2.0.0',
      services: checks,
    };

    res.status(isHealthy ? 200 : 503).json(payload);
  });

  return router;
}
