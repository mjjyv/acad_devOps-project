import {
  AuthService,
  InMemorySessionStore,
  InMemoryUserRepository,
  TokenManager,
} from '@acad/auth-service';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { adminGuard, authGuard, createApp } from '../src/index.js';

const TEST_SECRET = 'endpoint-test-secret-32-chars-minimum!';

describe('@acad/api-gateway Auth & Identity Endpoints', () => {
  function setupApp() {
    const repo = new InMemoryUserRepository();
    const store = new InMemorySessionStore();
    const authService = new AuthService(repo, store, TEST_SECRET);
    const app = createApp({ authService, jwtSecret: TEST_SECRET, disableRateLimit: true });
    return { app, repo, store, authService };
  }

  it('handles register, conflict 409, login, suspended 403, /me, sessions and logout', async () => {
    const { app, repo } = setupApp();

    const badReg = await request(app).post('/api/v1/auth/register').send({
      username: 'x',
      email: 'invalid',
      password: 'weak',
    });
    expect(badReg.status).toBe(400);
    expect(badReg.headers['content-type']).toContain('application/problem+json');

    const reg = await request(app).post('/api/v1/auth/register').send({
      username: 'alice_dev',
      email: 'alice@acad.vn',
      password: 'Password123!',
    });
    expect(reg.status).toBe(201);
    const accessToken = reg.body.tokens.accessToken as string;
    const refreshToken = reg.body.tokens.refreshToken as string;

    const dup = await request(app).post('/api/v1/auth/register').send({
      username: 'ALICE_DEV',
      email: 'another@acad.vn',
      password: 'Password123!',
    });
    expect(dup.status).toBe(409);

    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.username).toBe('alice_dev');
    expect(me.body.email).toBe('alice@acad.vn');

    const unauth = await request(app).get('/api/v1/auth/me');
    expect(unauth.status).toBe(401);

    const sessions = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(sessions.status).toBe(200);
    expect(sessions.body.sessions).toHaveLength(1);
    expect(sessions.body.sessions[0].isCurrentSession).toBe(true);

    const rotated = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(rotated.status).toBe(200);
    expect(rotated.body.refreshToken).not.toBe(refreshToken);

    // 30s grace period works for concurrent tab
    const grace = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(grace.status).toBe(200);

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${rotated.body.accessToken}`);
    expect(logout.status).toBe(200);

    await repo.updateStatus(reg.body.user.id, 'SUSPENDED');
    const suspendedLogin = await request(app).post('/api/v1/auth/login').send({
      identifier: 'alice_dev',
      password: 'Password123!',
    });
    expect(suspendedLogin.status).toBe(403);
  });

  it('serves /users/search and /users/:username with 0 PII leakage and protects admin routes', async () => {
    const { app } = setupApp();

    const aRes = await request(app).post('/api/v1/auth/register').send({
      username: 'search_owner',
      email: 'owner@acad.vn',
      password: 'Password123!',
    });
    const bRes = await request(app).post('/api/v1/auth/register').send({
      username: 'search_target',
      email: 'target@acad.vn',
      password: 'Password123!',
    });
    expect(bRes.status).toBe(201);

    const tokenA = aRes.body.tokens.accessToken as string;

    const searchRes = await request(app)
      .get('/api/v1/auth/users/search?q=search_')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(searchRes.status).toBe(200);
    expect(searchRes.body.users).toHaveLength(1);
    expect(searchRes.body.users[0].username).toBe('search_target');
    expect('email' in searchRes.body.users[0]).toBe(false);
    expect('passwordHash' in searchRes.body.users[0]).toBe(false);

    const pubProfile = await request(app).get('/api/v1/auth/users/search_target');
    expect(pubProfile.status).toBe(200);
    expect(pubProfile.body.username).toBe('search_target');
    expect('email' in pubProfile.body).toBe(false);

    const notFound = await request(app).get('/api/v1/auth/users/nonexistent_xyz');
    expect(notFound.status).toBe(404);

    // Check adminGuard enforces ADMIN/GLOBAL_MOD role
    app.get('/api/v1/admin/probe', authGuard(TEST_SECRET), adminGuard, (_req, res) => {
      res.json({ ok: true });
    });

    const memberProbe = await request(app)
      .get('/api/v1/admin/probe')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(memberProbe.status).toBe(403);

    const adminToken = TokenManager.signAccessToken(
      {
        sub: aRes.body.user.id,
        username: 'admin_pro',
        email: 'admin@acad.vn',
        role: 'ADMIN',
        status: 'ACTIVE',
        sessionId: 'f1000000-0000-0000-0000-000000000001',
      },
      TEST_SECRET,
    );
    const adminProbe = await request(app)
      .get('/api/v1/admin/probe')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminProbe.status).toBe(200);
  });
});
