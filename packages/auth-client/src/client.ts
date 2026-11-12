/**
 * @file client.ts
 * @description Resilient HTTP Client with single-flight Mutex Lock Token Refresh for @acad monorepo.
 */

import type {
  AuthResponse,
  AuthTokenPair,
  PublicUserProfile,
  SessionInfo,
  UserProfile,
} from '@acad/contracts';
import { AuthRefreshRevokedError, TokenRefreshMutex } from './interceptor.js';

export class HttpError extends Error {
  public readonly status: number;
  public readonly rfc7807?: Record<string, unknown> | undefined;

  constructor(message: string, status: number, rfc7807?: Record<string, unknown>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.rfc7807 = rfc7807;
  }
}

export type TokenPair = AuthTokenPair;

export interface ClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
  onTokensUpdated?: (tokens: TokenPair) => void;
  onSessionExpired?: () => void;
  initialAccessToken?: string | undefined;
  initialRefreshToken?: string | undefined;
}

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  _retry?: boolean;
}

export class AcadClient {
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private mutex: TokenRefreshMutex;
  private onTokensUpdated?: ((tokens: TokenPair) => void) | undefined;
  private onSessionExpired?: (() => void) | undefined;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.fetchFn = config.fetchFn ?? globalThis.fetch.bind(globalThis);
    this.onTokensUpdated = config.onTokensUpdated;
    this.onSessionExpired = config.onSessionExpired;

    if (config.initialAccessToken) {
      this.accessToken = config.initialAccessToken;
    }
    if (config.initialRefreshToken) {
      this.refreshToken = config.initialRefreshToken;
    }

    this.mutex = new TokenRefreshMutex({
      refreshFn: async () => this.executeTokenRefresh(),
      onRefreshSuccess: (newToken: string) => {
        this.accessToken = newToken;
      },
      onRefreshFailure: (err: Error) => {
        // Chỉ xóa phiên cục bộ khi server thực sự thu hồi hoặc từ chối Refresh Token (401/403).
        // Lỗi tạm thời như 429 Too Many Requests hoặc 503 không được xóa token đang giữ.
        if (err instanceof AuthRefreshRevokedError) {
          this.clearTokens();
          this.onSessionExpired?.();
        }
      },
    });
  }

  public setTokens(tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType?: 'Bearer' | string;
    expiresIn?: number;
  }): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.onTokensUpdated?.({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: 'Bearer',
      expiresIn: tokens.expiresIn ?? 900,
    });
  }

  public clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public getRefreshToken(): string | null {
    return this.refreshToken;
  }

  public async request(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = path.startsWith('http')
      ? path
      : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const headers = new Headers(options.headers || {});

    if (options.body && !headers.has('Content-Type') && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    if (!options.skipAuth && this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const response = await this.fetchFn(url, {
      ...options,
      headers,
    });

    if (response.status === 401 && !options.skipAuth && !options._retry && this.refreshToken) {
      try {
        const freshAccessToken = await this.mutex.acquireToken();
        if (freshAccessToken) {
          const retryHeaders = new Headers(options.headers || {});
          if (
            options.body &&
            !retryHeaders.has('Content-Type') &&
            typeof options.body === 'string'
          ) {
            retryHeaders.set('Content-Type', 'application/json');
          }
          retryHeaders.set('Authorization', `Bearer ${freshAccessToken}`);
          return await this.fetchFn(url, {
            ...options,
            _retry: true,
            headers: retryHeaders,
          } as RequestInit);
        }
      } catch (refreshError) {
        if (refreshError instanceof HttpError) {
          throw refreshError;
        }
        return response;
      }
    }

    return response;
  }

  private async executeTokenRefresh(): Promise<string | null> {
    if (!this.refreshToken) {
      throw new AuthRefreshRevokedError(401, 'No refresh token available');
    }

    const url = `${this.baseUrl}/auth/refresh`;
    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      let body: Record<string, unknown> | undefined;
      try {
        body = (await response.json()) as Record<string, unknown>;
      } catch {
        body = undefined;
      }
      const detail =
        typeof body?.detail === 'string'
          ? body.detail
          : `Token refresh failed with status ${response.status}`;

      if (response.status === 401 || response.status === 403) {
        throw new AuthRefreshRevokedError(response.status, detail);
      }
      throw new HttpError(detail, response.status, body);
    }

    const data = (await response.json()) as TokenPair;
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.onTokensUpdated?.({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      tokenType: 'Bearer',
      expiresIn: data.expiresIn,
    });

    return data.accessToken;
  }

  public async register(payload: {
    email: string;
    username: string;
    password: string;
  }): Promise<AuthResponse> {
    const res = await this.request('/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(payload),
    });
    const data = await this.handleJsonResponse<AuthResponse>(res);
    if (data.tokens) {
      this.setTokens(data.tokens);
    }
    return data;
  }

  public async login(payload: {
    identifier?: string;
    email?: string;
    password: string;
    fingerprint?: string;
  }): Promise<AuthResponse> {
    const res = await this.request('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({
        identifier: payload.identifier || payload.email,
        password: payload.password,
        ...(payload.fingerprint ? { fingerprint: payload.fingerprint } : {}),
      }),
    });
    const data = await this.handleJsonResponse<AuthResponse>(res);
    if (data.tokens) {
      this.setTokens(data.tokens);
    }
    return data;
  }

  public async logout(): Promise<void> {
    try {
      if (this.refreshToken) {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });
      }
    } finally {
      this.clearTokens();
    }
  }

  public async getMe(): Promise<UserProfile> {
    const res = await this.request('/auth/me', { method: 'GET' });
    return this.handleJsonResponse<UserProfile>(res);
  }

  public async searchUsers(query: string, limit = 10): Promise<PublicUserProfile[]> {
    const clean = query.trim();
    if (!clean) return [];
    const res = await this.request(
      `/auth/users/search?q=${encodeURIComponent(clean)}&limit=${limit}`,
      { method: 'GET' },
    );
    const data = await this.handleJsonResponse<{ users: PublicUserProfile[] }>(res);
    return Array.isArray(data.users) ? data.users : [];
  }

  public async getSessions(): Promise<{ sessions: SessionInfo[] }> {
    const res = await this.request('/auth/sessions', { method: 'GET' });
    return this.handleJsonResponse<{ sessions: SessionInfo[] }>(res);
  }

  public async revokeSession(sessionId: string): Promise<{ message: string }> {
    const res = await this.request(`/auth/sessions/${encodeURIComponent(sessionId)}/revoke`, {
      method: 'POST',
    });
    return this.handleJsonResponse<{ message: string }>(res);
  }

  private async handleJsonResponse<T>(res: Response): Promise<T> {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    if (!res.ok) {
      const problem =
        payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined;
      const msg =
        (typeof problem?.detail === 'string' && problem.detail) ||
        (typeof problem?.title === 'string' && problem.title) ||
        `HTTP Error ${res.status}`;
      throw new HttpError(msg, res.status, problem);
    }

    return payload as T;
  }
}
