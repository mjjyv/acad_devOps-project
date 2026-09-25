import { beforeEach, describe, expect, it } from 'vitest';
import { AuthController, InMemoryUserRepository } from '../src/handlers/auth-controller.js';
import { InMemorySessionStore } from '../src/session/store.js';

describe('3. Kiểm thử Giao thức Xoay vòng Token & Phát hiện Tấn công (Token Rotation Protocol)', () => {
  let userRepo: InMemoryUserRepository;
  let sessionStore: InMemorySessionStore;
  let authController: AuthController;

  beforeEach(() => {
    userRepo = new InMemoryUserRepository();
    sessionStore = new InMemorySessionStore();
    authController = new AuthController(userRepo, sessionStore);
  });

  it('Chu trình Đăng ký -> Đăng nhập -> Cấp phát cặp Token ban đầu', async () => {
    const regResult = await authController.register({
      email: 'bob@example.com',
      username: 'bob_builder',
      password: 'SecurePassword#123',
      deviceFingerprint: 'device_macbook_pro_01',
    });

    expect(regResult.response.user.username).toBe('bob_builder');
    expect(regResult.response.accessToken).toBeDefined();
    expect(regResult.rawTokens.refreshToken).toBeDefined();
    expect(regResult.cookies).toHaveLength(2);
    expect(regResult.cookies[0]).toContain('access_token=');
    expect(regResult.cookies[1]).toContain('refresh_token=');

    // Đăng nhập lại
    const loginResult = await authController.login({
      login: 'bob@example.com',
      password: 'SecurePassword#123',
      deviceFingerprint: 'device_macbook_pro_01',
    });
    expect(loginResult.response.user.email).toBe('bob@example.com');
  });

  it('Xoay vòng Token thành công: Cấp cặp token mới và lưu vết token cũ vào Grace Period', async () => {
    const reg = await authController.register({
      email: 'carol@example.com',
      username: 'carol_tester',
      password: 'SecurePassword#123',
      deviceFingerprint: 'device_phone_pixel',
    });

    const rt1 = reg.rawTokens.refreshToken;
    const userId = reg.response.user.id;

    // Tiến hành xoay vòng lần 1
    const rot1 = await authController.refresh(rt1, userId, 'device_phone_pixel');
    expect(rot1.response.accessToken).toBeDefined();
    expect(rot1.cookies).toHaveLength(2);

    // Kiểm tra session trong store
    const session = await sessionStore.getSession(userId, 'device_phone_pixel');
    expect(session).toBeDefined();
    expect(session?.previousTokenHash).toBeDefined();
    expect(session?.gracePeriodExpiresAt).toBeDefined();
  });

  it('Cơ chế Grace Period (30s): Yêu cầu lặp hợp lệ do nghẽn mạng không bị coi là tấn công', async () => {
    const reg = await authController.register({
      email: 'david@example.com',
      username: 'david_network',
      password: 'SecurePassword#123',
      deviceFingerprint: 'device_ipad_air',
    });

    const rt1 = reg.rawTokens.refreshToken;
    const userId = reg.response.user.id;

    // Lần 1: Xoay vòng bình thường
    const rot1 = await authController.refresh(rt1, userId, 'device_ipad_air');
    expect(rot1.response.accessToken).toBeDefined();

    // Lần 2: Giả lập Client gửi lại RT1 ngay sau đó (trong vòng 30s Grace Period)
    const rotGrace = await authController.refresh(rt1, userId, 'device_ipad_air');
    expect(rotGrace.response.accessToken).toBeDefined();

    // Phiên không bị thu hồi
    const session = await sessionStore.getSession(userId, 'device_ipad_air');
    expect(session?.isRevoked).toBe(false);
  });

  it('PHÁT HIỆN TẤN CÔNG TOKEN REUSE: Tái sử dụng Refresh Token cũ làm sập toàn bộ Session Family', async () => {
    const reg = await authController.register({
      email: 'eve@example.com',
      username: 'eve_security',
      password: 'SecurePassword#123',
      deviceFingerprint: 'device_eve_laptop',
    });

    const rt1 = reg.rawTokens.refreshToken;
    const userId = reg.response.user.id;

    // Lần 1: Xoay vòng từ RT1 sang RT2
    await authController.refresh(rt1, userId, 'device_eve_laptop');

    // Chỉnh sửa thời gian grace_period_expires_at về quá khứ để mô phỏng hết hạn 30s Grace Period
    const sessionBefore = await sessionStore.getSession(userId, 'device_eve_laptop');
    expect(sessionBefore).toBeDefined();
    await sessionStore.updateTokens(
      sessionBefore!.sessionId,
      sessionBefore!.currentTokenHash,
      sessionBefore!.previousTokenHash,
      new Date(Date.now() - 5000), // Đã hết hạn grace period 5s trước
    );

    // Kẻ tấn công cố tình gửi lại RT1 (đã bị thu hồi)
    await expect(
      authController.refresh(rt1, userId, 'device_eve_laptop'),
    ).rejects.toThrowError(/SECURITY_ALERT_TOKEN_REUSE/);

    // TOÀN BỘ PHIÊN CỦA FAMILY ĐÃ BỊ HỦY BỎ LẬP TỨC
    const sessionAfter = await sessionStore.getSession(userId, 'device_eve_laptop');
    expect(sessionAfter?.isRevoked).toBe(true);

    // Mọi yêu cầu refresh tiếp theo đều bị chặn
    await expect(
      authController.refresh('any_token_string', userId, 'device_eve_laptop'),
    ).rejects.toThrowError(/Phiên làm việc này đã bị thu hồi/);
  });
});
