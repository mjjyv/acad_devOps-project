import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AddressInfo } from 'node:net';
import { createApiServer } from '../src/server.js';
import { createAuthModule, TokenManager } from '@acad/auth-service';
import { randomUUID } from 'node:crypto';

describe('Admin Endpoints HTTP Integration Tests', () => {
  let server: ReturnType<typeof createApiServer>;
  let baseUrl: string;
  let adminToken: string;
  let normalUserToken: string;
  let targetUserId: string;

  beforeAll(async () => {
    const authModule = createAuthModule({ inMemory: true });
    server = createApiServer({ authModule });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;

    // Tạo Admin user
    const adminUser = await authModule.userRepo.create({
      username: 'admin_master',
      email: 'admin@acad.community',
      passwordHash: 'hashed_password',
      role: 'ADMIN',
      status: 'ACTIVE',
      karmaScore: 9999,
    });
    adminToken = TokenManager.signAccessToken({
      sub: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      role: 'ADMIN',
      status: 'ACTIVE',
      karmaScore: adminUser.karmaScore,
      accountAgeDays: 100,
      tokenVersion: 1,
      spacePermissions: [],
    });

    // Tạo Normal user
    const normalUser = await authModule.userRepo.create({
      username: 'normal_coder',
      email: 'coder@acad.community',
      passwordHash: 'hashed_password',
      role: 'USER',
      status: 'ACTIVE',
      karmaScore: 10,
    });
    targetUserId = normalUser.id;
    normalUserToken = TokenManager.signAccessToken({
      sub: normalUser.id,
      username: normalUser.username,
      email: normalUser.email,
      role: 'USER',
      status: 'ACTIVE',
      karmaScore: normalUser.karmaScore,
      accountAgeDays: 5,
      tokenVersion: 1,
      spacePermissions: [],
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('1. GET /api/v1/admin/users - Từ chối khi thiếu token (401)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users`);
    expect(res.status).toBe(401);
  });

  it('2. GET /api/v1/admin/users - Từ chối khi không phải ADMIN (403)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${normalUserToken}` },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  it('3. GET /api/v1/admin/stats - Lấy số liệu thống kê hệ thống thành công (200)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalUsers).toBeGreaterThanOrEqual(2);
    expect(body.adminUsers).toBeGreaterThanOrEqual(1);
    expect(body.activeUsers).toBeGreaterThanOrEqual(2);
  });

  it('4. GET /api/v1/admin/users - Liệt kê danh sách người dùng với phân trang (200)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.users).toBeInstanceOf(Array);
    expect(body.total).toBeGreaterThanOrEqual(2);
    expect(body.page).toBe(1);
    expect(body.totalPages).toBeGreaterThanOrEqual(1);
  });

  it('5. PATCH /api/v1/admin/users/:id/role - Thăng cấp người dùng lên SPACE_MOD (200)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${targetUserId}/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'SPACE_MOD' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.role).toBe('SPACE_MOD');
  });

  it('6. PATCH /api/v1/admin/users/:id/status - Khóa tài khoản thành SUSPENDED (200)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${targetUserId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'SUSPENDED' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user.status).toBe('SUSPENDED');
  });

  it('7. POST /api/v1/admin/users/:id/revoke-sessions - Cưỡng chế thu hồi tất cả phiên (200)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/admin/users/${targetUserId}/revoke-sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toContain('thu hồi thành công');
  });
});
