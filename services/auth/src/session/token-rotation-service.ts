import { TokenManager, type UserTokenClaims } from '../crypto/token.js';
import type { ISessionStore } from './store.js';
import type { TokenRotationResult, UserSession } from './types.js';

export type UserClaimsProvider = (userId: string) => Promise<UserTokenClaims | null>;

export interface TokenRotationHooks {
  onSessionRotated?: (session: UserSession) => Promise<void>;
  onReuseRevoked?: (userId: string) => Promise<void>;
}

export class TokenRotationService {
  public static readonly GRACE_PERIOD_MS = 30 * 1000;

  constructor(
    private sessionStore: ISessionStore,
    private claimsProvider: UserClaimsProvider,
    private jwtSecret: string = TokenManager.DEFAULT_SECRET,
    private hooks?: TokenRotationHooks | undefined,
  ) {}

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

    // Trường hợp 1: Khớp currentTokenHash -> Xoay vòng bình thường + đặt 30s Grace Window
    if (TokenManager.timingSafeCompare(submittedHash, session.currentTokenHash)) {
      const claims = await this.claimsProvider(session.userId);
      if (!claims || claims.status === 'SUSPENDED' || claims.status === 'DELETED') {
        await this.sessionStore.revokeSession(session.userId, session.id);
        return {
          status: 'SESSION_REVOKED',
          error: 'Tài khoản không khả dụng hoặc đã bị khóa',
        };
      }

      const newRefreshToken = TokenManager.generateRefreshToken();
      const newRefreshTokenHash = TokenManager.hashToken(newRefreshToken);

      const newAccessToken = TokenManager.signAccessToken(
        { ...claims, sessionId: session.id },
        this.jwtSecret,
      );

      const updatedSession: UserSession = {
        ...session,
        previousTokenHash: session.currentTokenHash,
        gracePeriodExpiresAt: new Date(now.getTime() + TokenRotationService.GRACE_PERIOD_MS),
        currentTokenHash: newRefreshTokenHash,
        updatedAt: now,
      };

      await this.sessionStore.saveSession(updatedSession);
      await this.hooks?.onSessionRotated?.(updatedSession);

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

    // Trường hợp 2: Phát lại previousTokenHash trong cửa sổ <= 30s Grace Period
    if (
      session.previousTokenHash &&
      TokenManager.timingSafeCompare(submittedHash, session.previousTokenHash) &&
      session.gracePeriodExpiresAt &&
      now.getTime() <= session.gracePeriodExpiresAt.getTime()
    ) {
      const claims = await this.claimsProvider(session.userId);
      if (!claims || claims.status === 'SUSPENDED' || claims.status === 'DELETED') {
        await this.sessionStore.revokeSession(session.userId, session.id);
        return {
          status: 'SESSION_REVOKED',
          error: 'Tài khoản không khả dụng hoặc đã bị khóa',
        };
      }

      const newAccessToken = TokenManager.signAccessToken(
        { ...claims, sessionId: session.id },
        this.jwtSecret,
      );

      return {
        status: 'GRACE_PERIOD_RENEWED',
        accessToken: newAccessToken,
        expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
        session,
      };
    }

    // Trường hợp 3: Token Reuse Attack ngoài cửa sổ 30s -> Thu hồi toàn bộ cụm phiên
    console.warn(
      `[SECURITY WARNING] Phát hiện Token Reuse Attack đối với User ID: ${session.userId}. Thu hồi cưỡng chế toàn bộ phiên!`,
    );
    await this.sessionStore.revokeAllUserSessions(session.userId);
    await this.hooks?.onReuseRevoked?.(session.userId);

    return {
      status: 'TOKEN_REUSE_DETECTED',
      userId: session.userId,
      error:
        'Cảnh báo an ninh: Phát hiện dấu hiệu tái sử dụng token đã thu hồi. Toàn bộ phiên đăng nhập đã bị hủy.',
    };
  }
}
