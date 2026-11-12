import type { IncomingMessage, ServerResponse } from 'node:http';

export interface SseClient {
  userId: string;
  res: ServerResponse;
  connectedAt: Date;
}

/**
 * Server-Sent Events (SSE) Gateway conforming to RFC 8895 with 15s keep-alive pings and multi-tab delivery.
 */
export class SseManager {
  private readonly clients = new Map<string, Set<ServerResponse>>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private readonly intervalMs: number;

  constructor(options: { heartbeatIntervalMs?: number } = {}) {
    this.intervalMs = options.heartbeatIntervalMs ?? 15000;
  }

  public startHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.intervalMs);
    this.heartbeatTimer.unref();
  }

  public stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  public registerClient(userId: string, res: ServerResponse, req?: IncomingMessage): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let userSockets = this.clients.get(userId);
    if (!userSockets) {
      userSockets = new Set();
      this.clients.set(userId, userSockets);
    }
    userSockets.add(res);

    if (this.isSocketAlive(res)) {
      res.write(
        `event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`,
      );
    }

    let cleanedUp = false;
    const onDisconnect = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      this.removeClient(userId, res);
    };

    res.on('close', onDisconnect);
    res.on('error', onDisconnect);
    req?.on('close', onDisconnect);
  }

  private isSocketAlive(res: ServerResponse): boolean {
    return !res.writableEnded && !res.destroyed;
  }

  public removeClient(userId: string, res: ServerResponse): void {
    const userSockets = this.clients.get(userId);
    if (!userSockets) return;
    userSockets.delete(res);
    if (userSockets.size === 0) {
      this.clients.delete(userId);
    }
  }

  public sendToUser(userId: string, event: string, data: unknown): boolean {
    const userSockets = this.clients.get(userId);
    if (!userSockets || userSockets.size === 0) return false;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    let delivered = false;
    for (const res of Array.from(userSockets)) {
      if (!this.isSocketAlive(res)) {
        this.removeClient(userId, res);
        continue;
      }
      try {
        res.write(payload);
        delivered = true;
      } catch {
        this.removeClient(userId, res);
      }
    }
    return delivered;
  }

  public broadcastToChannel(memberIds: string[], event: string, data: unknown): number {
    let count = 0;
    for (const uid of memberIds) {
      if (this.sendToUser(uid, event, data)) {
        count += 1;
      }
    }
    return count;
  }

  public sendHeartbeat(): number {
    let pinged = 0;
    for (const [userId, userSockets] of Array.from(this.clients.entries())) {
      for (const res of Array.from(userSockets)) {
        if (!this.isSocketAlive(res)) {
          this.removeClient(userId, res);
          continue;
        }
        try {
          res.write(': ping\n\n');
          pinged += 1;
        } catch {
          this.removeClient(userId, res);
        }
      }
    }
    return pinged;
  }

  public getConnectedUsersCount(): number {
    return this.clients.size;
  }

  public getUserConnectionCount(userId: string): number {
    return this.clients.get(userId)?.size ?? 0;
  }

  public clearAll(): void {
    this.stopHeartbeat();
    for (const userSockets of this.clients.values()) {
      for (const res of userSockets) {
        try {
          res.end();
        } catch {
          // ignore
        }
      }
    }
    this.clients.clear();
  }
}
