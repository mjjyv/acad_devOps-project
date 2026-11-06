import { AcadClient, type TokenPair } from '@acad/auth-client';

export const STORAGE_KEY_ACCESS_TOKEN = 'acad_access_token';
export const STORAGE_KEY_REFRESH_TOKEN = 'acad_refresh_token';

function getApiBaseUrl(): string {
  // If explicit external API URL is specified (and not outdated cloud placeholder)
  if (
    process.env.NEXT_PUBLIC_API_URL &&
    !process.env.NEXT_PUBLIC_API_URL.includes('onrender.com') &&
    process.env.NEXT_PUBLIC_API_URL.startsWith('http')
  ) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // In browser: empty string ('') uses same-origin relative paths.
  // Next.js rewrites in next.config.mjs proxy /auth/* and /api/* to the internal API (port 10000).
  // This guarantees 100% immunity to CORS and port-forwarding issues across custom domains & Cloudflare tunnels.
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
