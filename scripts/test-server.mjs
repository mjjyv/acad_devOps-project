import http from 'node:http';
import { createApp } from '../apps/api/dist/app.js';
import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '../services/auth/dist/index.js';
import {
  ChatService,
  InMemoryChatRepository,
  PresenceManager,
  SseManager,
} from '../services/chat/dist/index.js';
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
import {
  InMemoryModerationRepository,
  ModerationService,
} from '../services/moderation/dist/index.js';

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

const chatRepo = new InMemoryChatRepository(userRepository);
const presenceManager = new PresenceManager();
const sseManager = new SseManager({ heartbeatIntervalMs: 15000 });
sseManager.startHeartbeat();
const chatService = new ChatService(chatRepo, sseManager, presenceManager);

const moderationRepo = new InMemoryModerationRepository();
const moderationService = new ModerationService(moderationRepo, sessionStore);

// Đồng bộ tự động tài khoản người dùng giữa UserRepository và ModerationRepository
const origUserCreate = userRepository.createUser.bind(userRepository);
userRepository.createUser = async (data) => {
  const user = await origUserCreate(data);
  moderationRepo.seedUser({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    karmaScore: user.karmaScore,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
  });
  return user;
};

const origUpdateRole = moderationRepo.updateUserRole.bind(moderationRepo);
moderationRepo.updateUserRole = async (userId, role) => {
  await origUpdateRole(userId, role);
  await userRepository.updateRole(userId, role);
};

const origUpdateStatus = moderationRepo.updateUserStatus.bind(moderationRepo);
moderationRepo.updateUserStatus = async (userId, status) => {
  await origUpdateStatus(userId, status);
  await userRepository.updateStatus(userId, status);
};

// Seed không gian mẫu và bài viết mẫu cho quản trị viên kiểm tra
moderationRepo.seedSpace({
  id: '00000000-0000-4000-a000-000000000002',
  name: 'DevOps & Architecture',
  slug: 'devops-arch',
  description: 'Thảo luận chuyên sâu về DevOps, Kubernetes và kiến trúc phân tán',
  creatorId: '00000000-0000-4000-a000-000000000001',
  iconUrl: null,
  bannerUrl: null,
  rules: [],
  membersCount: 42,
  createdAt: new Date(),
  updatedAt: new Date(),
});

moderationRepo.seedThread({
  id: '00000000-0000-4000-a000-000000000001',
  spaceId: '00000000-0000-4000-a000-000000000002',
  authorId: '00000000-0000-4000-a000-000000000003',
  title: 'Hạ tầng Monorepo Clean Architecture với Zero-Hop Uploads',
  body: 'Bản phân tích chi tiết thiết kế hệ thống...',
  type: 'POST',
  commentsCount: 15,
  voteScore: 99,
  upvotesCount: 100,
  downvotesCount: 1,
  hotScore: 450.5,
  confidenceScore: 0.95,
  createdAt: new Date(),
  updatedAt: new Date(),
});

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
  chatServices: {
    chatService,
    presenceManager,
    sseManager,
  },
  moderationService,
});

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`TEST_SERVER_LISTENING:${PORT}`);
});

process.on('SIGTERM', () => {
  sseManager.stopHeartbeat();
  flushWorker.stop().finally(() => {
    server.close(() => process.exit(0));
  });
});

process.on('SIGINT', () => {
  sseManager.stopHeartbeat();
  flushWorker.stop().finally(() => {
    server.close(() => process.exit(0));
  });
});
