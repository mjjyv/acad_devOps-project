import { describe, expect, it } from 'vitest';
import {
  AtomicVoteEngine,
  FeedService,
  InMemoryCommunityRepository,
  SpaceService,
  ThreadService,
  VoteService,
} from '../src/index.js';

describe('@acad/community-service VoteService Write-Through & Smart Feeds', () => {
  it('reflects immediate thread vote in repository counters and orders /feed/popular + /feed/home', async () => {
    const repo = new InMemoryCommunityRepository();
    const voteEngine = new AtomicVoteEngine();
    const spaceService = new SpaceService(repo);
    const threadService = new ThreadService(repo, voteEngine);
    const voteService = new VoteService(repo, voteEngine);
    const feedService = new FeedService(repo, voteEngine);

    const aliceId = 'a0000000-0000-0000-0000-000000000001';
    const bobId = 'a0000000-0000-0000-0000-000000000002';
    repo.registerUserProfile(aliceId, 'alice');
    repo.registerUserProfile(bobId, 'bob');

    const s1 = await spaceService.createSpace(
      { slug: 'sre', name: 'SRE', isPrivate: false },
      aliceId,
    );
    const s2 = await spaceService.createSpace(
      { slug: 'rust', name: 'Rust', isPrivate: false },
      bobId,
    );

    const t1 = await threadService.createThread(
      { spaceId: s1.id, title: 'Prometheus Alerting Rules', contentText: 'Details' },
      aliceId,
    );
    const t2 = await threadService.createThread(
      { spaceId: s2.id, title: 'Rust Async Tokio Runtime Internals', contentText: 'Details' },
      bobId,
    );

    // Vote t2 -> should immediately appear in repo counters (0ms stale window)
    const voteRes = await voteService.voteThread(t2.id, aliceId, 1);
    expect(voteRes.upvotes).toBe(1);
    expect(voteRes.netScore).toBe(1);

    const countersInRepo = await repo.getThreadCounters(t2.id);
    expect(countersInRepo?.netScore).toBe(1);

    // Popular feed sorted by top -> t2 first, t1 second
    const popular = await feedService.getPopularFeed(aliceId, { sort: 'top' });
    expect(popular.items.map((x) => x.id)).toEqual([t2.id, t1.id]);

    // Home feed for alice -> only s1 threads (since alice didn't join s2)
    const home = await feedService.getHomeFeed(aliceId, { sort: 'new' });
    expect(home.items.map((x) => x.id)).toEqual([t1.id]);

    // Bookmark toggle
    const saved1 = await voteService.toggleSaveThread(t1.id, aliceId);
    expect(saved1.isSaved).toBe(true);
    const savedList = await voteService.listSavedThreads(aliceId);
    expect(savedList).toHaveLength(1);
  });
});
