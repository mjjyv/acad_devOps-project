import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '@acad/auth-service';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index.js';

describe('@acad/api-gateway Healthz Fail-Fast Probe', () => {
  it('returns 200 OK when pool and redis are healthy, and 503 with Retry-After when down', async () => {
    const authService = new AuthService(new InMemoryUserRepository(), new InMemorySessionStore());

    const healthyApp = createApp({
      authService,
      pool: { query: async () => ({ rows: [{ '?column?': 1 }] }) } as never,
      redis: { ping: async () => 'PONG' } as never,
      disableRateLimit: true,
    });

    const okRes = await request(healthyApp).get('/healthz');
    expect(okRes.status).toBe(200);
    expect(okRes.body.status).toBe('ok');
    expect(okRes.body.services).toEqual({ database: 'ok', redis: 'ok' });

    const degradedApp = createApp({
      authService,
      pool: {
        query: async () => {
          throw new Error('PG down');
        },
      } as never,
      redis: { ping: async () => 'PONG' } as never,
      disableRateLimit: true,
    });

    const errRes = await request(degradedApp).get('/api/v1/healthz');
    expect(errRes.status).toBe(503);
    expect(errRes.headers['retry-after']).toBe('5');
    expect(errRes.body.services.database).toBe('down');
  });
});
