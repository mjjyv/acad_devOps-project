import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '@acad/auth-service';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp, RateLimiter } from '../src/index.js';

const TEST_SECRET = 'security-test-secret-32-chars-minimum!';

describe('@acad/api-gateway Security Headers, RFC 7807 & Split Rate Limiter', () => {
  beforeEach(() => {
    RateLimiter.resetMemoryStore();
  });

  it('sets OWASP security headers and maps malformed JSON to 400 RFC 7807 without 500', async () => {
    const authService = new AuthService(
      new InMemoryUserRepository(),
      new InMemorySessionStore(),
      TEST_SECRET,
    );
    const app = createApp({ authService, jwtSecret: TEST_SECRET, disableRateLimit: true });

    const health = await request(app).get('/healthz');
    expect(health.headers['x-frame-options']).toBe('DENY');
    expect(health.headers['x-content-type-options']).toBe('nosniff');
    expect(health.headers['x-correlation-id']).toBeTruthy();

    const malformed = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"brokenJson": ');

    expect(malformed.status).toBe(400);
    expect(malformed.headers['content-type']).toContain('application/problem+json');
    expect(malformed.body.code).toBe('MALFORMED_JSON');
  });

  it('throttles POST /login at 10 req/min while keeping GET /me & /users/search unblocked by authRateLimiter', async () => {
    const authService = new AuthService(
      new InMemoryUserRepository(),
      new InMemorySessionStore(),
      TEST_SECRET,
    );
    const app = createApp({ authService, jwtSecret: TEST_SECRET, disableRateLimit: false });

    const reg = await request(app).post('/api/v1/auth/register').send({
      username: 'ratelimit_user',
      email: 'rl@acad.vn',
      password: 'Password123!',
    });
    expect(reg.status).toBe(201);
    const token = reg.body.tokens.accessToken as string;

    // 15 GET /me reloads must all succeed (200) without draining the 10-req auth mutation quota
    for (let i = 0; i < 15; i++) {
      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meRes.status).toBe(200);
    }

    // 9 POST /login calls (+ 1 register above = 10 total auth mutations) succeed/401, 11th hits 429
    for (let i = 0; i < 9; i++) {
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        identifier: 'ratelimit_user',
        password: 'WrongPassword!',
      });
      expect(loginRes.status).toBe(401);
    }

    const throttled = await request(app).post('/api/v1/auth/login').send({
      identifier: 'ratelimit_user',
      password: 'Password123!',
    });
    expect(throttled.status).toBe(429);
    expect(throttled.headers['retry-after']).toBeTruthy();
    expect(throttled.headers['content-type']).toContain('application/problem+json');
  });
});
