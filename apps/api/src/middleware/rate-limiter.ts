import type { NextFunction, Request, Response } from 'express';
import type { Redis } from 'ioredis';

export interface RateLimitOptions {
  tierName: string;
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  message?: string;
}

interface MemoryRecord {
  count: number;
  resetTime: number;
}

function resolveClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() || '127.0.0.1';
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

export class RateLimiter {
  private static memoryStore = new Map<string, MemoryRecord>();
  private static cleanupTimer: ReturnType<typeof setInterval> | null = null;

  public static resetMemoryStore(): void {
    RateLimiter.memoryStore.clear();
  }

  private static ensureCleanup(): void {
    if (RateLimiter.cleanupTimer) return;
    RateLimiter.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of RateLimiter.memoryStore.entries()) {
        if (record.resetTime <= now) {
          RateLimiter.memoryStore.delete(key);
        }
      }
    }, 60 * 1000);
    RateLimiter.cleanupTimer.unref();
  }

  public static create(options: RateLimitOptions, redis?: Redis) {
    const {
      tierName,
      windowMs,
      max,
      keyGenerator = (req: Request) => {
        const userId = req.user?.sub;
        return userId ? `user:${userId}` : `ip:${resolveClientIp(req)}`;
      },
      skip = () => false,
      message = `Quá giới hạn yêu cầu (${max} req/${Math.round(windowMs / 1000)}s). Vui lòng thử lại sau.`,
    } = options;

    RateLimiter.ensureCleanup();

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (skip(req)) {
        next();
        return;
      }

      const clientKey = keyGenerator(req);
      const redisKey = `ratelimit:${tierName}:${clientKey}`;
      const now = Date.now();
      const windowSeconds = Math.ceil(windowMs / 1000);

      let currentCount = 0;
      let ttlSeconds = windowSeconds;

      if (redis && redis.status === 'ready') {
        try {
          const results = await redis.multi().incr(redisKey).ttl(redisKey).exec();
          if (results?.[0] && results[1]) {
            currentCount = (results[0][1] as number) || 1;
            const ttl = results[1][1] as number;
            if (ttl === -1) {
              await redis.expire(redisKey, windowSeconds);
              ttlSeconds = windowSeconds;
            } else if (ttl > 0) {
              ttlSeconds = ttl;
            }
          }
        } catch {
          currentCount = 0;
        }
      }

      if (currentCount === 0) {
        const memKey = `${tierName}:${clientKey}`;
        const existing = RateLimiter.memoryStore.get(memKey);
        if (!existing || existing.resetTime <= now) {
          RateLimiter.memoryStore.set(memKey, { count: 1, resetTime: now + windowMs });
          currentCount = 1;
          ttlSeconds = windowSeconds;
        } else {
          existing.count += 1;
          currentCount = existing.count;
          ttlSeconds = Math.max(1, Math.ceil((existing.resetTime - now) / 1000));
        }
      }

      const remaining = Math.max(0, max - currentCount);
      const resetTimestamp = Math.floor(now / 1000) + ttlSeconds;

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTimestamp);

      if (currentCount > max) {
        res.setHeader('Retry-After', String(ttlSeconds));
        res.setHeader('Content-Type', 'application/problem+json');
        res.status(429).json({
          type: 'https://api.acad.vn/errors/too-many-requests',
          title: 'Too Many Requests',
          status: 429,
          detail: message,
          instance: req.originalUrl || req.url,
          correlationId: req.correlationId,
        });
        return;
      }

      next();
    };
  }
}

/**
 * Chỉ giới hạn các request xác thực/cấp token (POST /login, /register, /refresh)
 * ở mức 10 req/60s/IP; các API đọc/tìm kiếm (/me, /users/search) chạy qua globalRateLimiter.
 */
export function authRateLimiter(redis?: Redis) {
  return RateLimiter.create(
    {
      tierName: 'auth',
      windowMs: 60 * 1000,
      max: 10,
      skip: (req: Request) =>
        req.method !== 'POST' || !['/login', '/register', '/refresh'].includes(req.path),
      message: 'Bạn đã thử đăng nhập/đăng ký quá nhiều lần. Vui lòng chờ 1 phút.',
    },
    redis,
  );
}

export function interactionRateLimiter(redis?: Redis) {
  return RateLimiter.create(
    {
      tierName: 'interaction',
      windowMs: 60 * 1000,
      max: 30,
      message: 'Thao tác quá nhanh. Vui lòng giảm tần suất gửi dữ liệu.',
    },
    redis,
  );
}

export function globalRateLimiter(redis?: Redis) {
  return RateLimiter.create(
    {
      tierName: 'global',
      windowMs: 60 * 1000,
      max: 180,
      skip: (req: Request) =>
        req.path === '/healthz' || req.path === '/api/v1/healthz' || req.path === '/',
      message: 'Lưu lượng truy cập từ địa chỉ IP của bạn vượt quá ngưỡng cho phép.',
    },
    redis,
  );
}
