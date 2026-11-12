import { AcadClient, HttpError, type TokenPair } from '@acad/auth-client';
import type { PublicUserProfile } from '@acad/contracts';

export const STORAGE_KEY_ACCESS_TOKEN = 'acad_access_token';
export const STORAGE_KEY_REFRESH_TOKEN = 'acad_refresh_token';

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured && !configured.includes('onrender.com') && configured.startsWith('http')) {
    return configured.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    return '';
  }
  return process.env.INTERNAL_API_URL || 'http://127.0.0.1:10000';
}

let clientInstance: AcadClient | null = null;

export function getApiClient(): AcadClient {
  if (!clientInstance) {
    const isBrowser = typeof window !== 'undefined';
    const initialAccessToken = isBrowser
      ? localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN) || undefined
      : undefined;
    const initialRefreshToken = isBrowser
      ? localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN) || undefined
      : undefined;

    clientInstance = new AcadClient({
      baseUrl: getApiBaseUrl(),
      initialAccessToken,
      initialRefreshToken,
      onTokensUpdated: (tokens: TokenPair) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, tokens.accessToken);
          localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, tokens.refreshToken);
        }
      },
      onSessionExpired: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
        }
      },
    });
  }
  return clientInstance;
}

export function resetApiClient(): void {
  if (clientInstance) {
    clientInstance.clearTokens();
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN);
  }
  clientInstance = null;
}

export async function apiJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const client = getApiClient();
  const res = await client.request(path, init);

  let payload: unknown = null;
  const contentType = res.headers.get('content-type') || '';
  if (
    contentType.includes('application/json') ||
    contentType.includes('application/problem+json')
  ) {
    try {
      payload = await res.json();
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const problem =
      payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : undefined;
    const message =
      (typeof problem?.detail === 'string' && problem.detail) ||
      (typeof problem?.title === 'string' && problem.title) ||
      `HTTP ${res.status}`;
    throw new HttpError(message, res.status, problem);
  }

  return payload as T;
}

export async function fetchPublicUserProfile(username: string): Promise<PublicUserProfile> {
  return apiJson<PublicUserProfile>(`/api/v1/auth/users/${encodeURIComponent(username)}`, {
    method: 'GET',
  });
}

export async function logoutAllDevices(): Promise<void> {
  await apiJson('/api/v1/auth/logout-all', { method: 'POST' });
  resetApiClient();
}

export function extractApiErrorMessage(
  err: unknown,
  fallback = 'Có lỗi xảy ra, vui lòng thử lại',
): string {
  if (err instanceof HttpError) {
    const invalidParams = err.rfc7807?.invalidParams;
    if (Array.isArray(invalidParams) && invalidParams.length > 0) {
      const first = invalidParams[0] as { message?: string };
      if (first?.message) return first.message;
    }
    return err.message;
  }
  return err instanceof Error ? err.message : fallback;
}
