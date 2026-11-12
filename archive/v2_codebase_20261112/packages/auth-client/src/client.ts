/**
 * @file client.ts
 * @description Enterprise HTTP Client with single-flight Mutex Lock Token Refresh for @acad monorepo.
 */

import type { AuthResponse, SessionInfo, UserProfile } from '@acad/contracts';
import { TokenRefreshMutex } from './interceptor.js';

export class HttpError extends Error {
  public status: number;
  public rfc7807?: Record<string, unknown> | undefined;

  constructor(message: string, status: number, rfc7807?: Record<string, unknown>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.rfc7807 = rfc7807;
  }
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface ClientConfig {
  baseUrl: string;
  fetchFn?: typeof fetch;
  onTokensUpdated?: (tokens: TokenPair) => void;
  onSessionExpired?: () => void;
  initialAccessToken?: string;
  initialRefreshToken?: string;
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
      onRefreshFailure: () => {
        this.clearTokens();
        this.onSessionExpired?.();
      },
    });
  }

  public setTokens(tokens: {
    accessToken: string;
    refreshToken: string;
    tokenType?: string;
    expiresIn?: number;
  }): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.onTokensUpdated?.({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType || 'Bearer',
      expiresIn: tokens.expiresIn || 900,
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

  /**
   * Performs an HTTP request with automatic token injection and 401 single-flight retry.
   */
  public async request(path: string, options: RequestOptions = {}): Promise<Response> {
    const url = path.startsWith('http')
      ? path
      : `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const headers = new Headers(options.headers || {});

    // Ensure JSON content type by default for mutation methods
    if (options.body && !headers.has('Content-Type') && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    // Inject Bearer token if not skipped
    if (!options.skipAuth && this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }

    const modifiedOptions: RequestInit = {
      ...options,
      headers,
    };

    let response: Response;
    response = await this.fetchFn(url, modifiedOptions);

    // If 401 Unauthorized occurs on an authenticated request and we haven't retried yet:
    if (response.status === 401 && !options.skipAuth && !options._retry && this.refreshToken) {
      try {
        const freshAccessToken = await this.mutex.acquireToken();
        if (freshAccessToken) {
          // Retry the original request with the fresh token
          const retryHeaders = new Headers(options.headers || {});
          retryHeaders.set('Authorization', `Bearer ${freshAccessToken}`);
          return await this.fetchFn(url, {
            ...options,
            _retry: true,
            headers: retryHeaders,
          } as RequestInit);
        }
      } catch (_refreshError) {
        // Refresh failed (e.g. token expired / reuse detected), return original 401 response
        return response;
      }
    }

    return response;
  }

  /**
   * Executes the raw refresh API call. Only called via Mutex lock.
   */
  private async executeTokenRefresh(): Promise<string | null> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const url = `${this.baseUrl}/auth/refresh`;
    const response = await this.fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken }),
    });

    if (!response.ok) {
      const status = response.status;
      throw new Error(`Token refresh failed with status ${status}`);
    }

    const data = (await response.json()) as {
      accessToken: string;
      refreshToken: string;
      tokenType: string;
      expiresIn: number;
    };

    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;

    this.onTokensUpdated?.(data);

    return data.accessToken;
  }

  // --- Auth Convenience API Methods ---

  public async register(payload: {
    email: string;
    username: string;
    password: string;
  }): Promise<AuthResponse & { tokens?: TokenPair }> {
    const res = await this.request('/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(payload),
    });
    const data = await this.handleJsonResponse<AuthResponse & { tokens?: TokenPair }>(res);
    if (data.tokens) {
      this.setTokens({
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
        tokenType: data.tokens.tokenType,
        expiresIn: data.tokens.expiresIn,
      });
    }
    return data;
  }

  public async login(payload: {
    identifier?: string;
    email?: string;
    password: string;
  }): Promise<AuthResponse & { tokens?: TokenPair }> {
    const res = await this.request('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({
        identifier: payload.identifier || payload.email,
        password: payload.password,
      }),
    });
    const data = await this.handleJsonResponse<AuthResponse & { tokens?: TokenPair }>(res);
    if (data.tokens) {
      this.setTokens({
        accessToken: data.tokens.accessToken,
        refreshToken: data.tokens.refreshToken,
      });
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

  public async getSessions(): Promise<{ sessions: SessionInfo[] }> {
    const res = await this.request('/auth/sessions', { method: 'GET' });
    return this.handleJsonResponse<{ sessions: SessionInfo[] }>(res);
  }

  public async revokeSession(sessionId: string): Promise<{ message: string }> {
    const res = await this.request(`/auth/sessions/${sessionId}/revoke`, { method: 'POST' });
    return this.handleJsonResponse<{ message: string }>(res);
  }

  private async handleJsonResponse<T = unknown>(res: Response): Promise<T> {
    const contentType = res.headers.get('Content-Type') || '';
    if (
      contentType.includes('application/json') ||
      contentType.includes('application/problem+json')
    ) {
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const message =
          (typeof data.detail === 'string' ? data.detail : null) ||
          (typeof data.title === 'string' ? data.title : null) ||
          `Request failed with status ${res.status}`;
        throw new HttpError(message, res.status, data);
      }
      return data as T;
    }
    if (!res.ok) {
      throw new HttpError(`Request failed with status ${res.status}`, res.status);
    }
    return (await res.text()) as unknown as T;
  }
}
