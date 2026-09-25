import { AuthController, IUserRepository, InMemoryUserRepository } from './handlers/auth-controller.js';
import { ISessionStore, InMemorySessionStore } from './session/store.js';
import { PostgresUserRepository } from './repository/postgres-user-repository.js';
import { RedisSessionStore } from './session/redis-session-store.js';

export interface AuthModuleOptions {
  databaseUrl?: string;
  redisUrl?: string;
  inMemory?: boolean;
  userRepo?: IUserRepository;
  sessionStore?: ISessionStore;
}

export interface AuthModule {
  controller: AuthController;
  userRepo: IUserRepository;
  sessionStore: ISessionStore;
  close: () => Promise<void>;
}

export function createAuthModule(options: AuthModuleOptions = {}): AuthModule {
  const useInMemory =
    options.inMemory ??
    (!options.databaseUrl && !process.env.DATABASE_URL && !options.redisUrl && !process.env.REDIS_URL);

  let userRepo: IUserRepository;
  let sessionStore: ISessionStore;
  const closers: Array<() => Promise<void>> = [];

  if (options.userRepo) {
    userRepo = options.userRepo;
  } else if (useInMemory) {
    userRepo = new InMemoryUserRepository();
  } else {
    try {
      const dbUrl = options.databaseUrl || process.env.DATABASE_URL!;
      const pgRepo = new PostgresUserRepository(dbUrl);
      userRepo = pgRepo;
      closers.push(() => pgRepo.close());
    } catch (pgError: any) {
      console.warn(
        `[AuthModule Warning] Không thể kết nối PostgreSQL: ${pgError.message}. Tự động fallback sang InMemoryUserRepository.`,
      );
      userRepo = new InMemoryUserRepository();
    }
  }

  if (options.sessionStore) {
    sessionStore = options.sessionStore;
  } else if (useInMemory) {
    sessionStore = new InMemorySessionStore();
  } else {
    try {
      const redisUrl = options.redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
      const rStore = new RedisSessionStore(redisUrl);
      sessionStore = rStore;
      closers.push(() => rStore.disconnect());
    } catch (redisError: any) {
      console.warn(
        `[AuthModule Warning] Không thể kết nối Redis: ${redisError.message}. Tự động fallback sang InMemorySessionStore.`,
      );
      sessionStore = new InMemorySessionStore();
    }
  }

  const controller = new AuthController(userRepo, sessionStore);

  return {
    controller,
    userRepo,
    sessionStore,
    close: async () => {
      for (const closer of closers) {
        try {
          await closer();
        } catch {
          // Bỏ qua lỗi ngắt kết nối an toàn
        }
      }
    },
  };
}
