import { randomUUID } from 'node:crypto';
import type { UserProfile, UserRole, UserStatus } from '@acad/contracts';
import type { UserSession } from '../session/types.js';

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
  searchActiveUsers(query: string, excludeUserId?: string, limit?: number): Promise<UserEntity[]>;
  updateStatus(id: string, status: UserStatus): Promise<void>;
  updateRole(id: string, role: UserRole): Promise<void>;
  upsertSession?(session: UserSession): Promise<void>;
  revokeSessionById?(userId: string, sessionId: string): Promise<void>;
  revokeAllUserSessions?(userId: string): Promise<void>;
  checkHealth(): Promise<boolean>;
}

/**
 * InMemoryUserRepository chỉ phục vụ Unit Test cô lập (không dùng trong Production).
 */
export class InMemoryUserRepository implements IUserRepository {
  private users = new Map<string, UserEntity>();
  private dbSessions = new Map<string, UserSession>();

  public async createUser(data: CreateUserData): Promise<UserEntity> {
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === data.username.toLowerCase()) {
        throw new DuplicateUserError('username', 'Tên đăng nhập đã tồn tại trong hệ thống');
      }
      if (u.email.toLowerCase() === data.email.toLowerCase()) {
        throw new DuplicateUserError('email', 'Địa chỉ email đã tồn tại trong hệ thống');
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
    return this.users.get(id) ?? null;
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

  public async searchActiveUsers(
    query: string,
    excludeUserId?: string,
    limit = 10,
  ): Promise<UserEntity[]> {
    const q = query.trim().toLowerCase();
    const matched = Array.from(this.users.values())
      .filter((u) => {
        if (u.status !== 'ACTIVE') return false;
        if (excludeUserId && u.id === excludeUserId) return false;
        if (!q) return true;
        return u.username.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (q) {
          const aStarts = a.username.toLowerCase().startsWith(q) ? 0 : 1;
          const bStarts = b.username.toLowerCase().startsWith(q) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
        }
        return b.karmaScore - a.karmaScore || a.username.localeCompare(b.username);
      });
    return matched.slice(0, Math.min(Math.max(limit, 1), 25));
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

  public async upsertSession(session: UserSession): Promise<void> {
    this.dbSessions.set(session.id, { ...session });
  }

  public async revokeSessionById(_userId: string, sessionId: string): Promise<void> {
    const s = this.dbSessions.get(sessionId);
    if (s) s.isRevoked = true;
  }

  public async revokeAllUserSessions(userId: string): Promise<void> {
    for (const s of this.dbSessions.values()) {
      if (s.userId === userId) s.isRevoked = true;
    }
  }

  public async checkHealth(): Promise<boolean> {
    return true;
  }

  public clear(): void {
    this.users.clear();
    this.dbSessions.clear();
  }
}
