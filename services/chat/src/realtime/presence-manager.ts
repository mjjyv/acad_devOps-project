import type { Redis } from 'ioredis';

/**
 * Online Presence (15s TTL) & Typing Indicator (5s TTL) backed by Redis or In-Memory fallback.
 */
export class PresenceManager {
  private readonly onlineTtlSeconds = 15;
  private readonly typingTtlSeconds = 5;

  private readonly memoryOnline = new Map<string, number>();
  private readonly memoryTyping = new Map<string, number>();

  constructor(private readonly redis?: Redis | undefined) {}

  private onlineKey(userId: string): string {
    return `presence:online:${userId}`;
  }

  private typingKey(channelId: string, userId: string): string {
    return `presence:typing:${channelId}:${userId}`;
  }

  public async setOnline(userId: string): Promise<void> {
    if (this.redis) {
      await this.redis.set(this.onlineKey(userId), '1', 'EX', this.onlineTtlSeconds);
    } else {
      this.memoryOnline.set(userId, Date.now() + this.onlineTtlSeconds * 1000);
    }
  }

  public async isOnline(userId: string): Promise<boolean> {
    if (this.redis) {
      return (await this.redis.exists(this.onlineKey(userId))) === 1;
    }
    const exp = this.memoryOnline.get(userId);
    if (!exp) return false;
    if (exp < Date.now()) {
      this.memoryOnline.delete(userId);
      return false;
    }
    return true;
  }

  public async getOnlineStatusBatch(userIds: string[]): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    if (userIds.length === 0) return result;

    if (this.redis) {
      const pipeline = this.redis.pipeline();
      for (const uid of userIds) pipeline.exists(this.onlineKey(uid));
      const res = await pipeline.exec();
      userIds.forEach((uid, idx) => {
        result[uid] = res?.[idx]?.[1] === 1;
      });
      return result;
    }

    for (const uid of userIds) {
      result[uid] = await this.isOnline(uid);
    }
    return result;
  }

  public async setTyping(channelId: string, userId: string, isTyping: boolean): Promise<void> {
    if (this.redis) {
      const key = this.typingKey(channelId, userId);
      if (isTyping) {
        await this.redis.set(key, '1', 'EX', this.typingTtlSeconds);
      } else {
        await this.redis.del(key);
      }
      return;
    }

    const memKey = `${channelId}:${userId}`;
    if (isTyping) {
      this.memoryTyping.set(memKey, Date.now() + this.typingTtlSeconds * 1000);
    } else {
      this.memoryTyping.delete(memKey);
    }
  }

  public async isTyping(channelId: string, userId: string): Promise<boolean> {
    if (this.redis) {
      return (await this.redis.exists(this.typingKey(channelId, userId))) === 1;
    }
    const memKey = `${channelId}:${userId}`;
    const exp = this.memoryTyping.get(memKey);
    if (!exp) return false;
    if (exp < Date.now()) {
      this.memoryTyping.delete(memKey);
      return false;
    }
    return true;
  }
}
