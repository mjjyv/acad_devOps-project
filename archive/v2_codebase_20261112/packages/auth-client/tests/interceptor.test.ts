import { describe, expect, it, vi } from 'vitest';
import { AcadClient } from '../src/client.js';
import { TokenRefreshMutex } from '../src/interceptor.js';

describe('Thư viện Client (@acad/auth-client) & Mutex Lock', () => {
  it('TokenRefreshMutex: 20 luồng gọi đồng thời acquireToken() chỉ kích hoạt refreshFn DUY NHẤT 1 LẦN', async () => {
    let callCount = 0;
    const mockRefresh = vi.fn(async () => {
      callCount++;
      // Giả lập độ trễ mạng 50ms để các luồng khác rơi vào hàng đợi
      await new Promise((r) => setTimeout(r, 50));
      return 'new-access-token-xyz';
    });

    const mutex = new TokenRefreshMutex({
      refreshFn: mockRefresh,
    });

    // 20 requests gọi acquireToken() đồng thời
    const concurrentCalls = Array.from({ length: 20 }, () => mutex.acquireToken());

    const results = await Promise.all(concurrentCalls);

    // Kiểm tra tất cả 20 request đều nhận được cùng token mới
    for (const token of results) {
      expect(token).toBe('new-access-token-xyz');
    }

    // Khẳng định callCount bằng chính xác 1 (chặn đứng Thundering Herd)
    expect(callCount).toBe(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('TokenRefreshMutex: Xử lý lỗi tập trung khi refresh thất bại cho toàn bộ 20 subscribers', async () => {
    let callCount = 0;
    const mockRefreshFailure = vi.fn(async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 30));
      throw new Error('Refresh token revoked');
    });

    const mutex = new TokenRefreshMutex({
      refreshFn: mockRefreshFailure,
    });

    const concurrentCalls = Array.from({ length: 20 }, () =>
      mutex.acquireToken().catch((err: Error) => err.message),
    );

    const results = await Promise.all(concurrentCalls);

    // Mọi caller đều nhận được lỗi
    for (const msg of results) {
      expect(msg).toBe('Refresh token revoked');
    }

    // Refresh chỉ thực hiện 1 lần duy nhất
    expect(callCount).toBe(1);
  });

  it('AcadClient: 20 request API đồng thời gặp 401 chỉ kích hoạt 1 lần gọi /auth/refresh và tự động thử lại thành công', async () => {
    let refreshNetworkCalls = 0;
    let dataEndpointCalls = 0;

    // Giả lập custom fetch
    const mockFetch = vi.fn(
      async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
        const urlStr = url.toString();

        if (urlStr.includes('/auth/refresh')) {
          refreshNetworkCalls++;
          await new Promise((r) => setTimeout(r, 40));
          return new Response(
            JSON.stringify({
              accessToken: 'fresh-valid-token-123',
              refreshToken: 'fresh-refresh-token-456',
              tokenType: 'Bearer',
              expiresIn: 900,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        if (urlStr.includes('/api/resource')) {
          dataEndpointCalls++;
          const authHeader =
            (init?.headers as Headers | undefined)?.get('Authorization') ??
            (init?.headers as Record<string, string> | undefined)?.Authorization;

          if (authHeader === 'Bearer fresh-valid-token-123') {
            return new Response(JSON.stringify({ data: 'success' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          // Lần đầu với token cũ -> Trả về 401
          return new Response(JSON.stringify({ title: 'Unauthorized', status: 401 }), {
            status: 401,
            headers: { 'Content-Type': 'application/problem+json' },
          });
        }

        return new Response('Not Found', { status: 404 });
      },
    );

    const client = new AcadClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as unknown as typeof fetch,
      initialAccessToken: 'expired-token-000',
      initialRefreshToken: 'valid-refresh-token-000',
    });

    // Bắn 20 API calls đồng thời đến /api/resource
    const requests = Array.from({ length: 20 }, () => client.request('/api/resource'));

    const responses = await Promise.all(requests);

    // Mọi request đều retry thành công với HTTP 200
    for (const res of responses) {
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ data: 'success' });
    }

    // Refresh endpoint chỉ bị gọi đúng 1 lần
    expect(refreshNetworkCalls).toBe(1);

    // Endpoint dữ liệu nhận 20 cuộc gọi đầu tiên (thất bại 401) + 20 cuộc gọi retry (thành công 200) = 40
    expect(dataEndpointCalls).toBe(40);

    // Token mới được lưu trữ trong client
    expect(client.getAccessToken()).toBe('fresh-valid-token-123');
    expect(client.getRefreshToken()).toBe('fresh-refresh-token-456');
  });
});
