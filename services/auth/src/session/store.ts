import { UserSession } from './types.js';

export interface ISessionStore {
  saveSession(session: UserSession): Promise<void>;
  getSession(userId: string, deviceFingerprint: string): Promise<UserSession | null>;
  getSessionById(sessionId: string): Promise<UserSession | null>;
  getSessionByTokenHash?(tokenHash: string): Promise<UserSession | null>;
  updateTokens(
    sessionId: string,
    currentHash: string,
    previousHash: string | null,
    gracePeriodExpiresAt: Date | null,
  ): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
  revokeFamily(familyId: string): Promise<number>;
  revokeAllUserSessions(userId: string): Promise<number>;
  listUserSessions(userId: string): Promise<UserSession[]>;
  clear(): Promise<void>;
}

/**
 * InMemorySessionStore - Mô phỏng cấu trúc Hash Redis tập trung:
 * HSET session:{user_id}:{device_fingerprint}
 * Đáp ứng đầy đủ các kiểm thử độc lập mà không bắt buộc có cụm Redis vật lý.
 */
export class InMemorySessionStore implements ISessionStore {
  private sessionsById = new Map<string, UserSession>();
  private userDeviceIndex = new Map<string, string>(); // "userId:deviceFp" -> sessionId
  private familyIndex = new Map<string, Set<string>>(); // familyId -> Set<sessionId>
  private tokenHashIndex = new Map<string, string>(); // tokenHash -> sessionId

  private getCompositeKey(userId: string, deviceFp: string): string {
    return `${userId}:${deviceFp}`;
  }

  public async saveSession(session: UserSession): Promise<void> {
    this.sessionsById.set(session.sessionId, { ...session });
    this.userDeviceIndex.set(this.getCompositeKey(session.userId, session.deviceFingerprint), session.sessionId);
    this.tokenHashIndex.set(session.currentTokenHash, session.sessionId);
    if (session.previousTokenHash) {
      this.tokenHashIndex.set(session.previousTokenHash, session.sessionId);
    }

    let familySet = this.familyIndex.get(session.familyId);
    if (!familySet) {
      familySet = new Set<string>();
      this.familyIndex.set(session.familyId, familySet);
    }
    familySet.add(session.sessionId);
  }

  public async getSession(userId: string, deviceFingerprint: string): Promise<UserSession | null> {
    const sessionId = this.userDeviceIndex.get(this.getCompositeKey(userId, deviceFingerprint));
    if (!sessionId) return null;
    return this.getSessionById(sessionId);
  }

  public async getSessionById(sessionId: string): Promise<UserSession | null> {
    const session = this.sessionsById.get(sessionId);
    if (!session) return null;
    return { ...session };
  }

  public async getSessionByTokenHash(tokenHash: string): Promise<UserSession | null> {
    const sessionId = this.tokenHashIndex.get(tokenHash);
    if (!sessionId) return null;
    return this.getSessionById(sessionId);
  }

  public async updateTokens(
    sessionId: string,
    currentHash: string,
    previousHash: string | null,
    gracePeriodExpiresAt: Date | null,
  ): Promise<void> {
    const session = this.sessionsById.get(sessionId);
    if (!session) {
      throw new Error(`Session không tồn tại: ${sessionId}`);
    }

    session.currentTokenHash = currentHash;
    session.previousTokenHash = previousHash;
    session.gracePeriodExpiresAt = gracePeriodExpiresAt;
    session.updatedAt = new Date();

    this.tokenHashIndex.set(currentHash, sessionId);
    if (previousHash) {
      this.tokenHashIndex.set(previousHash, sessionId);
    }
  }

  public async revokeSession(sessionId: string): Promise<void> {
    const session = this.sessionsById.get(sessionId);
    if (session) {
      session.isRevoked = true;
      session.updatedAt = new Date();
    }
  }

  public async revokeFamily(familyId: string): Promise<number> {
    const sessionIds = this.familyIndex.get(familyId);
    if (!sessionIds) return 0;

    let count = 0;
    for (const sid of sessionIds) {
      const session = this.sessionsById.get(sid);
      if (session && !session.isRevoked) {
        session.isRevoked = true;
        session.updatedAt = new Date();
        count++;
      }
    }
    return count;
  }

  public async revokeAllUserSessions(userId: string): Promise<number> {
    let count = 0;
    for (const session of this.sessionsById.values()) {
      if (session.userId === userId && !session.isRevoked) {
        session.isRevoked = true;
        session.updatedAt = new Date();
        count++;
      }
    }
    return count;
  }

  public async listUserSessions(userId: string): Promise<UserSession[]> {
    const list: UserSession[] = [];
    for (const session of this.sessionsById.values()) {
      if (session.userId === userId && !session.isRevoked) {
        list.push({ ...session });
      }
    }
    return list;
  }

  public async clear(): Promise<void> {
    this.sessionsById.clear();
    this.userDeviceIndex.clear();
    this.familyIndex.clear();
    this.tokenHashIndex.clear();
  }
}
