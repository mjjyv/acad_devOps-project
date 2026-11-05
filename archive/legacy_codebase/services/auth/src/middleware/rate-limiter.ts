import { Redis } from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

export class AuthRateLimiter {
  private memoryStore = new Map<string, { count: number; resetAt: number }>();

  constructor(private redisClient?: Redis | null) {}

  /**
   * Kiểm tra giới hạn tần suất yêu cầu (Rate Limiting)
   * @param key Định danh yêu cầu (IP hoặc username)
   * @param maxAttempts Số lần cho phép tối đa trong cửa sổ
   * @param windowSeconds Thời gian cửa sổ (giây)
   */
  public async consume(
    key: string,
    maxAttempts = 10,
    windowSeconds = 900,
  ): Promise<RateLimitResult> {
    const prefixedKey = `ratelimit:auth:${key}`;

    if (this.redisClient) {
      try {
        const current = await this.redisClient.incr(prefixedKey);
        if (current === 1) {
          await this.redisClient.expire(prefixedKey, windowSeconds);
        }
        const ttl = await this.redisClient.ttl(prefixedKey);

        if (current > maxAttempts) {
          return {
            allowed: false,
            remaining: 0,
            retryAfterSeconds: Math.max(ttl, 1),
          };
        }

        return {
          allowed: true,
          remaining: Math.max(0, maxAttempts - current),
        };
      } catch (err) {
        // Fallback sang in-memory nếu Redis lỗi
      }
    }

    // In-memory fallback
    const now = Date.now();
    const entry = this.memoryStore.get(prefixedKey);

    if (!entry || entry.resetAt <= now) {
      this.memoryStore.set(prefixedKey, { count: 1, resetAt: now + windowSeconds * 1000 });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    entry.count += 1;
    if (entry.count > maxAttempts) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(retryAfter, 1),
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxAttempts - entry.count),
    };
  }

  /**
   * Đặt lại bộ đếm khi đăng nhập thành công
   */
  public async reset(key: string): Promise<void> {
    const prefixedKey = `ratelimit:auth:${key}`;
    this.memoryStore.delete(prefixedKey);
    if (this.redisClient) {
      try {
        await this.redisClient.del(prefixedKey);
      } catch {
        // Bỏ qua lỗi xóa redis an toàn
      }
    }
  }
}
