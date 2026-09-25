import { IncomingMessage, ServerResponse } from 'node:http';
import { AuthModule, TokenManager, UserRecord, UserSession } from '@acad/auth-service';
import { COOKIE_CONFIG } from '@acad/contracts';

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('=').trim());
    }
  });
  return list;
}

export async function readJsonBody<T = any>(req: IncomingMessage, maxBytes = 1024 * 1024): Promise<T> {
  return new Promise((resolve, reject) => {
    let data = '';
    let bytes = 0;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > maxBytes) {
        reject(new Error('Dung lượng tải lên vượt quá giới hạn'));
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({} as T);
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Dữ liệu JSON không hợp lệ'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

export function sendJson(
  res: ServerResponse,
  statusCode: number,
  data: unknown,
  headers?: Record<string, string | string[]>,
) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    ...(headers || {}),
  });
  res.end(payload);
}

export function createAuthRouter(authModule: AuthModule) {
  const { controller, sessionStore, userRepo, rateLimiter } = authModule;

  return async (req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> => {
    const method = req.method?.toUpperCase();
    const pathname = url.pathname;
    const cookies = parseCookies(req.headers.cookie);
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown_agent';

    // =========================================================================
    // 1. POST /api/v1/auth/register
    // =========================================================================
    if (method === 'POST' && pathname === '/api/v1/auth/register') {
      try {
        const body = await readJsonBody(req);
        const result = await controller.register(body, clientIp, userAgent);

        res.setHeader('Set-Cookie', result.cookies);
        sendJson(res, 201, {
          ...result.response,
          refreshToken: result.rawTokens.refreshToken,
        });
        return true;
      } catch (err: any) {
        sendJson(res, 400, { error: err.message || 'Đăng ký tài khoản thất bại' });
        return true;
      }
    }

    // =========================================================================
    // 2. POST /api/v1/auth/login
    // =========================================================================
    if (method === 'POST' && pathname === '/api/v1/auth/login') {
      try {
        if (rateLimiter) {
          const rateCheck = await rateLimiter.consume(`login:${clientIp}`, 10, 900);
          if (!rateCheck.allowed) {
            sendJson(
              res,
              429,
              {
                error: `Quá nhiều lượt đăng nhập thất bại. Vui lòng thử lại sau ${rateCheck.retryAfterSeconds || 60} giây.`,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: rateCheck.retryAfterSeconds,
              },
              { 'Retry-After': String(rateCheck.retryAfterSeconds || 60) },
            );
            return true;
          }
        }

        const body = await readJsonBody(req);
        const result = await controller.login(body, clientIp, userAgent);

        if (rateLimiter) {
          await rateLimiter.reset(`login:${clientIp}`);
        }

        res.setHeader('Set-Cookie', result.cookies);
        sendJson(res, 200, {
          ...result.response,
          refreshToken: result.rawTokens.refreshToken,
        });
        return true;
      } catch (err: any) {
        sendJson(res, 401, { error: err.message || 'Đăng nhập thất bại' });
        return true;
      }
    }

    // =========================================================================
    // 3. POST /api/v1/auth/refresh
    // =========================================================================
    if (method === 'POST' && pathname === '/api/v1/auth/refresh') {
      try {
        const body = await readJsonBody(req).catch(() => ({}));
        const rawRefreshToken =
          cookies[COOKIE_CONFIG.REFRESH_TOKEN.NAME] || body.refreshToken;

        if (!rawRefreshToken) {
          sendJson(res, 401, { error: 'Yêu cầu thiếu Refresh Token hợp lệ' });
          return true;
        }

        const deviceFingerprint =
          body.deviceFingerprint ||
          (req.headers['x-device-fingerprint'] as string) ||
          undefined;

        const userId =
          body.userId ||
          (req.headers['x-user-id'] as string) ||
          undefined;

        const result = await controller.refresh(rawRefreshToken, userId, deviceFingerprint);

        res.setHeader('Set-Cookie', result.cookies);
        sendJson(res, 200, result.response);
        return true;
      } catch (err: any) {
        if (err.message?.includes('SECURITY_ALERT_TOKEN_REUSE')) {
          res.setHeader('Set-Cookie', controller.generateClearCookies());
          sendJson(res, 403, {
            error: err.message,
            code: 'TOKEN_REUSE_DETECTED',
          });
          return true;
        }

        sendJson(res, 401, { error: err.message || 'Làm mới token thất bại' });
        return true;
      }
    }

    // =========================================================================
    // 4. POST /api/v1/auth/logout
    // =========================================================================
    if (method === 'POST' && pathname === '/api/v1/auth/logout') {
      try {
        const body = await readJsonBody(req).catch(() => ({}));
        const sessionId = body.sessionId || (req.headers['x-session-id'] as string);

        if (sessionId) {
          await sessionStore.revokeSession(sessionId);
        }

        res.setHeader('Set-Cookie', controller.generateClearCookies());
        sendJson(res, 200, { message: 'Đăng xuất thành công' });
        return true;
      } catch (err: any) {
        res.setHeader('Set-Cookie', controller.generateClearCookies());
        sendJson(res, 200, { message: 'Đăng xuất thành công' });
        return true;
      }
    }

    // =========================================================================
    // 5. GET /api/v1/auth/me
    // =========================================================================
    if (method === 'GET' && pathname === '/api/v1/auth/me') {
      try {
        const authHeader = req.headers.authorization;
        let token = '';
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7).trim();
        } else if (cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME]) {
          token = cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME];
        }

        if (!token) {
          sendJson(res, 401, { error: 'Yêu cầu không có quyền truy cập (Thiếu token)' });
          return true;
        }

        const claims = TokenManager.verifyAccessToken(token);
        const user = await userRepo.findById(claims.sub);
        if (!user) {
          sendJson(res, 401, { error: 'Người dùng không tồn tại' });
          return true;
        }

        if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
          sendJson(res, 403, { error: 'Tài khoản đã bị tạm ngưng hoặc xóa' });
          return true;
        }

        const ageDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        sendJson(res, 200, {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          status: user.status,
          karmaScore: user.karmaScore,
          avatarUrl: user.avatarUrl ?? null,
          bio: user.bio ?? null,
          createdAt: user.createdAt.toISOString(),
          accountAgeDays: ageDays,
        });
        return true;
      } catch (err: any) {
        sendJson(res, 401, { error: err.message || 'Token không hợp lệ hoặc đã hết hạn' });
        return true;
      }
    }

    // =========================================================================
    // 6. GET /api/v1/auth/sessions
    // =========================================================================
    if (method === 'GET' && pathname === '/api/v1/auth/sessions') {
      try {
        const authHeader = req.headers.authorization;
        let token = '';
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7).trim();
        } else if (cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME]) {
          token = cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME];
        }

        if (!token) {
          sendJson(res, 401, { error: 'Yêu cầu không có quyền truy cập (Thiếu token)' });
          return true;
        }

        const claims = TokenManager.verifyAccessToken(token);
        const sessions = await sessionStore.listUserSessions(claims.sub);

        sendJson(
          res,
          200,
          sessions.map((s: UserSession) => ({
            sessionId: s.sessionId,
            deviceFingerprint: s.deviceFingerprint,
            ipAddress: s.ipAddress,
            userAgent: s.userAgent,
            createdAt: s.createdAt.toISOString(),
            expiresAt: s.expiresAt.toISOString(),
          })),
        );
        return true;
      } catch (err: any) {
        sendJson(res, 401, { error: err.message || 'Token không hợp lệ' });
        return true;
      }
    }

    // =========================================================================
    // 7. DELETE /api/v1/auth/sessions (Thu hồi toàn bộ phiên của tài khoản)
    // =========================================================================
    if (method === 'DELETE' && pathname === '/api/v1/auth/sessions') {
      try {
        const authHeader = req.headers.authorization;
        let token = '';
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7).trim();
        } else if (cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME]) {
          token = cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME];
        }

        if (!token) {
          sendJson(res, 401, { error: 'Yêu cầu không có quyền truy cập (Thiếu token)' });
          return true;
        }

        const claims = TokenManager.verifyAccessToken(token);
        await sessionStore.revokeAllUserSessions(claims.sub);

        sendJson(res, 200, { message: 'Đã thu hồi tất cả các phiên đăng nhập thành công' });
        return true;
      } catch (err: any) {
        sendJson(res, 401, { error: err.message || 'Token không hợp lệ' });
        return true;
      }
    }

    // =========================================================================
    // 8. DELETE /api/v1/auth/sessions/:sessionId (Thu hồi 1 phiên cụ thể)
    // =========================================================================
    if (method === 'DELETE' && pathname.startsWith('/api/v1/auth/sessions/')) {
      try {
        const authHeader = req.headers.authorization;
        let token = '';
        if (authHeader && authHeader.startsWith('Bearer ')) {
          token = authHeader.substring(7).trim();
        } else if (cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME]) {
          token = cookies[COOKIE_CONFIG.ACCESS_TOKEN.NAME];
        }

        if (!token) {
          sendJson(res, 401, { error: 'Yêu cầu không có quyền truy cập (Thiếu token)' });
          return true;
        }

        TokenManager.verifyAccessToken(token);
        const targetSessionId = pathname.replace('/api/v1/auth/sessions/', '');
        await sessionStore.revokeSession(targetSessionId);

        sendJson(res, 200, { message: 'Thu hồi phiên thành công' });
        return true;
      } catch (err: any) {
        sendJson(res, 401, { error: err.message || 'Token không hợp lệ' });
        return true;
      }
    }

    return false;
  };
}
