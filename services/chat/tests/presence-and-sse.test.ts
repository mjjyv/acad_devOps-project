import type { ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { PresenceManager, SseManager } from '../src/index.js';

function createMockResponse() {
  const chunks: string[] = [];
  const handlers: Record<string, Array<() => void>> = {};
  const res = {
    writableEnded: false,
    destroyed: false,
    writeHead: vi.fn(),
    write: vi.fn((chunk: string) => {
      chunks.push(chunk);
      return true;
    }),
    end: vi.fn(),
    on: vi.fn((event: string, cb: () => void) => {
      handlers[event] = handlers[event] ?? [];
      handlers[event].push(cb);
    }),
  } as unknown as ServerResponse;
  return {
    res,
    chunks,
    emitClose: () => {
      for (const cb of handlers.close ?? []) cb();
    },
  };
}

describe('@acad/chat-service SSE Gateway & PresenceManager', () => {
  it('delivers multi-tab SSE events, 15s heartbeat pings, and cleans up closed sockets', () => {
    const sse = new SseManager({ heartbeatIntervalMs: 15000 });
    const tab1 = createMockResponse();
    const tab2 = createMockResponse();

    sse.registerClient('u1', tab1.res);
    sse.registerClient('u1', tab2.res);
    expect(sse.getUserConnectionCount('u1')).toBe(2);

    const delivered = sse.sendToUser('u1', 'message:new', { text: 'hello' });
    expect(delivered).toBe(true);
    expect(tab1.chunks.some((c) => c.includes('event: message:new'))).toBe(true);
    expect(tab2.chunks.some((c) => c.includes('event: message:new'))).toBe(true);

    expect(sse.sendHeartbeat()).toBe(2);
    expect(tab1.chunks.some((c) => c === ': ping\n\n')).toBe(true);

    tab1.emitClose();
    expect(sse.getUserConnectionCount('u1')).toBe(1);
    sse.clearAll();
    expect(sse.getConnectedUsersCount()).toBe(0);
  });

  it('tracks online and typing state with in-memory TTL fallback', async () => {
    const presence = new PresenceManager();
    await presence.setOnline('u1');
    expect(await presence.isOnline('u1')).toBe(true);

    const batch = await presence.getOnlineStatusBatch(['u1', 'u2']);
    expect(batch).toEqual({ u1: true, u2: false });

    await presence.setTyping('ch1', 'u1', true);
    expect(await presence.isTyping('ch1', 'u1')).toBe(true);
    await presence.setTyping('ch1', 'u1', false);
    expect(await presence.isTyping('ch1', 'u1')).toBe(false);
  });
});
