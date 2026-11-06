import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '@acad/auth-service';
import {
  ChatService,
  InMemoryChatRepository,
  PresenceManager,
  SseManager,
} from '@acad/chat-service';
import type { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('Kiểm thử Endpoints Phân Hệ Chat Thời Gian Thực (@acad/api-gateway/chat)', () => {
  let app: Application;
  let userRepo: InMemoryUserRepository;
  let sessionStore: InMemorySessionStore;
  let authService: AuthService;
  let chatRepo: InMemoryChatRepository;
  let presenceManager: PresenceManager;
  let sseManager: SseManager;
  let chatService: ChatService;

  const TEST_JWT_SECRET = 'acad-test-super-secret-key-32-chars-long!';

  let aliceToken: string;
  let bobToken: string;
  let _charlieToken: string;
  let aliceId: string;
  let bobId: string;
  let charlieId: string;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    sessionStore = new InMemorySessionStore();
    authService = new AuthService(userRepo, sessionStore, TEST_JWT_SECRET);

    chatRepo = new InMemoryChatRepository();
    presenceManager = new PresenceManager();
    sseManager = new SseManager();
    chatService = new ChatService(chatRepo, sseManager, presenceManager);

    app = createApp({
      authService,
      chatServices: {
        chatService,
        presenceManager,
        sseManager,
      },
      jwtSecret: TEST_JWT_SECRET,
    });

    // Tạo 3 tài khoản kiểm thử
    const uAlice = await authService.register({
      username: 'alice_chat',
      email: 'alice@acad.vn',
      password: 'StrongPassword123!',
    });
    aliceId = uAlice.user.id;
    aliceToken = uAlice.accessToken;
    chatRepo.seedUser({ id: aliceId, username: 'alice_chat', avatarUrl: null });

    const uBob = await authService.register({
      username: 'bob_chat',
      email: 'bob@acad.vn',
      password: 'StrongPassword123!',
    });
    bobId = uBob.user.id;
    bobToken = uBob.accessToken;
    chatRepo.seedUser({ id: bobId, username: 'bob_chat', avatarUrl: null });

    const uCharlie = await authService.register({
      username: 'charlie_chat',
      email: 'charlie@acad.vn',
      password: 'StrongPassword123!',
    });
    charlieId = uCharlie.user.id;
    _charlieToken = uCharlie.accessToken;
    chatRepo.seedUser({ id: charlieId, username: 'charlie_chat', avatarUrl: null });
  });

  it('1. Bắt đầu chat 1-1 với người lạ -> Tạo ChatRequest PENDING (201 Created)', async () => {
    const res = await request(app)
      .post('/chat/channels/direct')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        recipientId: bobId,
        initialMessage: 'Xin chào Bob, kết nối trao đổi về DevOps nhé!',
      });

    expect(res.status).toBe(201);
    expect(res.body.isRequest).toBe(true);
    expect(res.body.request.senderId).toBe(aliceId);
    expect(res.body.request.receiverId).toBe(bobId);
    expect(res.body.request.status).toBe('PENDING');
  });

  it('2. Chặn tự nhắn tin trực tiếp cho chính mình (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/chat/channels/direct')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        recipientId: aliceId,
        initialMessage: 'Tự chat với bản thân',
      });

    expect(res.status).toBe(400);
    expect(res.body.title).toBe('Bad Request');
  });

  it('3. Bob xem danh sách yêu cầu tin nhắn và chấp nhận (ACCEPTED) -> Kênh DIRECT được tạo', async () => {
    // Alice gửi request
    const initRes = await request(app)
      .post('/chat/channels/direct')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ recipientId: bobId, initialMessage: 'Hello Bob' });
    const requestId = initRes.body.request.id;

    // Bob kiểm tra danh sách requests
    const listRes = await request(app)
      .get('/chat/requests')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.requests.length).toBe(1);

    // Bob chấp nhận
    const acceptRes = await request(app)
      .patch(`/chat/requests/${requestId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ status: 'ACCEPTED' });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.request.status).toBe('ACCEPTED');
    expect(acceptRes.body.channel.type).toBe('DIRECT');

    // Cả 2 đều có kênh chat trong danh sách
    const bobChannels = await request(app)
      .get('/chat/channels')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(bobChannels.body.channels.length).toBe(1);
    expect(bobChannels.body.channels[0].unreadCount).toBe(1); // Tin nhắn Hello Bob
  });

  it('4. Gửi tin nhắn và phản hồi theo luồng Chat Thread', async () => {
    // Thiết lập kênh chat 1-1
    const initRes = await request(app)
      .post('/chat/channels/direct')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ recipientId: bobId, initialMessage: 'Root message for thread' });
    const requestId = initRes.body.request.id;
    const acceptRes = await request(app)
      .patch(`/chat/requests/${requestId}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ status: 'ACCEPTED' });
    const channelId = acceptRes.body.channel.id;

    // Lấy tin nhắn gốc
    const msgListRes = await request(app)
      .get(`/chat/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${bobToken}`);
    const rootMessageId = msgListRes.body.messages[0].id;

    // Bob gửi câu trả lời phân nhánh (Thread Reply)
    const replyRes = await request(app)
      .post(`/chat/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({
        content: 'Replying inside the thread',
        parentMessageId: rootMessageId,
      });

    expect(replyRes.status).toBe(201);
    expect(replyRes.body.message.parentMessageId).toBe(rootMessageId);

    // Lọc tin nhắn chỉ trong Thread con
    const threadMsgs = await request(app)
      .get(`/chat/channels/${channelId}/messages?parentMessageId=${rootMessageId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(threadMsgs.status).toBe(200);
    expect(threadMsgs.body.messages.length).toBe(1);
    expect(threadMsgs.body.messages[0].content).toBe('Replying inside the thread');
  });

  it('5. Tạo Group Chat thành công với nhiều người tham gia', async () => {
    const res = await request(app)
      .post('/chat/channels/group')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({
        name: 'DevOps Kiến Trúc Nhóm A',
        memberIds: [bobId, charlieId],
      });

    expect(res.status).toBe(201);
    expect(res.body.channel.type).toBe('GROUP');
    expect(res.body.channel.name).toBe('DevOps Kiến Trúc Nhóm A');
    expect(res.body.channel.membersCount).toBe(3);
  });

  it('6. Typing indicator và Presence heartbeat endpoints', async () => {
    // Heartbeat
    const heartRes = await request(app)
      .post('/chat/presence/heartbeat')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(heartRes.status).toBe(200);
    expect(heartRes.body.isOnline).toBe(true);

    // Tạo kênh trước để test typing
    const initRes = await request(app)
      .post('/chat/channels/direct')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ recipientId: bobId, initialMessage: 'Ping' });
    const acceptRes = await request(app)
      .patch(`/chat/requests/${initRes.body.request.id}`)
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ status: 'ACCEPTED' });
    const channelId = acceptRes.body.channel.id;

    // Gửi typing indicator
    const typingRes = await request(app)
      .post(`/chat/channels/${channelId}/typing`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ isTyping: true });
    expect(typingRes.status).toBe(200);
    expect(typingRes.body.status).toBe('ok');
  });

  it('7. SSE endpoint từ chối khi không có token (401) và chấp nhận query token', async () => {
    const unauthorizedRes = await request(app).get('/chat/events');
    expect(unauthorizedRes.status).toBe(401);
    expect(unauthorizedRes.body.title).toBe('Missing Authorization Token');
  });
});
