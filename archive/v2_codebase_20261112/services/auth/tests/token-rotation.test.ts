import { describe, expect, it } from 'vitest';
import { TokenManager, type UserTokenClaims } from '../src/crypto/token.js';
import { InMemorySessionStore } from '../src/session/redis-session-store.js';
import { TokenRotationService } from '../src/session/token-rotation-service.js';
import type { UserSession } from '../src/session/types.js';

describe('Động cơ Xoay vòng Token (@acad/auth-service/TokenRotationService)', () => {
  const mockUserId = '11111111-1111-1111-1111-111111111111';
  const mockSessionId = '22222222-2222-2222-2222-222222222222';
  const mockClaims: UserTokenClaims = {
    sub: mockUserId,
    username: 'alex_devops',
    email: 'alex@acad.community',
    role: 'USER',
    status: 'ACTIVE',
    sessionId: mockSessionId,
  };

  const claimsProvider = async (userId: string) => {
    return userId === mockUserId ? mockClaims : null;
  };

  it('Trường hợp 1: Xoay vòng chuẩn - Cấp cặp Token mới và thiết lập 30s Grace Period', async () => {
    const sessionStore = new InMemorySessionStore();
    const service = new TokenRotationService(sessionStore, claimsProvider);

    const initialToken = TokenManager.generateRefreshToken();
    const initialHash = TokenManager.hashToken(initialToken);

    const initialSession: UserSession = {
      id: mockSessionId,
      userId: mockUserId,
      currentTokenHash: initialHash,
      previousTokenHash: null,
      gracePeriodExpiresAt: null,
      deviceFingerprint: 'cli-test',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await sessionStore.saveSession(initialSession);

    // Thực hiện xoay vòng token
    const result = await service.rotateTokens(initialToken);
    expect(result.status).toBe('SUCCESS');

    if (result.status === 'SUCCESS') {
      expect(result.tokenPair.refreshToken).not.toBe(initialToken);
      expect(result.tokenPair.accessToken).toBeDefined();

      // Kiểm tra trạng thái phiên sau xoay vòng
      const updatedSession = await sessionStore.getSession(mockUserId, mockSessionId);
      expect(updatedSession).not.toBeNull();
      expect(updatedSession?.previousTokenHash).toBe(initialHash);
      expect(updatedSession?.currentTokenHash).toBe(
        TokenManager.hashToken(result.tokenPair.refreshToken),
      );
      expect(updatedSession?.gracePeriodExpiresAt).toBeDefined();
    }
  });

  it('Trường hợp 2: Gửi lại token cũ trong cửa sổ 30s Grace Period -> Cấp Access Token mới không phá phiên', async () => {
    const sessionStore = new InMemorySessionStore();
    const service = new TokenRotationService(sessionStore, claimsProvider);

    const oldToken = TokenManager.generateRefreshToken();
    const oldHash = TokenManager.hashToken(oldToken);

    const activeToken = TokenManager.generateRefreshToken();
    const activeHash = TokenManager.hashToken(activeToken);

    // Thiết lập phiên đang trong trạng thái 30s grace period
    const graceSession: UserSession = {
      id: mockSessionId,
      userId: mockUserId,
      currentTokenHash: activeHash,
      previousTokenHash: oldHash,
      gracePeriodExpiresAt: new Date(Date.now() + 25 * 1000), // Còn 25s
      deviceFingerprint: 'cli-test',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await sessionStore.saveSession(graceSession);

    // Gửi lại oldToken trong grace period
    const result = await service.rotateTokens(oldToken);
    expect(result.status).toBe('GRACE_PERIOD_RENEWED');

    if (result.status === 'GRACE_PERIOD_RENEWED') {
      expect(result.accessToken).toBeDefined();

      // Phiên vẫn còn active và giữ nguyên activeHash
      const currentSession = await sessionStore.getSession(mockUserId, mockSessionId);
      expect(currentSession?.currentTokenHash).toBe(activeHash);
      expect(currentSession?.isRevoked).toBe(false);
    }
  });

  it('Trường hợp 3: Token Reuse Attack - Phát lại token cũ ngoài cửa sổ 30s -> Thu hồi toàn bộ phiên', async () => {
    const sessionStore = new InMemorySessionStore();
    const service = new TokenRotationService(sessionStore, claimsProvider);

    const stolenOldToken = TokenManager.generateRefreshToken();
    const stolenOldHash = TokenManager.hashToken(stolenOldToken);

    const activeToken = TokenManager.generateRefreshToken();
    const activeHash = TokenManager.hashToken(activeToken);

    // Thiết lập phiên có grace period đã hết hạn (quá 30s)
    const expiredGraceSession: UserSession = {
      id: mockSessionId,
      userId: mockUserId,
      currentTokenHash: activeHash,
      previousTokenHash: stolenOldHash,
      gracePeriodExpiresAt: new Date(Date.now() - 5000), // Đã hết hạn cách đây 5s
      deviceFingerprint: 'cli-test',
      ipAddress: '127.0.0.1',
      userAgent: 'Vitest',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await sessionStore.saveSession(expiredGraceSession);

    // Kẻ tấn công phát lại stolenOldToken ngoài grace period
    const result = await service.rotateTokens(stolenOldToken);
    expect(result.status).toBe('TOKEN_REUSE_DETECTED');

    // Toàn bộ phiên của người dùng phải bị cưỡng chế thu hồi
    const currentSession = await sessionStore.getSession(mockUserId, mockSessionId);
    expect(currentSession?.isRevoked).toBe(true);
  });
});
