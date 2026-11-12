import { describe, expect, it } from 'vitest';
import {
  AccountSuspendedError,
  AuthenticationError,
  AuthService,
  DuplicateUserError,
  InMemorySessionStore,
  InMemoryUserRepository,
  PasswordHasher,
  TokenManager,
} from '../src/index.js';

// Hash trích từ deploy/seeds/001_auth_seed.sql cho mật khẩu Password123!
const SEED_ADMIN_HASH =
  '$scrypt$N=16384,r=8,p=1$b255175bbd6ad58ead522b940ced70ac$e91917e2bb6e3deab4ea3583f6a9425d4d0a1e8dcde2132f8ef5b422186b5e61489309cbe105e52cf5a1015d98db308e016454c642e5309b32f63e18b5bea426';

describe('@acad/auth-service v3.0.0 Crypto, Token Rotation & Search', () => {
  it('verifies PasswordHasher compatibility with deploy/seeds/001_auth_seed.sql and JWT HS256', async () => {
    expect(await PasswordHasher.verify('Password123!', SEED_ADMIN_HASH)).toBe(true);
    expect(await PasswordHasher.verify('WrongPass!', SEED_ADMIN_HASH)).toBe(false);

    const freshHash = await PasswordHasher.hash('CustomPass!99');
    expect(freshHash.startsWith('$scrypt$N=16384,r=8,p=1$')).toBe(true);
    expect(await PasswordHasher.verify('CustomPass!99', freshHash)).toBe(true);

    const token = TokenManager.signAccessToken(
      {
        sub: 'a0000000-0000-0000-0000-000000000001',
        username: 'admin_pro',
        email: 'admin@acad.vn',
        role: 'ADMIN',
        status: 'ACTIVE',
        sessionId: 'f1000000-0000-0000-0000-000000000001',
      },
      'test-secret-32-chars-minimum-length!!',
    );
    const decoded = TokenManager.verifyAccessToken(token, 'test-secret-32-chars-minimum-length!!');
    expect(decoded?.username).toBe('admin_pro');
    expect(
      TokenManager.verifyAccessToken(`${token}tampered`, 'test-secret-32-chars-minimum-length!!'),
    ).toBeNull();
  });

  it('handles Register, Duplicate Conflict, Login, Suspended rejection, and 3-case Token Rotation', async () => {
    const repo = new InMemoryUserRepository();
    const store = new InMemorySessionStore();
    const auth = new AuthService(repo, store, 'secret-key-at-least-32-bytes-long!!');

    const reg = await auth.register({
      username: 'alice_ops',
      email: 'alice@acad.vn',
      password: 'Password123!',
    });
    expect(reg.user.username).toBe('alice_ops');
    expect(reg.accessToken).toBeTruthy();

    await expect(
      auth.register({
        username: 'ALICE_OPS',
        email: 'other@acad.vn',
        password: 'Password123!',
      }),
    ).rejects.toThrow(DuplicateUserError);

    await expect(
      auth.login({ identifier: 'alice_ops', password: 'WrongPassword!' }),
    ).rejects.toThrow(AuthenticationError);

    const logged = await auth.login({ identifier: 'alice@acad.vn', password: 'Password123!' });
    expect(logged.sessionId).toBeTruthy();

    // Case 1: Rotate current refresh token
    const rot1 = await auth.refresh(logged.refreshToken);
    expect(rot1.status).toBe('SUCCESS');
    if (rot1.status !== 'SUCCESS') throw new Error('Expected SUCCESS');

    // Case 2: Replay previous token within 30s Grace Window
    const grace = await auth.refresh(logged.refreshToken);
    expect(grace.status).toBe('GRACE_PERIOD_RENEWED');

    // Case 3: Expire grace period and replay old token -> TOKEN_REUSE_DETECTED & full family revocation
    const session = await store.getSession(logged.user.id, rot1.session.id);
    expect(session).not.toBeNull();
    if (session) {
      session.gracePeriodExpiresAt = new Date(Date.now() - 1000);
      await store.saveSession(session);
    }

    const reuse = await auth.refresh(logged.refreshToken);
    expect(reuse.status).toBe('TOKEN_REUSE_DETECTED');

    // Subsequent attempt using even the newest token fails because entire user session family was revoked
    const afterRevoke = await auth.refresh(rot1.tokenPair.refreshToken);
    expect(['SESSION_NOT_FOUND', 'SESSION_REVOKED']).toContain(afterRevoke.status);
    expect(await auth.listSessions(logged.user.id)).toHaveLength(0);

    // Suspended user cannot log in
    await repo.updateStatus(reg.user.id, 'SUSPENDED');
    await expect(auth.login({ identifier: 'alice_ops', password: 'Password123!' })).rejects.toThrow(
      AccountSuspendedError,
    );
  });

  it('searches ACTIVE users by username with prefix prioritization and 0 PII exposure', async () => {
    const repo = new InMemoryUserRepository();
    const store = new InMemorySessionStore();
    const auth = new AuthService(repo, store, 'secret-key-at-least-32-bytes-long!!');

    const u1 = await auth.register({
      username: 'sre_requester',
      email: 'req@acad.vn',
      password: 'Password123!',
    });
    await auth.register({
      username: 'k8s_sre_mid',
      email: 'mid@acad.vn',
      password: 'Password123!',
    });
    await auth.register({
      username: 'sre_prefix',
      email: 'pref@acad.vn',
      password: 'Password123!',
    });
    const banned = await auth.register({
      username: 'sre_banned',
      email: 'banned@acad.vn',
      password: 'Password123!',
    });
    await repo.updateStatus(banned.user.id, 'SUSPENDED');

    const found = await auth.searchActiveUsers('sre', u1.user.id, 10);
    expect(found.map((u) => u.username)).toEqual(['sre_prefix', 'k8s_sre_mid']);
    for (const item of found) {
      expect('email' in item).toBe(false);
      expect('passwordHash' in item).toBe(false);
    }
  });
});
