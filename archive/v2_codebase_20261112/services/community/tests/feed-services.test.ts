import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryCommunityRepository } from '../src/repository/community-repository.js';
import { FeedService } from '../src/services/feed-service.js';
import { VoteService } from '../src/services/vote-service.js';
import { AtomicVoteEngine } from '../src/voting/lua-vote-engine.js';

describe('Dịch Vụ Bầu Chọn & Phân Phối Bảng Tin (VoteService & FeedService)', () => {
  let repo: InMemoryCommunityRepository;
  let voteEngine: AtomicVoteEngine;
  let voteService: VoteService;
  let feedService: FeedService;

  const AUTHOR_ID = 'author-uuid-1';
  const VOTER_ID = 'voter-uuid-2';

  beforeEach(() => {
    repo = new InMemoryCommunityRepository();
    voteEngine = new AtomicVoteEngine();
    voteService = new VoteService(repo, voteEngine);
    feedService = new FeedService(repo, voteEngine);
  });

  describe('1. VoteService: Biểu Quyết & Lưu Trữ Bài Viết', () => {
    it('Phải biểu quyết bài viết thành công và đồng bộ karma cho tác giả', async () => {
      const space = await repo.createSpace({
        name: 'PostgreSQL',
        slug: 'postgres',
        creatorId: AUTHOR_ID,
      });

      const thread = await repo.createThread({
        spaceId: space.id,
        authorId: AUTHOR_ID,
        title: 'Tối ưu GiST index trên ltree',
        slug: 'toi-uu-gist-index-tren-ltree',
      });

      const voteRes = await voteService.voteThread(thread.id, VOTER_ID, 1);
      expect(voteRes.targetId).toBe(thread.id);
      expect(voteRes.userVote).toBe(1);
      expect(voteRes.upvotes).toBe(1);
      expect(voteRes.netScore).toBe(1);
      expect(voteRes.delta).toBe(1);
    });

    it('Phải biểu quyết bình luận thành công', async () => {
      const space = await repo.createSpace({
        name: 'Golang',
        slug: 'golang',
        creatorId: AUTHOR_ID,
      });

      const thread = await repo.createThread({
        spaceId: space.id,
        authorId: AUTHOR_ID,
        title: 'Goroutines leak detector',
        slug: 'goroutines-leak-detector',
      });

      const comment = await repo.createComment({
        threadId: thread.id,
        authorId: AUTHOR_ID,
        path: '0000',
        depth: 1,
        content: 'Bài viết hay!',
      });

      const voteRes = await voteService.voteComment(comment.id, VOTER_ID, 1);
      expect(voteRes.targetId).toBe(comment.id);
      expect(voteRes.userVote).toBe(1);
      expect(voteRes.netScore).toBe(1);
    });

    it('Phải hỗ trợ đánh dấu lưu và bỏ lưu bài viết (toggle save)', async () => {
      const space = await repo.createSpace({
        name: 'Linux',
        slug: 'linux',
        creatorId: AUTHOR_ID,
      });

      const thread = await repo.createThread({
        spaceId: space.id,
        authorId: AUTHOR_ID,
        title: 'Kernel tuning',
        slug: 'kernel-tuning',
      });

      // Lưu bài
      const save1 = await voteService.toggleSaveThread(thread.id, VOTER_ID);
      expect(save1.isSaved).toBe(true);

      const savedList = await voteService.listSavedThreads(VOTER_ID);
      expect(savedList.length).toBe(1);
      expect(savedList[0]?.id).toBe(thread.id);

      // Bỏ lưu bài
      const save2 = await voteService.toggleSaveThread(thread.id, VOTER_ID);
      expect(save2.isSaved).toBe(false);

      const emptyList = await voteService.listSavedThreads(VOTER_ID);
      expect(emptyList.length).toBe(0);
    });
  });

  describe('2. FeedService: Phân Tầng Nguồn Tin & Con Trỏ Keyset', () => {
    it('Home Feed phải lọc chính xác bài viết thuộc các Spaces mà người dùng đã tham gia', async () => {
      const spaceA = await repo.createSpace({
        name: 'Space A',
        slug: 'space-a',
        creatorId: AUTHOR_ID,
      });
      const spaceB = await repo.createSpace({
        name: 'Space B',
        slug: 'space-b',
        creatorId: AUTHOR_ID,
      });

      const threadA = await repo.createThread({
        spaceId: spaceA.id,
        authorId: AUTHOR_ID,
        title: 'Thread in Space A',
        slug: 'thread-in-space-a',
      });

      await repo.createThread({
        spaceId: spaceB.id,
        authorId: AUTHOR_ID,
        title: 'Thread in Space B',
        slug: 'thread-in-space-b',
      });

      // VOTER_ID chỉ tham gia Space A
      await repo.joinSpace(spaceA.id, VOTER_ID);

      const homeFeed = await feedService.getHomeFeed(VOTER_ID);
      expect(homeFeed.items.length).toBe(1);
      expect(homeFeed.items[0]?.id).toBe(threadA.id);
    });

    it('Popular Feed phải cung cấp toàn bộ bài viết và phân trang bằng con trỏ', async () => {
      const space = await repo.createSpace({
        name: 'Global Space',
        slug: 'global',
        creatorId: AUTHOR_ID,
      });

      for (let i = 1; i <= 5; i++) {
        await repo.createThread({
          spaceId: space.id,
          authorId: AUTHOR_ID,
          title: `Global Thread ${i}`,
          slug: `global-thread-${i}`,
        });
      }

      // Trang 1: lấy 2 bài
      const page1 = await feedService.getPopularFeed(undefined, { limit: 2, sort: 'new' });
      expect(page1.items.length).toBe(2);
      expect(page1.pagination.hasMore).toBe(true);
      expect(page1.pagination.nextCursor).not.toBeNull();

      // Trang 2: dùng nextCursor từ trang 1
      const page2 = await feedService.getPopularFeed(undefined, {
        limit: 2,
        sort: 'new',
        cursor: page1.pagination.nextCursor ?? undefined,
      });

      expect(page2.items.length).toBe(2);
      expect(page2.items[0]?.id).not.toBe(page1.items[0]?.id);
      expect(page2.items[0]?.id).not.toBe(page1.items[1]?.id);
    });
  });
});
