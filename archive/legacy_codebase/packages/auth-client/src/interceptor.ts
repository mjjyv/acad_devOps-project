export type ClientAuthState =
  | 'AUTHENTICATED'
  | 'REFRESHING'
  | 'QUEUED'
  | 'UNAUTHENTICATED';

export type RequestCallback<T = any> = (accessToken: string) => Promise<T>;

export interface ClientInterceptorConfig {
  refreshEndpoint: () => Promise<{ accessToken: string }>;
  onUnauthenticated: (reason?: string) => void;
}

export class ClientAuthInterceptor {
  private state: ClientAuthState = 'UNAUTHENTICATED';
  private currentAccessToken: string | null = null;
  private refreshPromise: Promise<string> | null = null;
  private subscriberQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  constructor(private config: ClientInterceptorConfig) {}

  public getState(): ClientAuthState {
    return this.state;
  }

  public setAccessToken(token: string | null): void {
    this.currentAccessToken = token;
    this.state = token ? 'AUTHENTICATED' : 'UNAUTHENTICATED';
  }

  public getAccessToken(): string | null {
    return this.currentAccessToken;
  }

  /**
   * Bộ điều phối gọi API có bảo vệ token tự động làm mới với cơ chế Mutex Lock
   */
  public async executeWithAuth<T>(requestFn: RequestCallback<T>): Promise<T> {
    // Nếu chưa có token, thử refresh lần đầu
    if (!this.currentAccessToken && this.state !== 'REFRESHING') {
      try {
        const token = await this.acquireRefreshedToken();
        return await requestFn(token);
      } catch (err) {
        this.config.onUnauthenticated('Không thể khởi tạo phiên làm việc');
        throw err;
      }
    }

    try {
      if (this.state === 'REFRESHING') {
        const token = await this.enqueueSubscriber();
        return await requestFn(token);
      }

      return await requestFn(this.currentAccessToken!);
    } catch (error: any) {
      // Bắt lỗi 401 Unauthorized để kích hoạt chu trình làm mới token
      if (this.isUnauthorizedError(error)) {
        const freshToken = await this.acquireRefreshedToken();
        return await requestFn(freshToken);
      }
      throw error;
    }
  }

  /**
   * Kích hoạt tiến trình làm mới token với Mutex Lock:
   * Chỉ duy nhất 1 promise refresh được chạy tại một thời điểm
   */
  private async acquireRefreshedToken(): Promise<string> {
    if (this.refreshPromise) {
      // Đã có một request khác đang tiến hành refresh -> đưa vào hàng đợi
      return this.enqueueSubscriber();
    }

    this.state = 'REFRESHING';

    this.refreshPromise = (async () => {
      try {
        const { accessToken } = await this.config.refreshEndpoint();
        this.setAccessToken(accessToken);
        this.state = 'AUTHENTICATED';

        // Re-play và giải phóng toàn bộ hàng đợi subscriber
        const subscribers = [...this.subscriberQueue];
        this.subscriberQueue = [];
        subscribers.forEach((sub) => sub.resolve(accessToken));

        return accessToken;
      } catch (refreshError) {
        this.state = 'UNAUTHENTICATED';
        this.setAccessToken(null);

        // Báo lỗi cho toàn bộ subscriber đang chờ
        const subscribers = [...this.subscriberQueue];
        this.subscriberQueue = [];
        subscribers.forEach((sub) => sub.reject(refreshError));

        this.config.onUnauthenticated('Phiên làm việc đã hết hạn');
        throw refreshError;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private enqueueSubscriber(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      this.subscriberQueue.push({ resolve, reject });
    });
  }

  private isUnauthorizedError(error: any): boolean {
    if (!error) return false;
    if (error.status === 401 || error.statusCode === 401) return true;
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) return true;
    return false;
  }
}
