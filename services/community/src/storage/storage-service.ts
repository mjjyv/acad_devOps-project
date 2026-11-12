import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  InvalidMediaFileError,
  MAX_MEDIA_SIZE_BYTES,
  resolveSafeMimeFromKey,
  validateMediaUploadInput,
  validateUploadedFileBuffer,
} from './file-guard.js';

export type StorageProviderMode = 's3' | 'local';

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
  provider: StorageProviderMode;
  requiredHeaders: Record<string, string>;
}

export interface LocalUploadVerificationInput {
  key: string;
  exp: number;
  mime: string;
  max: number;
  uid: string;
  sig: string;
  contentType: string;
  body: Buffer;
}

export interface StorageServiceOptions {
  bucketName?: string | undefined;
  cdnBaseUrl?: string | undefined;
  s3Endpoint?: string | undefined;
  s3Region?: string | undefined;
  s3AccessKeyId?: string | undefined;
  s3SecretAccessKey?: string | undefined;
  localUploadDir?: string | undefined;
  signingSecret?: string | undefined;
}

function isRealSecret(val: string | undefined): val is string {
  return Boolean(val && !val.startsWith('your_') && val.trim().length >= 8);
}

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

/**
 * Dual-mode Zero-Hop Media Storage Service:
 * - When S3 / Cloudflare R2 credentials exist: generates genuine AWS SigV4 Presigned PUT URLs.
 * - Otherwise (Homelab / Dev / CI): issues HMAC-signed Local Disk PUT tickets & serves safe uploads.
 */
export class ZeroHopStorageService {
  private readonly bucketName: string;
  private readonly cdnBaseUrl: string;
  private readonly s3Endpoint: string | undefined;
  private readonly s3Region: string;
  private readonly s3AccessKeyId: string | undefined;
  private readonly s3SecretAccessKey: string | undefined;
  private readonly localUploadDir: string;
  private readonly signingSecret: string;

  constructor(options?: StorageServiceOptions) {
    const r2Account = process.env.R2_ACCOUNT_ID;
    const derivedR2Endpoint = isRealSecret(r2Account)
      ? `https://${r2Account}.r2.cloudflarestorage.com`
      : undefined;

    this.bucketName =
      options?.bucketName ||
      process.env.R2_BUCKET_NAME ||
      process.env.STORAGE_BUCKET ||
      'acad-media-bucket';
    this.cdnBaseUrl =
      options?.cdnBaseUrl || process.env.R2_PUBLIC_DOMAIN || process.env.CDN_BASE_URL || '';
    this.s3Endpoint = options?.s3Endpoint || process.env.S3_ENDPOINT || derivedR2Endpoint;
    this.s3Region = options?.s3Region || process.env.S3_REGION || 'auto';
    this.s3AccessKeyId =
      options?.s3AccessKeyId || process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
    this.s3SecretAccessKey =
      options?.s3SecretAccessKey ||
      process.env.R2_SECRET_ACCESS_KEY ||
      process.env.S3_SECRET_ACCESS_KEY;

    this.localUploadDir = path.resolve(
      options?.localUploadDir ||
        process.env.LOCAL_UPLOAD_DIR ||
        path.join(process.cwd(), '.data/uploads'),
    );
    this.signingSecret =
      options?.signingSecret ||
      process.env.MEDIA_SIGNING_SECRET ||
      process.env.JWT_SECRET ||
      'acad-local-media-signing-secret-v3-dev!';
  }

  public isS3Configured(): boolean {
    return (
      Boolean(this.s3Endpoint) &&
      isRealSecret(this.s3AccessKeyId) &&
      isRealSecret(this.s3SecretAccessKey)
    );
  }

  public async generatePresignedUploadUrl(options: {
    fileName: string;
    fileType: string;
    fileSizeBytes?: number | undefined;
    userId: string;
    baseUrl?: string | undefined;
  }): Promise<PresignedUploadResult> {
    const { safeName, normalizedMime } = validateMediaUploadInput(options);
    const randomSuffix = randomBytes(4).toString('hex');
    const key = `uploads/${options.userId}/${Date.now()}-${randomSuffix}-${safeName}`;
    const expiresIn = 300;

    if (this.isS3Configured() && this.s3Endpoint && this.s3AccessKeyId && this.s3SecretAccessKey) {
      return this.generateS3PresignedUrl({
        key,
        normalizedMime,
        expiresIn,
        endpoint: this.s3Endpoint,
        accessKeyId: this.s3AccessKeyId,
        secretAccessKey: this.s3SecretAccessKey,
      });
    }

    const base = (options.baseUrl || `http://127.0.0.1:${process.env.PORT || 10000}`).replace(
      /\/$/,
      '',
    );
    const exp = Date.now() + expiresIn * 1000;
    const max = MAX_MEDIA_SIZE_BYTES;
    const sig = this.signLocalTicket({ key, exp, mime: normalizedMime, max, uid: options.userId });

    const params = new URLSearchParams({
      key,
      exp: String(exp),
      mime: normalizedMime,
      max: String(max),
      uid: options.userId,
      sig,
    });

    return {
      uploadUrl: `${base}/api/v1/media/upload?${params.toString()}`,
      publicUrl: `${base}/api/v1/media/files/${key}`,
      key,
      expiresIn,
      provider: 'local',
      requiredHeaders: { 'Content-Type': normalizedMime },
    };
  }

