import {
  ABACDecision,
  ABACResource,
  ABACSubject,
  ActionType,
  COOKIE_CONFIG,
  JWTClaims,
} from '@acad/contracts';
import { TokenManager } from '../crypto/token.js';
import { PolicyEngine } from '../policy/rbac-abac-engine.js';

export class AuthGuard {
  /**
   * Trích xuất và kiểm tra tính hợp lệ của Access Token từ Header hoặc Cookie
   */
  public static authenticate(
    authHeader?: string,
    cookieHeader?: string,
  ): JWTClaims {
    let token: string | null = null;

    // 1. Kiểm tra Authorization Header dạng Bearer
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Fallback sang Cookie HttpOnly
    if (!token && cookieHeader) {
      const cookies = cookieHeader.split(';').reduce<Record<string, string>>((acc, pair) => {
        const [k, v] = pair.trim().split('=');
        if (k && v) acc[k] = decodeURIComponent(v);
        return acc;
      }, {});

      if (cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME]) {
        token = cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME];
      }
    }

    if (!token) {
      throw new Error('Chưa cung cấp thông tin xác thực');
    }

    return TokenManager.verifyAccessToken(token);
  }

  /**
   * Kiểm tra thẩm quyền thực hiện hành động dựa trên JWTClaims và RBAC/ABAC Policy Engine
   */
  public static authorize(
    action: ActionType,
    resource?: ABACResource,
    claims?: JWTClaims,
  ): ABACDecision {
    if (!claims) {
      // Trường hợp khách chưa đăng nhập (GUEST)
      const guestSubject: ABACSubject = {
        userId: '00000000-0000-0000-0000-000000000000',
        role: 'GUEST',
        accountAgeDays: 0,
        karmaScore: 0,
      };
      return PolicyEngine.evaluate(guestSubject, action, resource);
    }

    const spaceRolesMap: Record<string, any> = {};
    for (const p of claims.spacePermissions) {
      spaceRolesMap[p.spaceId] = p.role;
    }

    const subject: ABACSubject = {
      userId: claims.sub,
      role: claims.role,
      accountAgeDays: claims.accountAgeDays,
      karmaScore: claims.karmaScore,
      isShadowbanned: claims.status === 'SHADOWBANNED',
      spaceRoles: spaceRolesMap,
    };

    return PolicyEngine.evaluate(subject, action, resource);
  }
}
