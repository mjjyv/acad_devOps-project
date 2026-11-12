import { describe, expect, it, vi } from 'vitest';
import { AcadClient, HttpError } from '../src/index.js';

describe('@acad/auth-client v3.0.0 Resilience & Mutex Lock', () => {
  it('prevents Thundering Herd: 20 concurrent 401 requests trigger only 1 refresh call', async () => {
    let refreshCalls = 0;
    let currentValidToken = 'expired-token';

    const mockFetch: typeof fetch = vi.fn(async (input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((r) => setTimeout(r, 15));
        currentValidToken = 'fresh-token-v2';
        return new Response(
          JSON.stringify({
            accessToken: 'fresh-token-v2',
            refreshToken: 'refresh-v2',
            tokenType: 'Bearer',
            expiresIn: 900,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }

      const authHeader = new Headers(init?.headers).get('authorization');
      if (authHeader === 'Bearer fresh-token-v2' && currentValidToken === 'fresh-token-v2') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ status: 401, detail: 'Expired' }), { status: 401 });
    });

    const onTokensUpdated = vi.fn();
    const client = new AcadClient({
      baseUrl: 'http://127.0.0.1:10000/api/v1',
      fetchFn: mockFetch,
      initialAccessToken: 'expired-token',
      initialRefreshToken: 'refresh-v1',
      onTokensUpdated,
    });

    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) => client.request(`/threads/item-${i}`)),
    );

    expect(refreshCalls).toBe(1);
    expect(responses.every((r) => r.status === 200)).toBe(true);
    expect(onTokensUpdated).toHaveBeenCalledTimes(1);
    expect(client.getAccessToken()).toBe('fresh-token-v2');
    expect(client.getRefreshToken()).toBe('refresh-v2');
  });

  it('clears tokens and triggers onSessionExpired when /auth/refresh returns 401', async () => {
    const onSessionExpired = vi.fn();
    const mockFetch: typeof fetch = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/auth/refresh')) {
        return new Response(JSON.stringify({ detail: 'Token Reuse Attack' }), { status: 401 });
      }
      return new Response(JSON.stringify({ detail: 'Expired' }), { status: 401 });
    });

    const client = new AcadClient({
      baseUrl: 'http://127.0.0.1:10000/api/v1',
      fetchFn: mockFetch,
      initialAccessToken: 'old-access',
      initialRefreshToken: 'reused-refresh',
      onSessionExpired,
    });

    const res = await client.request('/auth/me');
    expect(res.status).toBe(401);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
    expect(client.getAccessToken()).toBeNull();
    expect(client.getRefreshToken()).toBeNull();
  });

  it('preserves local tokens on transient 429 or 503 errors during refresh or getMe', async () => {
    const onSessionExpired = vi.fn();
    const mockFetch: typeof fetch = vi.fn(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.endsWith('/auth/refresh')) {
        return new Response(JSON.stringify({ detail: 'Too Many Requests' }), { status: 429 });
      }
      return new Response(JSON.stringify({ detail: 'Unauthorized' }), { status: 401 });
    });

    const client = new AcadClient({
      baseUrl: 'http://127.0.0.1:10000/api/v1',
      fetchFn: mockFetch,
      initialAccessToken: 'old-access',
      initialRefreshToken: 'valid-refresh',
      onSessionExpired,
    });

    await expect(client.getMe()).rejects.toThrow(HttpError);
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(client.getRefreshToken()).toBe('valid-refresh');
  });
});
