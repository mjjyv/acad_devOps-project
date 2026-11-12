import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '@acad/auth-service';
import {
  AtomicVoteEngine,
  CommentService,
  FeedService,
  InMemoryCommunityRepository,
  SpaceService,
  ThreadService,
  VoteService,
  ZeroHopStorageService,
} from '@acad/community-service';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/index.js';

const TEST_SECRET = 'community-test-secret-32-chars-min!';

describe('@acad/api-gateway Community, Voting & Feed Endpoints', () => {
  function setupFullCommunityApp() {
    const userRepo = new InMemoryUserRepository();
    const store = new InMemorySessionStore();
    const authService = new AuthService(userRepo, store, TEST_SECRET);

    const commRepo = new InMemoryCommunityRepository();
    const voteEngine = new AtomicVoteEngine();
    const tempUploadDir = mkdtempSync(join(tmpdir(), 'acad-api-media-'));
    const communityServices = {
      spaceService: new SpaceService(commRepo),
      threadService: new ThreadService(commRepo, voteEngine),
      commentService: new CommentService(commRepo),
      storageService: new ZeroHopStorageService({ localUploadDir: tempUploadDir }),
      voteService: new VoteService(commRepo, voteEngine),
      feedService: new FeedService(commRepo, voteEngine),
    };

    const app = createApp({
      authService,
      communityServices,
      jwtSecret: TEST_SECRET,
      disableRateLimit: true,
    });
    return { app, commRepo, tempUploadDir };
  }

  it('supports end-to-end spaces, topics, threads, MEDIA binary upload/serve, ltree comments, votes and feeds', async () => {
    const { app, commRepo, tempUploadDir } = setupFullCommunityApp();
    try {
      const reg = await request(app).post('/api/v1/auth/register').send({
        username: 'sre_author',
        email: 'sre@acad.vn',
        password: 'Password123!',
      });
      expect(reg.status).toBe(201);
      const token = reg.body.tokens.accessToken as string;
      const userId = reg.body.user.id as string;
      commRepo.registerUserProfile(userId, 'sre_author');

      const createSpace = await request(app)
        .post('/api/v1/spaces')
        .set('Authorization', `Bearer ${token}`)
        .send({
          slug: 'ebpf-lab',
          name: 'eBPF & Kernel Lab',
          topic: 'Systems',
          isPrivate: false,
        });
      expect(createSpace.status).toBe(201);
      expect(createSpace.body.myRole).toBe('CREATOR');

      const topicsRes = await request(app).get('/api/v1/spaces/topics');
      expect(topicsRes.status).toBe(200);
      expect(topicsRes.body.topics[0].topic).toBe('Systems');

      const threadRes = await request(app)
        .post('/api/v1/spaces/ebpf-lab/threads')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Tracing TCP Retransmits with eBPF Maps',
          contentText: 'Deep dive into kprobes and ringbuf.',
        });
      expect(threadRes.status).toBe(201);
      const threadId = threadRes.body.id as string;

      const voteRes = await request(app)
        .post(`/api/v1/threads/${threadId}/vote`)
        .set('Authorization', `Bearer ${token}`)
        .send({ direction: 1 });
      expect(voteRes.status).toBe(200);
      expect(voteRes.body.upvotes).toBe(1);

      const popularRes = await request(app)
        .get('/api/v1/feed/popular?sort=top')
        .set('Authorization', `Bearer ${token}`);
      expect(popularRes.status).toBe(200);
      expect(popularRes.body.items[0].upvotes).toBe(1);
      expect(popularRes.body.items[0].userVote).toBe(1);

      const commentRes = await request(app)
        .post(`/api/v1/threads/${threadId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: 'Great tracepoints writeup!' });
      expect(commentRes.status).toBe(201);
      expect(commentRes.body.depth).toBe(1);

      const badMedia = await request(app)
        .post('/api/v1/media/presign')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileName: 'virus.sh', fileType: 'application/x-sh' });
      expect(badMedia.status).toBe(400);
      expect(badMedia.headers['content-type']).toContain('application/problem+json');

      // Real binary PNG presign -> PUT upload -> GET serve -> attach to MEDIA thread
      const presign = await request(app)
        .post('/api/v1/media/presign')
        .set('Authorization', `Bearer ${token}`)
        .send({ fileName: 'topology.png', fileType: 'image/png', fileSizeBytes: 64 });
      expect(presign.status).toBe(200);
      const uploadPath =
        new URL(presign.body.uploadUrl as string).pathname +
        new URL(presign.body.uploadUrl as string).search;
      const publicPath = new URL(presign.body.publicUrl as string).pathname;

      const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);
      const putRes = await request(app)
        .put(uploadPath)
        .set('Content-Type', 'image/png')
        .send(pngBytes);
      expect(putRes.status).toBe(200);

      const getFile = await request(app).get(publicPath);
      expect(getFile.status).toBe(200);
      expect(getFile.headers['content-type']).toContain('image/png');
      expect(Buffer.compare(getFile.body as Buffer, pngBytes)).toBe(0);

      const mediaThread = await request(app)
        .post('/api/v1/spaces/ebpf-lab/threads')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'eBPF RingBuffer Architecture Diagram',
          threadType: 'MEDIA',
          mediaUrls: [presign.body.publicUrl],
        });
      expect(mediaThread.status).toBe(201);
      expect(mediaThread.body.threadType).toBe('MEDIA');
      expect(mediaThread.body.mediaUrls).toEqual([presign.body.publicUrl]);
    } finally {
      rmSync(tempUploadDir, { recursive: true, force: true });
    }
  });
});
