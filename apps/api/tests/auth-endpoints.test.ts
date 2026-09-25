import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AddressInfo } from 'node:net';
import { createApiServer } from '../src/server.js';
import { createAuthModule } from '@acad/auth-service';
import { COOKIE_CONFIG } from '@acad/contracts';

describe('Auth Endpoints HTTP Integration Tests', () => {
  let server: ReturnType<typeof createApiServer>;
  let baseUrl: string;

  beforeAll(async () => {
    const authModule = createAuthModule({ inMemory: true });
    server = createApiServer({ authModule });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function extractCookie(response: Response, cookieName: string): string | null {
    const rawCookies = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie') || ''];

    for (const header of rawCookies) {
      if (header.includes(`${cookieName}=`)) {
        const match = header.match(new RegExp(`${cookieName}=([^;]+)`));
        if (match) return match[1];
      }
    }
    return null;
  }

  const testUser = {
    username: 'auth_tester',
    email: 'tester@acad.community',
    password: 'Password123!',
    deviceFingerprint: 'device_desktop_chrome_v120',
  };

  let registeredAccessToken: string;
  let registeredRefreshToken: string;
  let userId: string;

  it('1. POST /api/v1/auth/register - Đăng ký tài khoản mới & Cấp cặp Cookie bảo mật', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.user).toBeDefined();
    expect(body.user.username).toBe(testUser.username);
    expect(body.user.email).toBe(testUser.email);
    expect(body.accessToken).toBeDefined();
    expect(body.expiresIn).toBe(900);

    userId = body.user.id;
    registeredAccessToken = body.accessToken;

    const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    expect(setCookies.length).toBeGreaterThanOrEqual(2);

    const accessCookie = setCookies.find((c) => c.includes(COOKIE_CONFIG.ACCESS_TOKEN.NAME));
    const refreshCookie = setCookies.find((c) => c.includes(COOKIE_CONFIG.REFRESH_TOKEN.NAME));

    expect(accessCookie).toBeDefined();
    expect(accessCookie).toContain('Path=/');
    expect(accessCookie).toContain('HttpOnly');
    expect(accessCookie?.toLowerCase()).toContain('samesite=lax');

    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain(`Path=${COOKIE_CONFIG.REFRESH_TOKEN.PATH}`);
    expect(refreshCookie).toContain('HttpOnly');
    expect(refreshCookie?.toLowerCase()).toContain('samesite=strict');

    registeredRefreshToken = extractCookie(res, COOKIE_CONFIG.REFRESH_TOKEN.NAME)!;
    expect(registeredRefreshToken).toBeTruthy();
  });

  it('2. POST /api/v1/auth/register - Từ chối trùng email hoặc username', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain('đã được sử dụng');
  });

  it('3. POST /api/v1/auth/login - Đăng nhập tài khoản & Kiểm tra sai mật khẩu', async () => {
    // Thử sai mật khẩu
    const failRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: testUser.email,
        password: 'WrongPassword!',
        deviceFingerprint: testUser.deviceFingerprint,
      }),
    });
    expect(failRes.status).toBe(401);

    // Đăng nhập thành công
    const successRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: testUser.username,
        password: testUser.password,
        deviceFingerprint: testUser.deviceFingerprint,
      }),
    });

    expect(successRes.status).toBe(200);
    const successBody = (await successRes.json()) as any;
    expect(successBody.user.id).toBe(userId);
    expect(successBody.accessToken).toBeDefined();

    registeredAccessToken = successBody.accessToken;
    registeredRefreshToken = extractCookie(successRes, COOKIE_CONFIG.REFRESH_TOKEN.NAME)!;
  });

  it('4. GET /api/v1/auth/me - Bảo vệ endpoint bằng Bearer Token và Cookie', async () => {
    // Không có token -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/auth/me`);
    expect(unauthRes.status).toBe(401);

    // Kèm Bearer token trong Header -> 200 OK
    const bearerRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${registeredAccessToken}` },
    });
    expect(bearerRes.status).toBe(200);
    const bearerBody = (await bearerRes.json()) as any;
    expect(bearerBody.id).toBe(userId);
    expect(bearerBody.username).toBe(testUser.username);

    // Kèm Cookie access_token -> 200 OK
    const cookieRes = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { Cookie: `${COOKIE_CONFIG.ACCESS_TOKEN.NAME}=${registeredAccessToken}` },
    });
    expect(cookieRes.status).toBe(200);
    const cookieBody = (await cookieRes.json()) as any;
    expect(cookieBody.id).toBe(userId);
  });

  it('5. POST /api/v1/auth/refresh - Luồng Token Rotation chuẩn và Grace Period 30s', async () => {
    const initialRefreshToken = registeredRefreshToken;
    await new Promise((r) => setTimeout(r, 1050));

    // Yêu cầu làm mới 1 (Xoay vòng chuẩn)
    const refreshRes1 = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_CONFIG.REFRESH_TOKEN.NAME}=${initialRefreshToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceFingerprint: testUser.deviceFingerprint,
        userId,
      }),
    });

    expect(refreshRes1.status).toBe(200);
    const refreshBody1 = (await refreshRes1.json()) as any;
    expect(refreshBody1.accessToken).toBeDefined();
    expect(refreshBody1.accessToken).not.toBe(registeredAccessToken);

    const newRefreshToken = extractCookie(refreshRes1, COOKIE_CONFIG.REFRESH_TOKEN.NAME);
    expect(newRefreshToken).toBeDefined();
    expect(newRefreshToken).not.toBe(initialRefreshToken);

    // Yêu cầu làm mới 2 (Song song / Cửa sổ Grace Period 30s): Gửi LẠI token cũ initialRefreshToken
    const graceRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_CONFIG.REFRESH_TOKEN.NAME}=${initialRefreshToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceFingerprint: testUser.deviceFingerprint,
        userId,
      }),
    });

    // Phải chấp nhận và trả về token hợp lệ vì còn trong 30s Grace Period
    expect(graceRes.status).toBe(200);
    const graceBody = (await graceRes.json()) as any;
    expect(graceBody.accessToken).toBeDefined();

    // Cập nhật token mới nhất cho các bài kiểm tra tiếp theo
    registeredAccessToken = refreshBody1.accessToken;
    registeredRefreshToken = newRefreshToken!;
  });

  it('6. POST /api/v1/auth/refresh - Phát hiện Token Reuse Attack & Xóa sạch Session Family', async () => {
    // Tiếp tục xoay vòng một lần nữa để token trước đó chính thức rơi vào trạng thái cần bảo vệ
    const rotateRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_CONFIG.REFRESH_TOKEN.NAME}=${registeredRefreshToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceFingerprint: testUser.deviceFingerprint,
        userId,
      }),
    });
    expect(rotateRes.status).toBe(200);
    const latestRefreshToken = extractCookie(rotateRes, COOKIE_CONFIG.REFRESH_TOKEN.NAME)!;

    // Giả lập kẻ tấn công sử dụng một Refresh Token hoàn toàn lạ hoặc đã hết hạn ngoài grace period
    const staleHackerToken = 'stale_stolen_token_never_seen_before_abcdef1234567890abcdef1234567890';

    const attackRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_CONFIG.REFRESH_TOKEN.NAME}=${staleHackerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceFingerprint: testUser.deviceFingerprint,
        userId,
      }),
    });

    // Hệ thống phát hiện Token Reuse và trả về 403 Forbidden!
    expect(attackRes.status).toBe(403);
    const attackBody = (await attackRes.json()) as any;
    expect(attackBody.code).toBe('TOKEN_REUSE_DETECTED');
    expect(attackBody.error).toContain('TOKEN_REUSE');

    // Sau khi bị tấn công, session của gia đình đó đã bị thu hồi hoàn toàn!
    const tryLatestRes = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `${COOKIE_CONFIG.REFRESH_TOKEN.NAME}=${latestRefreshToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceFingerprint: testUser.deviceFingerprint,
        userId,
      }),
    });
    // Session đã bị revoke -> 401
    expect(tryLatestRes.status).toBe(401);
  });

  it('7. GET & DELETE /api/v1/auth/sessions - Quản lý và thu hồi phiên', async () => {
    // Đăng nhập lại tạo phiên mới
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: testUser.username,
        password: testUser.password,
        deviceFingerprint: 'device_tablet_ipad_v10',
      }),
    });
    const loginBody = (await loginRes.json()) as any;
    const token = loginBody.accessToken;

    // Lấy danh sách sessions
    const sessionsRes = await fetch(`${baseUrl}/api/v1/auth/sessions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(sessionsRes.status).toBe(200);
    const sessions = (await sessionsRes.json()) as any[];
    expect(sessions.length).toBeGreaterThanOrEqual(1);

    const targetSession = sessions[0];
    expect(targetSession.sessionId).toBeDefined();

    // Thu hồi session đó
    const delRes = await fetch(`${baseUrl}/api/v1/auth/sessions/${targetSession.sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(delRes.status).toBe(200);
  });

  it('8. POST /api/v1/auth/logout - Đăng xuất & Hủy Cookies', async () => {
    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: 'POST',
    });

    expect(logoutRes.status).toBe(200);
    const setCookies = logoutRes.headers.getSetCookie ? logoutRes.headers.getSetCookie() : [];
    const accessCookie = setCookies.find((c) => c.includes(COOKIE_CONFIG.ACCESS_TOKEN.NAME));
    const refreshCookie = setCookies.find((c) => c.includes(COOKIE_CONFIG.REFRESH_TOKEN.NAME));

    expect(accessCookie).toContain('Max-Age=0');
    expect(refreshCookie).toContain('Max-Age=0');
  });
});
