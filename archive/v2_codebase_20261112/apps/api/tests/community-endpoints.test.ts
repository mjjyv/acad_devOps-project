import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '@acad/auth-service';
import {
  CommentService,
  InMemoryCommunityRepository,
  SpaceService,
  ThreadService,
  ZeroHopStorageService,
} from '@acad/community-service';
import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('Kiểm thử Endpoints Không Gian Thảo Luận & Nội Dung (@acad/api-gateway/community)', () => {
  let userRepo: InMemoryUserRepository;
  let sessionStore: InMemorySessionStore;
  let authService: AuthService;

  let communityRepo: InMemoryCommunityRepository;
  let spaceService: SpaceService;
  let threadService: ThreadService;
  let commentService: CommentService;
  let storageService: ZeroHopStorageService;

  let app: Application;
  let user1Token: string;
  let user2Token: string;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionStore = new InMemorySessionStore();
    authService = new AuthService(userRepo, sessionStore);

    communityRepo = new InMemoryCommunityRepository();
    spaceService = new SpaceService(communityRepo);
    threadService = new ThreadService(communityRepo);
    commentService = new CommentService(communityRepo);
    storageService = new ZeroHopStorageService();

    app = createApp({
      authService,
      communityServices: {
        spaceService,
        threadService,
        commentService,
        storageService,
      },
    });

    // Tạo 2 users phục vụ kiểm thử
    const u1 = await authService.register({
      username: 'creator_user',
      email: 'creator@acad.vn',
      password: 'Password123!',
    });
    user1Token = u1.accessToken;

    const u2 = await authService.register({
      username: 'member_user',
      email: 'member@acad.vn',
      password: 'Password123!',
    });
    user2Token = u2.accessToken;
  });

  describe('1. Không Gian Thảo Luận (Spaces)', () => {
    it('Phải từ chối tạo Space nếu không có Bearer Token (HTTP 401)', async () => {
      const res = await request(app).post('/spaces').send({
        name: 'No Auth Space',
        slug: 'no-auth',
      });
      expect(res.status).toBe(401);
    });

    it('Phải tạo Space thành công (HTTP 201) và tự động gán vai trò CREATOR', async () => {
      const res = await request(app)
        .post('/spaces')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Kiến Trúc Hệ Thống',
          slug: 'system-architecture',
          description: 'Thảo luận Microservices và Phân tán',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.slug).toBe('system-architecture');
      expect(res.body.membersCount).toBe(1);
      expect(res.body.myRole).toBe('CREATOR');
    });

    it('Phải từ chối tạo Space trùng Slug với mã 409 Conflict RFC 7807', async () => {
      await request(app).post('/spaces').set('Authorization', `Bearer ${user1Token}`).send({
        name: 'Space A',
        slug: 'duplicate-slug',
      });

      const duplicateRes = await request(app)
        .post('/spaces')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Space B',
          slug: 'duplicate-slug',
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.headers['content-type']).toContain('application/problem+json');
      expect(duplicateRes.body).toHaveProperty('type', 'https://api.acad.vn/errors/conflict');
    });

    it('Phải cho phép lấy danh sách Spaces và truy vấn chi tiết theo Slug', async () => {
      await request(app).post('/spaces').set('Authorization', `Bearer ${user1Token}`).send({
        name: 'DevOps Vietnam',
        slug: 'devops-vn',
      });

      const listRes = await request(app).get('/spaces');
      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveProperty('spaces');
      expect(listRes.body.spaces.length).toBeGreaterThan(0);

      const detailRes = await request(app).get('/spaces/devops-vn');
      expect(detailRes.status).toBe(200);
      expect(detailRes.body.slug).toBe('devops-vn');
    });

    it('Phải cho phép tham gia và rời khỏi không gian thảo luận', async () => {
      await request(app).post('/spaces').set('Authorization', `Bearer ${user1Token}`).send({
        name: 'Golang Club',
        slug: 'golang-club',
      });

      // User 2 tham gia
      const joinRes = await request(app)
        .post('/spaces/golang-club/join')
        .set('Authorization', `Bearer ${user2Token}`);
      expect(joinRes.status).toBe(200);

      // User 2 rời đi
      const leaveRes = await request(app)
        .post('/spaces/golang-club/leave')
        .set('Authorization', `Bearer ${user2Token}`);
      expect(leaveRes.status).toBe(200);
    });

    it('Phải bảo vệ Flairs: Chỉ Creator/Mod mới có quyền tạo (403 Forbidden nếu là Member)', async () => {
      await request(app).post('/spaces').set('Authorization', `Bearer ${user1Token}`).send({
        name: 'Security Hub',
        slug: 'security-hub',
      });

      // User 1 (Creator) tạo Flair -> 201 Created
      const flairRes = await request(app)
        .post('/spaces/security-hub/flairs')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Critical CVE',
          slug: 'critical-cve',
          colorHex: '#FF0000',
          backgroundHex: '#000000',
        });
      expect(flairRes.status).toBe(201);
      expect(flairRes.body.name).toBe('Critical CVE');

      // User 2 tham gia làm Member thường -> Cố tình tạo Flair -> 403 Forbidden
      await request(app)
        .post('/spaces/security-hub/join')
        .set('Authorization', `Bearer ${user2Token}`);

      const forbiddenRes = await request(app)
        .post('/spaces/security-hub/flairs')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'Discussion',
          slug: 'discussion',
          colorHex: '#00FF00',
          backgroundHex: '#000000',
        });
      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.headers['content-type']).toContain('application/problem+json');
    });
  });

  describe('2. Quản Trị Bài Viết (Threads)', () => {
    beforeEach(async () => {
      await request(app).post('/spaces').set('Authorization', `Bearer ${user1Token}`).send({
        name: 'PostgreSQL Vietnam',
        slug: 'postgres-vn',
      });
    });

    it('Phải đăng bài viết mới thành công (HTTP 201 Created) kèm slug thân thiện SEO', async () => {
      const res = await request(app)
        .post('/spaces/postgres-vn/threads')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Chiến lược đánh chỉ mục ltree GiST trong cơ sở dữ liệu lớn',
          contentText: 'Phân tích chi tiết về thuật toán GiST và Base36...',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.slug).toMatch(/^chien-luoc-danh-chi-muc-ltree-gist.*-[a-f0-9]{8}$/);
      expect(res.body.title).toContain('Chiến lược đánh chỉ mục');
    });

    it('Phải tìm kiếm bài viết trong không gian qua từ khóa (In-Space Search)', async () => {
      await request(app)
        .post('/spaces/postgres-vn/threads')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          title: 'Tối ưu hóa bộ nhớ RAM với pgbouncer',
        });

      const searchRes = await request(app).get('/spaces/postgres-vn/search?q=pgbouncer');
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.threads.length).toBe(1);
      expect(searchRes.body.threads[0].title).toContain('pgbouncer');
    });
  });

  describe('3. Cây Bình Luận ltree & Capped Depth (Comments)', () => {
    let threadId: string;

    beforeEach(async () => {
      await request(app)
        .post('/spaces')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ name: 'Linux', slug: 'linux' });

      const t = await request(app)
        .post('/spaces/linux/threads')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ title: 'Thảo luận về Rust trong Linux Kernel' });

      threadId = t.body.id;
    });

    it('Phải tạo bình luận gốc và bình luận con phản hồi lồng nhau', async () => {
      // 1. Tạo Root
      const rootRes = await request(app)
        .post(`/threads/${threadId}/comments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Bình luận gốc cấp 1',
        });

      expect(rootRes.status).toBe(201);
      expect(rootRes.body.depth).toBe(1);
      expect(rootRes.body.path).toBe('0000');
      const rootId = rootRes.body.id;

      // 2. Tạo Reply
      const childRes = await request(app)
        .post(`/threads/${threadId}/comments`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          content: 'Phản hồi cấp 2',
          parentId: rootId,
          parentAuthorUsername: 'creator_user',
        });

      expect(childRes.status).toBe(201);
      expect(childRes.body.depth).toBe(2);
      expect(childRes.body.path).toBe('0000.0000');

      // 3. Lấy toàn bộ cây bình luận
      const treeRes = await request(app).get(`/threads/${threadId}/comments`);
      expect(treeRes.status).toBe(200);
      expect(treeRes.body.totalCount).toBe(2);
      expect(treeRes.body.items[0].path).toBe('0000');
      expect(treeRes.body.items[1].path).toBe('0000.0000');
    });

    it('Phải xóa mềm bình luận (Soft Delete)', async () => {
      const root = await request(app)
        .post(`/threads/${threadId}/comments`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ content: 'Bình luận cần xóa' });

      const delRes = await request(app)
        .delete(`/comments/${root.body.id}`)
        .set('Authorization', `Bearer ${user1Token}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.message).toContain('thành công');

      const treeRes = await request(app).get(`/threads/${threadId}/comments`);
      expect(treeRes.body.items[0].isDeleted).toBe(true);
      expect(treeRes.body.items[0].contentAst.text).toContain('đã bị xóa');
    });
  });

  describe('4. Zero-Hop Media Storage (Presigned URL)', () => {
    it('Phải cấp phát Presigned PUT URL thành công (HTTP 200 OK)', async () => {
      const res = await request(app)
        .post('/media/presigned-url')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          fileName: 'system_diagram.png',
          fileType: 'image/png',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('uploadUrl');
      expect(res.body).toHaveProperty('publicUrl');
      expect(res.body).toHaveProperty('key');
      expect(res.body).toHaveProperty('expiresIn', 300);
    });
  });
});
