import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { UserRole, UserStatus } from '@acad/contracts';

export interface UserTokenClaims {
  sub: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  sessionId: string;
}

export interface FullJWTClaims extends UserTokenClaims {
  iss: string;
  iat: number;
  exp: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class TokenManager {
  public static readonly DEFAULT_SECRET =
    'acad-super-secure-jwt-hmac-secret-key-at-least-32-chars-long!';
  public static readonly ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
  public static readonly REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

  public static generateRefreshToken(): string {
    return randomBytes(64).toString('base64url');
  }

  public static hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  public static timingSafeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }

  public static signAccessToken(
    claims: UserTokenClaims,
    secret: string = TokenManager.DEFAULT_SECRET,
    ttlSeconds: number = TokenManager.ACCESS_TOKEN_TTL_SECONDS,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const fullClaims: FullJWTClaims = {
      ...claims,
      iss: 'acad-devops-platform',
      iat: now,
      exp: now + ttlSeconds,
    };

    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' }), 'utf8').toString(
      'base64url',
    );
    const payload = Buffer.from(JSON.stringify(fullClaims), 'utf8').toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(`${header}.${payload}`, 'utf8')
      .digest('base64url');

    return `${header}.${payload}.${signature}`;
  }

  public static verifyAccessToken(
    token: string,
    secret: string = TokenManager.DEFAULT_SECRET,
  ): FullJWTClaims | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [headerB64, payloadB64, signatureB64] = parts;
      if (!headerB64 || !payloadB64 || !signatureB64) {
        return null;
      }

      const expectedSignature = createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`, 'utf8')
        .digest('base64url');

      if (!TokenManager.timingSafeCompare(signatureB64, expectedSignature)) {
        return null;
      }

      const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const claims = JSON.parse(payloadJson) as FullJWTClaims;
      const now = Math.floor(Date.now() / 1000);

      if (typeof claims.exp !== 'number' || claims.exp < now) {
        return null;
      }

      return claims;
    } catch {
      return null;
    }
  }
}
