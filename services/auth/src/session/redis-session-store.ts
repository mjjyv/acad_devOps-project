import { Redis, RedisOptions } from 'ioredis';
import { ISessionStore } from './store.js';
import { UserSession } from './types.js';

export class RedisSessionStore implements ISessionStore {
  private client: Redis;
  private readonly defaultTTL = 7 * 24 * 60 * 60; // 7 ngày (604800 giây)

  constructor(clientOrUrlOrOptions?: Redis | string | RedisOptions) {
    if (clientOrUrlOrOptions instanceof Redis) {
      this.client = clientOrUrlOrOptions;
    } else if (typeof clientOrUrlOrOptions === 'string') {
      this.client = new Redis(clientOrUrlOrOptions, {
        lazyConnect: true,
        enableOfflineQueue: true,
      });
    } else if (clientOrUrlOrOptions) {
      this.client = new Redis({
        ...clientOrUrlOrOptions,
        lazyConnect: true,
        enableOfflineQueue: true,
      });
    } else {
      this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true,
        enableOfflineQueue: true,
      });
    }
  }

  public getClient(): Redis {
    return this.client;
  }

  private getSessionKey(userId: string, deviceFingerprint: string): string {
    return `session:${userId}:${deviceFingerprint}`;
  }

  private getIdLookupKey(sessionId: string): string {
    return `session_by_id:${sessionId}`;
  }

  private getTokenLookupKey(tokenHash: string): string {
    return `token_idx:${tokenHash}`;
  }

  private getUserSessionsSetKey(userId: string): string {
    return `user_sessions:${userId}`;
  }

  private getFamilySessionsSetKey(familyId: string): string {
    return `family_sessions:${familyId}`;
  }

  public async saveSession(session: UserSession): Promise<void> {
    const key = this.getSessionKey(session.userId, session.deviceFingerprint);
    const idKey = this.getIdLookupKey(session.sessionId);
    const tokenKey = this.getTokenLookupKey(session.currentTokenHash);
    const userSetKey = this.getUserSessionsSetKey(session.userId);
    const familySetKey = this.getFamilySessionsSetKey(session.familyId);

    const ttl = Math.max(1, Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)) || this.defaultTTL;

    const payload: Record<string, string> = {
      sessionId: session.sessionId,
      userId: session.userId,
      familyId: session.familyId,
      deviceFingerprint: session.deviceFingerprint,
      currentTokenHash: session.currentTokenHash,
      previousTokenHash: session.previousTokenHash || '',
      gracePeriodExpiresAt: session.gracePeriodExpiresAt ? session.gracePeriodExpiresAt.toISOString() : '',
      ipAddress: session.ipAddress || '',
      userAgent: session.userAgent || '',
      isRevoked: session.isRevoked ? 'true' : 'false',
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    };

    const pipeline = this.client.pipeline();
    pipeline.hset(key, payload);
    pipeline.expire(key, ttl);
    pipeline.set(idKey, key, 'EX', ttl);
    pipeline.set(tokenKey, key, 'EX', ttl);
    if (session.previousTokenHash) {
      pipeline.set(this.getTokenLookupKey(session.previousTokenHash), key, 'EX', 60);
    }
    pipeline.sadd(userSetKey, key);
    pipeline.expire(userSetKey, ttl);
    pipeline.sadd(familySetKey, key);
    pipeline.expire(familySetKey, ttl);

    await pipeline.exec();
  }

  public async getSession(userId: string, deviceFingerprint: string): Promise<UserSession | null> {
    const key = this.getSessionKey(userId, deviceFingerprint);
    const data = await this.client.hgetall(key);
    if (!data || Object.keys(data).length === 0) {
      return null;
    }
    return this.parseSession(data);
  }

  public async getSessionById(sessionId: string): Promise<UserSession | null> {
    const idKey = this.getIdLookupKey(sessionId);
    const sessionKey = await this.client.get(idKey);
    if (!sessionKey) return null;

    const data = await this.client.hgetall(sessionKey);
    if (!data || Object.keys(data).length === 0) {
      return null;
    }
    return this.parseSession(data);
  }

  public async getSessionByTokenHash(tokenHash: string): Promise<UserSession | null> {
    const tokenKey = this.getTokenLookupKey(tokenHash);
    const sessionKey = await this.client.get(tokenKey);
    if (!sessionKey) return null;

    const data = await this.client.hgetall(sessionKey);
    if (!data || Object.keys(data).length === 0) {
      return null;
    }
    return this.parseSession(data);
  }

  public async updateTokens(
    sessionId: string,
    currentHash: string,
    previousHash: string | null,
    gracePeriodExpiresAt: Date | null,
  ): Promise<void> {
    const idKey = this.getIdLookupKey(sessionId);
    const sessionKey = await this.client.get(idKey);
    if (!sessionKey) {
      throw new Error(`Session không tồn tại: ${sessionId}`);
    }

    const updates: Record<string, string> = {
      currentTokenHash: currentHash,
      previousTokenHash: previousHash || '',
      gracePeriodExpiresAt: gracePeriodExpiresAt ? gracePeriodExpiresAt.toISOString() : '',
      updatedAt: new Date().toISOString(),
    };

    const pipeline = this.client.pipeline();
    pipeline.hset(sessionKey, updates);
    pipeline.set(this.getTokenLookupKey(currentHash), sessionKey, 'EX', this.defaultTTL);
    if (previousHash) {
      pipeline.set(this.getTokenLookupKey(previousHash), sessionKey, 'EX', 60);
    }
    await pipeline.exec();
  }

  public async revokeSession(sessionId: string): Promise<void> {
    const idKey = this.getIdLookupKey(sessionId);
    const sessionKey = await this.client.get(idKey);
    if (!sessionKey) return;

    await this.client.hset(sessionKey, {
      isRevoked: 'true',
      updatedAt: new Date().toISOString(),
    });
  }

  public async revokeFamily(familyId: string): Promise<number> {
    const familySetKey = this.getFamilySessionsSetKey(familyId);
    const sessionKeys = await this.client.smembers(familySetKey);
    if (!sessionKeys || sessionKeys.length === 0) return 0;

    let count = 0;
    const pipeline = this.client.pipeline();
    const nowIso = new Date().toISOString();

    for (const key of sessionKeys) {
      pipeline.hset(key, {
        isRevoked: 'true',
        updatedAt: nowIso,
      });
      count++;
    }

    await pipeline.exec();
    return count;
  }

  public async revokeAllUserSessions(userId: string): Promise<number> {
    const userSetKey = this.getUserSessionsSetKey(userId);
    const sessionKeys = await this.client.smembers(userSetKey);
    if (!sessionKeys || sessionKeys.length === 0) return 0;

    let count = 0;
    const pipeline = this.client.pipeline();
    const nowIso = new Date().toISOString();

    for (const key of sessionKeys) {
      pipeline.hset(key, {
        isRevoked: 'true',
        updatedAt: nowIso,
      });
      count++;
    }

    await pipeline.exec();
    return count;
  }

  public async listUserSessions(userId: string): Promise<UserSession[]> {
    const userSetKey = this.getUserSessionsSetKey(userId);
    const sessionKeys = await this.client.smembers(userSetKey);
    if (!sessionKeys || sessionKeys.length === 0) return [];

    const sessions: UserSession[] = [];
    for (const key of sessionKeys) {
      const data = await this.client.hgetall(key);
      if (data && Object.keys(data).length > 0) {
        const parsed = this.parseSession(data);
        if (!parsed.isRevoked) {
          sessions.push(parsed);
        }
      }
    }

    return sessions;
  }

  public async clear(): Promise<void> {
    const keys = await this.client.keys('session:*');
    const idKeys = await this.client.keys('session_by_id:*');
    const tokenKeys = await this.client.keys('token_idx:*');
    const userKeys = await this.client.keys('user_sessions:*');
    const familyKeys = await this.client.keys('family_sessions:*');

    const allKeys = [...keys, ...idKeys, ...tokenKeys, ...userKeys, ...familyKeys];
    if (allKeys.length > 0) {
      await this.client.del(...allKeys);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  private parseSession(data: Record<string, string>): UserSession {
    return {
      sessionId: data.sessionId,
      userId: data.userId,
      familyId: data.familyId,
      deviceFingerprint: data.deviceFingerprint,
      currentTokenHash: data.currentTokenHash,
      previousTokenHash: data.previousTokenHash ? data.previousTokenHash : null,
      gracePeriodExpiresAt: data.gracePeriodExpiresAt ? new Date(data.gracePeriodExpiresAt) : null,
      ipAddress: data.ipAddress ? data.ipAddress : null,
      userAgent: data.userAgent ? data.userAgent : null,
      isRevoked: data.isRevoked === 'true',
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      expiresAt: new Date(data.expiresAt),
    };
  }
}
