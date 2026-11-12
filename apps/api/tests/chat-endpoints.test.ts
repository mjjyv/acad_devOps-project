import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '@acad/auth-service';
import {
  ChatService,
  InMemoryChatRepository,
  PresenceManager,
  SseManager,
} from '@acad/chat-service';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index.js';

const TEST_SECRET = 'chat-test-secret-32-chars-minimum!';

describe('@acad/api-gateway Chat, Requests Queue & Presence Endpoints', () => {
  it('handles DM request -> accept -> message + thread -> mark-read + presence heartbeat', async () => {
    const userRepo = new InMemoryUserRepository();
    const store = new InMemorySessionStore();
    const authService = new AuthService(userRepo, store, TEST_SECRET);

    const chatRepo = new InMemoryChatRepository();
    const sseManager = new SseManager();
    const presenceManager = new PresenceManager();
    const chatService = new ChatService(chatRepo, sseManager, presenceManager);

    const app = createApp({
      authService,
      chatServices: { chatService, sseManager, presenceManager },
      jwtSecret: TEST_SECRET,
      disableRateLimit: true,
    });

    const regA = await request(app).post('/api/v1/auth/register').send({
      username: 'chat_alice',
      email: 'alice@chat.vn',
      password: 'Password123!',
    });
    const regB = await request(app).post('/api/v1/auth/register').send({
      username: 'chat_bob',
      email: 'bob@chat.vn',
      password: 'Password123!',
    });

    const tokenA = regA.body.tokens.accessToken as string;
    const tokenB = regB.body.tokens.accessToken as string;
    const idA = regA.body.user.id as string;
    const idB = regB.body.user.id as string;

    chatRepo.registerUser({ id: idA, username: 'chat_alice', avatarUrl: null });
    chatRepo.registerUser({ id: idB, username: 'chat_bob', avatarUrl: null });

    const dmRes = await request(app)
      .post('/api/v1/chat/channels/direct')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipientId: idB, initialMessage: 'Hello Bob' });
    expect(dmRes.status).toBe(202);
    expect(dmRes.body.isRequest).toBe(true);
    const requestId = dmRes.body.request.id as string;

    const acceptRes = await request(app)
      .patch(`/api/v1/chat/requests/${requestId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'ACCEPTED' });
    expect(acceptRes.status).toBe(200);
    const channelId = acceptRes.body.channel.id as string;

    const msgRes = await request(app)
      .post(`/api/v1/chat/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ content: 'Hi Alice!' });
    expect(msgRes.status).toBe(201);

    const imgMsgRes = await request(app)
      .post(`/api/v1/chat/channels/${channelId}/messages`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        content: '',
        attachments: [
          { type: 'IMAGE', url: 'https://cdn.acad.vn/uploads/pic.png', title: 'pic.png' },
        ],
      });
    expect(imgMsgRes.status).toBe(201);
    expect(imgMsgRes.body.message.attachments).toHaveLength(1);

    const hbRes = await request(app)
      .post('/api/v1/chat/presence/heartbeat')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(hbRes.status).toBe(200);

    const batchRes = await request(app)
      .post('/api/v1/chat/presence/batch')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ userIds: [idA, idB] });
    expect(batchRes.status).toBe(200);
    expect(batchRes.body.statuses[idA]).toBe(true);
  });
});
