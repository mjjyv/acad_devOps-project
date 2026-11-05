import { TokenManager, type UserTokenClaims } from '../crypto/token.js';
import type { ISessionStore } from './store.js';
import type { TokenRotationResult, UserSession } from './types.js';

export type UserClaimsProvider = (userId: string) => Promise<UserTokenClaims | null>;

export class TokenRotationService {
  public static readonly GRACE_PERIOD_MS = 30 * 1000; // 30 giây

  constructor(
    private sessionStore: ISessionStore,
    private claimsProvider: UserClaimsProvider,
    private jwtSecret: string = TokenManager.DEFAULT_SECRET,
  ) {}

  /**
   * Thực thi chu trình xoay vòng token với 30s Grace Period và Token Reuse Attack Detection
   */
  public async rotateTokens(rawRefreshToken: string): Promise<TokenRotationResult> {
    const submittedHash = TokenManager.hashToken(rawRefreshToken);
    const session = await this.sessionStore.getSessionByTokenHash(submittedHash);

    if (!session) {
      return {
        status: 'SESSION_NOT_FOUND',
        error: 'Phiên làm việc không tồn tại hoặc đã bị đăng xuất',
      };
    }

    if (session.isRevoked) {
      return {
        status: 'SESSION_REVOKED',
        error: 'Phiên làm việc này đã bị thu hồi trước đó',
      };
    }

    const now = new Date();
    if (session.expiresAt < now) {
      return {
        status: 'SESSION_EXPIRED',
        error: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại',
      };
    }

    // =========================================================================
    // TRƯỜNG HỢP 1: KHỚP TOKEN HIỆN HÀNH (CURRENT TOKEN MATCH)
    // Người dùng gửi đúng token mới nhất -> Tiến hành xoay vòng bình thường
    // =========================================================================
    if (TokenManager.timingSafeCompare(submittedHash, session.currentTokenHash)) {
      const claims = await this.claimsProvider(session.userId);
      if (!claims) {
        return {
          status: 'SESSION_NOT_FOUND',
          error: 'Không tìm thấy thông tin tài khoản người dùng',
        };
      }

      const newRefreshToken = TokenManager.generateRefreshToken();
      const newRefreshTokenHash = TokenManager.hashToken(newRefreshToken);

      const claimsWithSession: UserTokenClaims = {
        ...claims,
        sessionId: session.id,
      };
      const newAccessToken = TokenManager.signAccessToken(claimsWithSession, this.jwtSecret);

      const updatedSession: UserSession = {
        ...session,
        previousTokenHash: session.currentTokenHash,
        gracePeriodExpiresAt: new Date(now.getTime() + TokenRotationService.GRACE_PERIOD_MS),
        currentTokenHash: newRefreshTokenHash,
        updatedAt: now,
      };

      await this.sessionStore.saveSession(updatedSession);

      return {
        status: 'SUCCESS',
        tokenPair: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
        },
        session: updatedSession,
      };
    }

    // =========================================================================
    // TRƯỜNG HỢP 2: GỬI LẠI TOKEN CŨ TRONG CỬA SỔ 30S GRACE PERIOD
    // Người dùng mở nhiều tab, các tab gửi cùng 1 token cũ -> Cấp Access Token mới
    // =========================================================================
    if (
      session.previousTokenHash &&
      TokenManager.timingSafeCompare(submittedHash, session.previousTokenHash)
    ) {
      if (session.gracePeriodExpiresAt && now.getTime() <= session.gracePeriodExpiresAt.getTime()) {
        const claims = await this.claimsProvider(session.userId);
        if (!claims) {
          return {
            status: 'SESSION_NOT_FOUND',
            error: 'Không tìm thấy thông tin tài khoản người dùng',
          };
        }

        const claimsWithSession: UserTokenClaims = {
          ...claims,
          sessionId: session.id,
        };
        const newAccessToken = TokenManager.signAccessToken(claimsWithSession, this.jwtSecret);

        return {
          status: 'GRACE_PERIOD_RENEWED',
          accessToken: newAccessToken,
          expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
          session,
        };
      }

      // =======================================================================
      // TRƯỜNG HỢP 3: TOKEN REUSE ATTACK
      // Token cũ đã xoay vòng bị phát lại NGOÀI cửa sổ 30s -> Tấn công đánh cắp phiên!
      // =======================================================================
      console.warn(
        `[SECURITY WARNING] Phát hiện Token Reuse Attack đối với User ID: ${session.userId}. Thu hồi cưỡng chế toàn bộ phiên!`,
      );
      await this.sessionStore.revokeAllUserSessions(session.userId);

      return {
        status: 'TOKEN_REUSE_DETECTED',
        error:
          'Cảnh báo an ninh: Phát hiện dấu hiệu tái sử dụng token đã thu hồi. Toàn bộ phiên đăng nhập đã bị hủy.',
      };
    }

    return {
      status: 'SESSION_NOT_FOUND',
      error: 'Token không hợp lệ hoặc không thuộc phiên này',
    };
  }
}
