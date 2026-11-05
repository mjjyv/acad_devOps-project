import { randomUUID } from 'node:crypto';
import type { UserProfile, UserRole, UserStatus } from '@acad/contracts';

export class DuplicateUserError extends Error {
  constructor(
    public readonly field: 'username' | 'email',
    message: string,
  ) {
    super(message);
    this.name = 'DuplicateUserError';
  }
}

export interface UserEntity extends UserProfile {
  passwordHash: string;
}

export interface CreateUserData {
  username: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
  status?: UserStatus;
  avatarUrl?: string | null;
  bio?: string | null;
}

export interface IUserRepository {
  createUser(data: CreateUserData): Promise<UserEntity>;
  findById(id: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsernameOrEmail(identifier: string): Promise<UserEntity | null>;
  updateStatus(id: string, status: UserStatus): Promise<void>;
  updateRole(id: string, role: UserRole): Promise<void>;
  checkHealth(): Promise<boolean>;
}

/**
 * InMemoryUserRepository for fast, deterministic unit testing without database dependency.
 */
export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, UserEntity> = new Map();

  public async createUser(data: CreateUserData): Promise<UserEntity> {
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === data.username.toLowerCase()) {
        throw new DuplicateUserError('username', 'Tên người dùng đã tồn tại trong hệ thống');
      }
      if (u.email.toLowerCase() === data.email.toLowerCase()) {
        throw new DuplicateUserError('email', 'Email đã tồn tại trong hệ thống');
      }
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const user: UserEntity = {
      id,
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role ?? 'USER',
      status: data.status ?? 'ACTIVE',
      karmaScore: 0,
      threadsCount: 0,
      avatarUrl: data.avatarUrl ?? null,
      bio: data.bio ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(id, user);
    return user;
  }

  public async findById(id: string): Promise<UserEntity | null> {
    return this.users.get(id) || null;
  }

  public async findByUsername(username: string): Promise<UserEntity | null> {
    const lower = username.toLowerCase();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === lower) {
        return u;
      }
    }
    return null;
  }

  public async findByEmail(email: string): Promise<UserEntity | null> {
    const lower = email.toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === lower) {
        return u;
      }
    }
    return null;
  }

  public async findByUsernameOrEmail(identifier: string): Promise<UserEntity | null> {
    const lower = identifier.toLowerCase();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === lower || u.email.toLowerCase() === lower) {
        return u;
      }
    }
    return null;
  }

  public async updateStatus(id: string, status: UserStatus): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.status = status;
      user.updatedAt = new Date().toISOString();
    }
  }

  public async updateRole(id: string, role: UserRole): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.role = role;
      user.updatedAt = new Date().toISOString();
    }
  }

  public async checkHealth(): Promise<boolean> {
    return true;
  }

  public clear(): void {
    this.users.clear();
  }
}
