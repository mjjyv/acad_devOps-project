import {
  AuthService,
  PostgresUserRepository,
  RedisSessionStore,
  TokenManager,
} from '@acad/auth-service';
import {
  ChatService,
  PostgresChatRepository,
  PresenceManager,
  SseManager,
} from '@acad/chat-service';
import { ModerationService, PostgresModerationRepository } from '@acad/moderation-service';
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

describe('Real PostgreSQL 16 + Redis 7 Integration Tests (Phase B4 Chat & Phase B5 Moderation)', () => {
  let pool: pg.Pool;
  let redis: Redis;
  let sessionStore: RedisSessionStore;
  let app: ReturnType<typeof createApp>;

  const createdUserIds: string[] = [];
  const createdChannelIds: string[] = [];
  const createdReportIds: string[] = [];

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3 });

    const userRepo = new PostgresUserRepository(pool);
    sessionStore = new RedisSessionStore(redis);
    const authService = new AuthService(userRepo, sessionStore, JWT_SECRET);

    const chatRepo = new PostgresChatRepository(pool);
    const sseManager = new SseManager();
    const presenceManager = new PresenceManager(redis);
    const chatService = new ChatService(chatRepo, sseManager, presenceManager);

    const modRepo = new PostgresModerationRepository(pool);
    const moderationService = new ModerationService(modRepo, sessionStore);

    app = createApp({
      authService,
      chatServices: { chatService, sseManager, presenceManager },
      moderationService,
      jwtSecret: JWT_SECRET,
      pool,
      redis,
      disableRateLimit: true,
    });
  });

  afterAll(async () => {
    if (createdReportIds.length > 0) {
      await pool.query('DELETE FROM reports WHERE id = ANY($1);', [createdReportIds]);
    }
    if (createdChannelIds.length > 0) {
      await pool.query('DELETE FROM chat_channels WHERE id = ANY($1);', [createdChannelIds]);
    }
    for (const uid of createdUserIds) {
      await sessionStore.revokeAllUserSessions(uid);
      await redis.del(`presence:online:${uid}`);
    }
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1);', [createdUserIds]);
    }
    await redis.quit();
    await pool.end();
  });

  it('persists DM queue -> channel -> message threads, anti-harassment block, duplicate report 409, session revoke & audit immutability', async () => {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin_pro', password: 'Password123!' });
    expect(adminLogin.status).toBe(200);
    const adminToken = adminLogin.body.tokens.accessToken as string;
    const adminRefresh = adminLogin.body.tokens.refreshToken as string;

    const regA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `chat_a_${suffix}`,
        email: `chat_a_${suffix}@acad.vn`,
        password: 'Password123!',
      });
    const regB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `chat_b_${suffix}`,
        email: `chat_b_${suffix}@acad.vn`,
        password: 'Password123!',
      });
    expect(regA.status).toBe(201);
    expect(regB.status).toBe(201);

    const idA = regA.body.user.id as string;
    const idB = regB.body.user.id as string;
    const tokenA = regA.body.tokens.accessToken as string;
    const tokenB = regB.body.tokens.accessToken as string;
    const refreshB = regB.body.tokens.refreshToken as string;
    createdUserIds.push(idA, idB);

    // 1. DM request -> PENDING -> ACCEPTED -> Channel + Message Thread + Read
    const dmRes = await request(app)
      .post('/api/v1/chat/channels/direct')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipientId: idB, initialMessage: 'Hello from Integration Test' });
    expect(dmRes.status).toBe(202);
    const reqId = dmRes.body.request.id as string;

    const accRes = await request(app)
      .patch(`/api/v1/chat/requests/${reqId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'ACCEPTED' });
    expect(accRes.status).toBe(200);
    const channelId = accRes.body.channel.id as string;
    createdChannelIds.push(channelId);

    const msgsRes = await request(app)
      .get(`/api/v1/chat/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(msgsRes.status).toBe(200);
    expect(msgsRes.body.messages).toHaveLength(1);
    const rootMsgId = msgsRes.body.messages[0].id as string;

    const replyRes = await request(app)
      .post(`/api/v1/chat/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ parentMessageId: rootMsgId, content: 'Thread reply inside real Postgres!' });
    expect(replyRes.status).toBe(201);

    const imgMsgRes = await request(app)
      .post(`/api/v1/chat/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        content: '',
        attachments: [
          {
            type: 'IMAGE',
            url: 'http://127.0.0.1:10000/api/v1/media/files/uploads/demo/chart.png',
            title: 'chart.png',
          },
        ],
      });
    expect(imgMsgRes.status).toBe(201);
    expect(imgMsgRes.body.message.attachments).toHaveLength(1);

    // 2. Moderation report + 409 anti-spam + Admin Resolve + Suspend User B revoking Postgres + Redis sessions
    const fakeThreadTarget = '00000000-0000-4000-8000-000000000777';
    const repRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ targetType: 'THREAD', targetId: fakeThreadTarget, reason: 'Real DB spam test' });
    expect(repRes.status).toBe(201);
    createdReportIds.push(repRes.body.id as string);

    const dupRep = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ targetType: 'THREAD', targetId: fakeThreadTarget, reason: 'Duplicate check' });
    expect(dupRep.status).toBe(409);

    const suspendRes = await request(app)
      .patch(`/api/v1/admin/users/${idB}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'SUSPENDED', reason: 'E2E suspension audit' });
    expect(suspendRes.status).toBe(200);

    // Verify Postgres user_sessions revoked AND Redis sessions cleared AND refresh rejected
    const dbSess = await pool.query(
      'SELECT COUNT(*)::int AS cnt FROM user_sessions WHERE user_id = $1 AND is_revoked = FALSE;',
      [idB],
    );
    expect(dbSess.rows[0].cnt).toBe(0);
    expect(await sessionStore.listUserSessions(idB)).toHaveLength(0);

    const deniedRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshB });
    expect(deniedRefresh.status).toBe(401);

    // 3. Verify append-only immutability trigger blocks UPDATE/DELETE on audit_logs
    const latestAudit = await pool.query(
      'SELECT id FROM audit_logs WHERE actor_id = (SELECT id FROM users WHERE username = $1) ORDER BY created_at DESC LIMIT 1;',
      ['admin_pro'],
    );
    expect(latestAudit.rows).toHaveLength(1);
    const auditId = latestAudit.rows[0].id as string;
    await expect(
      pool.query("UPDATE audit_logs SET action = 'TAMPERED' WHERE id = $1;", [auditId]),
    ).rejects.toThrow();

    // Logout temporary admin_pro test session cleanly
    await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ refreshToken: adminRefresh });
  });
});
