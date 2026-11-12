import { describe, expect, it } from 'vitest';
import {
  CannotChatWithSelfError,
  CannotCreateSoloGroupError,
  ChatService,
  DuplicateChatRequestError,
  InMemoryChatRepository,
  PresenceManager,
  SseManager,
  UserBlockedError,
} from '../src/index.js';

describe('@acad/chat-service Direct Chat, Stranger Queue, Group & Chat Threads', () => {
  it('routes stranger DM through PENDING queue -> ACCEPTED channel + threads + mark-read', async () => {
    const repo = new InMemoryChatRepository();
    const sse = new SseManager();
    const presence = new PresenceManager();
    const chat = new ChatService(repo, sse, presence);

    const aliceId = 'a0000000-0000-0000-0000-000000000001';
    const bobId = 'a0000000-0000-0000-0000-000000000002';
    repo.registerUser({ id: aliceId, username: 'alice', avatarUrl: null });
    repo.registerUser({ id: bobId, username: 'bob', avatarUrl: null });

    await expect(chat.initiateDirectChat(aliceId, aliceId, 'self')).rejects.toThrow(
      CannotChatWithSelfError,
    );

    // 1. Alice sends DM request to Bob -> PENDING
    const init = await chat.initiateDirectChat(aliceId, bobId, 'Xin chao Bob!');
    expect(init.isRequest).toBe(true);
    expect(init.request?.status).toBe('PENDING');

    // Duplicate pending throws 409 domain error
    await expect(chat.initiateDirectChat(aliceId, bobId, 'Ping again')).rejects.toThrow(
      DuplicateChatRequestError,
    );

    const bobQueue = await chat.listRequests(bobId, 'incoming');
    expect(bobQueue.incoming).toHaveLength(1);

    // 2. Bob accepts -> DIRECT channel created with initialMessage
    const accepted = await chat.respondChatRequest(init.request?.id ?? '', bobId, 'ACCEPTED');
    expect(accepted.channel?.type).toBe('DIRECT');
    expect(accepted.channel?.unreadCount).toBe(1);

    await chat.markChannelAsRead(accepted.channel?.id ?? '', bobId);
    const bobChannels = await chat.listUserChannels(bobId);
    expect(bobChannels[0]?.unreadCount).toBe(0);

    // 3. Nested Chat Thread reply
    const listed = await chat.listMessages(accepted.channel?.id ?? '', bobId);
    const parentMsg = listed.messages[0];
    expect(parentMsg).toBeDefined();

    const reply = await chat.sendMessage(bobId, {
      channelId: accepted.channel?.id,
      parentMessageId: parentMsg?.id,
      content: 'Chao Alice!',
    });
    expect(reply.parentMessageId).toBe(parentMsg?.id);

    const threadReplies = await chat.listMessages(accepted.channel?.id ?? '', aliceId, {
      parentMessageId: parentMsg?.id,
    });
    expect(threadReplies.messages).toHaveLength(1);
    expect(threadReplies.messages[0]?.content).toBe('Chao Alice!');

    // Pure-image attachment message without text
    const imageMsg = await chat.sendMessage(aliceId, {
      channelId: accepted.channel?.id,
      content: '',
      attachments: [{ type: 'IMAGE', url: 'https://cdn.acad.vn/uploads/a.png', title: 'a.png' }],
    });
    expect(imageMsg.attachments).toHaveLength(1);
    expect(imageMsg.attachments[0]?.type).toBe('IMAGE');
  });

  it('enforces BLOCKED anti-harassment and prevents solo groups', async () => {
    const repo = new InMemoryChatRepository();
    const chat = new ChatService(repo, new SseManager(), new PresenceManager());

    const u1 = 'a0000000-0000-0000-0000-000000000011';
    const u2 = 'a0000000-0000-0000-0000-000000000012';
    repo.registerUser({ id: u1, username: 'spammer', avatarUrl: null });
    repo.registerUser({ id: u2, username: 'target', avatarUrl: null });

    const req = await chat.initiateDirectChat(u1, u2, 'spam');
    await chat.respondChatRequest(req.request?.id ?? '', u2, 'BLOCKED');

    await expect(chat.initiateDirectChat(u1, u2, 'more spam')).rejects.toThrow(UserBlockedError);
    await expect(chat.createGroupChannel(u1, 'Solo', [u1])).rejects.toThrow(
      CannotCreateSoloGroupError,
    );
  });
});
