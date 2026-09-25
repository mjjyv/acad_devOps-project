import { ClientAuthInterceptor } from '@acad/auth-client';
import {
  AdminSystemStats,
  AdminUserListQuery,
  AuthResponse,
  SessionInfo,
  UserProfile,
  UserRole,
  UserStatus,
} from '@acad/contracts';

function getApiBaseUrl(): string {
  // 1. Kiểm tra biến môi trường được Next.js inject lúc build
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  // 2. Nếu đang chạy trên trình duyệt (client-side)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Nếu ứng dụng đang truy cập qua domain Render (*.onrender.com)
    if (hostname.endsWith('.onrender.com')) {
      // Nếu envUrl rỗng, hoặc là localhost, hoặc là tên private host Render "acad-core-api"
      if (!envUrl || envUrl.includes('localhost') || envUrl === 'acad-core-api' || !envUrl.includes('.')) {
        return 'https://acad-core-api.onrender.com';
      }
    }
  }

  // 3. Fallback mặc định cho local development
  if (!envUrl) {
    return 'http://localhost:8080';
  }

  // 4. Nếu Render Blueprint vô tình truyền private service name trần (ví dụ 'acad-core-api')
  if (envUrl === 'acad-core-api' || (!envUrl.includes('.') && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1'))) {
    return `https://${envUrl.replace(/^https?:\/\//, '')}.onrender.com`;
  }

  // 5. Chuẩn hóa protocol
  if (envUrl.startsWith('http://') || envUrl.startsWith('https://')) {
    const cleanUrl = envUrl.replace(/\/+$/, '');
    const domainPart = cleanUrl.replace(/^https?:\/\//, '');
    if (!domainPart.includes('.') && !domainPart.includes('localhost') && !domainPart.includes(':')) {
      return `https://${domainPart}.onrender.com`;
    }
    return cleanUrl;
  }

  return `https://${envUrl.replace(/\/+$/, '')}`;
}

const API_BASE_URL = getApiBaseUrl();

export class WebAuthService {
  private interceptor: ClientAuthInterceptor;

  constructor() {
    this.interceptor = new ClientAuthInterceptor({
      refreshEndpoint: async () => {
        let storedRefreshToken: string | undefined;
        if (typeof window !== 'undefined') {
          try {
            storedRefreshToken = localStorage.getItem('acad_refresh_token') || undefined;
          } catch {
            // bỏ qua lỗi nếu localStorage bị chặn
          }
        }

        const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Tự động gửi httpOnly refresh_token cookie
          body: storedRefreshToken ? JSON.stringify({ refreshToken: storedRefreshToken }) : undefined,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || 'Phiên làm việc đã hết hạn');
        }

        const data = (await response.json()) as { accessToken: string; refreshToken?: string };
        if (data.refreshToken && typeof window !== 'undefined') {
          try {
            localStorage.setItem('acad_refresh_token', data.refreshToken);
          } catch {
            // bỏ qua
          }
        }
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
    if (typeof document !== 'undefined') {
      if (token) {
        document.cookie = 'acad_session_active=1; path=/; max-age=604800; SameSite=Lax';
      } else {
        document.cookie = 'acad_session_active=; path=/; max-age=0; SameSite=Lax';
      }
    }
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
    if ((data as any).refreshToken && typeof window !== 'undefined') {
      try {
        localStorage.setItem('acad_refresh_token', (data as any).refreshToken);
      } catch {
        // ignore
      }
    }
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
    if ((data as any).refreshToken && typeof window !== 'undefined') {
      try {
        localStorage.setItem('acad_refresh_token', (data as any).refreshToken);
      } catch {
        // ignore
      }
    }
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
        try {
          localStorage.removeItem('acad_refresh_token');
        } catch {
          // ignore
        }
        window.location.href = '/login';
      }
    }
  }

  // =========================================================================
  // QUẢN TRỊ PHIÊN LÀM VIỆC (SESSION MANAGEMENT)
  // =========================================================================

  public async listSessions(): Promise<SessionInfo[]> {
    const response = await this.fetchWithAuth('/api/v1/auth/sessions');
    if (!response.ok) {
      throw new Error('Không thể tải danh sách phiên làm việc');
    }
    return response.json();
  }

  public async revokeSession(sessionId: string): Promise<void> {
    const response = await this.fetchWithAuth(`/api/v1/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Thu hồi phiên thất bại');
    }
  }

  public async revokeAllOtherSessions(): Promise<void> {
    const response = await this.fetchWithAuth('/api/v1/auth/sessions', {
      method: 'DELETE',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Thu hồi toàn bộ phiên thất bại');
    }
  }

  // =========================================================================
  // QUẢN TRỊ ADMIN (ADMIN OPERATIONS)
  // =========================================================================

  public async adminGetStats(): Promise<AdminSystemStats> {
    const response = await this.fetchWithAuth('/api/v1/admin/stats');
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể lấy dữ liệu thống kê');
    }
    return response.json();
  }

  public async adminListUsers(query: Partial<AdminUserListQuery> = {}): Promise<{
    users: UserProfile[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.role) params.set('role', query.role);
    if (query.status) params.set('status', query.status);
    if (query.search) params.set('search', query.search);

    const response = await this.fetchWithAuth(`/api/v1/admin/users?${params.toString()}`);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Không thể tải danh sách người dùng');
    }
    return response.json();
  }

  public async adminUpdateRole(userId: string, role: UserRole): Promise<void> {
    const response = await this.fetchWithAuth(`/api/v1/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Cập nhật vai trò thất bại');
    }
  }

  public async adminUpdateStatus(userId: string, status: UserStatus): Promise<void> {
    const response = await this.fetchWithAuth(`/api/v1/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Cập nhật trạng thái thất bại');
    }
  }

  public async adminRevokeUserSessions(userId: string): Promise<void> {
    const response = await this.fetchWithAuth(`/api/v1/admin/users/${userId}/revoke-sessions`, {
      method: 'POST',
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Thu hồi phiên người dùng thất bại');
    }
  }
}

export const webAuth = new WebAuthService();
