import { AcadClient, type TokenPair } from '@acad/auth-client';

export const STORAGE_KEY_ACCESS_TOKEN = 'acad_access_token';
export const STORAGE_KEY_REFRESH_TOKEN = 'acad_refresh_token';

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:10000`;
  }
  return 'http://localhost:10000';
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
