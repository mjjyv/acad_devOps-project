import { beforeEach, describe, expect, it } from 'vitest';
import { PresenceManager } from '../src/realtime/presence-manager.js';
import { SseManager } from '../src/realtime/sse-manager.js';
import { InMemoryChatRepository } from '../src/repository/chat-repository.js';
import {
  CannotChatWithSelfError,
  ChatService,
  NotChannelMemberError,
  ParentMessageNotFoundError,
  UserBlockedError,
} from '../src/services/chat-service.js';

describe('Động cơ Chat & Hàng đợi Yêu cầu Tin Nhắn (@acad/chat-service)', () => {
  let repo: InMemoryChatRepository;
  let sseManager: SseManager;
  let presenceManager: PresenceManager;
  let chatService: ChatService;

  const userAlice = {
    id: '11111111-1111-1111-1111-111111111111',
    username: 'alice',
    avatarUrl: null,
  };
  const userBob = { id: '22222222-2222-2222-2222-222222222222', username: 'bob', avatarUrl: null };
  const userCharlie = {
    id: '33333333-3333-3333-3333-333333333333',
    username: 'charlie',
    avatarUrl: null,
  };

  beforeEach(() => {
    repo = new InMemoryChatRepository();
    repo.seedUser(userAlice);
    repo.seedUser(userBob);
    repo.seedUser(userCharlie);

    sseManager = new SseManager();
    presenceManager = new PresenceManager();
    chatService = new ChatService(repo, sseManager, presenceManager);
  });

  it('1. Bắt đầu chat 1-1 với người lạ -> Tạo ChatRequest PENDING', async () => {
    const res = await chatService.initiateDirectChat(
      userAlice.id,
      userBob.id,
      'Xin chào Bob, mình thảo luận về DevOps nhé!',
    );

    expect(res.isRequest).toBe(true);
    expect(res.request).toBeDefined();
    expect(res.request?.status).toBe('PENDING');
    expect(res.request?.senderUsername).toBe('alice');
    expect(res.request?.initialMessage).toBe('Xin chào Bob, mình thảo luận về DevOps nhé!');
  });

  it('2. Chặn tự nhắn tin cho chính mình', async () => {
    await expect(
      chatService.initiateDirectChat(userAlice.id, userAlice.id, 'Hello me'),
    ).rejects.toThrow(CannotChatWithSelfError);
  });

  it('3. Người nhận ACCEPTED ChatRequest -> Tự động sinh kênh DIRECT và tin nhắn đầu tiên', async () => {
    const initRes = await chatService.initiateDirectChat(userAlice.id, userBob.id, 'Xin chào Bob!');
    const requestId = initRes.request?.id;

    const respondRes = await chatService.respondChatRequest(requestId, userBob.id, 'ACCEPTED');

    expect(respondRes.request.status).toBe('ACCEPTED');
    expect(respondRes.channel).toBeDefined();
    expect(respondRes.channel?.type).toBe('DIRECT');
    expect(respondRes.channel?.membersCount).toBe(2);

    // Kiểm tra tin nhắn trong kênh vừa tạo
    const messages = await chatService.listMessages(respondRes.channel?.id, userBob.id);
    expect(messages.length).toBe(1);
    expect(messages[0]?.content).toBe('Xin chào Bob!');
    expect(messages[0]?.senderId).toBe(userAlice.id);
  });

  it('4. Người nhận BLOCKED ChatRequest -> Người gửi bị chặn vĩnh viễn (403)', async () => {
    const initRes = await chatService.initiateDirectChat(userAlice.id, userBob.id, 'Spam message');
    const requestId = initRes.request?.id;

    await chatService.respondChatRequest(requestId, userBob.id, 'BLOCKED');

    // Alice cố gắng gửi lại tin nhắn cho Bob -> Phải bị chặn
    await expect(
      chatService.initiateDirectChat(userAlice.id, userBob.id, 'Another try'),
    ).rejects.toThrow(UserBlockedError);
  });

  it('5. Tạo Group Chat thành công với nhiều thành viên', async () => {
    const group = await chatService.createGroupChannel(userAlice.id, 'DevOps Core Team', [
      userBob.id,
      userCharlie.id,
    ]);

    expect(group.type).toBe('GROUP');
    expect(group.name).toBe('DevOps Core Team');
    expect(group.membersCount).toBe(3);

    // Gửi tin nhắn vào Group
    const msg = await chatService.sendMessage(userAlice.id, {
      channelId: group.id,
      content: 'Chào cả nhóm, cùng deploy lên Render nhé!',
    });

    expect(msg.content).toBe('Chào cả nhóm, cùng deploy lên Render nhé!');
    expect(msg.senderUsername).toBe('alice');

    // Bob xem danh sách tin nhắn
    const msgs = await chatService.listMessages(group.id, userBob.id);
    expect(msgs.length).toBe(1);
  });

  it('6. Chặn người dùng ngoài phòng gửi tin nhắn (NotChannelMemberError)', async () => {
    const group = await chatService.createGroupChannel(userAlice.id, 'Private Group', [userBob.id]);

    await expect(
      chatService.sendMessage(userCharlie.id, {
        channelId: group.id,
        content: 'I want in',
      }),
    ).rejects.toThrow(NotChannelMemberError);
  });

  it('7. Chat Threads: Phân nhánh thảo luận qua parentMessageId', async () => {
    const group = await chatService.createGroupChannel(userAlice.id, 'DevOps Architecture', [
      userBob.id,
    ]);

    // Tin nhắn gốc của Alice
    const rootMsg = await chatService.sendMessage(userAlice.id, {
      channelId: group.id,
      content: 'Bàn về kiến trúc Redis Lua vs PostgreSQL Ltree',
    });

    // Bob trả lời lồng nhau vào nhánh của tin nhắn gốc
    const reply1 = await chatService.sendMessage(userBob.id, {
      channelId: group.id,
      parentMessageId: rootMsg.id,
      content: 'Redis Lua tối ưu O(1) cho tác vụ bỏ phiếu cao tần',
    });

    // Alice trả lời tiếp trong nhánh con
    const reply2 = await chatService.sendMessage(userAlice.id, {
      channelId: group.id,
      parentMessageId: rootMsg.id,
      content: 'Đồng ý, còn PostgreSQL ltree tốt cho cấu trúc bình luận phân cấp',
    });

    expect(reply1.parentMessageId).toBe(rootMsg.id);
    expect(reply2.parentMessageId).toBe(rootMsg.id);

    // Lấy tin nhắn riêng của nhánh con (Thread View)
    const threadReplies = await chatService.listMessages(group.id, userAlice.id, {
      parentMessageId: rootMsg.id,
    });
    expect(threadReplies.length).toBe(2);

    // Lấy tin nhắn của dòng chính (Main Feed: parentMessageId = null)
    const mainMessages = await chatService.listMessages(group.id, userAlice.id, {
      parentMessageId: null,
    });
    expect(mainMessages.length).toBe(1);
    expect(mainMessages[0]?.repliesCount).toBe(2);
  });

  it('8. Báo lỗi khi parentMessageId không tồn tại', async () => {
    const group = await chatService.createGroupChannel(userAlice.id, 'Test Group', [userBob.id]);

    await expect(
      chatService.sendMessage(userAlice.id, {
        channelId: group.id,
        parentMessageId: '99999999-9999-9999-9999-999999999999',
        content: 'Invalid parent reply',
      }),
    ).rejects.toThrow(ParentMessageNotFoundError);
  });

  it('9. Tính toán unreadCount chính xác khi đọc tin nhắn', async () => {
    // Tạo quan hệ direct chat
    const initRes = await chatService.initiateDirectChat(userAlice.id, userBob.id, 'Hello Bob');
    const channelRes = await chatService.respondChatRequest(
      initRes.request?.id,
      userBob.id,
      'ACCEPTED',
    );
    const channelId = channelRes.channel?.id;

    // Alice gửi thêm 2 tin nhắn
    await chatService.sendMessage(userAlice.id, { channelId, content: 'Msg 1' });
    await chatService.sendMessage(userAlice.id, { channelId, content: 'Msg 2' });

    // Bob kiểm tra danh sách channel -> unreadCount = 3
    let bobChannels = await chatService.listChannels(userBob.id);
    expect(bobChannels[0]?.unreadCount).toBe(3);

    // Bob đọc tin nhắn trong phòng
    await chatService.listMessages(channelId, userBob.id);

    // Bob kiểm tra lại -> unreadCount = 0
    bobChannels = await chatService.listChannels(userBob.id);
    expect(bobChannels[0]?.unreadCount).toBe(0);
  });
});
