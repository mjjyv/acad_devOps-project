import { TokenManager, TokenPair } from '../crypto/token.js';
import { ISessionStore } from './store.js';
import { TokenRotationResult, UserSession } from './types.js';
import { JWTClaims } from '@acad/contracts';

export type UserClaimsProvider = (userId: string) => Promise<Omit<JWTClaims, 'iss' | 'iat' | 'exp'>>;

export class TokenRotationService {
  public static readonly GRACE_PERIOD_MS = 30 * 1000; // 30 giây

  constructor(
    private sessionStore: ISessionStore,
    private claimsProvider: UserClaimsProvider,
  ) {}

  /**
   * Thực thi chu trình Xoay vòng Token (Token Rotation Protocol)
   * Tuân thủ sơ đồ DAG an ninh và quy tắc phát hiện tấn công tái sử dụng (Token Reuse Attack)
   */
  public async rotateTokens(
    rawRefreshToken: string,
    userId?: string,
    deviceFingerprint?: string,
  ): Promise<TokenRotationResult> {
    const submittedHash = TokenManager.hashToken(rawRefreshToken);
    let session: UserSession | null = null;

    if (userId && deviceFingerprint) {
      session = await this.sessionStore.getSession(userId, deviceFingerprint);
    } else if (this.sessionStore.getSessionByTokenHash) {
      session = await this.sessionStore.getSessionByTokenHash(submittedHash);
    }

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
    // NHÁNH 1: KHỚP TOKEN HIỆN HÀNH (CURRENT TOKEN MATCH)
    // Người dùng gửi đúng token mới nhất -> Tiến hành xoay vòng bình thường
    // =========================================================================
    if (TokenManager.timingSafeCompare(submittedHash, session.currentTokenHash)) {
      const newRefreshToken = TokenManager.generateRefreshToken();
      const newRefreshTokenHash = TokenManager.hashToken(newRefreshToken);

      const claims = await this.claimsProvider(session.userId);
      const newAccessToken = TokenManager.signAccessToken(claims);

      const gracePeriodExpiresAt = new Date(now.getTime() + TokenRotationService.GRACE_PERIOD_MS);

      await this.sessionStore.updateTokens(
        session.sessionId,
        newRefreshTokenHash,
        session.currentTokenHash, // Đẩy token cũ vào previous_token_hash
        gracePeriodExpiresAt,
      );

      const updatedSession = await this.sessionStore.getSessionById(session.sessionId);

      return {
        status: 'SUCCESS',
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
        },
        session: updatedSession ?? undefined,
      };
    }

    // =========================================================================
    // NHÁNH 2: KHỚP TOKEN VỪA XOAY VÒNG TRONG CỬA SỔ AN TOÀN (GRACE PERIOD MATCH)
    // Do nghẽn mạng hoặc nhiều tab gọi refresh cùng lúc trong 30 giây
    // =========================================================================
    if (
      session.previousTokenHash &&
      TokenManager.timingSafeCompare(submittedHash, session.previousTokenHash) &&
      session.gracePeriodExpiresAt &&
      now <= session.gracePeriodExpiresAt
    ) {
      const claims = await this.claimsProvider(session.userId);
      const currentAccessToken = TokenManager.signAccessToken(claims);

      // Cấp lại Access Token mới mà KHÔNG tiếp tục xoay vòng Refresh Token
      // nhằm giữ nguyên tính nhất quán cho các request song song hợp lệ
      return {
        status: 'GRACE_PERIOD_MATCH',
        tokens: {
          accessToken: currentAccessToken,
          refreshToken: rawRefreshToken, // Giữ nguyên token của client trong grace period
          expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
        },
        session,
      };
    }

    // =========================================================================
    // NHÁNH 3: PHÁT HIỆN TẤN CÔNG TÁI SỬ DỤNG TOKEN (TOKEN REUSE DETECTED)
    // Token không khớp cả current lẫn previous trong grace period
    // Dấu hiệu rõ ràng Refresh Token cũ đã bị kẻ tấn công đánh cắp và cố tình phát lại!
    // =========================================================================
    await this.sessionStore.revokeFamily(session.familyId);

    return {
      status: 'TOKEN_REUSE_DETECTED',
      familyId: session.familyId,
      error:
        'CẢNH BÁO AN NINH: Phát hiện hành vi tái sử dụng Refresh Token không hợp lệ. Toàn bộ phiên làm việc của tài khoản trên thiết bị này đã bị hủy bỏ lập tức.',
    };
  }
}
