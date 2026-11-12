import type {
  CreateFlairInput,
  CreateSpaceInput,
  Space,
  SpaceFlair,
  SpaceMembershipRole,
} from '@acad/contracts';
import type {
  ICommunityRepository,
  SpaceEntity,
  SpaceTopicStats,
} from '../repository/community-repository.js';

export class InsufficientSpacePermissionError extends Error {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này trong không gian') {
    super(message);
    this.name = 'InsufficientSpacePermissionError';
  }
}

export class SpaceNotFoundError extends Error {
  constructor(message = 'Không tìm thấy không gian thảo luận yêu cầu') {
    super(message);
    this.name = 'SpaceNotFoundError';
  }
}

export class SpaceService {
  constructor(private readonly repo: ICommunityRepository) {}

  private toSpaceContract(
    entity: SpaceEntity,
    isJoined = false,
    myRole?: SpaceMembershipRole | null,
  ): Space {
    return {
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      topic: entity.topic ?? 'DevOps & SRE',
      description: entity.description,
      iconUrl: entity.iconUrl,
      bannerUrl: entity.bannerUrl,
      rules: entity.rules,
      creatorId: entity.creatorId,
      membersCount: entity.memberCount,
      threadsCount: entity.threadCount,
      isPrivate: Boolean(entity.isPrivate),
      isJoined,
      myRole: myRole ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  public async createSpace(input: CreateSpaceInput, creatorId: string): Promise<Space> {
    const space = await this.repo.createSpace({
      name: input.name,
      slug: input.slug,
      topic: input.topic ?? 'DevOps & SRE',
      description: input.description || null,
      rules: input.rules || [],
      creatorId,
      isPrivate: input.isPrivate ?? false,
    });

    return this.toSpaceContract(space, true, 'CREATOR');
  }

  public async getSpaceBySlug(slug: string, userId?: string): Promise<Space | null> {
    const space = await this.repo.findSpaceBySlug(slug);
    if (!space) return null;

    let isJoined = false;
    let myRole: SpaceMembershipRole | null = null;

    if (userId) {
      const membership = await this.repo.getMembership(space.id, userId);
      if (membership) {
        isJoined = true;
        myRole = membership.role;
      }
    }

    if (space.isPrivate && !isJoined) {
      throw new InsufficientSpacePermissionError(
        'Không gian này ở chế độ riêng tư, chỉ thành viên mới có quyền truy cập',
      );
    }

    return this.toSpaceContract(space, isJoined, myRole);
  }

  public async getSpaceById(id: string): Promise<Space | null> {
    const space = await this.repo.findSpaceById(id);
    return space ? this.toSpaceContract(space) : null;
  }

  public async listSpaces(
    options?: { limit?: number; offset?: number; topic?: string; q?: string },
    userId?: string,
  ): Promise<Space[]> {
    const entities = await this.repo.listSpaces(options);
    if (!userId) {
      return entities.filter((e) => !e.isPrivate).map((e) => this.toSpaceContract(e, false, null));
    }
    const spacesWithMembership = await Promise.all(
      entities.map(async (e) => {
        const membership = await this.repo.getMembership(e.id, userId);
        return this.toSpaceContract(e, Boolean(membership), membership?.role ?? null);
      }),
    );
    return spacesWithMembership.filter((s) => !s.isPrivate || s.isJoined);
  }

  public async listSpaceTopics(): Promise<SpaceTopicStats[]> {
    return this.repo.listSpaceTopics();
  }

  public async joinSpace(spaceId: string, userId: string): Promise<void> {
    const space = await this.repo.findSpaceById(spaceId);
    if (!space) throw new SpaceNotFoundError();
    if (space.isPrivate) {
      const existing = await this.repo.getMembership(spaceId, userId);
      if (!existing) {
        throw new InsufficientSpacePermissionError(
          'Không gian riêng tư không cho phép tự tham gia; cần được Quản trị viên thêm vào',
        );
      }
    }
    await this.repo.joinSpace(spaceId, userId, 'MEMBER');
  }

  public async leaveSpace(spaceId: string, userId: string): Promise<void> {
    const space = await this.repo.findSpaceById(spaceId);
    if (!space) throw new SpaceNotFoundError();
    if (space.creatorId === userId) {
      throw new InsufficientSpacePermissionError(
        'Người tạo không gian không thể tự rời khỏi không gian của mình',
      );
    }
    await this.repo.leaveSpace(spaceId, userId);
  }

  public async createFlair(
    spaceId: string,
    input: CreateFlairInput,
    userId: string,
  ): Promise<SpaceFlair> {
    const space = await this.repo.findSpaceById(spaceId);
    if (!space) throw new SpaceNotFoundError();

    const membership = await this.repo.getMembership(spaceId, userId);
    if (!membership || (membership.role !== 'CREATOR' && membership.role !== 'MODERATOR')) {
      throw new InsufficientSpacePermissionError(
        'Chỉ Người tạo hoặc Điều hành viên của không gian mới có quyền tạo Nhãn (Flair)',
      );
    }

    return this.repo.createFlair(spaceId, {
      name: input.name,
      slug: input.slug,
      colorHex: input.colorHex,
      backgroundHex: input.backgroundHex,
    });
  }

  public async listFlairs(spaceId: string): Promise<SpaceFlair[]> {
    return this.repo.listFlairs(spaceId);
  }
}
