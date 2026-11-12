import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CommentService,
  InMemoryCommunityRepository,
  InsufficientSpacePermissionError,
  InvalidMediaFileError,
  SpaceService,
  ThreadService,
  ZeroHopStorageService,
} from '../src/index.js';

describe('@acad/community-service Spaces, Threads, Comments ltree & Storage Guard', () => {
  it('handles spaces, private membership guards, depth-9 comment capping, and soft-delete counts', async () => {
    const repo = new InMemoryCommunityRepository();
    const spaceService = new SpaceService(repo);
    const threadService = new ThreadService(repo);
    const commentService = new CommentService(repo);

    const aliceId = 'a0000000-0000-0000-0000-000000000001';
    const bobId = 'a0000000-0000-0000-0000-000000000002';
    repo.registerUserProfile(aliceId, 'alice');
    repo.registerUserProfile(bobId, 'bob');

    const privSpace = await spaceService.createSpace(
      { slug: 'secret-sre', name: 'Secret SRE', isPrivate: true, topic: 'Security' },
      aliceId,
    );
    expect(privSpace.myRole).toBe('CREATOR');

    // Stranger cannot join private space directly
    await expect(spaceService.joinSpace(privSpace.id, bobId)).rejects.toThrow(
      InsufficientSpacePermissionError,
    );

    const pubSpace = await spaceService.createSpace(
      { slug: 'kubernetes', name: 'Kubernetes', isPrivate: false, topic: 'Cloud Native' },
      aliceId,
    );
    await spaceService.joinSpace(pubSpace.id, bobId);

    const topics = await spaceService.listSpaceTopics();
    expect(topics[0]).toEqual({ topic: 'Cloud Native', spacesCount: 1, totalMembers: 2 });

    const thread = await threadService.createThread(
      { spaceId: pubSpace.id, title: 'Helm Chart Structure Best Practices', contentText: 'Body' },
      aliceId,
    );

    let parentId: string | undefined;
    for (let depth = 1; depth <= 9; depth++) {
      const comment = await commentService.createComment({
        threadId: thread.id,
        authorId: depth % 2 === 1 ? aliceId : bobId,
        content: `Level ${depth} reply`,
        parentId,
      });
      parentId = comment.id;
      if (depth < 9) {
        expect(comment.depth).toBe(depth);
      } else {
        expect(comment.depth).toBe(8);
        expect(comment.isCappedAtMaxDepth).toBe(true);
        expect(comment.contentAst.text).toBe('@bob Level 9 reply');
      }
    }

    const treeBefore = await commentService.getCommentTree(thread.id);
    expect(treeBefore.totalCount).toBe(9);

    await commentService.softDeleteComment(treeBefore.items[0].id, aliceId);
    const treeAfter = await commentService.getCommentTree(thread.id);
    expect(treeAfter.items.length).toBe(9);
    expect(treeAfter.totalCount).toBe(8);
  });

  it('validates MIME types, saves & reads Local Homelab media via magic bytes, and signs S3/R2 SigV4 URLs', async () => {
    const tempUploadDir = mkdtempSync(join(tmpdir(), 'acad-media-test-'));
    try {
      const storage = new ZeroHopStorageService({
        localUploadDir: tempUploadDir,
        signingSecret: 'unit-test-media-signing-secret-32chars!',
      });
      const ok = await storage.generatePresignedUploadUrl({
        fileName: 'diagram.png',
        fileType: 'image/png',
        fileSizeBytes: 1024 * 500,
        userId: 'u1',
        baseUrl: 'http://127.0.0.1:10000',
      });
      expect(ok.provider).toBe('local');
      expect(ok.uploadUrl).toContain('/api/v1/media/upload?');

      const parsedUrl = new URL(ok.uploadUrl);
      const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
      const saved = await storage.saveLocalUpload({
        key: parsedUrl.searchParams.get('key') ?? '',
        exp: Number(parsedUrl.searchParams.get('exp')),
        mime: parsedUrl.searchParams.get('mime') ?? '',
        max: Number(parsedUrl.searchParams.get('max')),
        uid: parsedUrl.searchParams.get('uid') ?? '',
        sig: parsedUrl.searchParams.get('sig') ?? '',
        contentType: 'image/png',
        body: validPng,
      });
      expect(saved.sizeBytes).toBe(validPng.length);

      const loaded = await storage.readLocalFile(ok.key);
      expect(loaded?.mimeType).toBe('image/png');
      expect(loaded?.buffer.equals(validPng)).toBe(true);

      // Fake PNG magic bytes rejected
      await expect(
        storage.saveLocalUpload({
          key: parsedUrl.searchParams.get('key') ?? '',
          exp: Number(parsedUrl.searchParams.get('exp')),
          mime: parsedUrl.searchParams.get('mime') ?? '',
          max: Number(parsedUrl.searchParams.get('max')),
          uid: parsedUrl.searchParams.get('uid') ?? '',
          sig: parsedUrl.searchParams.get('sig') ?? '',
          contentType: 'image/png',
          body: Buffer.from('#!/bin/sh\necho pwned'),
        }),
      ).rejects.toThrow(InvalidMediaFileError);

      await expect(
        storage.generatePresignedUploadUrl({
          fileName: 'payload.exe',
          fileType: 'application/x-msdownload',
          userId: 'u1',
        }),
      ).rejects.toThrow(InvalidMediaFileError);

      // S3/R2 AWS SigV4 URL generation
      const s3Storage = new ZeroHopStorageService({
        s3Endpoint: 'https://r2-account.r2.cloudflarestorage.com',
        s3AccessKeyId: 'test_access_key_1234',
        s3SecretAccessKey: 'test_secret_key_1234567890',
        bucketName: 'acad-prod',
        cdnBaseUrl: 'https://cdn.acad.vn',
      });
      const s3Res = await s3Storage.generatePresignedUploadUrl({
        fileName: 'arch.png',
        fileType: 'image/png',
        userId: 'u1',
      });
      expect(s3Res.provider).toBe('s3');
      expect(s3Res.uploadUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(s3Res.uploadUrl).toContain('X-Amz-Signature=');
      expect(s3Res.publicUrl).toContain('https://cdn.acad.vn/uploads/u1/');
    } finally {
      rmSync(tempUploadDir, { recursive: true, force: true });
    }
  });
});
