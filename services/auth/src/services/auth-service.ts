import { randomUUID } from 'node:crypto';
import type {
  AuthResponse,
  LoginInput,
  PublicUserProfile,
  RegisterInput,
  SessionInfo,
  UserProfile,
} from '@acad/contracts';
import { PasswordHasher } from '../crypto/password.js';
import { TokenManager, type UserTokenClaims } from '../crypto/token.js';
import type { IUserRepository, UserEntity } from '../repository/user-repository.js';
import type { ISessionStore } from '../session/store.js';
import { TokenRotationService } from '../session/token-rotation-service.js';
import type { TokenRotationResult, UserSession } from '../session/types.js';

export interface AuthSessionMetadata {
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceFingerprint?: string | null;
}

export interface RegisterResult extends AuthResponse {
  refreshToken: string;
}

export interface LoginResult extends AuthResponse {
  refreshToken: string;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'UNAUTHORIZED',
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AccountSuspendedError extends Error {
  constructor(message: string = 'Tài khoản đã bị tạm khóa') {
    super(message);
    this.name = 'AccountSuspendedError';
  }
}

export class TokenReuseError extends Error {
  constructor(
    message: string = 'Phát hiện hành vi tái sử dụng Refresh Token! Toàn bộ phiên đã bị thu hồi.',
  ) {
    super(message);
    this.name = 'TokenReuseError';
  }
}

export class TokenExpiredError extends Error {
  constructor(message: string = 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class AuthService {
  private rotationService: TokenRotationService;

  constructor(
    private userRepository: IUserRepository,
    private sessionStore: ISessionStore,
    private jwtSecret: string = TokenManager.DEFAULT_SECRET,
  ) {
    this.rotationService = new TokenRotationService(
      this.sessionStore,
      async (userId: string): Promise<UserTokenClaims | null> => {
        const u = await this.userRepository.findById(userId);
        if (!u) return null;
        return {
          sub: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          status: u.status,
          sessionId: '',
        };
      },
      this.jwtSecret,
      {
        onSessionRotated: async (session) => {
          await this.userRepository.upsertSession?.(session);
        },
        onReuseRevoked: async (userId) => {
          await this.userRepository.revokeAllUserSessions?.(userId);
        },
      },
    );
  }

  private toProfile(user: UserEntity): UserProfile {
    const { passwordHash: _, ...profile } = user;
    return profile;
  }

  private async issueSession(
    user: UserEntity,
    meta?: AuthSessionMetadata,
  ): Promise<{ sessionId: string; accessToken: string; refreshToken: string }> {
    const sessionId = randomUUID();
    const refreshToken = TokenManager.generateRefreshToken();
    const refreshTokenHash = TokenManager.hashToken(refreshToken);

    const claims: UserTokenClaims = {
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      sessionId,
    };
    const accessToken = TokenManager.signAccessToken(claims, this.jwtSecret);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + TokenManager.REFRESH_TOKEN_TTL_SECONDS * 1000);

    const session: UserSession = {
      id: sessionId,
      userId: user.id,
      currentTokenHash: refreshTokenHash,
      previousTokenHash: null,
      gracePeriodExpiresAt: null,
      deviceFingerprint: meta?.deviceFingerprint ?? null,
      ipAddress: meta?.ipAddress ?? null,
      userAgent: meta?.userAgent ?? null,
      isRevoked: false,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await this.sessionStore.saveSession(session);
    await this.userRepository.upsertSession?.(session);

    return { sessionId, accessToken, refreshToken };
  }

  public async register(input: RegisterInput, meta?: AuthSessionMetadata): Promise<RegisterResult> {
    const passwordHash = await PasswordHasher.hash(input.password);
    const user = await this.userRepository.createUser({
      username: input.username,
      email: input.email,
      passwordHash,
      role: 'USER',
      status: 'ACTIVE',
    });

    const { sessionId, accessToken, refreshToken } = await this.issueSession(user, meta);

    return {
      user: this.toProfile(user),
      sessionId,
      accessToken,
      refreshToken,
    };
  }

  public async login(input: LoginInput, meta?: AuthSessionMetadata): Promise<LoginResult> {
    const user = await this.userRepository.findByUsernameOrEmail(input.identifier);
    if (!user) {
      throw new AuthenticationError('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    if (user.status === 'SUSPENDED' || user.status === 'DELETED') {
      throw new AccountSuspendedError('Tài khoản này đang bị khóa hoặc ngừng hoạt động');
    }

    const isValid = await PasswordHasher.verify(input.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    const mergedMeta: AuthSessionMetadata = {
      ...meta,
      deviceFingerprint: input.fingerprint ?? meta?.deviceFingerprint ?? null,
    };
    const { sessionId, accessToken, refreshToken } = await this.issueSession(user, mergedMeta);

    return {
      user: this.toProfile(user),
      sessionId,
      accessToken,
      refreshToken,
    };
  }

  public async refresh(refreshToken: string): Promise<TokenRotationResult> {
    return this.rotationService.rotateTokens(refreshToken);
  }

  public async logout(userId: string, sessionId: string): Promise<void> {
    await this.sessionStore.revokeSession(userId, sessionId);
    await this.userRepository.revokeSessionById?.(userId, sessionId);
  }

  public async revokeSession(userId: string, targetSessionId: string): Promise<void> {
    await this.sessionStore.revokeSession(userId, targetSessionId);
    await this.userRepository.revokeSessionById?.(userId, targetSessionId);
  }

  public async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.userRepository.findById(userId);
    return user ? this.toProfile(user) : null;
  }

  public async getPublicProfileByUsername(username: string): Promise<PublicUserProfile | null> {
    const user = await this.userRepository.findByUsername(username);
    if (!user || user.status === 'DELETED') {
      return null;
    }
    const { email: _email, passwordHash: _passwordHash, ...publicProfile } = user;
    return publicProfile;
  }

  public async searchActiveUsers(
    query: string,
    excludeUserId?: string,
    limit = 10,
  ): Promise<PublicUserProfile[]> {
    const rows = await this.userRepository.searchActiveUsers(query, excludeUserId, limit);
    return rows.map(({ email: _email, passwordHash: _passwordHash, ...pub }) => pub);
  }

  public async listSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
    const rawSessions = await this.sessionStore.listUserSessions(userId);
    return rawSessions.map((s) => ({
      id: s.id,
      userId: s.userId,
      deviceFingerprint: s.deviceFingerprint,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      isCurrentSession: s.id === currentSessionId,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
    }));
  }

  public async checkHealth(): Promise<{ postgres: boolean; redis: boolean }> {
    const [postgres, redis] = await Promise.all([
      this.userRepository.checkHealth(),
      this.sessionStore.checkHealth(),
    ]);
    return { postgres, redis };
  }
}
