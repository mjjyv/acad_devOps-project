import http from 'node:http';
import { createApp } from '../apps/api/dist/app.js';
import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '../services/auth/dist/index.js';
import {
  AtomicVoteEngine,
  CommentService,
  FeedService,
  InMemoryCommunityRepository,
  SpaceService,
  ThreadService,
  VoteFlushWorker,
  VoteService,
  ZeroHopStorageService,
} from '../services/community/dist/index.js';

const PORT = 3099;
const userRepository = new InMemoryUserRepository();
const sessionStore = new InMemorySessionStore();
const authService = new AuthService(userRepository, sessionStore);

const communityRepo = new InMemoryCommunityRepository();
const voteEngine = new AtomicVoteEngine();
const spaceService = new SpaceService(communityRepo);
const threadService = new ThreadService(communityRepo);
const commentService = new CommentService(communityRepo);
const storageService = new ZeroHopStorageService();
const voteService = new VoteService(communityRepo, voteEngine);
const feedService = new FeedService(communityRepo, voteEngine);
const flushWorker = new VoteFlushWorker(voteEngine, communityRepo, { intervalMs: 1000 });
flushWorker.start();

const app = createApp({
  authService,
  communityServices: {
    spaceService,
    threadService,
    commentService,
    storageService,
    voteService,
    feedService,
    flushWorker,
  },
});

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`TEST_SERVER_LISTENING:${PORT}`);
});

process.on('SIGTERM', () => {
  flushWorker.stop().finally(() => {
    server.close(() => process.exit(0));
  });
});

process.on('SIGINT', () => {
  flushWorker.stop().finally(() => {
    server.close(() => process.exit(0));
  });
});
