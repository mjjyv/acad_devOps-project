/**
 * Media file validation guard preventing unsafe uploads on both Local Storage and Zero-Hop S3/R2 Presign.
 */

export const MAX_MEDIA_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_MEDIA_MIME_TYPES = new Set<string>([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
]);

const MIME_TO_EXT_MAP: Record<string, string[]> = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
};

export class InvalidMediaFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMediaFileError';
  }
}

export function validateMediaUploadInput(options: {
  fileName: string;
  fileType: string;
  fileSizeBytes?: number | undefined;
}): { safeName: string; normalizedMime: string } {
  const normalizedMime = options.fileType.trim().toLowerCase();
  if (!ALLOWED_MEDIA_MIME_TYPES.has(normalizedMime)) {
    throw new InvalidMediaFileError(`Định dạng tệp "${options.fileType}" không được phép tải lên`);
  }

  if (options.fileSizeBytes !== undefined) {
    if (options.fileSizeBytes <= 0 || options.fileSizeBytes > MAX_MEDIA_SIZE_BYTES) {
      throw new InvalidMediaFileError(
        `Kích thước tệp vượt quá giới hạn cho phép (${MAX_MEDIA_SIZE_BYTES / (1024 * 1024)}MB)`,
      );
    }
  }

  const trimmed = options.fileName.trim();
  if (!trimmed) {
    throw new InvalidMediaFileError('Tên tệp không được rỗng');
  }

  const safeName = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return { safeName: safeName || 'upload.bin', normalizedMime };
}

/** Verifies magic bytes of uploaded payload so binary executables cannot masquerade as images. */
export function validateUploadedFileBuffer(buffer: Buffer, claimedMime: string): void {
  if (buffer.length === 0) {
    throw new InvalidMediaFileError('Nội dung tệp tải lên không được rỗng');
  }
  if (buffer.length > MAX_MEDIA_SIZE_BYTES) {
    throw new InvalidMediaFileError(
      `Kích thước tệp vượt quá giới hạn cho phép (${MAX_MEDIA_SIZE_BYTES / (1024 * 1024)}MB)`,
    );
  }

  const mime = claimedMime.trim().toLowerCase();
  if (!ALLOWED_MEDIA_MIME_TYPES.has(mime)) {
    throw new InvalidMediaFileError(`MIME type "${claimedMime}" không được hỗ trợ`);
  }

  if (mime === 'image/png') {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    if (buffer.length < 8 || !sig.every((b, idx) => buffer[idx] === b)) {
      throw new InvalidMediaFileError('Tệp không khớp chữ ký nhị phân PNG hợp lệ');
    }
    return;
  }

  if (mime === 'image/jpeg') {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
      throw new InvalidMediaFileError('Tệp không khớp chữ ký nhị phân JPEG hợp lệ');
    }
    return;
  }

  if (mime === 'image/gif') {
    const header = buffer.subarray(0, 6).toString('ascii');
    if (header !== 'GIF87a' && header !== 'GIF89a') {
      throw new InvalidMediaFileError('Tệp không khớp chữ ký nhị phân GIF hợp lệ');
    }
    return;
  }

  if (mime === 'image/webp') {
    if (
      buffer.length < 12 ||
      buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
      buffer.subarray(8, 12).toString('ascii') !== 'WEBP'
    ) {
      throw new InvalidMediaFileError('Tệp không khớp chữ ký nhị phân WebP hợp lệ');
    }
    return;
  }

  if (mime === 'application/pdf') {
    if (buffer.length < 5 || buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new InvalidMediaFileError('Tệp không khớp chữ ký nhị phân PDF hợp lệ');
    }
    return;
  }

  if (mime === 'text/plain' && buffer.includes(0x00)) {
    throw new InvalidMediaFileError('Tệp văn bản thuần chứa ký tự nhị phân không hợp lệ');
  }
}

export function resolveSafeMimeFromKey(key: string): string {
  const lower = key.toLowerCase();
  for (const [mime, exts] of Object.entries(MIME_TO_EXT_MAP)) {
    if (exts.some((ext) => lower.endsWith(ext))) {
      return mime;
    }
  }
  return 'application/octet-stream';
}
