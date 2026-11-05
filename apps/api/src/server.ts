import http from 'node:http';
import {
  AuthService,
  PostgresUserRepository,
  RedisSessionStore,
  TokenManager,
} from '@acad/auth-service';
import { Redis } from 'ioredis';
import pg from 'pg';
import { createApp } from './app.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/acad_dev?sslmode=disable';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
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
      process.env.DATABASE_SSL === 'true' || DATABASE_URL.includes('sslmode=require')
        ? { rejectUnauthorized: false }
        : undefined,
  });

  // 2. Khởi tạo Redis Client
  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
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

  // 4. Khởi tạo Express App & HTTP Server
  const app = createApp({
    authService,
    jwtSecret: JWT_SECRET,
    pool,
    redis,
  });

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`[HTTP SERVER] Acad API Gateway đang lắng nghe tại http://localhost:${PORT}`);
    console.log(`[HEALTH CHECK] Endpoint kiểm tra sức khỏe: http://localhost:${PORT}/healthz`);
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
