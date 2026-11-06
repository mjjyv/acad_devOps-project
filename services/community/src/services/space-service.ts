/**
 * @file space-service.ts
 * @description Service for managing Spaces (/s/[slug]), Memberships, and Flairs.
 */

import type {
  CreateFlairInput,
  CreateSpaceInput,
  Space,
  SpaceFlair,
  SpaceMembership,
} from '@acad/contracts';
import type { ICommunityRepository, SpaceEntity } from '../repository/community-repository.js';

export class InsufficientSpacePermissionError extends Error {
  constructor(message: string = 'Bạn không có quyền thực hiện thao tác này trong không gian') {
    super(message);
    this.name = 'InsufficientSpacePermissionError';
  }
}

export class SpaceNotFoundError extends Error {
  constructor(message: string = 'Không tìm thấy không gian thảo luận yêu cầu') {
    super(message);
    this.name = 'SpaceNotFoundError';
  }
}

export class SpaceService {
  constructor(private repo: ICommunityRepository) {}

  private toSpaceContract(
    entity: SpaceEntity,
    isJoined = false,
    myRole?: string | null | undefined,
  ): Space {
    return {
      id: entity.id,
      slug: entity.slug,
      name: entity.name,
      description: entity.description,
      iconUrl: entity.avatarUrl,
      bannerUrl: entity.bannerUrl,
      rules: entity.rules,
      creatorId: entity.creatorId,
      membersCount: entity.memberCount,
      threadsCount: entity.threadCount,
      isPrivate: Boolean(entity.isPrivate),
      isJoined,
      myRole: (myRole as 'MEMBER' | 'MODERATOR' | 'ADMIN' | null) || null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  public async createSpace(input: CreateSpaceInput, creatorId: string): Promise<Space> {
    const space = await this.repo.createSpace({
      name: input.name,
      slug: input.slug,
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
    let myRole: string | undefined;

    if (userId) {
      const membership = await this.repo.getMembership(space.id, userId);
      if (membership) {
        isJoined = true;
        myRole = membership.role;
      }
    }

    return this.toSpaceContract(space, isJoined, myRole);
  }

  public async getSpaceById(id: string): Promise<Space | null> {
    const space = await this.repo.findSpaceById(id);
    return space ? this.toSpaceContract(space) : null;
  }

  public async listSpaces(
    options?: { limit?: number; offset?: number },
    userId?: string,
  ): Promise<Space[]> {
    const entities = await this.repo.listSpaces(options);
    if (!userId) {
      return entities.map((e) => this.toSpaceContract(e, false, null));
    }
    const spacesWithMembership = await Promise.all(
      entities.map(async (e) => {
        const membership = await this.repo.getMembership(e.id, userId);
        return this.toSpaceContract(e, Boolean(membership), membership?.role || null);
      }),
    );
    return spacesWithMembership;
  }

  public async joinSpace(spaceId: string, userId: string): Promise<void> {
    const space = await this.repo.findSpaceById(spaceId);
    if (!space) {
      throw new SpaceNotFoundError();
    }
    await this.repo.joinSpace(spaceId, userId, 'MEMBER');
  }

  public async leaveSpace(spaceId: string, userId: string): Promise<void> {
    const space = await this.repo.findSpaceById(spaceId);
    if (!space) {
      throw new SpaceNotFoundError();
    }
    await this.repo.leaveSpace(spaceId, userId);
  }

  public async getMembership(spaceId: string, userId: string): Promise<SpaceMembership | null> {
    const m = await this.repo.getMembership(spaceId, userId);
    if (!m) return null;
    return {
      spaceId: m.spaceId,
      userId: m.userId,
      role: m.role as 'MEMBER' | 'MODERATOR' | 'ADMIN',
      joinedAt: m.joinedAt,
    };
  }

  public async createFlair(
    spaceId: string,
    input: CreateFlairInput,
    userId: string,
  ): Promise<SpaceFlair> {
    const membership = await this.repo.getMembership(spaceId, userId);
    if (!membership || (membership.role !== 'CREATOR' && membership.role !== 'MODERATOR')) {
      throw new InsufficientSpacePermissionError('Chỉ Quản trị viên mới được tạo Flair');
    }

    const flair = await this.repo.createFlair(spaceId, input.name, input.colorHex);
    return {
      id: flair.id,
      spaceId: flair.spaceId,
      name: flair.name,
      slug: input.slug,
      colorHex: flair.color,
      backgroundHex: input.backgroundHex,
      createdAt: flair.createdAt,
    };
  }

  public async listFlairs(spaceId: string): Promise<SpaceFlair[]> {
    const flairs = await this.repo.listFlairs(spaceId);
    return flairs.map((f) => ({
      id: f.id,
      spaceId: f.spaceId,
      name: f.name,
      slug: f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      colorHex: f.color,
      backgroundHex: '#393E46',
      createdAt: f.createdAt,
    }));
  }
}
