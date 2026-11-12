import { EventEmitter } from 'node:events';
import type { ServerResponse } from 'node:http';
import { AuthService, PostgresUserRepository, RedisSessionStore } from '@acad/auth-service';
import {
  ChatService,
  PostgresChatRepository,
  PresenceManager,
  SseManager,
} from '@acad/chat-service';
import {
  CommentService,
  FeedService,
  PostgresCommunityRepository,
  RedisVoteEngine,
  SpaceService,
  ThreadService,
  VoteFlushWorker,
  VoteService,
  ZeroHopStorageService,
} from '@acad/community-service';
import { ModerationService, PostgresModerationRepository } from '@acad/moderation-service';
import type { Application } from 'express';
import { Redis } from 'ioredis';
import pg from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/acad_dev?sslmode=disable';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const JWT_SECRET =
  process.env.JWT_SECRET ||
  'acad_super_secure_jwt_hmac_secret_key_change_me_in_production_32chars!';

describe('Real PostgreSQL 16 + Redis 7 Integration Tests (Subsystems 1-5)', () => {
  let pool: pg.Pool;
  let redis: Redis;
  let app: Application;
  let flushWorker: VoteFlushWorker;
  let sseManager: SseManager;

  const suffix = `${Date.now().toString(36)}`;
  const createdUserIds: string[] = [];
  const createdSpaceIds: string[] = [];
  const createdThreadIds: string[] = [];
  const createdCommentIds: string[] = [];
  const createdChannelIds: string[] = [];
  const createdRequestIds: string[] = [];
  const createdReportIds: string[] = [];
  const createdRedisTargets: string[] = [];

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 10 });
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true });
    await redis.connect();

    const userRepo = new PostgresUserRepository(pool);
    const sessionStore = new RedisSessionStore(redis);
    const authService = new AuthService(userRepo, sessionStore, JWT_SECRET);

    const communityRepo = new PostgresCommunityRepository(pool);
    const voteEngine = new RedisVoteEngine(redis);
    const spaceService = new SpaceService(communityRepo);
    const threadService = new ThreadService(communityRepo, voteEngine);
    const commentService = new CommentService(communityRepo);
    const storageService = new ZeroHopStorageService();
    const voteService = new VoteService(communityRepo, voteEngine);
    const feedService = new FeedService(communityRepo, voteEngine);
    flushWorker = new VoteFlushWorker(voteEngine, communityRepo, { intervalMs: 60000 });

    const chatRepo = new PostgresChatRepository(pool);
    const presenceManager = new PresenceManager(redis);
    sseManager = new SseManager({ heartbeatIntervalMs: 60000 });
    const chatService = new ChatService(chatRepo, sseManager, presenceManager);

    const modRepo = new PostgresModerationRepository(pool);
    const moderationService = new ModerationService(modRepo, sessionStore);

    app = createApp({
      authService,
      communityServices: {
        spaceService,
        threadService,
        commentService,
        storageService,
        voteService,
        feedService,
        flushWorker,
      },
      chatServices: {
        chatService,
        presenceManager,
        sseManager,
      },
      moderationService,
      jwtSecret: JWT_SECRET,
      pool,
      redis,
      disableRateLimit: true,
    });
  });

  afterAll(async () => {
    try {
      if (createdReportIds.length > 0) {
        await pool.query('DELETE FROM reports WHERE id = ANY($1::uuid[])', [createdReportIds]);
      }
      if (createdChannelIds.length > 0) {
        await pool.query('DELETE FROM chat_messages WHERE channel_id = ANY($1::uuid[])', [
          createdChannelIds,
        ]);
        await pool.query('DELETE FROM chat_members WHERE channel_id = ANY($1::uuid[])', [
          createdChannelIds,
        ]);
        await pool.query('DELETE FROM chat_channels WHERE id = ANY($1::uuid[])', [
          createdChannelIds,
        ]);
      }
      if (createdRequestIds.length > 0) {
        await pool.query('DELETE FROM chat_requests WHERE id = ANY($1::uuid[])', [
          createdRequestIds,
        ]);
      }
      if (createdCommentIds.length > 0) {
        await pool.query('DELETE FROM comment_votes WHERE comment_id = ANY($1::uuid[])', [
          createdCommentIds,
        ]);
      }
      if (createdThreadIds.length > 0) {
        await pool.query('DELETE FROM comments WHERE thread_id = ANY($1::uuid[])', [
          createdThreadIds,
        ]);
        await pool.query('DELETE FROM thread_votes WHERE thread_id = ANY($1::uuid[])', [
          createdThreadIds,
        ]);
        await pool.query('DELETE FROM user_saved_threads WHERE thread_id = ANY($1::uuid[])', [
          createdThreadIds,
        ]);
        await pool.query('DELETE FROM thread_counters WHERE thread_id = ANY($1::uuid[])', [
          createdThreadIds,
        ]);
        await pool.query('DELETE FROM threads WHERE id = ANY($1::uuid[])', [createdThreadIds]);
      }
      if (createdSpaceIds.length > 0) {
        await pool.query('DELETE FROM space_flairs WHERE space_id = ANY($1::uuid[])', [
          createdSpaceIds,
        ]);
        await pool.query('DELETE FROM space_memberships WHERE space_id = ANY($1::uuid[])', [
          createdSpaceIds,
        ]);
        await pool.query('DELETE FROM spaces WHERE id = ANY($1::uuid[])', [createdSpaceIds]);
      }
      if (createdUserIds.length > 0) {
        await pool.query('DELETE FROM user_sessions WHERE user_id = ANY($1::uuid[])', [
          createdUserIds,
        ]);
        await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [createdUserIds]);
      }
      for (const targetId of createdRedisTargets) {
        await redis.del(`target:${targetId}:counters`, `target:${targetId}:voters`);
        await redis.srem('dirty:votes', targetId);
      }
      for (const uid of createdUserIds) {
        await redis.del(`user_sessions:${uid}`, `presence:${uid}`);
      }
    } finally {
      await redis.quit();
      await pool.end();
    }
  });

  it('1. Auth: đăng nhập seed admin_pro bằng scrypt & kiểm tra Rotation 30s Grace + Reuse Revocation trên Redis thật', async () => {
    const healthRes = await request(app).get('/healthz');
    expect(healthRes.status).toBe(200);
    expect(healthRes.body.services?.database).toBe('ok');
    expect(healthRes.body.services?.redis).toBe('ok');

    // Login tài khoản seed admin_pro / Password123!
    const seedLogin = await request(app).post('/api/v1/auth/login').send({
      identifier: 'admin_pro',
      password: 'Password123!',
    });
    expect(seedLogin.status).toBe(200);
    expect(seedLogin.body.user.username).toBe('admin_pro');
    expect(seedLogin.body.tokens.accessToken).toBeTruthy();

    // Public user profile endpoint (must NOT leak email/passwordHash)
    const pubProfileRes = await request(app).get('/api/v1/auth/users/admin_pro');
    expect(pubProfileRes.status).toBe(200);
    expect(pubProfileRes.body.username).toBe('admin_pro');
    expect(pubProfileRes.body).not.toHaveProperty('email');
    expect(pubProfileRes.body).not.toHaveProperty('passwordHash');

    // Admin endpoints on real Postgres (stats/spaces/threads/reports)
    const adminStatsRes = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${seedLogin.body.tokens.accessToken}`);
    expect(adminStatsRes.status).toBe(200);
    expect(adminStatsRes.body.spacesCount).toBeGreaterThanOrEqual(1);

    const adminSpacesRes = await request(app)
      .get('/api/v1/admin/spaces')
      .set('Authorization', `Bearer ${seedLogin.body.tokens.accessToken}`);
    expect(adminSpacesRes.status).toBe(200);
    expect(Array.isArray(adminSpacesRes.body)).toBe(true);

    const adminThreadsRes = await request(app)
      .get('/api/v1/admin/threads?limit=5')
      .set('Authorization', `Bearer ${seedLogin.body.tokens.accessToken}`);
    expect(adminThreadsRes.status).toBe(200);
    expect(Array.isArray(adminThreadsRes.body.threads)).toBe(true);

    // Register user tạm để test Rotation + Grace + Reuse
    const reg = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `it_auth_${suffix}`,
        email: `it_auth_${suffix}@acad.vn`,
        password: 'Password123!',
      });
    expect(reg.status).toBe(201);
    createdUserIds.push(reg.body.user.id);

    const token1 = reg.body.tokens.refreshToken as string;

    // Lần xoay 1: token1 -> token2
    const rot1 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: token1 });
    expect(rot1.status).toBe(200);
    const token2 = rot1.body.refreshToken as string;
    expect(token2).toBeTruthy();
    expect(token2).not.toBe(token1);

    // Grace period 30s: dùng lại token1 trong cửa sổ 30s vẫn hợp lệ
    const graceRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: token1 });
    expect(graceRes.status).toBe(200);

    // Lần xoay 2: token2 -> token3 (token1 bị đẩy khỏi previousTokenHash)
    const rot2 = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: token2 });
    expect(rot2.status).toBe(200);
    const token3 = rot2.body.refreshToken as string;
    expect(token3).toBeTruthy();

    // Tái sử dụng token1 cũ bị xem là đánh cắp -> trả 401 & thu hồi session (token3 cũng vô hiệu)
    const reuseRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: token1 });
    expect(reuseRes.status).toBe(401);

    const postRevoke = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: token3 });
    expect(postRevoke.status).toBe(401);
  });

  it('2. Community, Triggers, Private Space RBAC (incident-vault) & ltree Depth 8/9 Capped Flat Reply', async () => {
    const regA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `it_comm_a_${suffix}`,
        email: `it_comm_a_${suffix}@acad.vn`,
        password: 'Password123!',
      });
    const regB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `it_comm_b_${suffix}`,
        email: `it_comm_b_${suffix}@acad.vn`,
        password: 'Password123!',
      });
    expect(regA.status).toBe(201);
    expect(regB.status).toBe(201);
    createdUserIds.push(regA.body.user.id, regB.body.user.id);

    const tokenA = regA.body.tokens.accessToken as string;
    const tokenB = regB.body.tokens.accessToken as string;

    // A không phải thành viên của private space seed incident-vault -> phải bị chặn 403 trên content endpoints
    const privFeedRes = await request(app)
      .get('/api/v1/spaces/incident-vault/threads')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(privFeedRes.status).toBe(403);

    const privPostRes = await request(app)
      .post('/api/v1/spaces/incident-vault/threads')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ title: 'Unauthorized attempt into incident vault', contentText: 'nope' });
    expect(privPostRes.status).toBe(403);

    const privJoinRes = await request(app)
      .post('/api/v1/spaces/incident-vault/join')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(privJoinRes.status).toBe(403);

    const privThreadDetailRes = await request(app)
      .get('/api/v1/threads/post-mortem-p1-ro-ri-bo-nho-nodejs-sse-socket-leak')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(privThreadDetailRes.status).toBe(403);

    // Popular feed không bao giờ rò rỉ bài từ Private Space
    const popularRes = await request(app).get('/api/v1/feed/popular?limit=50');
    expect(popularRes.status).toBe(200);
    const leaked = (popularRes.body.items as Array<{ spaceSlug: string }>).some(
      (item) => item.spaceSlug === 'incident-vault',
    );
    expect(leaked).toBe(false);

    // Devops-arch seed iconUrl & flair filtering hoạt động thật
    const spaceMeta = await request(app).get('/api/v1/spaces/devops-arch');
    expect(spaceMeta.status).toBe(200);
    expect(spaceMeta.body.iconUrl).toBeTruthy();

    const flairsRes = await request(app).get('/api/v1/spaces/devops-arch/flairs');
    expect(flairsRes.status).toBe(200);
    expect(flairsRes.body.flairs.length).toBeGreaterThan(0);
    expect(flairsRes.body.flairs[0]).toHaveProperty('slug');
    expect(flairsRes.body.flairs[0]).toHaveProperty('backgroundHex');

    // Tạo Space public tạm thời để test trigger đếm không trùng (member_count, thread_count, comment_count)
    const slug = `it-space-${suffix}`;
    const createSpaceRes = await request(app)
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: `IT Space ${suffix}`, slug, description: 'Integration test space' });
    expect(createSpaceRes.status).toBe(201);
    const spaceId = createSpaceRes.body.id as string;
    createdSpaceIds.push(spaceId);
    expect(createSpaceRes.body.membersCount).toBe(1);

    // B join -> member_count phải = 2 (không phải 3 do double count)
    await request(app)
      .post(`/api/v1/spaces/${slug}/join`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    const afterJoinSpace = await pool.query('SELECT member_count FROM spaces WHERE id = $1', [
      spaceId,
    ]);
    expect(afterJoinSpace.rows[0]?.member_count).toBe(2);

    // B leave qua DELETE alias -> member_count về 1
    await request(app)
      .delete(`/api/v1/spaces/${slug}/leave`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    const afterLeaveSpace = await pool.query('SELECT member_count FROM spaces WHERE id = $1', [
      spaceId,
    ]);
    expect(afterLeaveSpace.rows[0]?.member_count).toBe(1);

    // Tạo thread + kiểm tra thread_count = 1
    const createThreadRes = await request(app)
      .post(`/api/v1/spaces/${slug}/threads`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: `Integration ltree thread ${suffix}`,
        contentText: 'Nội dung chi tiết cho integration test PostgreSQL 16 ltree.',
      });
    expect(createThreadRes.status).toBe(201);
    const threadId = createThreadRes.body.id as string;
    createdThreadIds.push(threadId);
    createdRedisTargets.push(threadId);

    const spaceThreadCnt = await pool.query('SELECT thread_count FROM spaces WHERE id = $1', [
      spaceId,
    ]);
    expect(spaceThreadCnt.rows[0]?.thread_count).toBe(1);

    // Tạo chuỗi bình luận ltree từ Depth 1 đến Depth 8, rồi trả lời Depth 9 (bị Capped ở Depth 8)
    let parentId: string | undefined;
    let level8Id = '';
    let level8Path = '';

    for (let depth = 1; depth <= 8; depth += 1) {
      const cRes = await request(app)
        .post(`/api/v1/threads/${threadId}/comments`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          content: `Nested depth ${depth}`,
          ...(parentId ? { parentId, parentAuthorUsername: regA.body.user.username } : {}),
        });
      expect(cRes.status).toBe(201);
      expect(cRes.body.depth).toBe(depth);
      createdCommentIds.push(cRes.body.id);
      parentId = cRes.body.id;
      if (depth === 8) {
        level8Id = cRes.body.id;
        level8Path = cRes.body.path;
      }
    }

    const level9Res = await request(app)
      .post(`/api/v1/threads/${threadId}/comments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        content: 'Reply at depth 9 should flatten at depth 8',
        parentId: level8Id,
        parentAuthorUsername: regA.body.user.username,
      });
    expect(level9Res.status).toBe(201);
    createdCommentIds.push(level9Res.body.id);
    expect(level9Res.body.depth).toBe(8);
    expect(level9Res.body.path).toBe(level8Path);
    expect(level9Res.body.isCappedAtMaxDepth).toBe(true);
    expect(level9Res.body.contentAst.text).toContain(`@${regA.body.user.username}`);

    // Soft-delete node level 9
    await request(app)
      .delete(`/api/v1/comments/${level9Res.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    // Kiểm tra cây bình luận từ PostgreSQL ltree
    const commentsTreeRes = await request(app)
      .get(`/api/v1/threads/${threadId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(commentsTreeRes.status).toBe(200);
    expect(commentsTreeRes.body.totalCount).toBe(9);
    expect(commentsTreeRes.body.items[0]?.totalDescendantsCount).toBe(8);
    const level8Node = commentsTreeRes.body.items.find((c: { id: string }) => c.id === level8Id);
    expect(level8Node?.directRepliesCount).toBe(1);
    const softDeletedNode = commentsTreeRes.body.items.find(
      (c: { id: string }) => c.id === level9Res.body.id,
    );
    expect(softDeletedNode?.isDeleted).toBe(true);

    // Kiểm tra comment_count trigger = 8 (9 nút ltree trong đó 1 nút đã soft-delete is_deleted = TRUE)
    const threadCountersRow = await pool.query(
      'SELECT comment_count FROM thread_counters WHERE thread_id = $1',
      [threadId],
    );
    expect(threadCountersRow.rows[0]?.comment_count).toBe(8);
    const threadRow = await pool.query('SELECT comment_count FROM threads WHERE id = $1', [
      threadId,
    ]);
    expect(threadRow.rows[0]?.comment_count).toBe(8);
  });

  it('3. Atomic Vote FSM + Redis Lua + VoteFlushWorker + Karma DB Trigger + UserVote Reload Persistence', async () => {
    const regAuthor = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `it_author_${suffix}`,
        email: `it_author_${suffix}@acad.vn`,
        password: 'Password123!',
      });
    const regVoter = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `it_voter_${suffix}`,
        email: `it_voter_${suffix}@acad.vn`,
        password: 'Password123!',
      });
    expect(regAuthor.status).toBe(201);
    expect(regVoter.status).toBe(201);
    createdUserIds.push(regAuthor.body.user.id, regVoter.body.user.id);

    const authorToken = regAuthor.body.tokens.accessToken as string;
    const voterToken = regVoter.body.tokens.accessToken as string;

    const spaceSlug = `it-vote-${suffix}`;
    const spaceRes = await request(app)
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ name: 'Vote Space', slug: spaceSlug });
    expect(spaceRes.status).toBe(201);
    createdSpaceIds.push(spaceRes.body.id);

    const threadRes = await request(app)
      .post(`/api/v1/spaces/${spaceSlug}/threads`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({
        title: `Atomic Redis Vote Thread ${suffix}`,
        contentText: 'Kiểm thử Vote FSM toggle + flip + VoteFlushWorker + Karma DB trigger.',
      });
    expect(threadRes.status).toBe(201);
    const threadId = threadRes.body.id as string;
    createdThreadIds.push(threadId);
    createdRedisTargets.push(threadId);

    // Vote 1: Upvote (+1)
    const v1 = await request(app)
      .post(`/api/v1/threads/${threadId}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ direction: 1 });
    expect(v1.status).toBe(200);
    expect(v1.body.userVote).toBe(1);
    expect(v1.body.upvotes).toBe(1);
    expect(v1.body.netScore).toBe(1);

    // Vote 2: Bấm Upvote lần 2 -> Toggle về 0
    const v2 = await request(app)
      .post(`/api/v1/threads/${threadId}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ direction: 1 });
    expect(v2.status).toBe(200);
    expect(v2.body.userVote).toBe(0);
    expect(v2.body.upvotes).toBe(0);
    expect(v2.body.netScore).toBe(0);

    // Vote 3: Downvote (-1) rồi kiểm tra reload GET /threads/:id trả về đúng userVote = -1
    const v3 = await request(app)
      .post(`/api/v1/threads/${threadId}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ direction: -1 });
    expect(v3.status).toBe(200);
    expect(v3.body.userVote).toBe(-1);
    expect(v3.body.downvotes).toBe(1);
    expect(v3.body.netScore).toBe(-1);

    // Flip từ Downvote (-1) sang Upvote (+1) -> netScore = 1, author karma phải tăng đúng thành +1 (không double-count!)
    const v4 = await request(app)
      .post(`/api/v1/threads/${threadId}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ direction: 1 });
    expect(v4.status).toBe(200);
    expect(v4.body.userVote).toBe(1);
    expect(v4.body.upvotes).toBe(1);
    expect(v4.body.downvotes).toBe(0);
    expect(v4.body.netScore).toBe(1);

    // F5 Reload bài viết và kiểm tra comment vote persistence
    const cRes = await request(app)
      .post(`/api/v1/threads/${threadId}/comments`)
      .set('Authorization', `Bearer ${authorToken}`)
      .send({ content: 'Bình luận kiểm thử vote' });
    expect(cRes.status).toBe(201);
    createdCommentIds.push(cRes.body.id);
    createdRedisTargets.push(cRes.body.id);

    await request(app)
      .post(`/api/v1/comments/${cRes.body.id}/vote`)
      .set('Authorization', `Bearer ${voterToken}`)
      .send({ direction: -1 })
      .expect(200);

    const detailReload = await request(app)
      .get(`/api/v1/threads/${threadId}`)
      .set('Authorization', `Bearer ${voterToken}`);
    expect(detailReload.status).toBe(200);
    expect(detailReload.body.userVote).toBe(1);

    const commentsReload = await request(app)
      .get(`/api/v1/threads/${threadId}/comments`)
      .set('Authorization', `Bearer ${voterToken}`);
    expect(commentsReload.status).toBe(200);
    expect(commentsReload.body.items[0]?.userVote).toBe(-1);

    // Chạy VoteFlushWorker thủ công xả Redis -> PostgreSQL thread_counters
    const flushedCount = await flushWorker.flushNow();
    expect(flushedCount).toBeGreaterThanOrEqual(1);

    const dbCounter = await pool.query(
      'SELECT upvotes, downvotes, net_score, hot_score, wilson_score FROM thread_counters WHERE thread_id = $1',
      [threadId],
    );
    expect(dbCounter.rows[0]?.upvotes).toBe(1);
    expect(dbCounter.rows[0]?.downvotes).toBe(0);
    expect(dbCounter.rows[0]?.net_score).toBe(1);
    expect(Number(dbCounter.rows[0]?.wilson_score)).toBeGreaterThan(0);

    // Kiểm tra Karma Author trong DB = +1 (thread +1) + (-1) (comment -1) = 0 (chứng minh trigger DB không bị Service cộng dồn kép)
    const authorRow = await pool.query('SELECT karma_score FROM users WHERE id = $1', [
      regAuthor.body.user.id,
    ]);
    expect(authorRow.rows[0]?.karma_score).toBe(0);

    // Keyset Pagination trên SQL Ranking Feed
    const page1 = await request(app).get('/api/v1/feed/popular?sort=best&limit=2');
    expect(page1.status).toBe(200);
    expect(page1.body.items).toHaveLength(2);
    expect(page1.body.pagination.nextCursor).toBeTruthy();

    const page2 = await request(app).get(
      `/api/v1/feed/popular?sort=best&limit=2&cursor=${page1.body.pagination.nextCursor}`,
    );
    expect(page2.status).toBe(200);
    const page1Ids = new Set((page1.body.items as Array<{ id: string }>).map((i) => i.id));
    for (const item of page2.body.items as Array<{ id: string }>) {
      expect(page1Ids.has(item.id)).toBe(false);
    }
  });

  it('4. Chat BLOCKED 403 + SSE Socket Cleanup + Duplicate Report 409 + Immutable audit_logs DB Trigger', async () => {
    const regU1 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `it_chat1_${suffix}`,
        email: `it_chat1_${suffix}@acad.vn`,
        password: 'Password123!',
      });
    const regU2 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `it_chat2_${suffix}`,
        email: `it_chat2_${suffix}@acad.vn`,
        password: 'Password123!',
      });
    expect(regU1.status).toBe(201);
    expect(regU2.status).toBe(201);
    createdUserIds.push(regU1.body.user.id, regU2.body.user.id);

    const token1 = regU1.body.tokens.accessToken as string;
    const token2 = regU2.body.tokens.accessToken as string;

    // U1 gửi yêu cầu chat tới U2 -> PENDING request
    const reqInit = await request(app)
      .post('/api/v1/chat/channels/direct')
      .set('Authorization', `Bearer ${token1}`)
      .send({ recipientId: regU2.body.user.id, initialMessage: 'Xin chào U2' });
    expect(reqInit.status).toBe(201);
    expect(reqInit.body.isRequest).toBe(true);
    const reqId = reqInit.body.request.id as string;
    createdRequestIds.push(reqId);

    // U2 BLOCK yêu cầu của U1 -> lần sau U1 cố gửi lại phải nhận 403 UserBlockedError
    const blockRes = await request(app)
      .patch(`/api/v1/chat/requests/${reqId}`)
      .set('Authorization', `Bearer ${token2}`)
      .send({ status: 'BLOCKED' });
    expect(blockRes.status).toBe(200);

    const blockedRetry = await request(app)
      .post('/api/v1/chat/channels/direct')
      .set('Authorization', `Bearer ${token1}`)
      .send({ recipientId: regU2.body.user.id, initialMessage: 'Cố gửi lại sau khi bị chặn' });
    expect(blockedRetry.status).toBe(403);

    // Kiểm tra SSE Manager dọn dẹp socket đóng/chết (req.close / writableEnded) chống FD leak
    const fakeReq = new EventEmitter();
    const fakeRes = Object.assign(new EventEmitter(), {
      writeHead: () => fakeRes,
      write: () => true,
      writableEnded: false,
      destroyed: false,
    });
    sseManager.registerClient(
      regU1.body.user.id,
      fakeRes as unknown as ServerResponse,
      fakeReq as never,
    );
    expect(sseManager.isUserConnected(regU1.body.user.id)).toBe(true);
    fakeReq.emit('close');
    expect(sseManager.isUserConnected(regU1.body.user.id)).toBe(false);

    // Kiểm tra Report trùng lặp bắt PG error 23505 -> 409 Conflict RFC 7807
    const targetThreadId = 'd0000000-0000-0000-0000-000000000001';
    const r1 = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        targetType: 'THREAD',
        targetId: targetThreadId,
        reason: 'Integration test violation report check',
      });
    expect(r1.status).toBe(201);
    createdReportIds.push(r1.body.id);

    const r2 = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${token1}`)
      .send({
        targetType: 'THREAD',
        targetId: targetThreadId,
        reason: 'Duplicate pending report should return 409',
      });
    expect(r2.status).toBe(409);

    // Kiểm tra tính bất biến vật lý của bảng audit_logs trong PostgreSQL (trong transaction rollback sạch)
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ins = await client.query(
        `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
         VALUES ('a0000000-0000-0000-0000-000000000001', 'INTEGRATION_TEST', 'SYSTEM', '00000000-0000-0000-0000-000000000000', '{}'::jsonb)
         RETURNING id`,
      );
      const logId = ins.rows[0].id as string;

      await client.query('SAVEPOINT sp_before_update');
      await expect(
        client.query(`UPDATE audit_logs SET action = 'TAMPERED' WHERE id = $1`, [logId]),
      ).rejects.toThrow();
      await client.query('ROLLBACK TO SAVEPOINT sp_before_update');

      await client.query('SAVEPOINT sp_before_delete');
      await expect(client.query(`DELETE FROM audit_logs WHERE id = $1`, [logId])).rejects.toThrow();
      await client.query('ROLLBACK TO SAVEPOINT sp_before_delete');

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
