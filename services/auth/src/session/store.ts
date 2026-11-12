import type { UserSession } from './types.js';

export interface ISessionStore {
  saveSession(session: UserSession): Promise<void>;
  getSession(userId: string, sessionId: string): Promise<UserSession | null>;
  getSessionByTokenHash(tokenHash: string): Promise<UserSession | null>;
  revokeSession(userId: string, sessionId: string): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
  listUserSessions(userId: string): Promise<UserSession[]>;
  checkHealth(): Promise<boolean>;
}
