import { describe, expect, it } from 'vitest';
import {
  AdminUpdateUserStatusInputSchema,
  ChatRequestSchema,
  CreateCommentInputSchema,
  CreateGroupChannelInputSchema,
  CreateSpaceInputSchema,
  CreateThreadInputSchema,
  CursorPaginationQuerySchema,
  FlatCommentItemSchema,
  HealthCheckResponseSchema,
  LoginInputSchema,
  ProblemDetailsSchema,
  PublicUserProfileSchema,
  RegisterInputSchema,
  SpaceSchema,
  UserProfileSchema,
  UserSearchQuerySchema,
  VoteInputSchema,
} from '../src/index.js';

describe('@acad/contracts v3.0.0 Schema Validation', () => {
  it('validates RFC 7807 ProblemDetails and HealthCheckResponse', () => {
    const problem = ProblemDetailsSchema.parse({
      type: 'https://api.acad.vn/errors/validation-error',
      title: 'Validation Failed',
      status: 400,
      detail: 'Invalid request payload',
      code: 'VALIDATION_FAILED',
    });
    expect(problem.status).toBe(400);

    const health = HealthCheckResponseSchema.parse({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: 12.5,
      version: '3.0.0',
      services: { database: 'ok', redis: 'ok' },
    });
    expect(health.services.database).toBe('ok');
  });

  it('validates RegisterInput password complexity and username constraints', () => {
    const valid = RegisterInputSchema.safeParse({
      username: 'devops_master',
      email: 'master@acad.vn',
      password: 'Password123!',
    });
    expect(valid.success).toBe(true);

    expect(
      RegisterInputSchema.safeParse({
        username: 'ab',
        email: 'bad',
        password: 'weak',
      }).success,
    ).toBe(false);

    expect(
      LoginInputSchema.safeParse({
        identifier: 'admin_pro',
        password: 'Password123!',
      }).success,
    ).toBe(true);
  });

  it('strips email PII on PublicUserProfileSchema and validates UserSearchQuerySchema', () => {
    const full = UserProfileSchema.parse({
      id: 'a0000000-0000-0000-0000-000000000001',
      username: 'admin_pro',
      email: 'admin@acad.vn',
      role: 'ADMIN',
      status: 'ACTIVE',
      karmaScore: 10,
      threadsCount: 2,
      createdAt: new Date().toISOString(),
    });
    const pub = PublicUserProfileSchema.parse(full);
    expect('email' in pub).toBe(false);
    expect(pub.username).toBe('admin_pro');

    const query = UserSearchQuerySchema.parse({ q: '  admin_  ', limit: '5' });
    expect(query).toEqual({ q: 'admin_', limit: 5 });
    expect(UserSearchQuerySchema.safeParse({ q: '   ' }).success).toBe(false);
  });

  it('validates SpaceSchema & CreateSpaceInputSchema with topic field', () => {
    const space = SpaceSchema.parse({
      id: 'b0000000-0000-0000-0000-000000000001',
      slug: 'kubernetes',
      name: 'Kubernetes Architecture',
      topic: 'Kubernetes Architecture',
      creatorId: 'a0000000-0000-0000-0000-000000000001',
      createdAt: new Date().toISOString(),
    });
    expect(space.topic).toBe('Kubernetes Architecture');

    const input = CreateSpaceInputSchema.parse({
      slug: 'sre-ops',
      name: 'SRE Operations',
    });
    expect(input.isPrivate).toBe(false);
  });

  it('validates Thread, Comment ltree depth 8, Voting, Chat, and Admin schemas', () => {
    expect(
      CreateThreadInputSchema.safeParse({
        spaceId: 'b0000000-0000-0000-0000-000000000001',
        title: 'Production PostgreSQL 16 Tuning Guide',
        contentText: 'Details...',
      }).success,
    ).toBe(true);

    expect(
      CreateCommentInputSchema.safeParse({
        threadId: 'd0000000-0000-0000-0000-000000000001',
        contentAst: { text: 'LGTM' },
      }).success,
    ).toBe(true);

    expect(
      FlatCommentItemSchema.safeParse({
        id: 'c0000000-0000-0000-0000-000000000001',
        threadId: 'd0000000-0000-0000-0000-000000000001',
        parentId: null,
        path: '0001.000a',
        depth: 1,
        contentAst: { text: 'Reply' },
        author: { id: 'a0000000-0000-0000-0000-000000000001', username: 'admin_pro' },
        createdAt: new Date().toISOString(),
      }).success,
    ).toBe(true);

    expect(
      VoteInputSchema.safeParse({
        targetId: 'd0000000-0000-0000-0000-000000000001',
        targetType: 'THREAD',
        direction: 1,
      }).success,
    ).toBe(true);

    expect(
      CreateGroupChannelInputSchema.safeParse({
        name: 'SRE Group',
        memberIds: ['a0000000-0000-0000-0000-000000000002'],
      }).success,
    ).toBe(true);

    const chatReq = ChatRequestSchema.parse({
      id: 'e0000000-0000-0000-0000-000000000001',
      senderId: 'a0000000-0000-0000-0000-000000000001',
      senderUsername: 'admin_pro',
      receiverId: 'a0000000-0000-0000-0000-000000000002',
      receiverUsername: 'mod_lead',
      initialMessage: 'Ping',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });
    expect(chatReq.receiverUsername).toBe('mod_lead');

    expect(AdminUpdateUserStatusInputSchema.safeParse({ status: 'SHADOWBANNED' }).success).toBe(
      true,
    );
    expect(CursorPaginationQuerySchema.parse({}).limit).toBe(20);
  });
});
