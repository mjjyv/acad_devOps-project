import { Redis } from 'ioredis';
import type { ISessionStore } from './store.js';
import type { UserSession } from './types.js';

export class RedisSessionStore implements ISessionStore {
  private redis: Redis;
  private readonly DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

  constructor(redisOrUrl?: Redis | string) {
    if (redisOrUrl && typeof redisOrUrl !== 'string') {
      this.redis = redisOrUrl;
      return;
    }

    const url =
      typeof redisOrUrl === 'string'
        ? redisOrUrl
        : process.env.REDIS_URL || 'redis://localhost:6379';

    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });

    this.redis.on('error', (err: Error) => {
      console.error('[RedisSessionStore] Lỗi kết nối Redis:', err.message);
    });
  }

  private sessionKey(userId: string, sessionId: string): string {
    return `session:${userId}:${sessionId}`;
  }

  private lookupKey(tokenHash: string): string {
    return `session_lookup:${tokenHash}`;
  }

  private async scanSessionKeys(userId: string): Promise<string[]> {
    const pattern = `session:${userId}:*`;
    const matched: string[] = [];
    let cursor = '0';

    do {
      const [nextCursor, batch] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      for (const k of batch) {
        matched.push(k);
      }
    } while (cursor !== '0');

    return matched;
  }

  private serialize(session: UserSession): Record<string, string> {
    return {
      id: session.id,
      userId: session.userId,
      currentTokenHash: session.currentTokenHash,
      previousTokenHash: session.previousTokenHash || '',
      gracePeriodExpiresAt: session.gracePeriodExpiresAt
        ? session.gracePeriodExpiresAt.toISOString()
        : '',
      deviceFingerprint: session.deviceFingerprint || '',
      ipAddress: session.ipAddress || '',
      userAgent: session.userAgent || '',
      isRevoked: session.isRevoked ? 'true' : 'false',
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  private deserialize(data: Record<string, string>): UserSession | null {
    if (!data.id || !data.userId || !data.currentTokenHash) {
      return null;
    }

    return {
      id: data.id,
      userId: data.userId,
      currentTokenHash: data.currentTokenHash,
      previousTokenHash: data.previousTokenHash || null,
      gracePeriodExpiresAt: data.gracePeriodExpiresAt ? new Date(data.gracePeriodExpiresAt) : null,
      deviceFingerprint: data.deviceFingerprint || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
      isRevoked: data.isRevoked === 'true',
      expiresAt: new Date(data.expiresAt || Date.now()),
      createdAt: new Date(data.createdAt || Date.now()),
      updatedAt: new Date(data.updatedAt || Date.now()),
    };
  }

  public async saveSession(session: UserSession): Promise<void> {
    const key = this.sessionKey(session.userId, session.id);
    const data = this.serialize(session);

    const pipeline = this.redis.pipeline();
    pipeline.hset(key, data);
    pipeline.expire(key, this.DEFAULT_TTL_SECONDS);

    pipeline.set(
      this.lookupKey(session.currentTokenHash),
      `${session.userId}:${session.id}`,
      'EX',
      this.DEFAULT_TTL_SECONDS,
    );

    // Giữ lookup của previousTokenHash để phát hiện Token Reuse Attack ngay cả sau khi cửa sổ 30s Grace kết thúc
    if (session.previousTokenHash) {
      pipeline.set(
        this.lookupKey(session.previousTokenHash),
        `${session.userId}:${session.id}`,
        'EX',
        this.DEFAULT_TTL_SECONDS,
      );
    }

    await pipeline.exec();
  }

  public async getSession(userId: string, sessionId: string): Promise<UserSession | null> {
    const key = this.sessionKey(userId, sessionId);
    const data = await this.redis.hgetall(key);
    return this.deserialize(data);
  }

  public async getSessionByTokenHash(tokenHash: string): Promise<UserSession | null> {
    const mapping = await this.redis.get(this.lookupKey(tokenHash));
    if (!mapping) {
      return null;
    }

    const [userId, sessionId] = mapping.split(':');
    if (!userId || !sessionId) {
      return null;
    }

    return this.getSession(userId, sessionId);
  }

  public async revokeSession(userId: string, sessionId: string): Promise<void> {
    const key = this.sessionKey(userId, sessionId);
    const session = await this.getSession(userId, sessionId);

    if (session) {
      const pipeline = this.redis.pipeline();
      pipeline.hset(key, 'isRevoked', 'true', 'updatedAt', new Date().toISOString());
      pipeline.del(this.lookupKey(session.currentTokenHash));
      if (session.previousTokenHash) {
        pipeline.del(this.lookupKey(session.previousTokenHash));
      }
      await pipeline.exec();
    }
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    const keys = await this.scanSessionKeys(userId);
    if (keys.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      const data = await this.redis.hgetall(key);
      if (data.currentTokenHash) {
        pipeline.del(this.lookupKey(data.currentTokenHash));
      }
      if (data.previousTokenHash) {
        pipeline.del(this.lookupKey(data.previousTokenHash));
      }
      pipeline.hset(key, 'isRevoked', 'true', 'updatedAt', new Date().toISOString());
    }
    await pipeline.exec();
  }

  public async listUserSessions(userId: string): Promise<UserSession[]> {
    const keys = await this.scanSessionKeys(userId);
    const sessions: UserSession[] = [];

    for (const key of keys) {
      const data = await this.redis.hgetall(key);
      const session = this.deserialize(data);
      if (session && !session.isRevoked) {
        sessions.push(session);
      }
    }

    return sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch {
      return false;
    }
  }

  public async close(): Promise<void> {
    await this.redis.quit();
  }
}

/**
 * In-Memory Session Store dành riêng cho Unit Tests cô lập (không dùng trong Production).
 */
export class InMemorySessionStore implements ISessionStore {
  private sessions = new Map<string, UserSession>();
  private lookups = new Map<string, string>();

  public async saveSession(session: UserSession): Promise<void> {
    const key = `${session.userId}:${session.id}`;
    this.sessions.set(key, { ...session });
    this.lookups.set(session.currentTokenHash, key);
    if (session.previousTokenHash) {
      this.lookups.set(session.previousTokenHash, key);
    }
  }

  public async getSession(userId: string, sessionId: string): Promise<UserSession | null> {
    const key = `${userId}:${sessionId}`;
    const s = this.sessions.get(key);
    return s ? { ...s } : null;
  }

  public async getSessionByTokenHash(tokenHash: string): Promise<UserSession | null> {
    const key = this.lookups.get(tokenHash);
    if (!key) return null;
    const s = this.sessions.get(key);
    return s ? { ...s } : null;
  }

  public async revokeSession(userId: string, sessionId: string): Promise<void> {
    const key = `${userId}:${sessionId}`;
    const s = this.sessions.get(key);
    if (s) {
      s.isRevoked = true;
      s.updatedAt = new Date();
      this.lookups.delete(s.currentTokenHash);
      if (s.previousTokenHash) {
        this.lookups.delete(s.previousTokenHash);
      }
    }
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    for (const s of this.sessions.values()) {
      if (s.userId === userId) {
        s.isRevoked = true;
        s.updatedAt = new Date();
        this.lookups.delete(s.currentTokenHash);
        if (s.previousTokenHash) {
          this.lookups.delete(s.previousTokenHash);
        }
      }
    }
  }

  public async listUserSessions(userId: string): Promise<UserSession[]> {
    const result: UserSession[] = [];
    for (const s of this.sessions.values()) {
      if (s.userId === userId && !s.isRevoked) {
        result.push({ ...s });
      }
    }
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async checkHealth(): Promise<boolean> {
    return true;
  }
}
