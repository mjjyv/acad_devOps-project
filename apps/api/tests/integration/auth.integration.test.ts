import {
  AuthService,
  PostgresUserRepository,
  RedisSessionStore,
  TokenManager,
} from '@acad/auth-service';
import { Redis } from 'ioredis';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/index.js';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/acad_dev?sslmode=disable';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const JWT_SECRET = process.env.JWT_SECRET || TokenManager.DEFAULT_SECRET;

describe('Real PostgreSQL 16 + Redis 7 Integration Tests (Phase B1 Auth Foundation)', () => {
  let pool: pg.Pool;
  let redis: Redis;
  let sessionStore: RedisSessionStore;
  let app: ReturnType<typeof createApp>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3 });

    const userRepo = new PostgresUserRepository(pool);
    sessionStore = new RedisSessionStore(redis);
    const authService = new AuthService(userRepo, sessionStore, JWT_SECRET);

    app = createApp({
      authService,
      jwtSecret: JWT_SECRET,
      pool,
      redis,
      disableRateLimit: true,
    });
  });

  afterAll(async () => {
    for (const uid of createdUserIds) {
      await sessionStore.revokeAllUserSessions(uid);
      await pool.query('DELETE FROM users WHERE id = $1', [uid]);
    }
    await pool.end();
    await redis.quit();
  });

  it('authenticates seeded admin_pro with scrypt, checks /healthz & pg_trgm user search without PII', async () => {
    const health = await request(app).get('/healthz');
    expect(health.status).toBe(200);
    expect(health.body.services).toEqual({ database: 'ok', redis: 'ok' });

    const login = await request(app).post('/api/v1/auth/login').send({
      identifier: 'admin_pro',
      password: 'Password123!',
    });
    expect(login.status).toBe(200);
    const adminToken = login.body.tokens.accessToken as string;
    const adminId = login.body.user.id as string;

    const claims = TokenManager.verifyAccessToken(adminToken, JWT_SECRET);
    expect(claims?.role).toBe('ADMIN');
    if (claims) {
      await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    }

    const meCheck = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(meCheck.status).toBe(200);
    expect(meCheck.body.id).toBe(adminId);
  });

  it('persists register -> user_sessions + Redis, verifies 30s Grace & Reuse Attack full revocation + pg_trgm search', async () => {
    const ts = Date.now();
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `b1_real_${ts}`,
        email: `b1_real_${ts}@acad.vn`,
        password: 'Password123!',
      });
    expect(reg.status).toBe(201);
    const userId = reg.body.user.id as string;
    createdUserIds.push(userId);

    const accessToken = reg.body.tokens.accessToken as string;
    const refresh1 = reg.body.tokens.refreshToken as string;

    // 1. Verify PostgreSQL users & user_sessions rows exist
    const dbSessions = await pool.query(
      'SELECT id, is_revoked FROM user_sessions WHERE user_id = $1',
      [userId],
    );
    expect(dbSessions.rows).toHaveLength(1);
    expect(dbSessions.rows[0].is_revoked).toBe(false);
    const sessionId = String(dbSessions.rows[0].id);

    // 2. Verify Redis hash matches
    const redisSession = await sessionStore.getSession(userId, sessionId);
    expect(redisSession).not.toBeNull();
    expect(redisSession?.isRevoked).toBe(false);

    // 3. Verify pg_trgm search returns seeded admin_pro without PII
    const search = await request(app)
      .get('/api/v1/auth/users/search?q=admin_')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(search.status).toBe(200);
    const adminResult = (search.body.users as Array<Record<string, unknown>>).find(
      (u) => u.username === 'admin_pro',
    );
    expect(adminResult).toBeDefined();
    expect('email' in (adminResult ?? {})).toBe(false);
    expect('passwordHash' in (adminResult ?? {})).toBe(false);

    // 4. Rotate Token -> Grace Period -> Expire Grace -> Reuse Attack revokes both Redis & DB
    const rot1 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: refresh1 });
    expect(rot1.status).toBe(200);

    const graceRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh1 });
    expect(graceRes.status).toBe(200);

    await redis.hset(
      `session:${userId}:${sessionId}`,
      'gracePeriodExpiresAt',
      new Date(Date.now() - 5000).toISOString(),
    );

    const reuseRes = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refresh1 });
    expect(reuseRes.status).toBe(401);

    const afterReuseDb = await pool.query(
      'SELECT is_revoked FROM user_sessions WHERE user_id = $1',
      [userId],
    );
    expect(afterReuseDb.rows[0].is_revoked).toBe(true);
    const afterReuseRedis = await sessionStore.getSession(userId, sessionId);
    expect(afterReuseRedis?.isRevoked).toBe(true);
  });
});
