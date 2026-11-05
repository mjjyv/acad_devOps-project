import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AddressInfo } from 'node:net';
import { createApiServer } from '../src/server.js';

describe('Kiểm thử Endpoints Cộng đồng (Core Community Subsystem)', () => {
  let server: ReturnType<typeof createApiServer>;
  let baseUrl: string;
  let userToken: string;
  let userId: string;

  beforeAll(async () => {
    server = createApiServer();
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;

    // Đăng ký tài khoản người dùng kiểm thử để lấy token
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'tester_community',
        email: 'tester_community@acad.internal',
        password: 'Password123!',
        deviceFingerprint: 'tester_device_1',
      }),
    });
    const regData = (await regRes.json()) as any;
    userToken = regData.accessToken;
    userId = regData.user.id;
  });

  afterAll(async () => {
    if (server.authModule) {
      await server.authModule.close();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('1. GET /api/v1/spaces - Trả về danh sách các không gian thảo luận mẫu', async () => {
    const res = await fetch(`${baseUrl}/api/v1/spaces`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(Array.isArray(data.spaces)).toBe(true);
    expect(data.spaces.length).toBeGreaterThanOrEqual(3);

    const devopsSpace = data.spaces.find((s: any) => s.slug === 'devops-engineering');
    expect(devopsSpace).toBeDefined();
    expect(devopsSpace.name).toBe('DevOps & SRE Engineering');
    expect(devopsSpace.memberCount).toBeGreaterThan(0);
  });

  it('2. GET /api/v1/spaces/:slug - Lấy chi tiết không gian', async () => {
    const res = await fetch(`${baseUrl}/api/v1/spaces/devops-engineering`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.space).toBeDefined();
    expect(data.space.slug).toBe('devops-engineering');
    expect(data.space.rules.length).toBeGreaterThan(0);
  });

  it('3. POST /api/v1/spaces - Từ chối khi không có token (401)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/spaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: 'test-space',
        name: 'Test Space',
      }),
    });
    expect(res.status).toBe(401);
  });

  it('4. POST /api/v1/spaces - Cho phép tạo không gian mới khi đã xác thực', async () => {
    const res = await fetch(`${baseUrl}/api/v1/spaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        slug: 'kubernetes-vietnam',
        name: 'Cộng đồng Kubernetes Việt Nam',
        description: 'Thảo luận K8s thực chiến',
        rules: [],
      }),
    });
    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.space).toBeDefined();
    expect(data.space.slug).toBe('kubernetes-vietnam');
  });

  it('5. GET /api/v1/threads - Bảng tin cộng đồng trả về danh sách bài viết', async () => {
    const res = await fetch(`${baseUrl}/api/v1/threads?sort=hot`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThanOrEqual(3);

    const first = data.items[0];
    expect(first.title).toBeDefined();
    expect(first.counters).toBeDefined();
    expect(typeof first.counters.netScore).toBe('number');
  });

  let createdThreadSlug = '';
  let createdThreadId = '';

  it('6. POST /api/v1/threads - Tạo bài viết mới và xác nhận xuất hiện trên Feed', async () => {
    // Lấy ID space
    const sRes = await fetch(`${baseUrl}/api/v1/spaces/devops-engineering`);
    const sData = (await sRes.json()) as any;
    const spaceId = sData.space.id;

    const res = await fetch(`${baseUrl}/api/v1/threads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        spaceId,
        title: 'Thực nghiệm CI/CD Pipeline với GitHub Actions và Docker Buildx',
        contentAst: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              text: 'Nội dung chia sẻ kinh nghiệm tối ưu hóa cache layer Docker multi-stage build để giảm thời gian build từ 15 phút xuống 2 phút.',
            },
          ],
        },
      }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.thread).toBeDefined();
    expect(data.thread.title).toBe('Thực nghiệm CI/CD Pipeline với GitHub Actions và Docker Buildx');
    expect(data.thread.counters.upvotes).toBe(1); // Tự động upvote bài của chính mình

    createdThreadSlug = data.thread.slug;
    createdThreadId = data.thread.id;

    // Xác nhận bài viết xuất hiện trên Feed
    const feedRes = await fetch(`${baseUrl}/api/v1/threads?sort=new`);
    const feedData = (await feedRes.json()) as any;
    const found = feedData.items.find((item: any) => item.id === createdThreadId);
    expect(found).toBeDefined();
  });

  it('7. GET /api/v1/threads/:slug - Xem chi tiết bài viết vừa tạo', async () => {
    const res = await fetch(`${baseUrl}/api/v1/threads/${createdThreadSlug}`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(data.thread).toBeDefined();
    expect(data.thread.id).toBe(createdThreadId);
    expect(data.thread.contentAst).toBeDefined();
  });

  it('8. POST /api/v1/threads/:id/vote - Upvote bài viết', async () => {
    // Đăng ký thêm user khác để upvote
    const u2Res = await fetch(`${baseUrl}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'tester_voter',
        email: 'tester_voter@acad.internal',
        password: 'Password123!',
        deviceFingerprint: 'tester_device_2',
      }),
    });
    const u2Data = (await u2Res.json()) as any;
    const voterToken = u2Data.accessToken;

    const res = await fetch(`${baseUrl}/api/v1/threads/${createdThreadId}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${voterToken}`,
      },
      body: JSON.stringify({ direction: 1 }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.upvotes).toBe(2);
    expect(data.netScore).toBe(2);
    expect(data.userVote).toBe(1);
  });

  let rootCommentId = '';

  it('9. POST /api/v1/threads/:id/comments - Gửi bình luận cấp 1', async () => {
    const res = await fetch(`${baseUrl}/api/v1/threads/${createdThreadId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        parentId: null,
        contentAst: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              text: 'Kỹ thuật cache gha của GitHub Actions dùng rất hiệu quả!',
            },
          ],
        },
      }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.comment).toBeDefined();
    expect(data.comment.depth).toBe(0);
    expect(data.comment.path).toBeDefined();
    rootCommentId = data.comment.id;
  });

  it('10. POST /api/v1/threads/:id/comments - Gửi phản hồi lồng nhau cấp 2 (Nested Reply)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/threads/${createdThreadId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({
        parentId: rootCommentId,
        contentAst: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              text: 'Đúng vậy, đặc biệt là cache type=gha,mode=max.',
            },
          ],
        },
      }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.comment).toBeDefined();
    expect(data.comment.depth).toBe(1);
    expect(data.comment.parentId).toBe(rootCommentId);
    expect(data.comment.path.startsWith('0001.')).toBe(true);
  });

  it('11. GET /api/v1/threads/:id/comments - Lấy danh sách cây bình luận phẳng chuẩn hóa', async () => {
    const res = await fetch(`${baseUrl}/api/v1/threads/${createdThreadId}/comments`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(Array.isArray(data.comments)).toBe(true);
    expect(data.comments.length).toBe(2);

    // Kiểm tra thứ tự ltree sắp xếp cha trước con sau
    expect(data.comments[0].depth).toBe(0);
    expect(data.comments[1].depth).toBe(1);
  });

  it('12. GET /api/v1/threads?q=... - Lọc danh sách bài viết theo từ khóa tìm kiếm (Search Query)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/threads?q=Pipeline`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as any;
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThanOrEqual(1);
    expect(data.items.some((item: any) => item.title.includes('Pipeline'))).toBe(true);

    // Tìm kiếm với từ khóa không tồn tại
    const emptyRes = await fetch(`${baseUrl}/api/v1/threads?q=nonexistent_xyz_keyword_9999`);
    const emptyData = (await emptyRes.json()) as any;
    expect(emptyData.items.length).toBe(0);
  });
});
