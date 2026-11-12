/**
 * @file storage-service.ts
 * @description Zero-Hop Media Storage Service (Presigned PUT URL generator for S3 / Cloudflare R2).
 */

import { randomBytes } from 'node:crypto';

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export class ZeroHopStorageService {
  private bucketName: string;
  private cdnBaseUrl: string;

  constructor(options?: { bucketName?: string; cdnBaseUrl?: string }) {
    this.bucketName = options?.bucketName || process.env.STORAGE_BUCKET || 'acad-media-bucket';
    this.cdnBaseUrl = options?.cdnBaseUrl || process.env.CDN_BASE_URL || 'https://cdn.acad.vn';
  }

  public async generatePresignedUploadUrl(options: {
    fileName: string;
    fileType: string;
    userId: string;
  }): Promise<PresignedUploadResult> {
    const safeName = options.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const randomSuffix = randomBytes(4).toString('hex');
    const key = `uploads/${options.userId}/${Date.now()}-${randomSuffix}-${safeName}`;

    // Khi tích hợp S3 / Cloudflare R2, URL này sẽ được ký bằng AWS SDK S3Client / PutObjectCommand
    const uploadUrl = `https://${this.bucketName}.s3.amazonaws.com/${key}?X-Amz-Expires=300&X-Amz-Signature=mock-presigned-sig`;
    const publicUrl = `${this.cdnBaseUrl.replace(/\/$/, '')}/${key}`;

    return {
      uploadUrl,
      publicUrl,
      key,
      expiresIn: 300,
    };
  }
}
