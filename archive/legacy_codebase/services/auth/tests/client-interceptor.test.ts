import { describe, expect, it, vi } from 'vitest';
import { ClientAuthInterceptor } from '@acad/auth-client';

describe('5. Kiểm thử Client Auth Interceptor (Mutex Lock & Subscriber Queue)', () => {
  it('Cơ chế Mutex Lock: 5 request song song bị 401 chỉ kích hoạt ĐÚNG 1 request refresh', async () => {
    let refreshCallCount = 0;

    const interceptor = new ClientAuthInterceptor({
      refreshEndpoint: async () => {
        refreshCallCount++;
        // Mô phỏng độ trễ mạng khi refresh token (50ms)
        await new Promise((r) => setTimeout(r, 50));
        return { accessToken: 'fresh_access_token_abc123' };
      },
      onUnauthenticated: vi.fn(),
    });

    // Giả lập 5 request API song song đồng thời gặp lỗi 401 (token cũ hết hạn)
    interceptor.setAccessToken('expired_token');

    let requestSuccessCount = 0;
    const makeMockRequest = async (id: number) => {
      return interceptor.executeWithAuth(async (token: string) => {
        if (token === 'expired_token') {
          const err: any = new Error('HTTP 401 Unauthorized');
          err.status = 401;
          throw err;
        }
        // Gọi thành công với token mới
        requestSuccessCount++;
        return `response_from_request_${id}_with_${token}`;
      });
    };

    const results = await Promise.all([
      makeMockRequest(1),
      makeMockRequest(2),
      makeMockRequest(3),
      makeMockRequest(4),
      makeMockRequest(5),
    ]);

    // CHỨNG MINH MUTEX LOCK:
    // Dù có 5 request 401 cùng lúc, endpoint refresh CHỈ ĐƯỢC GỌI DUY NHẤT 1 LẦN!
    expect(refreshCallCount).toBe(1);

    // Toàn bộ 5 request đều hoàn thành thành công với token mới
    expect(requestSuccessCount).toBe(5);
    expect(results).toHaveLength(5);
    results.forEach((res: string, i: number) => {
      expect(res).toBe(`response_from_request_${i + 1}_with_fresh_access_token_abc123`);
    });

    expect(interceptor.getState()).toBe('AUTHENTICATED');
    expect(interceptor.getAccessToken()).toBe('fresh_access_token_abc123');
  });

  it('Xử lý thất bại khi Refresh Token hết hạn: Chuyển sang UNAUTHENTICATED và gọi callback', async () => {
    const onUnauthMock = vi.fn();
    const interceptor = new ClientAuthInterceptor({
      refreshEndpoint: async () => {
        throw new Error('Refresh token expired');
      },
      onUnauthenticated: onUnauthMock,
    });

    await expect(
      interceptor.executeWithAuth(async (token: string) => token),
    ).rejects.toThrowError(/Refresh token expired/);

    expect(interceptor.getState()).toBe('UNAUTHENTICATED');
    expect(onUnauthMock).toHaveBeenCalledWith('Không thể khởi tạo phiên làm việc');
  });
});
