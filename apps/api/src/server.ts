import http from 'node:http';
import {
  AuthService,
  PostgresUserRepository,
  RedisSessionStore,
  TokenManager,
} from '@acad/auth-service';
import {
  ChatService,
  PostgresChatRepository,
  PresenceManager,
  SseManager,
} from '@acad/chat-service';
import {
  CommentService,
  FeedService,
  PostgresCommunityRepository,
  RedisLuaVoteEngine,
  SpaceService,
  ThreadService,
  VoteFlushWorker,
  VoteService,
  ZeroHopStorageService,
} from '@acad/community-service';
import { ModerationService, PostgresModerationRepository } from '@acad/moderation-service';
import { Redis } from 'ioredis';
import pg from 'pg';
import { createApp } from './app.js';

const PORT = Number.parseInt(process.env.PORT || process.env.API_PORT || '10000', 10);
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@127.0.0.1:5432/acad_dev?sslmode=disable';
let REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
if (REDIS_URL.includes('upstash.io') && REDIS_URL.startsWith('redis://')) {
  REDIS_URL = REDIS_URL.replace('redis://', 'rediss://');
}
const JWT_SECRET = process.env.JWT_SECRET || TokenManager.DEFAULT_SECRET;

async function connectPostgresWithBackoff(pool: pg.Pool): Promise<void> {
  const delays = [1000, 2000, 4000, 8000];
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      await pool.query('SELECT 1');
      console.log('[POSTGRES] Kết nối PostgreSQL thành công.');
      return;
    } catch (err) {
      const waitMs = delays[attempt];
      if (waitMs === undefined) {
        console.warn('[POSTGRES WARNING] Không thể kết nối PostgreSQL lúc khởi động:', err);
        return;
      }
      console.warn(`[POSTGRES WARNING] Chờ ${waitMs}ms trước khi thử kết nối lại...`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

async function bootstrap(): Promise<void> {
  console.log('[BOOTSTRAP] Khởi động Acad API Gateway v3.0.0 (B1–B5 Integrated)...');

  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl:
      process.env.DATABASE_SSL === 'true' ||
      DATABASE_URL.includes('sslmode=require') ||
      (!DATABASE_URL.includes('localhost') && !DATABASE_URL.includes('127.0.0.1'))
        ? { rejectUnauthorized: false }
        : undefined,
  });

  await connectPostgresWithBackoff(pool);

  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times) {
      return Math.min(times * 200, 3000);
    },
    reconnectOnError(err) {
      return ['READONLY', 'ECONNRESET', 'ETIMEDOUT'].some((t) => err.message.includes(t));
    },
  });

  redis.on('error', (err) => {
    console.warn('[REDIS WARNING] Lỗi kết nối Redis tạm thời:', err.message);
  });

  try {
    await redis.connect();
    console.log('[REDIS] Kết nối Redis thành công.');
  } catch (err) {
    console.warn('[REDIS WARNING] Không thể kết nối Redis lúc khởi động:', err);
  }

  // Phase B1: Auth & Session Engine
  const userRepository = new PostgresUserRepository(pool);
  const sessionStore = new RedisSessionStore(redis);
  const authService = new AuthService(userRepository, sessionStore, JWT_SECRET);

  // Phase B2 + B3: Community, Voting (Redis Lua) & Smart Feeds
  const communityRepo = new PostgresCommunityRepository(pool);
  const voteEngine = new RedisLuaVoteEngine(redis);
  const voteFlushWorker = new VoteFlushWorker(voteEngine, communityRepo, { intervalMs: 5000 });
  voteFlushWorker.start();
  console.log('[COMMUNITY] Khởi chạy VoteFlushWorker đồng bộ hot_score & dirty:votes.');

  const communityServices = {
    spaceService: new SpaceService(communityRepo),
    threadService: new ThreadService(communityRepo, voteEngine),
    commentService: new CommentService(communityRepo),
    storageService: new ZeroHopStorageService(),
    voteService: new VoteService(communityRepo, voteEngine),
    feedService: new FeedService(communityRepo, voteEngine),
    flushWorker: voteFlushWorker,
  };

  // Phase B4: Realtime Chat & SSE Gateway
  const chatRepo = new PostgresChatRepository(pool);
  const sseManager = new SseManager({ heartbeatIntervalMs: 15000 });
  sseManager.startHeartbeat();
  const presenceManager = new PresenceManager(redis);
  const chatServices = {
    chatService: new ChatService(chatRepo, sseManager, presenceManager),
    sseManager,
    presenceManager,
  };
  console.log('[CHAT] Khởi chạy SSE Gateway (15s Keep-Alive) & PresenceManager.');

  // Phase B5: Moderation & Admin Hub
  const moderationRepo = new PostgresModerationRepository(pool);
  const moderationService = new ModerationService(moderationRepo, sessionStore);

  const app = createApp({
    authService,
    communityServices,
    chatServices,
    moderationService,
    jwtSecret: JWT_SECRET,
    pool,
    redis,
  });

  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP SERVER] Acad API Gateway đang lắng nghe tại http://0.0.0.0:${PORT}`);
    console.log(`[HEALTH CHECK] Endpoint kiểm tra sức khỏe: http://0.0.0.0:${PORT}/healthz`);
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(`[SHUTDOWN] Nhận tín hiệu ${signal}. Đang đóng kết nối & xả bộ đếm an toàn...`);
    sseManager.clearAll();
    await Promise.allSettled([voteFlushWorker.stop()]);
    server.close(async () => {
      await Promise.allSettled([pool.end(), redis.quit()]);
      console.log('[SHUTDOWN] Đã đóng toàn bộ tài nguyên an toàn.');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[FATAL] Khởi động API Gateway thất bại:', err);
  process.exit(1);
});
