/**
 * @file interceptor.ts
 * @description Client-side Mutex Lock and Subscriber Queue preventing Thundering Herd on 401 token refresh.
 */

export type RefreshFn = () => Promise<string | null>;

export interface MutexRefreshOptions {
  refreshFn: RefreshFn;
  onRefreshSuccess?: (newAccessToken: string) => void;
  onRefreshFailure?: (error: Error) => void;
}

/**
 * Thrown when the refresh token is definitively rejected (401/403) by the auth server.
 * Transient errors (429, 5xx, network timeout) do NOT revoke local tokens.
 */
export class AuthRefreshRevokedError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AuthRefreshRevokedError';
  }
}

/**
 * TokenRefreshMutex guarantees that if multiple concurrent requests encounter 401,
 * only ONE network call to the refresh endpoint is executed. All other concurrent
 * requests wait in a subscriber queue and receive the fresh access token.
 */
export class TokenRefreshMutex {
  private isRefreshing = false;
  private refreshPromise: Promise<string | null> | null = null;
  private refreshSubscribers: Array<{
    resolve: (token: string | null) => void;
    reject: (err: Error) => void;
  }> = [];

  private refreshFn: RefreshFn;
  private onRefreshSuccess?: ((newAccessToken: string) => void) | undefined;
  private onRefreshFailure?: ((error: Error) => void) | undefined;

  constructor(options: MutexRefreshOptions) {
    this.refreshFn = options.refreshFn;
    this.onRefreshSuccess = options.onRefreshSuccess;
    this.onRefreshFailure = options.onRefreshFailure;
  }

  public async acquireToken(): Promise<string | null> {
    if (this.isRefreshing && this.refreshPromise) {
      return new Promise<string | null>((resolve, reject) => {
        this.refreshSubscribers.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    this.refreshPromise = (async () => {
      try {
        const newAccessToken = await this.refreshFn();
        if (newAccessToken) {
          this.onRefreshSuccess?.(newAccessToken);
          for (const sub of this.refreshSubscribers) {
            sub.resolve(newAccessToken);
          }
        } else {
          const err = new AuthRefreshRevokedError(401, 'Token refresh returned empty access token');
          this.onRefreshFailure?.(err);
          for (const sub of this.refreshSubscribers) {
            sub.reject(err);
          }
        }
        return newAccessToken;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.onRefreshFailure?.(error);
        for (const sub of this.refreshSubscribers) {
          sub.reject(error);
        }
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
        this.refreshSubscribers = [];
      }
    })();

    return this.refreshPromise;
  }

  public isLocked(): boolean {
    return this.isRefreshing;
  }

  public setRefreshFn(fn: RefreshFn): void {
    this.refreshFn = fn;
  }
}
