import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '@acad/auth-service';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('Kiểm tra cổng Health Check (/healthz)', () => {
  it('GET /healthz phải trả về HTTP 200 OK và thông tin trạng thái dịch vụ', async () => {
    const userRepository = new InMemoryUserRepository();
    const sessionStore = new InMemorySessionStore();
    const authService = new AuthService(userRepository, sessionStore);

    const app = createApp({
      authService,
    });

    const res = await request(app).get('/healthz');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('version', '2.0.0');
    expect(res.body).toHaveProperty('services');
  });
});
