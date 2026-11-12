import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const SCRYPT_CONFIG = {
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 64,
  saltLen: 16,
  maxmem: 64 * 1024 * 1024,
} as const;

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: { cost: number; blockSize: number; parallelization: number; maxmem: number },
): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

export class PasswordHasher {
  /**
   * Băm mật khẩu theo chuẩn $scrypt$N=16384,r=8,p=1${salt_hex}${hash_hex}
   * Tương thích 100% với seed dữ liệu PostgreSQL tại deploy/seeds/001_auth_seed.sql.
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
   * So khớp mật khẩu với hash bằng crypto.timingSafeEqual chống timing attack.
   */
  public static async verify(password: string, storedHash: string): Promise<boolean> {
    try {
      const parts = storedHash.split('$');
      if (parts.length !== 5 || parts[1] !== 'scrypt') {
        return false;
      }

      const [, , paramsStr, saltHex, hashHex] = parts;
      if (!paramsStr || !saltHex || !hashHex) {
        return false;
      }

      const params: Record<string, number> = {};
      for (const entry of paramsStr.split(',')) {
        const [k, v] = entry.split('=');
        if (k && v) {
          const parsed = Number.parseInt(v, 10);
          if (Number.isFinite(parsed) && parsed > 0) {
            params[k] = parsed;
          }
        }
      }

      const cost = params.N ?? SCRYPT_CONFIG.N;
      const blockSize = params.r ?? SCRYPT_CONFIG.r;
      const parallelization = params.p ?? SCRYPT_CONFIG.p;

      const salt = Buffer.from(saltHex, 'hex');
      const expectedKey = Buffer.from(hashHex, 'hex');
      if (salt.length === 0 || expectedKey.length === 0) {
        return false;
      }

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
