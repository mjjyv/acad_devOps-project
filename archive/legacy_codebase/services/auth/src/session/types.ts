import { TokenPair } from '../crypto/token.js';

export interface UserSession {
  sessionId: string;
  userId: string;
  familyId: string;
  deviceFingerprint: string;
  currentTokenHash: string;
  previousTokenHash: string | null;
  gracePeriodExpiresAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export type TokenRotationStatus =
  | 'SUCCESS'
  | 'GRACE_PERIOD_MATCH'
  | 'TOKEN_REUSE_DETECTED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED';

export interface TokenRotationResult {
  status: TokenRotationStatus;
  tokens?: TokenPair;
  session?: UserSession;
  familyId?: string;
  error?: string;
}
