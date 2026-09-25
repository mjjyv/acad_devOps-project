import { ClientAuthInterceptor } from '@acad/auth-client';
import { AuthResponse, UserProfile } from '@acad/contracts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export class WebAuthService {
  private interceptor: ClientAuthInterceptor;

  constructor() {
    this.interceptor = new ClientAuthInterceptor({
      refreshEndpoint: async () => {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Tự động gửi httpOnly refresh_token cookie
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Phiên làm việc đã hết hạn');
        }

        const data = (await response.json()) as { accessToken: string };
        return { accessToken: data.accessToken };
      },
      onUnauthenticated: (reason) => {
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register')) {
            window.location.href = `/login?reason=${encodeURIComponent(reason || 'unauthenticated')}&redirect=${encodeURIComponent(currentPath)}`;
          }
        }
      },
    });
  }

  public getInterceptor(): ClientAuthInterceptor {
    return this.interceptor;
  }

  public setAccessToken(token: string | null): void {
    this.interceptor.setAccessToken(token);
  }

  public getAccessToken(): string | null {
    return this.interceptor.getAccessToken();
  }

  /**
   * Gọi fetch có bảo vệ tự động đính kèm Bearer token và Mutex Lock Refresh
   */
  public async fetchWithAuth(url: string, init: RequestInit = {}): Promise<Response> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    return this.interceptor.executeWithAuth(async (token: string) => {
      const headers = new Headers(init.headers || {});
      headers.set('Authorization', `Bearer ${token}`);

      const response = await fetch(fullUrl, {
        ...init,
        headers,
        credentials: 'include',
      });

      if (response.status === 401) {
        throw new Error('401 Unauthorized');
      }

      return response;
    });
  }

  /**
   * Đăng ký tài khoản
   */
  public async register(payload: {
    username: string;
    email: string;
    password: string;
    deviceFingerprint?: string;
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Đăng ký thất bại');
    }

    this.setAccessToken(data.accessToken);
    return data;
  }

  /**
   * Đăng nhập
   */
  public async login(payload: {
    login: string;
    password: string;
    deviceFingerprint?: string;
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Đăng nhập thất bại');
    }

    this.setAccessToken(data.accessToken);
    return data;
  }

  /**
   * Lấy thông tin người dùng hiện hành
   */
  public async getCurrentUser(): Promise<UserProfile> {
    const response = await this.fetchWithAuth('/api/v1/auth/me');
    return response.json();
  }

  /**
   * Đăng xuất
   */
  public async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      this.setAccessToken(null);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }
}

export const webAuth = new WebAuthService();
