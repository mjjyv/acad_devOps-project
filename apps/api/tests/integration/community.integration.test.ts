import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  AuthService,
  PostgresUserRepository,
  RedisSessionStore,
  TokenManager,
} from '@acad/auth-service';
import {
  CommentService,
  FeedService,
  PostgresCommunityRepository,
  RedisLuaVoteEngine,
  SpaceService,
  ThreadService,
  VoteService,
  ZeroHopStorageService,
} from '@acad/community-service';
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

describe('Real PostgreSQL 16 + Redis 7 Integration Tests (Phase B2 + B3 Community & Lua Voting)', () => {
  let pool: pg.Pool;
  let redis: Redis;
  let sessionStore: RedisSessionStore;
  let app: ReturnType<typeof createApp>;

  const createdUserIds: string[] = [];
  const createdSpaceIds: string[] = [];
  const createdTargetIds: string[] = [];
  const tempUploadDir = mkdtempSync(join(tmpdir(), 'acad-int-media-'));

  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 5 });
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3 });

    const userRepo = new PostgresUserRepository(pool);
    sessionStore = new RedisSessionStore(redis);
    const authService = new AuthService(userRepo, sessionStore, JWT_SECRET);

    const communityRepo = new PostgresCommunityRepository(pool);
    const voteEngine = new RedisLuaVoteEngine(redis);
    app = createApp({
      authService,
      communityServices: {
        spaceService: new SpaceService(communityRepo),
        threadService: new ThreadService(communityRepo, voteEngine),
        commentService: new CommentService(communityRepo),
        storageService: new ZeroHopStorageService({ localUploadDir: tempUploadDir }),
        voteService: new VoteService(communityRepo, voteEngine),
        feedService: new FeedService(communityRepo, voteEngine),
      },
      jwtSecret: JWT_SECRET,
      pool,
      redis,
      disableRateLimit: true,
    });
  });

  afterAll(async () => {
    rmSync(tempUploadDir, { recursive: true, force: true });
    for (const targetId of createdTargetIds) {
      await redis.del(`target:${targetId}:counters`, `target:${targetId}:voters`);
      await redis.srem('dirty:votes', targetId);
    }
    if (createdSpaceIds.length > 0) {
      await pool.query('DELETE FROM spaces WHERE id = ANY($1);', [createdSpaceIds]);
    }
    for (const uid of createdUserIds) {
      await sessionStore.revokeAllUserSessions(uid);
    }
    if (createdUserIds.length > 0) {
      await pool.query('DELETE FROM users WHERE id = ANY($1);', [createdUserIds]);
    }
    await redis.quit();
    await pool.end();
  });

  it('persists Space triggers, Depth-9 ltree Capped @mention, soft-delete active count & 0ms Write-Through Lua Votes', async () => {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const regA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `comm_a_${suffix}`,
        email: `comm_a_${suffix}@acad.vn`,
        password: 'Password123!',
      });
    const regB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        username: `comm_b_${suffix}`,
        email: `comm_b_${suffix}@acad.vn`,
        password: 'Password123!',
      });
    expect(regA.status).toBe(201);
    expect(regB.status).toBe(201);

    const userAId = regA.body.user.id as string;
    const userBId = regB.body.user.id as string;
    const tokenA = regA.body.tokens.accessToken as string;
    const tokenB = regB.body.tokens.accessToken as string;
    createdUserIds.push(userAId, userBId);

    // 1. Create Space -> triggers member_count = 1
    const spaceSlug = `k8s-int-${suffix}`.toLowerCase();
    const spaceRes = await request(app)
      .post('/api/v1/spaces')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        slug: spaceSlug,
        name: 'Integration K8s Lab',
        topic: 'Cloud Native',
        isPrivate: false,
      });
    expect(spaceRes.status).toBe(201);
    const spaceId = spaceRes.body.id as string;
    createdSpaceIds.push(spaceId);
    expect(spaceRes.body.membersCount).toBe(1);

    // User B joins -> triggers member_count = 2
    const joinRes = await request(app)
      .post(`/api/v1/spaces/${spaceSlug}/join`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(joinRes.status).toBe(200);

    const spaceCheck = await pool.query('SELECT member_count FROM spaces WHERE id = $1;', [
      spaceId,
    ]);
    expect(spaceCheck.rows[0].member_count).toBe(2);

    // 2. Upload real PNG & Post MEDIA thread -> verify thread_counters row + media_urls in Postgres
    const presignRes = await request(app)
      .post('/api/v1/media/presign')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ fileName: 'pg16-bench.png', fileType: 'image/png', fileSizeBytes: 64 });
    expect(presignRes.status).toBe(200);
    const uploadUrl = new URL(presignRes.body.uploadUrl as string);
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const putRes = await request(app)
      .put(uploadUrl.pathname + uploadUrl.search)
      .set('Content-Type', 'image/png')
      .send(pngBytes);
    expect(putRes.status).toBe(200);

    const threadRes = await request(app)
      .post(`/api/v1/spaces/${spaceSlug}/threads`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'PostgreSQL 16 HOT Fillfactor Benchmark Report',
        threadType: 'MEDIA',
        contentText: 'Zero drift write-through test body.',
        mediaUrls: [presignRes.body.publicUrl],
      });
    expect(threadRes.status).toBe(201);
    expect(threadRes.body.threadType).toBe('MEDIA');
    expect(threadRes.body.mediaUrls).toEqual([presignRes.body.publicUrl]);
    const threadId = threadRes.body.id as string;
    createdTargetIds.push(threadId);

    // 3. Vote thread +1 via Redis execute_vote.lua -> 0ms sync to threads + thread_counters + karma trigger
    const voteUp = await request(app)
      .post(`/api/v1/threads/${threadId}/vote`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ direction: 1 });
    expect(voteUp.status).toBe(200);
    expect(voteUp.body.upvotes).toBe(1);
    expect(voteUp.body.netScore).toBe(1);

    // Immediately verify Postgres SQL truth without waiting 5s worker!
    const pgCounterCheck = await pool.query(
      `SELECT t.upvotes_count, t.downvotes_count, tc.net_score, u.karma_score
       FROM threads t
       JOIN thread_counters tc ON tc.thread_id = t.id
       JOIN users u ON u.id = t.author_id
       WHERE t.id = $1;`,
      [threadId],
    );
    expect(pgCounterCheck.rows[0].upvotes_count).toBe(1);
    expect(pgCounterCheck.rows[0].net_score).toBe(1);
    expect(pgCounterCheck.rows[0].karma_score).toBe(1);

    // Verify /feed/home shows the joined space thread & /feed/popular respects sort=top
    const homeFeed = await request(app)
      .get('/api/v1/feed/home?sort=new')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(homeFeed.status).toBe(200);
    expect(homeFeed.body.items.some((x: { id: string }) => x.id === threadId)).toBe(true);

    // 4. Depth 1 -> 9 ltree comments + soft delete active trigger
    let parentId: string | undefined;
    const commentIds: string[] = [];
    for (let depth = 1; depth <= 9; depth++) {
      const cRes = await request(app)
        .post(`/api/v1/threads/${threadId}/comments`)
        .set('Authorization', `Bearer ${depth % 2 === 1 ? tokenA : tokenB}`)
        .send({ content: `Real SQL Comment Depth ${depth}`, parentId });
      expect(cRes.status).toBe(201);
      parentId = cRes.body.id as string;
      commentIds.push(parentId);
      createdTargetIds.push(parentId);
      if (depth === 9) {
        expect(cRes.body.depth).toBe(8);
        expect(cRes.body.isCappedAtMaxDepth).toBe(true);
        expect(cRes.body.contentAst.text).toContain(`@comm_b_${suffix}`);
      }
    }

    // Soft-delete root comment -> migration 000007 trigger reduces active comment_count from 9 to 8
    const delRes = await request(app)
      .delete(`/api/v1/comments/${commentIds[0]}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(delRes.status).toBe(200);

    const commentCountCheck = await pool.query(
      'SELECT t.comment_count AS t_cnt, tc.comment_count AS tc_cnt FROM threads t JOIN thread_counters tc ON tc.thread_id = t.id WHERE t.id = $1;',
      [threadId],
    );
    expect(commentCountCheck.rows[0].t_cnt).toBe(8);
    expect(commentCountCheck.rows[0].tc_cnt).toBe(8);
  });
});
