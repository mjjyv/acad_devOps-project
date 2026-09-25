import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiServer } from '../src/server.js';
import { AddressInfo } from 'node:net';

describe('Kiểm thử API Gateway & Healthcheck Probe (/healthz)', () => {
  let server: ReturnType<typeof createApiServer>;
  let baseUrl: string;

  beforeAll(async () => {
    server = createApiServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('GET /healthz trả về mã HTTP 200 OK và status "ok"', async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.status).toBe('ok');
    expect(data.service).toBe('acad-community-api');
    expect(typeof data.uptime).toBe('number');
    expect(typeof data.timestamp).toBe('string');
  });

  it('GET /api/v1/health cũng trả về status "ok"', async () => {
    const res = await fetch(`${baseUrl}/api/v1/health`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('ok');
  });

  it('GET / trả về thông tin API Gateway', async () => {
    const res = await fetch(`${baseUrl}/`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('running');
  });

  it('Yêu cầu tới route không tồn tại trả về HTTP 404', async () => {
    const res = await fetch(`${baseUrl}/non-existent-route`);
    expect(res.status).toBe(404);
  });
});
