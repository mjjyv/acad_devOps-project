/**
 * @file sse-manager.ts
 * @description Server-Sent Events (SSE) Gateway with Heartbeat (15s Keep-Alive) & Multi-Tab Support.
 */

import type { ServerResponse } from 'node:http';

export interface SseClient {
  userId: string;
  res: ServerResponse;
  connectedAt: Date;
}

export class SseManager {
  private clients = new Map<string, Set<ServerResponse>>(); // userId -> Set<ServerResponse>
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(options: { heartbeatIntervalMs?: number } = {}) {
    this.intervalMs = options.heartbeatIntervalMs ?? 15000;
  }

  /**
   * Khởi chạy tiến trình Heartbeat Ping 15 giây
   */
  public startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.intervalMs);
  }

  /**
   * Dừng tiến trình Heartbeat
   */
  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Đăng ký một kết nối SSE mới từ client
   */
  public registerClient(userId: string, res: ServerResponse): void {
    // 1. Thiết lập Headers tiêu chuẩn SSE RFC 8895
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Vô hiệu hóa bộ đệm Nginx/Proxy
    });

    // 2. Thêm vào tập hợp các tab của người dùng
    let userSockets = this.clients.get(userId);
    if (!userSockets) {
      userSockets = new Set();
      this.clients.set(userId, userSockets);
    }
    userSockets.add(res);

    // 3. Gửi thông điệp chào đón kết nối
    res.write(
      `event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`,
    );

    // 4. Lắng nghe sự kiện ngắt kết nối
    res.on('close', () => {
      this.removeClient(userId, res);
    });
  }

  /**
   * Gỡ bỏ kết nối khi client ngắt
   */
  public removeClient(userId: string, res: ServerResponse): void {
    const userSockets = this.clients.get(userId);
    if (userSockets) {
      userSockets.delete(res);
      if (userSockets.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  /**
   * Gửi sự kiện riêng tư tới một người dùng cụ thể (tất cả các tab đang mở)
   */
  public sendToUser(userId: string, event: string, data: unknown): boolean {
    const userSockets = this.clients.get(userId);
    if (!userSockets || userSockets.size === 0) {
      return false;
    }

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of userSockets) {
      try {
        res.write(payload);
      } catch {
        this.removeClient(userId, res);
      }
    }
    return true;
  }

  /**
   * Phát sóng sự kiện tới danh sách người dùng trong phòng chat
   */
  public broadcastToUsers(userIds: string[], event: string, data: unknown): number {
    let sentCount = 0;
    for (const uid of userIds) {
      if (this.sendToUser(uid, event, data)) {
        sentCount += 1;
      }
    }
    return sentCount;
  }

  /**
   * Gửi chuỗi Ping Comment giữ kết nối cho toàn bộ client đang online
   */
  public sendHeartbeat(): void {
    const pingComment = `: ping\n\n`;
    for (const [userId, sockets] of this.clients.entries()) {
      for (const res of sockets) {
        try {
          res.write(pingComment);
        } catch {
          this.removeClient(userId, res);
        }
      }
    }
  }

  /**
   * Đếm số lượng người dùng đang kết nối SSE
   */
  public getConnectedUserCount(): number {
    return this.clients.size;
  }

  /**
   * Kiểm tra người dùng có socket SSE đang mở không
   */
  public isUserConnected(userId: string): boolean {
    const sockets = this.clients.get(userId);
    return !!sockets && sockets.size > 0;
  }
}
