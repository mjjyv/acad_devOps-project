import { randomUUID } from 'node:crypto';
import {
  AuthResponse,
  COOKIE_CONFIG,
  LoginInput,
  LoginInputSchema,
  RegisterInput,
  RegisterInputSchema,
  UserProfile,
  UserRole,
  UserStatus,
} from '@acad/contracts';
import { PasswordHasher } from '../crypto/password.js';
import { TokenManager, TokenPair } from '../crypto/token.js';
import { ISessionStore } from '../session/store.js';
import { TokenRotationService } from '../session/token-rotation-service.js';
import { UserSession } from '../session/types.js';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  karmaScore: number;
  avatarUrl?: string | null;
  bio?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserListFilter {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface UserListResult {
  users: UserRecord[];
  total: number;
}

export interface UserStatsResult {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  moderatorUsers: number;
}

export interface IUserRepository {
  create(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByUsername(username: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  listUsers(filter?: UserListFilter): Promise<UserListResult>;
  updateRole(id: string, role: UserRole): Promise<UserRecord>;
  updateStatus(id: string, status: UserStatus): Promise<UserRecord>;
  getStats(): Promise<UserStatsResult>;
}

export class InMemoryUserRepository implements IUserRepository {
  private users = new Map<string, UserRecord>();

  public async create(user: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord> {
    const id = randomUUID();
    const now = new Date();
    const record: UserRecord = {
      ...user,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(id, record);
    return { ...record };
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    const lower = email.toLowerCase();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === lower) return { ...u };
    }
    return null;
  }

  public async findByUsername(username: string): Promise<UserRecord | null> {
    const lower = username.toLowerCase();
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === lower) return { ...u };
    }
    return null;
  }

  public async findById(id: string): Promise<UserRecord | null> {
    const u = this.users.get(id);
    return u ? { ...u } : null;
  }

  public async listUsers(filter: UserListFilter = {}): Promise<UserListResult> {
    let result = Array.from(this.users.values());
    if (filter.role) {
      result = result.filter((u) => u.role === filter.role);
    }
    if (filter.status) {
      result = result.filter((u) => u.status === filter.status);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter((u) => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = result.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 20;
    const paginated = result.slice(offset, offset + limit).map((u) => ({ ...u }));
    return { users: paginated, total };
  }

  public async updateRole(id: string, role: UserRole): Promise<UserRecord> {
    const user = this.users.get(id);
    if (!user) throw new Error(`Người dùng ID ${id} không tồn tại`);
    user.role = role;
    user.updatedAt = new Date();
    this.users.set(id, user);
    return { ...user };
  }

  public async updateStatus(id: string, status: UserStatus): Promise<UserRecord> {
    const user = this.users.get(id);
    if (!user) throw new Error(`Người dùng ID ${id} không tồn tại`);
    user.status = status;
    user.updatedAt = new Date();
    this.users.set(id, user);
    return { ...user };
  }

  public async getStats(): Promise<UserStatsResult> {
    const all = Array.from(this.users.values());
    return {
      totalUsers: all.length,
      activeUsers: all.filter((u) => u.status === 'ACTIVE').length,
      suspendedUsers: all.filter((u) => u.status === 'SUSPENDED').length,
      adminUsers: all.filter((u) => u.role === 'ADMIN').length,
      moderatorUsers: all.filter((u) => u.role === 'SPACE_MOD' || u.role === 'GLOBAL_MOD').length,
    };
  }
}

export class AuthController {
  private rotationService: TokenRotationService;

  constructor(
    private userRepo: IUserRepository,
    private sessionStore: ISessionStore,
  ) {
    this.rotationService = new TokenRotationService(this.sessionStore, async (userId) => {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new Error('Người dùng không còn tồn tại');
      }
      const ageDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        karmaScore: user.karmaScore,
        accountAgeDays: ageDays,
        tokenVersion: 1,
        spacePermissions: [],
      };
    });
  }

  /**
   * Đăng ký tài khoản mới & Khởi tạo phiên
   */
  public async register(
    rawInput: unknown,
    ip?: string,
    userAgent?: string,
  ): Promise<{ response: AuthResponse; rawTokens: TokenPair; cookies: string[] }> {
    const input = RegisterInputSchema.parse(rawInput);

    const existingEmail = await this.userRepo.findByEmail(input.email);
    if (existingEmail) {
      throw new Error('Địa chỉ email đã được sử dụng');
    }

    const existingUsername = await this.userRepo.findByUsername(input.username);
    if (existingUsername) {
      throw new Error('Tên người dùng đã được sử dụng');
    }

    const passwordHash = await PasswordHasher.hash(input.password);

    const newUser = await this.userRepo.create({
      username: input.username,
      email: input.email,
      passwordHash,
      role: 'USER',
      status: 'ACTIVE',
      karmaScore: 0,
      avatarUrl: null,
      bio: null,
    });

    const sessionData = await this.createSession(
      newUser,
      input.deviceFingerprint ?? 'unknown_device',
      ip,
      userAgent,
    );

    return {
      response: {
        user: this.toProfile(newUser),
        accessToken: sessionData.tokens.accessToken,
        expiresIn: sessionData.tokens.expiresIn,
      },
      rawTokens: sessionData.tokens,
      cookies: this.generateAuthCookies(sessionData.tokens),
    };
  }

  /**
   * Đăng nhập hệ thống & Thiết lập phiên bảo mật
   */
  public async login(
    rawInput: unknown,
    ip?: string,
    userAgent?: string,
  ): Promise<{ response: AuthResponse; rawTokens: TokenPair; cookies: string[] }> {
    const input = LoginInputSchema.parse(rawInput);

    let user: UserRecord | null = null;
    if (input.login.includes('@')) {
      user = await this.userRepo.findByEmail(input.login);
    } else {
      user = await this.userRepo.findByUsername(input.login);
    }

    if (!user) {
      throw new Error('Thông tin đăng nhập hoặc mật khẩu không chính xác');
    }

    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new Error('Tài khoản đã bị tạm ngưng hoặc xóa');
    }

    const isMatch = await PasswordHasher.verify(input.password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Thông tin đăng nhập hoặc mật khẩu không chính xác');
    }

    const sessionData = await this.createSession(
      user,
      input.deviceFingerprint ?? 'unknown_device',
      ip,
      userAgent,
    );

    return {
      response: {
        user: this.toProfile(user),
        accessToken: sessionData.tokens.accessToken,
        expiresIn: sessionData.tokens.expiresIn,
      },
      rawTokens: sessionData.tokens,
      cookies: this.generateAuthCookies(sessionData.tokens),
    };
  }

  /**
   * Làm mới Token (Token Rotation Protocol)
   */
  public async refresh(
    refreshToken: string,
    userId?: string,
    deviceFingerprint?: string,
  ): Promise<{ response: { accessToken: string; expiresIn: number }; cookies: string[] }> {
    const result = await this.rotationService.rotateTokens(refreshToken, userId, deviceFingerprint);

    if (result.status === 'TOKEN_REUSE_DETECTED') {
      throw new Error(`SECURITY_ALERT_TOKEN_REUSE: ${result.error}`);
    }

    if (!result.tokens) {
      throw new Error(result.error || 'Làm mới token thất bại');
    }

    return {
      response: {
        accessToken: result.tokens.accessToken,
        expiresIn: result.tokens.expiresIn,
      },
      cookies: this.generateAuthCookies(result.tokens),
    };
  }

  /**
   * Đăng xuất & Hủy bỏ phiên
   */
  public async logout(sessionId: string): Promise<{ clearCookies: string[] }> {
    await this.sessionStore.revokeSession(sessionId);
    return {
      clearCookies: this.generateClearCookies(),
    };
  }

  /**
   * Thu hồi toàn bộ phiên của tài khoản (Ví dụ khi đổi mật khẩu)
   */
  public async revokeAllSessions(userId: string): Promise<number> {
    return this.sessionStore.revokeAllUserSessions(userId);
  }

  private async createSession(
    user: UserRecord,
    deviceFp: string,
    ip?: string,
    userAgent?: string,
  ): Promise<{ session: UserSession; tokens: TokenPair }> {
    const sessionId = randomUUID();
    const familyId = randomUUID();
    const rawRefreshToken = TokenManager.generateRefreshToken();
    const refreshTokenHash = TokenManager.hashToken(rawRefreshToken);

    const ageDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const accessToken = TokenManager.signAccessToken({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      karmaScore: user.karmaScore,
      accountAgeDays: ageDays,
      tokenVersion: 1,
      spacePermissions: [],
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TokenManager.REFRESH_TOKEN_TTL_SECONDS * 1000);

    const session: UserSession = {
      sessionId,
      userId: user.id,
      familyId,
      deviceFingerprint: deviceFp,
      currentTokenHash: refreshTokenHash,
      previousTokenHash: null,
      gracePeriodExpiresAt: null,
      ipAddress: ip ?? null,
      userAgent: userAgent ?? null,
      isRevoked: false,
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    await this.sessionStore.saveSession(session);

    return {
      session,
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
      },
    };
  }

  private toProfile(user: UserRecord): UserProfile {
    const ageDays = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      karmaScore: user.karmaScore,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      createdAt: user.createdAt.toISOString(),
      accountAgeDays: ageDays,
    };
  }

  public generateAuthCookies(tokens: TokenPair): string[] {
    const secureFlag = COOKIE_CONFIG.ACCESS_TOKEN.SECURE ? '; Secure' : '';
    
    const accessCookie = `${COOKIE_CONFIG.ACCESS_TOKEN.NAME}=${tokens.accessToken}; Path=${COOKIE_CONFIG.ACCESS_TOKEN.PATH}; Max-Age=${COOKIE_CONFIG.ACCESS_TOKEN.MAX_AGE}; HttpOnly; SameSite=${COOKIE_CONFIG.ACCESS_TOKEN.SAME_SITE}${secureFlag}`;

    const refreshCookie = `${COOKIE_CONFIG.REFRESH_TOKEN.NAME}=${tokens.refreshToken}; Path=${COOKIE_CONFIG.REFRESH_TOKEN.PATH}; Max-Age=${COOKIE_CONFIG.REFRESH_TOKEN.MAX_AGE}; HttpOnly; SameSite=${COOKIE_CONFIG.REFRESH_TOKEN.SAME_SITE}${secureFlag}`;

    return [accessCookie, refreshCookie];
  }

  public generateClearCookies(): string[] {
    const accessCookie = `${COOKIE_CONFIG.ACCESS_TOKEN.NAME}=; Path=${COOKIE_CONFIG.ACCESS_TOKEN.PATH}; Max-Age=0; HttpOnly; SameSite=${COOKIE_CONFIG.ACCESS_TOKEN.SAME_SITE}`;

    const refreshCookie = `${COOKIE_CONFIG.REFRESH_TOKEN.NAME}=; Path=${COOKIE_CONFIG.REFRESH_TOKEN.PATH}; Max-Age=0; HttpOnly; SameSite=${COOKIE_CONFIG.REFRESH_TOKEN.SAME_SITE}`;

    return [accessCookie, refreshCookie];
  }
}
