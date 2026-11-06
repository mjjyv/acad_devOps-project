import { randomUUID } from 'node:crypto';
import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '@acad/auth-service';
import { InMemoryModerationRepository, ModerationService } from '@acad/moderation-service';
import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('Kiểm thử Endpoints Phân Hệ Kiểm Duyệt & Quản Trị Hệ Thống (@acad/api-gateway/admin & reports)', () => {
  let app: Application;
  let userRepo: InMemoryUserRepository;
  let sessionStore: InMemorySessionStore;
  let authService: AuthService;
  let modRepo: InMemoryModerationRepository;
  let moderationService: ModerationService;

  const TEST_JWT_SECRET = 'acad-test-super-secret-key-32-chars-long!';

  let adminToken: string;
  let adminId: string;
  let userToken: string;
  let userId: string;
  let targetUserId: string;

  const sampleThreadId = randomUUID();
  const sampleSpaceId = randomUUID();

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionStore = new InMemorySessionStore();
    authService = new AuthService(userRepo, sessionStore, TEST_JWT_SECRET);

    modRepo = new InMemoryModerationRepository();
    moderationService = new ModerationService(modRepo, sessionStore);

    app = createApp({
      authService,
      moderationService,
      jwtSecret: TEST_JWT_SECRET,
    });

    // 1. Tạo tài khoản Admin
    const adminReg = await authService.register({
      username: 'root_admin',
      email: 'admin@acad.vn',
      password: 'AdminPassword123!',
    });
    adminId = adminReg.user.id;
    // Nâng cấp quyền ADMIN trong user repo
    await userRepo.updateRole(adminId, 'ADMIN');
    // Login lại để lấy token có role ADMIN
    const adminLogin = await authService.login({
      identifier: 'admin@acad.vn',
      password: 'AdminPassword123!',
    });
    adminToken = adminLogin.accessToken;

    // 2. Tạo tài khoản User thông thường
    const userReg = await authService.register({
      username: 'normal_user',
      email: 'user@acad.vn',
      password: 'UserPassword123!',
    });
    userId = userReg.user.id;
    userToken = userReg.accessToken;

    // 3. Tạo tài khoản mục tiêu (để test đổi role, status)
    const targetReg = await authService.register({
      username: 'bad_user',
      email: 'bad@acad.vn',
      password: 'BadPassword123!',
    });
    targetUserId = targetReg.user.id;

    // Đồng bộ user vào modRepo
    modRepo.seedUser({
      id: adminId,
      username: 'root_admin',
      email: 'admin@acad.vn',
      role: 'ADMIN',
      status: 'ACTIVE',
      karmaScore: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    modRepo.seedUser({
      id: userId,
      username: 'normal_user',
      email: 'user@acad.vn',
      role: 'USER',
      status: 'ACTIVE',
      karmaScore: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    modRepo.seedUser({
      id: targetUserId,
      username: 'bad_user',
      email: 'bad@acad.vn',
      role: 'USER',
      status: 'ACTIVE',
      karmaScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed space và thread
    modRepo.seedSpace({
      id: sampleSpaceId,
      name: 'tech',
      slug: 'tech',
      description: 'Technology discussion',
      rules: null,
      ownerId: adminId,
      memberCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    modRepo.seedThread({
      id: sampleThreadId,
      spaceId: sampleSpaceId,
      authorId: targetUserId,
      title: 'Spam thread',
      content: 'Commercial spam',
      type: 'TEXT',
      url: null,
      isPinned: false,
      isLocked: false,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      commentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  describe('1. Báo Cáo Vi Phạm (/reports & /api/v1/reports)', () => {
    it('từ chối 401 khi không có Bearer token', async () => {
      const res = await request(app).post('/reports').send({
        targetType: 'THREAD',
        targetId: sampleThreadId,
        reason: 'Spam content',
      });

      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('gửi báo cáo vi phạm thành công với mã 201 Created', async () => {
      const res = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'THREAD',
          targetId: sampleThreadId,
          reason: 'Nội dung quảng cáo spam',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.reporterId).toBe(userId);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.targetId).toBe(sampleThreadId);
    });

    it('trả về 409 Conflict khi gửi báo cáo trùng lặp đang chờ xử lý', async () => {
      await request(app).post('/reports').set('Authorization', `Bearer ${userToken}`).send({
        targetType: 'THREAD',
        targetId: sampleThreadId,
        reason: 'Nội dung quảng cáo spam lần 1',
      });

      const res = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'THREAD',
          targetId: sampleThreadId,
          reason: 'Nội dung quảng cáo spam lần 2',
        });

      expect(res.status).toBe(409);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('cho phép xem danh sách báo cáo cá nhân tại GET /reports/my', async () => {
      await request(app).post('/reports').set('Authorization', `Bearer ${userToken}`).send({
        targetType: 'THREAD',
        targetId: sampleThreadId,
        reason: 'Báo cáo để kiểm tra my reports',
      });

      const res = await request(app).get('/reports/my').set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });
  });

  describe('2. Bảo Mật Phân Hệ Admin (/admin - adminGuard)', () => {
    it('từ chối 401 khi không truyền token', async () => {
      const res = await request(app).get('/admin/stats');
      expect(res.status).toBe(401);
      expect(res.headers['content-type']).toContain('application/problem+json');
    });

    it('từ chối 403 Forbidden khi người dùng thông thường cố truy cập /admin', async () => {
      const res = await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(res.body.title).toContain('Forbidden');
    });

    it('cho phép truy cập /admin/stats khi có token ADMIN', async () => {
      const res = await request(app)
        .get('/admin/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('activeUsersCount');
      expect(res.body).toHaveProperty('spacesCount');
      expect(res.body).toHaveProperty('threadsCount');
      expect(res.body).toHaveProperty('pendingReportsCount');
    });
  });

  describe('3. Hàng Đợi Báo Cáo Mod Queue (/admin/reports)', () => {
    let reportId: string;

    beforeEach(async () => {
      const repRes = await request(app)
        .post('/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetType: 'THREAD',
          targetId: sampleThreadId,
          reason: 'Nội dung bạo lực',
        });
      reportId = repRes.body.id;
    });

    it('Admin lấy danh sách hàng đợi báo cáo', async () => {
      const res = await request(app)
        .get('/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.reports[0].id).toBe(reportId);
    });

    it('Admin duyệt báo cáo (RESOLVED) kèm ghi chú', async () => {
      const res = await request(app)
        .patch(`/admin/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'RESOLVED',
          note: 'Đã gỡ bài và cảnh cáo người dùng',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('RESOLVED');
      expect(res.body.resolvedBy).toBe(adminId);
    });

    it('Admin bác bỏ báo cáo (DISMISSED)', async () => {
      const res = await request(app)
        .patch(`/admin/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'DISMISSED',
          note: 'Báo cáo sai sự thật',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('DISMISSED');
    });
  });

  describe('4. Quản Lý Người Dùng & Phiên Làm Việc (/admin/users)', () => {
    it('Admin lấy danh sách người dùng phân trang', async () => {
      const res = await request(app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(3);
    });

    it('Admin cập nhật vai trò người dùng (USER -> GLOBAL_MOD)', async () => {
      const res = await request(app)
        .patch(`/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'GLOBAL_MOD' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.role).toBe('GLOBAL_MOD');
    });

    it('Admin cập nhật trạng thái người dùng (SHADOWBANNED)', async () => {
      const res = await request(app)
        .patch(`/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SHADOWBANNED', reason: 'Spammer âm thầm' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('SHADOWBANNED');
    });

    it('Admin cập nhật trạng thái người dùng (SUSPENDED) và thu hồi phiên', async () => {
      const res = await request(app)
        .patch(`/admin/users/${targetUserId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'SUSPENDED', reason: 'Vi phạm nghiêm trọng' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Admin cưỡng chế thu hồi toàn bộ phiên của người dùng', async () => {
      const res = await request(app)
        .post(`/admin/users/${targetUserId}/revoke-sessions`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('5. Quản Lý Nội Dung & Nhật Ký Kiểm Toán (/admin/threads, spaces, audit-logs)', () => {
    it('Admin ghim và khóa bài viết', async () => {
      const pinRes = await request(app)
        .patch(`/admin/threads/${sampleThreadId}/pin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: true });

      expect(pinRes.status).toBe(200);
      expect(pinRes.body.isPinned).toBe(true);

      const lockRes = await request(app)
        .patch(`/admin/threads/${sampleThreadId}/lock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ value: true });

      expect(lockRes.status).toBe(200);
      expect(lockRes.body.isLocked).toBe(true);
    });

    it('Admin xóa bài viết', async () => {
      const res = await request(app)
        .delete(`/admin/threads/${sampleThreadId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Nội dung vi phạm pháp luật' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Admin xóa không gian', async () => {
      const res = await request(app)
        .delete(`/admin/spaces/${sampleSpaceId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ reason: 'Không gian không còn hoạt động' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('Admin truy vấn nhật ký kiểm toán hệ thống (/admin/audit-logs)', async () => {
      // Thực hiện một hành động admin để sinh log
      await request(app)
        .patch(`/admin/users/${targetUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'GLOBAL_MOD' });

      const res = await request(app)
        .get('/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.logs[0].actorId).toBe(adminId);
    });
  });
});