  private generateS3PresignedUrl(cfg: {
    key: string;
    normalizedMime: string;
    expiresIn: number;
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
  }): PresignedUploadResult {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const credentialScope = `${dateStamp}/${this.s3Region}/s3/aws4_request`;

    const endpointUrl = new URL(cfg.endpoint);
    const objectPath = `/${this.bucketName}/${cfg.key}`.replace(/\/+/g, '/');

    const queryParams = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${cfg.accessKeyId}/${credentialScope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(cfg.expiresIn),
      'X-Amz-SignedHeaders': 'host',
    });
    queryParams.sort();

    const canonicalRequest = [
      'PUT',
      objectPath,
      queryParams.toString(),
      `host:${endpointUrl.host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');

    const kDate = hmacSha256(`AWS4${cfg.secretAccessKey}`, dateStamp);
    const kRegion = hmacSha256(kDate, this.s3Region);
    const kService = hmacSha256(kRegion, 's3');
    const kSigning = hmacSha256(kService, 'aws4_request');
    const signature = createHmac('sha256', kSigning).update(stringToSign, 'utf8').digest('hex');

    queryParams.set('X-Amz-Signature', signature);

    const uploadUrl = `${endpointUrl.origin}${objectPath}?${queryParams.toString()}`;
    const publicBase =
      this.cdnBaseUrl && !this.cdnBaseUrl.includes('cdn.acad-community.dev')
        ? this.cdnBaseUrl.replace(/\/$/, '')
        : `${endpointUrl.origin}/${this.bucketName}`;

    return {
      uploadUrl,
      publicUrl: `${publicBase}/${cfg.key}`,
      key: cfg.key,
      expiresIn: cfg.expiresIn,
      provider: 's3',
      requiredHeaders: { 'Content-Type': cfg.normalizedMime },
    };
  }

  private signLocalTicket(payload: {
    key: string;
    exp: number;
    mime: string;
    max: number;
    uid: string;
  }): string {
    const raw = `${payload.key}|${payload.exp}|${payload.mime}|${payload.max}|${payload.uid}`;
    return createHmac('sha256', this.signingSecret).update(raw, 'utf8').digest('hex');
  }

  private resolveSafeLocalPath(key: string): string {
    if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) {
      throw new InvalidMediaFileError('Đường dẫn tệp tải lên không hợp lệ');
    }
    const target = path.resolve(this.localUploadDir, key);
    const rootWithSep = this.localUploadDir.endsWith(path.sep)
      ? this.localUploadDir
      : `${this.localUploadDir}${path.sep}`;
    if (!target.startsWith(rootWithSep)) {
      throw new InvalidMediaFileError('Truy cập vượt ngoài thư mục lưu trữ được phép');
    }
    return target;
  }

  public async saveLocalUpload(
    input: LocalUploadVerificationInput,
    baseUrl?: string,
  ): Promise<{ key: string; publicUrl: string; sizeBytes: number; contentType: string }> {
    const expectedSig = this.signLocalTicket({
      key: input.key,
      exp: input.exp,
      mime: input.mime,
      max: input.max,
      uid: input.uid,
    });

    const sigBuf = Buffer.from(input.sig, 'utf8');
    const expBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new InvalidMediaFileError('Chữ ký xác thực upload không hợp lệ');
    }

    if (Date.now() > input.exp) {
      throw new InvalidMediaFileError('Liên kết upload đã hết hạn, vui lòng xin lại URL mới');
    }

    const normalizedContentType = input.contentType.split(';')[0]?.trim().toLowerCase() ?? '';
    if (normalizedContentType && normalizedContentType !== input.mime.toLowerCase()) {
      throw new InvalidMediaFileError('Content-Type không khớp với yêu cầu presign');
    }

    if (input.body.length > input.max) {
      throw new InvalidMediaFileError('Dung lượng tệp vượt quá giới hạn ticket');
    }

    validateUploadedFileBuffer(input.body, input.mime);

    const destPath = this.resolveSafeLocalPath(input.key);
    await mkdir(path.dirname(destPath), { recursive: true });
    await writeFile(destPath, input.body);

    const base = (baseUrl || `http://127.0.0.1:${process.env.PORT || 10000}`).replace(/\/$/, '');
    return {
      key: input.key,
      publicUrl: `${base}/api/v1/media/files/${input.key}`,
      sizeBytes: input.body.length,
      contentType: input.mime,
    };
  }

  public async readLocalFile(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const targetPath = this.resolveSafeLocalPath(key);
    if (!existsSync(targetPath)) {
      return null;
    }
    const buffer = await readFile(targetPath);
    return {
      buffer,
      mimeType: resolveSafeMimeFromKey(key),
    };
  }
}
