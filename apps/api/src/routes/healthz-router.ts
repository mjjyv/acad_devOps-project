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
      version: '3.0.0',
      documentation: '/api/v1/openapi.yaml',
      healthz: '/healthz',
      status: 'running',
      timestamp: new Date().toISOString(),
    });
  });

  router.get('/healthz', async (_req: Request, res: Response) => {
    const services: Record<string, string> = {};
    let isHealthy = true;

    if (options.pool) {
      try {
        await options.pool.query('SELECT 1');
        services.database = 'ok';
      } catch {
        services.database = 'down';
        isHealthy = false;
      }
    } else {
      services.database = 'not_configured';
    }

    if (options.redis) {
      try {
        const ping = await options.redis.ping();
        if (ping === 'PONG') {
          services.redis = 'ok';
        } else {
          services.redis = 'down';
          isHealthy = false;
        }
      } catch {
        services.redis = 'down';
        isHealthy = false;
      }
    } else {
      services.redis = 'not_configured';
    }

    if (!isHealthy) {
      res.setHeader('Retry-After', '5');
    }

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '3.0.0',
      services,
    });
  });

  return router;
}
