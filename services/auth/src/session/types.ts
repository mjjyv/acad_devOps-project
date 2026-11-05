import type { TokenPair } from '../crypto/token.js';

export interface UserSession {
  id: string; // Session UUID
  userId: string;
  currentTokenHash: string;
  previousTokenHash: string | null;
  gracePeriodExpiresAt: Date | null;
  deviceFingerprint: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TokenRotationResult =
  | {
      status: 'SUCCESS';
      tokenPair: TokenPair;
      session: UserSession;
    }
  | {
      status: 'GRACE_PERIOD_RENEWED'; // Cấp Access Token mới trong cửa sổ 30s Grace Period
      accessToken: string;
      expiresIn: number;
      session: UserSession;
    }
  | {
      status: 'TOKEN_REUSE_DETECTED';
      error: string;
    }
  | {
      status: 'SESSION_NOT_FOUND';
      error: string;
    }
  | {
      status: 'SESSION_REVOKED';
      error: string;
    }
  | {
      status: 'SESSION_EXPIRED';
      error: string;
    };
