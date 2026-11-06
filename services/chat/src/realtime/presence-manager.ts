/**
 * @file presence-manager.ts
 * @description Real-time User Presence & Typing Indicator Manager using Redis with In-Memory fallback.
 */

import type { Redis } from 'ioredis';

export interface TypingUser {
  userId: string;
  username: string;
}

export class PresenceManager {
  private inMemoryPresence = new Map<string, number>(); // userId -> expiresAtMs
  private inMemoryTyping = new Map<string, { username: string; expiresAtMs: number }>(); // `${channelId}:${userId}` -> typing info

  constructor(private redis?: Redis | undefined) {}

  /**
   * Đánh dấu người dùng đang trực tuyến (Heartbeat) - TTL 15 giây
   */
  public async setOnline(userId: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.set(`presence:online:${userId}`, '1', 'EX', 15);
        return;
      } catch {
        // Fallback in-memory
      }
    }
    this.inMemoryPresence.set(userId, Date.now() + 15000);
  }

  /**
   * Kiểm tra người dùng có đang online không
   */
  public async isOnline(userId: string): Promise<boolean> {
    if (this.redis) {
      try {
        const val = await this.redis.get(`presence:online:${userId}`);
        return val !== null;
      } catch {
        // Fallback in-memory
      }
    }
    const exp = this.inMemoryPresence.get(userId);
    if (!exp) return false;
    if (Date.now() > exp) {
      this.inMemoryPresence.delete(userId);
      return false;
    }
    return true;
  }

  /**
   * Kiểm tra trạng thái online của danh sách người dùng
   */
  public async getOnlineUsers(userIds: string[]): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    if (this.redis && userIds.length > 0) {
      try {
        const pipeline = this.redis.pipeline();
        for (const uid of userIds) {
          pipeline.get(`presence:online:${uid}`);
        }
        const execRes = await pipeline.exec();
        if (execRes) {
          for (let i = 0; i < userIds.length; i++) {
            const id = userIds[i];
            const item = execRes[i];
            if (id && item) {
              const [, val] = item;
              result[id] = val !== null;
            }
          }
          return result;
        }
      } catch {
        // Fallback in-memory
      }
    }

    const now = Date.now();
    for (const uid of userIds) {
      const exp = this.inMemoryPresence.get(uid);
      if (exp && now <= exp) {
        result[uid] = true;
      } else {
        result[uid] = false;
      }
    }
    return result;
  }

  /**
   * Đặt chỉ báo soạn thảo (Typing Indicator) - TTL 5 giây
   */
  public async setTyping(
    channelId: string,
    userId: string,
    username: string,
    isTyping: boolean,
  ): Promise<void> {
    const key = `typing:${channelId}:${userId}`;
    if (this.redis) {
      try {
        if (isTyping) {
          await this.redis.set(key, username, 'EX', 5);
        } else {
          await this.redis.del(key);
        }
        return;
      } catch {
        // Fallback in-memory
      }
    }

    const memKey = `${channelId}:${userId}`;
    if (isTyping) {
      this.inMemoryTyping.set(memKey, { username, expiresAtMs: Date.now() + 5000 });
    } else {
      this.inMemoryTyping.delete(memKey);
    }
  }

  /**
   * Lấy danh sách các tài khoản đang soạn thảo trong phòng chat
   */
  public async getTypingUsers(channelId: string): Promise<TypingUser[]> {
    if (this.redis) {
      try {
        const pattern = `typing:${channelId}:*`;
        const keys = await this.redis.keys(pattern);
        if (keys.length === 0) return [];

        const users: TypingUser[] = [];
        const pipeline = this.redis.pipeline();
        for (const key of keys) {
          pipeline.get(key);
        }
        const values = await pipeline.exec();
        if (values) {
          for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const v = values[i];
            if (k && v?.[1]) {
              const userId = k.split(':')[2] ?? '';
              const username = String(v[1]);
              users.push({ userId, username });
            }
          }
        }
        return users;
      } catch {
        // Fallback in-memory
      }
    }

    const now = Date.now();
    const users: TypingUser[] = [];
    for (const [key, info] of this.inMemoryTyping.entries()) {
      if (key.startsWith(`${channelId}:`)) {
        if (now <= info.expiresAtMs) {
          const userId = key.split(':')[1] ?? '';
          users.push({ userId, username: info.username });
        } else {
          this.inMemoryTyping.delete(key);
        }
      }
    }
    return users;
  }
}
