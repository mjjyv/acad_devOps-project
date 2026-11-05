import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '@acad/auth-service';
import {
  AtomicVoteEngine,
  CommentService,
  FeedService,
  InMemoryCommunityRepository,
  SpaceService,
  ThreadService,
  VoteFlushWorker,
  VoteService,
  ZeroHopStorageService,
} from '@acad/community-service';
import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('Kiểm thử Endpoints Bầu Chọn Nguyên Tử & Bảng Tin Thông Minh (@acad/api-gateway/voting-and-feeds)', () => {
  let app: Application;
  let userRepo: InMemoryUserRepository;
  let sessionStore: InMemorySessionStore;
  let authService: AuthService;
  let communityRepo: InMemoryCommunityRepository;
  let voteEngine: AtomicVoteEngine;
  let voteService: VoteService;
  let feedService: FeedService;
  let spaceService: SpaceService;
  let threadService: ThreadService;
  let commentService: CommentService;
  let storageService: ZeroHopStorageService;
  let flushWorker: VoteFlushWorker;

  const TEST_JWT_SECRET = 'acad-test-super-secret-key-32-chars-long!';

  let _user1Token: string;
  let user2Token: string;
  let spaceId: string;
  let threadId: string;
  let commentId: string;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionStore = new InMemorySessionStore();
    authService = new AuthService(userRepo, sessionStore, TEST_JWT_SECRET);

    communityRepo = new InMemoryCommunityRepository();
    voteEngine = new AtomicVoteEngine();
    voteService = new VoteService(communityRepo, voteEngine);
    feedService = new FeedService(communityRepo, voteEngine);
    spaceService = new SpaceService(communityRepo);
    threadService = new ThreadService(communityRepo);
    commentService = new CommentService(communityRepo);
    storageService = new ZeroHopStorageService();
    flushWorker = new VoteFlushWorker(voteEngine, communityRepo, { intervalMs: 1000 });

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
      jwtSecret: TEST_JWT_SECRET,
    });

    // 1. Tạo 2 tài khoản kiểm thử
    const u1 = await authService.register({
      username: 'vote_creator',
      email: 'creator@acad.vn',
      password: 'StrongPassword123!',
    });
    _user1Token = u1.accessToken;

    const u2 = await authService.register({
      username: 'voter_pro',
      email: 'voter@acad.vn',
      password: 'StrongPassword123!',
    });
    user2Token = u2.accessToken;

    // 2. Tạo Space, Thread và Comment ban đầu
    const space = await spaceService.createSpace(
      { name: 'Redis Architecture', slug: 'redis-arch', isPrivate: false },
      u1.user.id,
    );
    spaceId = space.id;

    const thread = await threadService.createThread(
      {
        spaceId,
        title: 'Hiệu năng Redis Lua trong xử lý biểu quyết nguyên tử',
        contentText: 'Chi tiết thuật toán O(1)...',
      },
      u1.user.id,
    );
    threadId = thread.id;

    const comment = await commentService.createComment({
      threadId,
      authorId: u1.user.id,
      content: 'Bình luận thử nghiệm đầu tiên',
    });
    commentId = comment.id;
  });

  describe('1. Biểu Quyết Bài Viết (POST /threads/:id/vote)', () => {
    it('Phải từ chối biểu quyết nếu không có Authorization Bearer Token (HTTP 401)', async () => {
      const res = await request(app).post(`/threads/${threadId}/vote`).send({ direction: 1 });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('type');
    });

    it('Phải biểu quyết Upvote (+1) thành công (HTTP 200 OK)', async () => {
      const res = await request(app)
        .post(`/threads/${threadId}/vote`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ direction: 1 });

      expect(res.status).toBe(200);
      expect(res.body.targetId).toBe(threadId);
      expect(res.body.userVote).toBe(1);
      expect(res.body.upvotes).toBe(1);
      expect(res.body.netScore).toBe(1);
      expect(res.body.delta).toBe(1);
    });

    it('Phải hủy vote (Unvote -> 0) khi người dùng bấm lại nút cùng chiều (HTTP 200 OK)', async () => {
      // Vote lần 1 (+1)
      await request(app)
        .post(`/threads/${threadId}/vote`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ direction: 1 });

      // Bấm lại (+1) -> Unvote
      const res = await request(app)
        .post(`/threads/${threadId}/vote`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ direction: 1 });

      expect(res.status).toBe(200);
      expect(res.body.userVote).toBe(0);
      expect(res.body.upvotes).toBe(0);
      expect(res.body.netScore).toBe(0);
    });

    it('Phải đảo chiều vote (-1 sang +1) với delta = +2 (HTTP 200 OK)', async () => {
      // Vote lần 1 (-1)
      await request(app)
        .post(`/threads/${threadId}/vote`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ direction: -1 });

      // Đảo sang (+1)
      const res = await request(app)
        .post(`/threads/${threadId}/vote`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ direction: 1 });

      expect(res.status).toBe(200);
      expect(res.body.userVote).toBe(1);
      expect(res.body.upvotes).toBe(1);
      expect(res.body.downvotes).toBe(0);
      expect(res.body.netScore).toBe(1);
      expect(res.body.delta).toBe(2);
    });

    it('Phải trả về 404 RFC 7807 khi vote cho Thread không tồn tại', async () => {
      const res = await request(app)
        .post('/threads/99999999-9999-9999-9999-999999999999/vote')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ direction: 1 });

      expect(res.status).toBe(404);
      expect(res.body.type).toContain('not-found');
    });
  });

  describe('2. Biểu Quyết Bình Luận (POST /comments/:id/vote)', () => {
    it('Phải biểu quyết bình luận thành công (HTTP 200 OK)', async () => {
      const res = await request(app)
        .post(`/comments/${commentId}/vote`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ direction: 1 });

      expect(res.status).toBe(200);
      expect(res.body.targetId).toBe(commentId);
      expect(res.body.userVote).toBe(1);
      expect(res.body.netScore).toBe(1);
    });
  });

  describe('3. Đánh Dấu Lưu Trữ Bài Viết (POST /threads/:id/save & GET /users/me/saved)', () => {
    it('Phải cho phép lưu bài viết và truy vấn danh sách đã lưu (HTTP 200 OK)', async () => {
      // 1. Lưu bài viết
      const saveRes = await request(app)
        .post(`/threads/${threadId}/save`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.isSaved).toBe(true);

      // 2. Lấy danh sách đã lưu
      const listRes = await request(app)
        .get('/users/me/saved')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.items).toHaveLength(1);
      expect(listRes.body.items[0].id).toBe(threadId);

      // 3. Bỏ lưu bài viết (Toggle off)
      const unsaveRes = await request(app)
        .post(`/threads/${threadId}/save`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(unsaveRes.status).toBe(200);
      expect(unsaveRes.body.isSaved).toBe(false);
    });
  });

  describe('4. Bảng Tin Thịnh Hành & Trang Chủ (Feeds & Keyset Cursor)', () => {
    it('Phải truy vấn Popular Feed kèm phân trang con trỏ (HTTP 200 OK)', async () => {
      // Tạo thêm 3 bài viết
      for (let i = 1; i <= 3; i++) {
        await threadService.createThread(
          {
            spaceId,
            title: `Thread Feed Index ${i}`,
            contentText: `Nội dung ${i}`,
          },
          'creator-uuid',
        );
      }

      const res = await request(app).get('/feed/popular?limit=2&sort=new');
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.pagination.hasMore).toBe(true);
      expect(res.body.pagination.nextCursor).toBeTruthy();

      // Truy vấn trang tiếp theo
      const page2 = await request(app).get(
        `/feed/popular?limit=2&sort=new&cursor=${res.body.pagination.nextCursor}`,
      );
      expect(page2.status).toBe(200);
      expect(page2.body.items).toHaveLength(2);
    });

    it('Phải hỗ trợ sắp xếp Hot, Top, Best trên Feeds', async () => {
      const hotRes = await request(app).get('/feed/popular?sort=hot');
      expect(hotRes.status).toBe(200);

      const topRes = await request(app).get('/feed/popular?sort=top&time=day');
      expect(topRes.status).toBe(200);

      const bestRes = await request(app).get('/feed/popular?sort=best');
      expect(bestRes.status).toBe(200);
    });

    it('Home Feed phải trả về bài viết từ Spaces mà người dùng đã tham gia', async () => {
      // User 2 tham gia space
      await spaceService.joinSpace(spaceId, 'user2-id');

      const homeRes = await request(app)
        .get('/feed/home')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(homeRes.status).toBe(200);
      expect(homeRes.body.items.length).toBeGreaterThan(0);
    });
  });
});
