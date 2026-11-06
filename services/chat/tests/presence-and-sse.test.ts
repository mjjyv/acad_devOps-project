import type { ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { PresenceManager } from '../src/realtime/presence-manager.js';
import { SseManager } from '../src/realtime/sse-manager.js';

describe('Presence & Realtime SSE Engine (@acad/chat-service)', () => {
  describe('PresenceManager', () => {
    it('1. Quản lý trạng thái trực tuyến (Presence Heartbeat 15s) với In-memory fallback', async () => {
      const presence = new PresenceManager();
      const userId = '11111111-1111-1111-1111-111111111111';

      expect(await presence.isOnline(userId)).toBe(false);

      await presence.setOnline(userId);
      expect(await presence.isOnline(userId)).toBe(true);

      const statusMap = await presence.getOnlineUsers([
        userId,
        '22222222-2222-2222-2222-222222222222',
      ]);
      expect(statusMap[userId]).toBe(true);
      expect(statusMap['22222222-2222-2222-2222-222222222222']).toBe(false);
    });

    it('2. Quản lý tín hiệu đang nhập tin nhắn (Typing Indicator 5s)', async () => {
      const presence = new PresenceManager();
      const channelId = 'chan-abc-123';
      const userAlice = { id: 'u1', username: 'alice' };
      const userBob = { id: 'u2', username: 'bob' };

      expect(await presence.getTypingUsers(channelId)).toEqual([]);

      await presence.setTyping(channelId, userAlice.id, userAlice.username, true);
      let typingUsers = await presence.getTypingUsers(channelId);
      expect(typingUsers.length).toBe(1);
      expect(typingUsers[0]?.username).toBe('alice');

      await presence.setTyping(channelId, userBob.id, userBob.username, true);
      typingUsers = await presence.getTypingUsers(channelId);
      expect(typingUsers.length).toBe(2);

      // Xóa tín hiệu typing
      await presence.setTyping(channelId, userAlice.id, userAlice.username, false);
      typingUsers = await presence.getTypingUsers(channelId);
      expect(typingUsers.length).toBe(1);
      expect(typingUsers[0]?.username).toBe('bob');
    });
  });

  describe('SseManager', () => {
    it('3. Đăng ký client SSE và nhận gói tin sự kiện chuẩn RFC 8895', () => {
      const sse = new SseManager();
      const userId = 'user-sse-001';

      const writes: string[] = [];
      const mockRes = {
        writeHead: vi.fn(),
        write: vi.fn((data: string) => {
          writes.push(data);
          return true;
        }),
        on: vi.fn(),
      } as unknown as ServerResponse;

      sse.registerClient(userId, mockRes);
      expect(mockRes.writeHead).toHaveBeenCalledWith(
        200,
        expect.objectContaining({
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        }),
      );

      // Kiểm tra gói tin kết nối ban đầu
      expect(writes.some((w) => w.includes('event: connected'))).toBe(true);

      // Gửi event tới user
      sse.sendToUser(userId, 'chat_message:new', { messageId: 'msg-1', content: 'Hello' });
      expect(writes.some((w) => w.includes('chat_message:new') && w.includes('Hello'))).toBe(true);

      // Gửi ping heartbeat định kỳ
      sse.sendHeartbeat();
      expect(writes.some((w) => w === ': ping\n\n')).toBe(true);

      // Hủy client
      sse.removeClient(userId, mockRes);
      expect(sse.getConnectedUserCount()).toBe(0);
    });

    it('4. Hỗ trợ multi-tab: Phát sóng đồng thời tới nhiều tabs của cùng một user', () => {
      const sse = new SseManager();
      const userId = 'multi-tab-user';

      const tab1Writes: string[] = [];
      const tab2Writes: string[] = [];

      const mockRes1 = {
        writeHead: vi.fn(),
        write: vi.fn((d: string) => tab1Writes.push(d)),
        on: vi.fn(),
      } as unknown as ServerResponse;
      const mockRes2 = {
        writeHead: vi.fn(),
        write: vi.fn((d: string) => tab2Writes.push(d)),
        on: vi.fn(),
      } as unknown as ServerResponse;

      sse.registerClient(userId, mockRes1);
      sse.registerClient(userId, mockRes2);
      expect(sse.getConnectedUserCount()).toBe(1);
      expect(sse.isUserConnected(userId)).toBe(true);

      sse.sendToUser(userId, 'notification', { alert: 'Multi tab test' });
      expect(tab1Writes.some((w) => w.includes('Multi tab test'))).toBe(true);
      expect(tab2Writes.some((w) => w.includes('Multi tab test'))).toBe(true);

      sse.removeClient(userId, mockRes1);
      expect(sse.isUserConnected(userId)).toBe(true); // Tab 2 vẫn còn mở

      sse.removeClient(userId, mockRes2);
      expect(sse.isUserConnected(userId)).toBe(false); // Tất cả các tabs đã đóng
    });
  });
});
