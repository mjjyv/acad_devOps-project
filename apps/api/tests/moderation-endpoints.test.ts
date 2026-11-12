import {
  AuthService,
  InMemorySessionStore,
  InMemoryUserRepository,
  PasswordHasher,
} from '@acad/auth-service';
import { InMemoryModerationRepository, ModerationService } from '@acad/moderation-service';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index.js';

const TEST_SECRET = 'mod-test-secret-32-chars-minimum!';

describe('@acad/api-gateway Reports, Admin RBAC & Audit Log Endpoints', () => {
  it('enforces 403 for non-admin, 409 duplicate report, and logs admin resolutions', async () => {
    const userRepo = new InMemoryUserRepository();
    const store = new InMemorySessionStore();
    const authService = new AuthService(userRepo, store, TEST_SECRET);

    const modRepo = new InMemoryModerationRepository();
    const moderationService = new ModerationService(modRepo, store);

    const app = createApp({
      authService,
      moderationService,
      jwtSecret: TEST_SECRET,
      disableRateLimit: true,
    });

    const passwordHash = await PasswordHasher.hash('Password123!');
    const adminUser = await userRepo.createUser({
      username: 'admin_mod',
      email: 'admin@acad.vn',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    modRepo.seedUser({
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: 'ADMIN',
      status: 'ACTIVE',
      karmaScore: 0,
      createdAt: adminUser.createdAt,
      updatedAt: adminUser.updatedAt,
    });

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'admin_mod', password: 'Password123!' });
    const adminToken = adminLogin.body.tokens.accessToken as string;

    const regMember = await request(app).post('/api/v1/auth/register').send({
      username: 'normal_member',
      email: 'member@acad.vn',
      password: 'Password123!',
    });
    const memberToken = regMember.body.tokens.accessToken as string;
    modRepo.seedUser({
      id: regMember.body.user.id,
      username: 'normal_member',
      email: 'member@acad.vn',
      role: 'USER',
      status: 'ACTIVE',
      karmaScore: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Non-admin blocked from /admin/stats -> 403
    const forbidden = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(forbidden.status).toBe(403);
    expect(forbidden.headers['content-type']).toContain('application/problem+json');

    const targetThreadId = '10000000-0000-4000-8000-000000000099';
    const reportRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        targetType: 'THREAD',
        targetId: targetThreadId,
        reason: 'Phishing links',
      });
    expect(reportRes.status).toBe(201);

    const dupReport = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        targetType: 'THREAD',
        targetId: targetThreadId,
        reason: 'Phishing links again',
      });
    expect(dupReport.status).toBe(409);

    const resolveRes = await request(app)
      .patch(`/api/v1/admin/reports/${reportRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED', note: 'Verified phishing' });
    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.status).toBe('RESOLVED');

    const logsRes = await request(app)
      .get('/api/v1/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logsRes.status).toBe(200);
    expect(logsRes.body.total).toBe(1);
    expect(logsRes.body.logs[0].action).toBe('REPORT_RESOLVE');
  });
});
