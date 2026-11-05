import { describe, expect, it } from 'vitest';
import { PasswordHasher } from '../src/crypto/password.js';
import { TokenManager, type UserTokenClaims } from '../src/crypto/token.js';

describe('Động cơ Mật mã & Quản lý Token (@acad/auth-service/crypto)', () => {
  describe('1. PasswordHasher (KDF 64MB RAM & Constant-time comparison)', () => {
    it('Phải băm mật khẩu thành chuỗi scrypt định dạng chuẩn', async () => {
      const rawPassword = 'StrongPassword123!';
      const hash = await PasswordHasher.hash(rawPassword);

      expect(hash).toContain('$scrypt$N=16384,r=8,p=1$');
      const parts = hash.split('$');
      expect(parts.length).toBe(5);
      expect(parts[3]?.length).toBe(32); // 16 bytes salt hex = 32 hex chars
      expect(parts[4]?.length).toBe(128); // 64 bytes key hex = 128 hex chars
    });

    it('Phải xác thực thành công mật khẩu đúng và từ chối mật khẩu sai', async () => {
      const rawPassword = 'CorrectPassword999$';
      const hash = await PasswordHasher.hash(rawPassword);

      const isValid = await PasswordHasher.verify(rawPassword, hash);
      expect(isValid).toBe(true);

      const isInvalid = await PasswordHasher.verify('WrongPassword123', hash);
      expect(isInvalid).toBe(false);
    });

    it('Phải từ chối chuỗi hash bị định dạng sai hoặc giả mạo', async () => {
      expect(await PasswordHasher.verify('any', 'malformed_hash')).toBe(false);
      expect(await PasswordHasher.verify('any', '$md5$N=1$salt$hash')).toBe(false);
    });
  });

  describe('2. TokenManager (JWT HS256 & CSPRNG 64 Bytes)', () => {
    const mockClaims: UserTokenClaims = {
      sub: '11111111-1111-1111-1111-111111111111',
      username: 'alex_devops',
      email: 'alex@acad.community',
      role: 'USER',
      status: 'ACTIVE',
      sessionId: '22222222-2222-2222-2222-222222222222',
    };

    it('Phải sinh Refresh Token ngẫu nhiên độ dài 64 bytes base64url', () => {
      const token1 = TokenManager.generateRefreshToken();
      const token2 = TokenManager.generateRefreshToken();

      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThanOrEqual(80);
    });

    it('Phải băm SHA-256 nhất quán cho Refresh Token', () => {
      const token = 'sample_random_token_string';
      const hash1 = TokenManager.hashToken(token);
      const hash2 = TokenManager.hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('Phải ký số và giải mã thành công Access Token JWT HS256', () => {
      const secret = 'super-secret-key-32-characters-length!';
      const token = TokenManager.signAccessToken(mockClaims, secret);

      const decoded = TokenManager.verifyAccessToken(token, secret);
      expect(decoded).not.toBeNull();
      expect(decoded?.sub).toBe(mockClaims.sub);
      expect(decoded?.username).toBe(mockClaims.username);
      expect(decoded?.role).toBe(mockClaims.role);
      expect(decoded?.sessionId).toBe(mockClaims.sessionId);
      expect(decoded?.exp).toBeGreaterThan(decoded?.iat || 0);
    });

    it('Phải từ chối Access Token nếu sai khóa bí mật hoặc bị chỉnh sửa chữ ký', () => {
      const secret1 = 'key-one-32-characters-length-needed-here!';
      const secret2 = 'key-two-32-characters-length-needed-here!';
      const token = TokenManager.signAccessToken(mockClaims, secret1);

      const decoded = TokenManager.verifyAccessToken(token, secret2);
      expect(decoded).toBeNull();

      const tamperedToken = `${token}tampered`;
      expect(TokenManager.verifyAccessToken(tamperedToken, secret1)).toBeNull();
    });
  });
});
