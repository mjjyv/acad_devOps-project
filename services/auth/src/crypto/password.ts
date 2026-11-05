import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_CONFIG = {
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 64,
  saltLen: 16,
  maxmem: 64 * 1024 * 1024, // 64MB RAM
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
   * Băm mật khẩu bằng KDF với 64MB RAM, Salt 16 bytes ngẫu nhiên
   * Định dạng chuẩn: $scrypt$N=16384,r=8,p=1${salt_hex}${hash_hex}
   */
  public static async hash(password: string): Promise<string> {
    const salt = randomBytes(SCRYPT_CONFIG.saltLen);
    const derivedKey = await scryptAsync(password, salt, SCRYPT_CONFIG.keyLen, {
      cost: SCRYPT_CONFIG.N,
      blockSize: SCRYPT_CONFIG.r,
      parallelization: SCRYPT_CONFIG.p,
      maxmem: SCRYPT_CONFIG.maxmem,
    });

    return `$scrypt$N=${SCRYPT_CONFIG.N},r=${SCRYPT_CONFIG.r},p=${SCRYPT_CONFIG.p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
  }

  /**
   * So khớp mật khẩu với mã băm lưu trữ bằng thuật toán thời gian an toàn crypto.timingSafeEqual
   * Chống tấn công Timing Attacks và Side-Channel Attacks
   */
  public static async verify(password: string, storedHash: string): Promise<boolean> {
    try {
      const parts = storedHash.split('$');
      // Format: ['', 'scrypt', 'N=...,r=...,p=...', 'salt_hex', 'hash_hex']
      if (parts.length !== 5 || parts[1] !== 'scrypt') {
        return false;
      }

      const paramsStr = parts[2];
      const saltHex = parts[3];
      const hashHex = parts[4];

      if (!paramsStr || !saltHex || !hashHex) {
        return false;
      }

      const params = paramsStr.split(',').reduce<Record<string, number>>((acc, curr) => {
        const [k, v] = curr.split('=');
        if (k && v) {
          acc[k] = parseInt(v, 10);
        }
        return acc;
      }, {});

      const cost = params.N || SCRYPT_CONFIG.N;
      const blockSize = params.r || SCRYPT_CONFIG.r;
      const parallelization = params.p || SCRYPT_CONFIG.p;

      const salt = Buffer.from(saltHex, 'hex');
      const expectedKey = Buffer.from(hashHex, 'hex');

      const derivedKey = await scryptAsync(password, salt, expectedKey.length, {
        cost,
        blockSize,
        parallelization,
        maxmem: SCRYPT_CONFIG.maxmem,
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
