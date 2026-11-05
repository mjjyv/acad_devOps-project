import http from 'node:http';
import {
  AuthService,
  PostgresUserRepository,
  RedisSessionStore,
  TokenManager,
} from '@acad/auth-service';
import {
  CommentService,
  FeedService,
  PostgresCommunityRepository,
  RedisVoteEngine,
  SpaceService,
  ThreadService,
  VoteFlushWorker,
  VoteService,
  ZeroHopStorageService,
} from '@acad/community-service';
import { Redis } from 'ioredis';
import pg from 'pg';
import { createApp } from './app.js';

const PORT = parseInt(process.env.PORT || '10000', 10);
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/acad_dev?sslmode=disable';
let REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
if (REDIS_URL.includes('upstash.io') && REDIS_URL.startsWith('redis://')) {
  REDIS_URL = REDIS_URL.replace('redis://', 'rediss://');
}
const JWT_SECRET = process.env.JWT_SECRET || TokenManager.DEFAULT_SECRET;

async function bootstrap() {
  console.log(`[BOOTSTRAP] Khởi động Acad API Gateway (Version 2.0.0)...`);

  // 1. Khởi tạo Connection Pool PostgreSQL
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

  // 2. Khởi tạo Redis Client
  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
    retryStrategy(times) {
      return Math.min(times * 200, 3000);
    },
    reconnectOnError(err) {
      const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
      return targetErrors.some((target) => err.message.includes(target));
    },
  });

  redis.on('error', (err) => {
    console.warn('[REDIS WARNING] Lỗi kết nối Redis tạm thời (sẽ tự động retry):', err.message);
  });

  try {
    await redis.connect();
    console.log('[REDIS] Kết nối Redis thành công.');
  } catch (err) {
    console.warn(
      '[REDIS WARNING] Không thể kết nối Redis lúc khởi động. Dịch vụ sẽ tự động retry:',
      err,
    );
  }

  // 3. Khởi tạo Repositories & Services
  const userRepository = new PostgresUserRepository(pool);
  const sessionStore = new RedisSessionStore(redis);
  const authService = new AuthService(userRepository, sessionStore, JWT_SECRET);

  // 3.1. Khởi tạo Phân Hệ Cộng Đồng (Community Services)
  const communityRepo = new PostgresCommunityRepository(pool);
  const spaceService = new SpaceService(communityRepo);
  const threadService = new ThreadService(communityRepo);
  const commentService = new CommentService(communityRepo);
  const storageService = new ZeroHopStorageService();

  // 3.2. Khởi tạo Phân Hệ Bầu Chọn & Nguồn Cấp Tin (Phase B3)
  const voteEngine = new RedisVoteEngine(redis);
  const voteService = new VoteService(communityRepo, voteEngine);
  const feedService = new FeedService(communityRepo, voteEngine);
  const flushWorker = new VoteFlushWorker(voteEngine, communityRepo, { intervalMs: 5000 });
  flushWorker.start();

  // 4. Khởi tạo Express App & HTTP Server
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
    jwtSecret: JWT_SECRET,
    pool,
    redis,
  });

  const server = http.createServer(app);

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[HTTP SERVER] Acad API Gateway đang lắng nghe tại http://0.0.0.0:${PORT}`);
    console.log(`[HEALTH CHECK] Endpoint kiểm tra sức khỏe: http://0.0.0.0:${PORT}/healthz`);
  });

  // 5. Quản lý Tắt Máy An Toàn (Graceful Shutdown)
  let isShuttingDown = false;
  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[SHUTDOWN] Nhận tín hiệu ${signal}. Tiến hành đóng các kết nối an toàn...`);

    server.close(async () => {
      console.log('[HTTP SERVER] Máy chủ HTTP đã đóng tiếp nhận kết nối mới.');
      try {
        await flushWorker.stop();
        console.log('[WORKER] Tiến trình VoteFlushWorker đã dừng an toàn.');
        await pool.end();
        console.log('[POSTGRES] Pool kết nối cơ sở dữ liệu đã giải phóng.');
        await redis.quit();
        console.log('[REDIS] Kết nối Redis đã đóng an toàn.');
        process.exit(0);
      } catch (err) {
        console.error('[SHUTDOWN ERROR] Lỗi khi giải phóng tài nguyên:', err);
        process.exit(1);
      }
    });

    // Ép buộc kết thúc sau 10 giây nếu các tiến trình không kịp đóng
    setTimeout(() => {
      console.error('[SHUTDOWN TIMEOUT] Quá thời gian chờ (10s), buộc dừng tiến trình.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('[FATAL BOOTSTRAP ERROR]:', err);
    process.exit(1);
  });
}
