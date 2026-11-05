import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// ============================================================================
// CẤU HÌNH THUẬT TOÁN BĂM MẬT KHẨU BẢO MẬT (OWASP STANDARD)
// Sử dụng KDF chống tấn công ASIC/GPU với Salt ngẫu nhiên 16 bytes
// ============================================================================
const SCRYPT_CONFIG = {
  N: 16384, // CPU/memory cost parameter (16MB memory)
  r: 8,     // Block size
  p: 1,     // Parallelization
  keyLen: 64, // Độ dài khóa xuất ra (512 bits)
  saltLen: 16, // Độ dài muối ngẫu nhiên (128 bits)
};

const scryptAsync = (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { cost: number; blockSize: number; parallelization: number; maxmem: number },
): Promise<Buffer> => {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
};

export class PasswordHasher {
  /**
   * Băm mật khẩu bản rõ thành chuỗi định dạng chuẩn:
   * $scrypt$N={N},r={r},p={p}${salt_hex}${hash_hex}
   */
  public static async hash(password: string): Promise<string> {
    const salt = randomBytes(SCRYPT_CONFIG.saltLen);
    const derivedKey = await scryptAsync(password, salt, SCRYPT_CONFIG.keyLen, {
      cost: SCRYPT_CONFIG.N,
      blockSize: SCRYPT_CONFIG.r,
      parallelization: SCRYPT_CONFIG.p,
      maxmem: 64 * 1024 * 1024, // 64MB
    });

    return `$scrypt$N=${SCRYPT_CONFIG.N},r=${SCRYPT_CONFIG.r},p=${SCRYPT_CONFIG.p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
  }

  /**
   * So khớp mật khẩu với mã băm đã lưu trữ bằng thuật toán thời gian hằng số O(1)
   * Chống tấn công kênh bên (Side-channel & Timing Attacks)
   */
  public static async verify(password: string, storedHash: string): Promise<boolean> {
    try {
      const parts = storedHash.split('$');
      // Format: ['', 'scrypt', 'N=...,r=...,p=...', 'salt_hex', 'hash_hex']
      if (parts.length !== 5 || parts[1] !== 'scrypt') {
        return false;
      }

      const params = parts[2].split(',').reduce<Record<string, number>>((acc, curr) => {
        const [k, v] = curr.split('=');
        acc[k] = parseInt(v, 10);
        return acc;
      }, {});

      const salt = Buffer.from(parts[3], 'hex');
      const expectedKey = Buffer.from(parts[4], 'hex');

      const derivedKey = await scryptAsync(password, salt, expectedKey.length, {
        cost: params.N || SCRYPT_CONFIG.N,
        blockSize: params.r || SCRYPT_CONFIG.r,
        parallelization: params.p || SCRYPT_CONFIG.p,
        maxmem: 64 * 1024 * 1024,
      });

      if (derivedKey.length !== expectedKey.length) {
        return false;
      }

      return timingSafeEqual(derivedKey, expectedKey);
    } catch {
      return false;
    }
  }
}
