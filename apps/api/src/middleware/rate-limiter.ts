import type { NextFunction, Request, Response } from 'express';
import type { Redis } from 'ioredis';

export interface RateLimiterOptions {
  windowMs: number; // Thời gian cửa sổ tính bằng milliseconds
  max: number; // Số lượng request tối đa trong cửa sổ
  tierName?: string; // Tên phân tầng để sinh prefix key
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  message?: string;
}

interface InMemoryRecord {
  count: number;
  resetTime: number;
}

/**
 * ==============================================================================
 * RATE LIMITER MIDDLEWARE - REDIS SLIDING WINDOW WITH RESILIENT MEMORY FALLBACK
 * Bảo vệ hệ thống trước tấn công Brute-force, DoS và Spam lạm dụng API
 * ==============================================================================
 */
export class RateLimiter {
  private static memoryStore = new Map<string, InMemoryRecord>();
  private static cleanupInterval: NodeJS.Timeout | null = null;

  private static ensureCleanup() {
    if (!RateLimiter.cleanupInterval) {
      RateLimiter.cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [key, record] of RateLimiter.memoryStore.entries()) {
          if (record.resetTime <= now) {
            RateLimiter.memoryStore.delete(key);
          }
        }
      }, 60000).unref();
    }
  }

  public static create(options: RateLimiterOptions, redis?: Redis) {
    const {
      windowMs,
      max,
      tierName = 'general',
      keyGenerator = (req: Request) => {
        const forwarded = req.headers['x-forwarded-for'];
        const ip =
          typeof forwarded === 'string'
            ? forwarded.split(',')[0]?.trim()
            : req.socket.remoteAddress || '127.0.0.1';
        const user = (req as unknown as { user?: { sub?: string } }).user;
        return user?.sub ? `user:${user.sub}` : `ip:${ip}`;
      },
      skip = () => false,
      message = `Quá giới hạn yêu cầu (${max} req/${Math.round(windowMs / 1000)}s). Vui lòng thử lại sau.`,
    } = options;

    RateLimiter.ensureCleanup();

    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      if (skip(req)) {
        return next();
      }

      const clientKey = keyGenerator(req);
      const redisKey = `ratelimit:${tierName}:${clientKey}`;
      const now = Date.now();
      const windowSeconds = Math.ceil(windowMs / 1000);

      let currentCount = 0;
      let ttlSeconds = windowSeconds;

      // 1. Thử ghi nhận qua Redis nếu khả dụng
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
          // Khi Redis gặp sự cố, tự động lùi về In-Memory Store
          currentCount = 0;
        }
      }

      // 2. Dự phòng bằng In-Memory Store nếu không dùng được Redis
      if (currentCount === 0) {
        const memKey = `${tierName}:${clientKey}`;
        const record = RateLimiter.memoryStore.get(memKey);

        if (!record || record.resetTime <= now) {
          RateLimiter.memoryStore.set(memKey, {
            count: 1,
            resetTime: now + windowMs,
          });
          currentCount = 1;
          ttlSeconds = windowSeconds;
        } else {
          record.count += 1;
          currentCount = record.count;
          ttlSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
        }
      }

      const remaining = Math.max(0, max - currentCount);
      const resetTimestamp = Math.floor(now / 1000) + ttlSeconds;

      // Gán các tiêu đề HTTP chuẩn RFC theo tiêu chuẩn Rate Limiting
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTimestamp);

      if (currentCount > max) {
        res.setHeader('Retry-After', ttlSeconds);
        const correlationId = (req as unknown as { correlationId?: string }).correlationId || '';

        res.status(429).json({
          type: 'https://httpstatuses.com/429',
          title: 'Too Many Requests',
          status: 429,
          detail: message,
          tier: tierName,
          retryAfter: ttlSeconds,
          correlationId,
        });
        return;
      }

      next();
    };
  }
}

/**
 * Phân tầng Rate Limiting cho Xác thực (Login / Register / Refresh)
 * Tối đa 10 yêu cầu / 60 giây / IP
 */
export function authRateLimiter(redis?: Redis) {
  return RateLimiter.create(
    {
      tierName: 'auth',
      windowMs: 60 * 1000,
      max: 10,
      message: 'Bạn đã thử đăng nhập/đăng ký quá nhiều lần. Vui lòng chờ 1 phút.',
    },
    redis,
  );
}

/**
 * Phân tầng Rate Limiting cho Tương tác dữ liệu (Đăng bài, Bình luận, Bỏ phiếu, Báo cáo)
 * Tối đa 30 yêu cầu / 60 giây / Người dùng
 */
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

/**
 * Phân tầng Rate Limiting Toàn Cầu (Bảo vệ chung toàn bộ API)
 * Tối đa 180 yêu cầu / 60 giây / IP
 */
export function globalRateLimiter(redis?: Redis) {
  return RateLimiter.create(
    {
      tierName: 'global',
      windowMs: 60 * 1000,
      max: 180,
      skip: (req: Request) => req.path === '/healthz' || req.path === '/',
      message: 'Lưu lượng truy cập từ địa chỉ IP của bạn vượt quá ngưỡng cho phép.',
    },
    redis,
  );
}
