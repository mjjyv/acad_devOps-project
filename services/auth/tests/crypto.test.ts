import { describe, expect, it } from 'vitest';
import { PasswordHasher } from '../src/crypto/password.js';
import { TokenManager } from '../src/crypto/token.js';

describe('1. Kiểm thử Thuật toán Băm Mật khẩu (PasswordHasher)', () => {
  it('Băm mật khẩu thành chuỗi định dạng scrypt chuẩn với salt ngẫu nhiên', async () => {
    const rawPass = 'SecretP@ssw0rd123';
    const hash1 = await PasswordHasher.hash(rawPass);
    const hash2 = await PasswordHasher.hash(rawPass);

    expect(hash1).toMatch(/^\$scrypt\$N=16384,r=8,p=1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
    expect(hash2).toMatch(/^\$scrypt\$N=16384,r=8,p=1\$[a-f0-9]{32}\$[a-f0-9]{128}$/);

    // Muối ngẫu nhiên phải khác nhau -> Mã băm phải khác nhau dù cùng mật khẩu
    expect(hash1).not.toBe(hash2);
  });

  it('Xác thực đúng mật khẩu và từ chối mật khẩu sai', async () => {
    const rawPass = 'MyStrongPassword#2026';
    const hash = await PasswordHasher.hash(rawPass);

    const isMatch = await PasswordHasher.verify(rawPass, hash);
    expect(isMatch).toBe(true);

    const isWrong = await PasswordHasher.verify('WrongPassword#2026', hash);
    expect(isWrong).toBe(false);
  });

  it('Từ chối chuỗi hash bị chỉnh sửa hoặc sai định dạng', async () => {
    const rawPass = 'CorrectPass123';
    const hash = await PasswordHasher.hash(rawPass);
    const tamperedHash = hash.slice(0, -4) + '0000';

    const isValid = await PasswordHasher.verify(rawPass, tamperedHash);
    expect(isValid).toBe(false);

    const isMalformed = await PasswordHasher.verify(rawPass, 'invalid$hash$string');
    expect(isMalformed).toBe(false);
  });
});

describe('2. Kiểm thử Token Manager & Mật mã Ký số (TokenManager)', () => {
  const dummyPayload = {
    sub: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    username: 'alice_dev',
    email: 'alice@example.com',
    role: 'USER' as const,
    status: 'ACTIVE' as const,
    karmaScore: 120,
    accountAgeDays: 14,
    tokenVersion: 1,
    spacePermissions: [],
  };

  it('Ký và giải mã JWT Access Token thành công với đầy đủ Claims', () => {
    const token = TokenManager.signAccessToken(dummyPayload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);

    const verified = TokenManager.verifyAccessToken(token);
    expect(verified.sub).toBe(dummyPayload.sub);
    expect(verified.username).toBe('alice_dev');
    expect(verified.role).toBe('USER');
    expect(verified.iss).toBe('acad-community-auth');
    expect(verified.exp - verified.iat).toBe(TokenManager.ACCESS_TOKEN_TTL_SECONDS);
  });

  it('Phát hiện và từ chối token có chữ ký bị giả mạo', () => {
    const token = TokenManager.signAccessToken(dummyPayload);
    const parts = token.split('.');
    // Giả mạo payload
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...dummyPayload, role: 'ADMIN' }),
    ).toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    expect(() => TokenManager.verifyAccessToken(tamperedToken)).toThrowError(
      /Chữ ký token không hợp lệ/,
    );
  });

  it('Sinh Refresh Token ngẫu nhiên bảo mật (CSPRNG) và băm SHA-256 nhất quán', () => {
    const rt1 = TokenManager.generateRefreshToken();
    const rt2 = TokenManager.generateRefreshToken();

    expect(typeof rt1).toBe('string');
    expect(rt1).not.toBe(rt2);
    expect(rt1.length).toBeGreaterThanOrEqual(80);

    const hash1 = TokenManager.hashToken(rt1);
    const hash2 = TokenManager.hashToken(rt1);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });
});
