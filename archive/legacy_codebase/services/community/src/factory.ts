import {
  ICommunityRepository,
  InMemoryCommunityRepository,
  PostgresCommunityRepository,
} from './repository/community-repository.js';
import { CommunityService } from './services/community-service.js';

export interface CommunityModuleOptions {
  databaseUrl?: string;
  inMemory?: boolean;
  repository?: ICommunityRepository;
}

export function createCommunityService(options: CommunityModuleOptions = {}): CommunityService {
  if (options.repository) {
    return new CommunityService(options.repository);
  }

  const useInMemory =
    options.inMemory ?? (!options.databaseUrl && !process.env.DATABASE_URL);

  if (useInMemory) {
    return new CommunityService(new InMemoryCommunityRepository());
  }

  try {
    const dbUrl = options.databaseUrl || process.env.DATABASE_URL!;
    const repo = new PostgresCommunityRepository(dbUrl);
    return new CommunityService(repo);
  } catch (err: any) {
    console.warn(
      `[CommunityModule Warning] Không thể kết nối PostgreSQL: ${err.message}. Chuyển sang InMemoryCommunityRepository.`,
    );
    return new CommunityService(new InMemoryCommunityRepository());
  }
}
