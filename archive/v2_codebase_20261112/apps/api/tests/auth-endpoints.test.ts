import {
  AuthService,
  InMemorySessionStore,
  InMemoryUserRepository,
  TokenManager,
} from '@acad/auth-service';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('Kiểm thử Endpoints Xác thực (@acad/api-gateway/auth)', () => {
  let userRepository: InMemoryUserRepository;
  let sessionStore: InMemorySessionStore;
  let authService: AuthService;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    userRepository = new InMemoryUserRepository();
    sessionStore = new InMemorySessionStore();
    authService = new AuthService(userRepository, sessionStore);
    app = createApp({ authService });
  });

  describe('1. Đăng ký tài khoản (POST /auth/register)', () => {
    it('Phải trả về 400 RFC 7807 nếu payload không hợp lệ (mật khẩu yếu, thiếu ký tự hoa/số)', async () => {
      const res = await request(app).post('/auth/register').send({
        username: 'validuser',
        email: 'not-an-email',
        password: 'weak',
      });

      expect(res.status).toBe(400);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body).toHaveProperty('type', 'https://api.acad.vn/errors/validation-error');
      expect(res.body).toHaveProperty('title', 'Validation Failed');
      expect(res.body).toHaveProperty('invalidParams');
      expect(res.body.invalidParams.length).toBeGreaterThan(0);
    });

    it('Phải đăng ký thành công (201 Created) với dữ liệu hợp lệ và trả về Tokens', async () => {
      const res = await request(app).post('/auth/register').send({
        username: 'john_doe',
        email: 'john@example.com',
        password: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty('username', 'john_doe');
      expect(res.body.user).toHaveProperty('email', 'john@example.com');
      expect(res.body.user).not.toHaveProperty('passwordHash');
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');
      expect(res.body.tokens).toHaveProperty('tokenType', 'Bearer');
      expect(res.body.tokens).toHaveProperty('expiresIn', 900);
    });

    it('Phải trả về 409 Conflict RFC 7807 khi đăng ký tài khoản trùng lặp email hoặc username', async () => {
      await request(app).post('/auth/register').send({
        username: 'existing_user',
        email: 'existing@example.com',
        password: 'Password123!',
      });

      // Gửi lại email trùng
      const duplicateRes = await request(app).post('/auth/register').send({
        username: 'new_username',
        email: 'existing@example.com',
        password: 'Password123!',
      });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.headers['content-type']).toContain('application/problem+json');
      expect(duplicateRes.body).toHaveProperty('type', 'https://api.acad.vn/errors/conflict');
      expect(duplicateRes.body).toHaveProperty('title', 'Resource Conflict');
    });
  });

  describe('2. Đăng nhập hệ thống (POST /auth/login)', () => {
    beforeEach(async () => {
      await request(app).post('/auth/register').send({
        username: 'alice_smith',
        email: 'alice@example.com',
        password: 'Password123!',
      });
    });

    it('Phải từ chối với HTTP 401 RFC 7807 khi nhập sai mật khẩu', async () => {
      const res = await request(app).post('/auth/login').send({
        identifier: 'alice@example.com',
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body).toHaveProperty('type', 'https://api.acad.vn/errors/unauthorized');
    });

    it('Phải đăng nhập thành công với HTTP 200 OK khi nhập đúng username hoặc email', async () => {
      const res = await request(app).post('/auth/login').send({
        identifier: 'alice_smith',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.username).toBe('alice_smith');
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');
    });
  });

  describe('3. Xác thực Bearer Token & Hồ sơ cá nhân (GET /auth/me)', () => {
    let accessToken: string;

    beforeEach(async () => {
      const reg = await request(app).post('/auth/register').send({
        username: 'charlie_brown',
        email: 'charlie@example.com',
        password: 'Password123!',
      });
      accessToken = reg.body.tokens.accessToken;
    });

    it('Phải từ chối 401 RFC 7807 nếu không truyền Authorization Header', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('Phải từ chối 401 RFC 7807 nếu token sai chữ ký hoặc bị làm giả', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer forged.token.signature');

      expect(res.status).toBe(401);
    });

    it('Phải trả về 200 OK và Profile người dùng khi truyền Access Token hợp lệ', async () => {
      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('username', 'charlie_brown');
      expect(res.body).toHaveProperty('email', 'charlie@example.com');
      expect(res.body).toHaveProperty('role', 'USER');
      expect(res.body).toHaveProperty('status', 'ACTIVE');
    });
  });

  describe('4. Chu trình Xoay vòng Token & Phòng chống Tấn công (POST /auth/refresh)', () => {
    let refreshToken1: string;

    beforeEach(async () => {
      const reg = await request(app).post('/auth/register').send({
        username: 'dave_rotation',
        email: 'dave@example.com',
        password: 'Password123!',
      });
      refreshToken1 = reg.body.tokens.refreshToken;
    });

    it('Phải từ chối 400 RFC 7807 nếu thiếu refreshToken trong request body', async () => {
      const res = await request(app).post('/auth/refresh').send({});
      expect(res.status).toBe(400);
    });

    it('Lần xoay vòng 1: Cấp cặp token mới thành công với HTTP 200 OK', async () => {
      const res = await request(app).post('/auth/refresh').send({ refreshToken: refreshToken1 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.refreshToken).not.toBe(refreshToken1);
    });

    it('30s Grace Period: Gửi lại token cũ trong vòng 30s vẫn nhận được Access Token hợp lệ', async () => {
      // Xoay vòng lần 1
      const res1 = await request(app).post('/auth/refresh').send({ refreshToken: refreshToken1 });
      expect(res1.status).toBe(200);

      // Giả lập tab trình duyệt thứ 2 gửi lại token cũ (refreshToken1) ngay sau đó
      const res2 = await request(app).post('/auth/refresh').send({ refreshToken: refreshToken1 });

      expect(res2.status).toBe(200);
      expect(res2.body).toHaveProperty('accessToken');
      expect(res2.body).toHaveProperty('expiresIn', 900);
    });

    it('Token Reuse Attack: Kẻ gian phát lại token cũ sau khi cửa sổ 30s Grace Period đã hết hạn -> Bị phát hiện & Thu hồi toàn bộ phiên (HTTP 401)', async () => {
      // Xoay vòng lần 1
      const res1 = await request(app).post('/auth/refresh').send({ refreshToken: refreshToken1 });
      expect(res1.status).toBe(200);
      const refreshToken2 = res1.body.refreshToken;

      // Ép thời gian gracePeriodExpiresAt về quá khứ để giả lập quá hạn 30s
      const submittedHash = TokenManager.hashToken(refreshToken1);
      const session = await sessionStore.getSessionByTokenHash(submittedHash);
      if (session) {
        session.gracePeriodExpiresAt = new Date(Date.now() - 5000);
        await sessionStore.saveSession(session);
      }

      // Kẻ gian phát lại refreshToken1 sau khi grace period kết thúc
      const attackRes = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: refreshToken1 });

      expect(attackRes.status).toBe(401);
      expect(attackRes.headers['content-type']).toContain('application/problem+json');
      expect(attackRes.body).toHaveProperty('title', 'Token Reuse Attack Detected');

      // Thử dùng refreshToken2 hợp lệ lúc nãy -> Phải bị từ chối vì toàn bộ phiên đã bị thu hồi
      const followUpRes = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: refreshToken2 });

      expect(followUpRes.status).toBe(401);
    });
  });

  describe('5. Quản lý Phiên làm việc & Đăng xuất (GET /auth/sessions, POST /auth/logout)', () => {
    it('Phải liệt kê danh sách phiên làm việc và cho phép đăng xuất / thu hồi phiên', async () => {
      const reg = await request(app).post('/auth/register').send({
        username: 'emma_watson',
        email: 'emma@example.com',
        password: 'Password123!',
      });
      const { accessToken } = reg.body.tokens;

      // Lấy danh sách phiên
      const sessionsRes = await request(app)
        .get('/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(sessionsRes.status).toBe(200);
      expect(sessionsRes.body).toHaveProperty('sessions');
      expect(sessionsRes.body.sessions.length).toBe(1);
      const activeSessionId = sessionsRes.body.sessions[0].id;

      // Thu hồi phiên
      const revokeRes = await request(app)
        .post(`/auth/sessions/${activeSessionId}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body).toHaveProperty('message', 'Thu hồi phiên thành công');

      // Đăng xuất
      const logoutRes = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body).toHaveProperty('message', 'Đăng xuất thành công');
    });
  });
});
