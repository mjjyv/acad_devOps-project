import { describe, expect, it } from 'vitest';
import { AtomicVoteEngine, InMemoryCommunityRepository, VoteFlushWorker } from '../src/index.js';

describe('@acad/community-service Atomic Vote FSM & VoteFlushWorker', () => {
  it('handles +1 -> flip -1 (-2 delta) -> unvote (-1 again -> 0) atomically', async () => {
    const engine = new AtomicVoteEngine();
    const targetId = 't0000000-0000-0000-0000-000000000001';
    const userId = 'u0000000-0000-0000-0000-000000000001';

    const r1 = await engine.executeVote(targetId, userId, 1);
    expect(r1.finalDirection).toBe(1);
    expect(r1.counters).toEqual({ upvotes: 1, downvotes: 0, netScore: 1 });

    // Flip +1 -> -1
    const r2 = await engine.executeVote(targetId, userId, -1);
    expect(r2.finalDirection).toBe(-1);
    expect(r2.counters).toEqual({ upvotes: 0, downvotes: 1, netScore: -1 });

    // Unvote -1 -> 0
    const r3 = await engine.executeVote(targetId, userId, -1);
    expect(r3.finalDirection).toBe(0);
    expect(r3.counters).toEqual({ upvotes: 0, downvotes: 0, netScore: 0 });
  });

  it('flushes dirty vote targets into repository via VoteFlushWorker', async () => {
    const repo = new InMemoryCommunityRepository();
    const voteEngine = new AtomicVoteEngine();
    const creatorId = 'a0000000-0000-0000-0000-000000000001';
    repo.registerUserProfile(creatorId, 'alice');

    const space = await repo.createSpace({
      slug: 'devops',
      name: 'DevOps',
      creatorId,
    });
    const thread = await repo.createThread({
      spaceId: space.id,
      authorId: creatorId,
      title: 'Docker Multi-stage Build Deep Dive',
      slug: 'docker-multi-stage',
      content: 'Content text',
      threadType: 'TEXT',
    });

    await voteEngine.executeVote(thread.id, creatorId, 1);
    const worker = new VoteFlushWorker(voteEngine, repo);
    const flushedCount = await worker.flushNow();
    expect(flushedCount).toBe(1);

    const counters = await repo.getThreadCounters(thread.id);
    expect(counters?.upvotes).toBe(1);
    expect(counters?.netScore).toBe(1);
    expect(await voteEngine.getDirtyTargetIds()).toEqual([]);
  });
});
