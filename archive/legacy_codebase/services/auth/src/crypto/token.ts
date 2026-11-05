import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { JWTClaims, JWTClaimsSchema } from '@acad/contracts';

// ============================================================================
// TOKEN MANAGER & CRYPTOGRAPHIC ENGINE
// ============================================================================

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 900 seconds (15 mins)
}

export class TokenManager {
  private static readonly DEFAULT_SECRET = 'acad-super-secure-jwt-hmac-secret-key-32-chars-min!';
  public static readonly ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 phút (900s)
  public static readonly REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 ngày

  /**
   * Sinh Refresh Token ngẫu nhiên bảo mật cao (64 bytes CSPRNG)
   */
  public static generateRefreshToken(): string {
    return randomBytes(64).toString('base64url');
  }

  /**
   * Băm SHA-256 chuỗi Refresh Token để lưu trữ an toàn trong Database / Redis
   * Tuyệt đối không bao giờ lưu trữ Refresh Token dạng bản rõ
   */
  public static hashToken(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  /**
   * So sánh an toàn hai chuỗi mã băm theo thời gian hằng số O(1)
   */
  public static timingSafeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }

  /**
   * Ký số và sinh chuỗi JWT Access Token (HMAC-SHA256)
   */
  public static signAccessToken(
    payload: Omit<JWTClaims, 'iss' | 'iat' | 'exp'>,
    secret: string = this.DEFAULT_SECRET,
  ): string {
    const now = Math.floor(Date.now() / 1000);
    const fullClaims: JWTClaims = {
      ...payload,
      iss: 'acad-community-auth',
      iat: now,
      exp: now + this.ACCESS_TOKEN_TTL_SECONDS,
    };

    // Kiểm định schema claims
    JWTClaimsSchema.parse(fullClaims);

    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(fullClaims)).toString('base64url');
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const signature = createHmac('sha256', secret)
      .update(dataToSign)
      .digest('base64url');

    return `${dataToSign}.${signature}`;
  }

  /**
   * Giải mã và kiểm tra tính toàn vẹn của JWT Access Token
   */
  public static verifyAccessToken(
    token: string,
    secret: string = this.DEFAULT_SECRET,
  ): JWTClaims {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Định dạng token không hợp lệ (Phải gồm 3 phần)');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = createHmac('sha256', secret)
      .update(dataToSign)
      .digest('base64url');

    if (!this.timingSafeCompare(signature, expectedSignature)) {
      throw new Error('Chữ ký token không hợp lệ hoặc đã bị thay đổi');
    }

    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    const parsedClaims = JSON.parse(payloadJson);

    const claims = JWTClaimsSchema.parse(parsedClaims);

    const now = Math.floor(Date.now() / 1000);
    if (claims.exp < now) {
      throw new Error('Token đã hết hạn');
    }

    return claims;
  }
}
