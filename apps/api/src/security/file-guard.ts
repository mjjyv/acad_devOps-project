/**
 * ==============================================================================
 * FILE UPLOAD SHIELD & MAGIC BYTES VERIFICATION
 * Xác minh tính hợp lệ của tệp dựa trên chữ ký nhị phân thực tế (Magic Bytes)
 * Ngăn chặn kẻ tấn công đổi đuôi file (.php -> .png, .exe -> .jpg) hoặc nhúng SVG XSS.
 * ==============================================================================
 */

export interface FileValidationResult {
  valid: boolean;
  detectedMime?: string;
  error?: string;
}

export class FileGuard {
  /**
   * Nhận diện MIME Type thực tế từ Magic Bytes ở đầu Buffer
   */
  public static detectImageMime(buffer: Buffer): string | null {
    if (!buffer || buffer.length < 12) {
      return null;
    }

    // 1. JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return 'image/png';
    }

    // 3. GIF: 47 49 46 38 ('GIF8')
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
      return 'image/gif';
    }

    // 4. WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return 'image/webp';
    }

    return null;
  }

  /**
   * Kiểm tra xem tệp có chứa chữ ký mã thực thi độc hại hay không
   */
  public static isExecutableOrMalicious(buffer: Buffer): boolean {
    if (!buffer || buffer.length < 4) {
      return false;
    }

    // PE Windows Executable (MZ)
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) return true;

    // ELF Linux Executable
    if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46)
      return true;

    // Java Class bytecode (CA FE BA BE)
    if (buffer[0] === 0xca && buffer[1] === 0xfe && buffer[2] === 0xba && buffer[3] === 0xbe)
      return true;

    // Shell Script (#! /bin/...)
    if (buffer[0] === 0x23 && buffer[1] === 0x21) return true;

    // PHP Script (<?php)
    const headerStr = buffer.slice(0, 100).toString('utf-8').toLowerCase();
    if (headerStr.includes('<?php') || headerStr.includes('<?=')) return true;

    // SVG Vector (Có nguy cơ nhúng JavaScript trong <script> hoặc thuộc tính onload)
    if (headerStr.includes('<svg') || headerStr.includes('<!doctype svg')) return true;

    return false;
  }

  /**
   * Toàn diện xác minh Buffer tệp tải lên
   */
  public static validateUploadBuffer(
    buffer: Buffer,
    declaredMime?: string,
    maxSizeBytes = 5 * 1024 * 1024, // 5MB
  ): FileValidationResult {
    if (!buffer || buffer.length === 0) {
      return { valid: false, error: 'Dữ liệu tệp rỗng' };
    }

    if (buffer.length > maxSizeBytes) {
      return {
        valid: false,
        error: `Kích thước tệp vượt quá giới hạn tối đa cho phép (${Math.round(maxSizeBytes / (1024 * 1024))}MB)`,
      };
    }

    // 1. Kiểm tra chữ ký độc hại
    if (FileGuard.isExecutableOrMalicious(buffer)) {
      return {
        valid: false,
        error:
          'Tệp bị từ chối: Phát hiện định dạng thực thi hoặc script độc hại (PE/ELF/Shell/PHP/SVG).',
      };
    }

    // 2. Kiểm tra định dạng ảnh hợp lệ
    const detectedMime = FileGuard.detectImageMime(buffer);
    if (!detectedMime) {
      return {
        valid: false,
        error: 'Định dạng tệp không được hỗ trợ. Chỉ chấp nhận ảnh JPEG, PNG, WEBP, GIF hợp lệ.',
      };
    }

    // 3. Đối chiếu MIME type khai báo nếu có
    if (declaredMime && declaredMime.toLowerCase() !== detectedMime) {
      return {
        valid: false,
        error: `MIME type khai báo (${declaredMime}) không khớp với Magic Bytes thực tế (${detectedMime}).`,
      };
    }

    return {
      valid: true,
      detectedMime,
    };
  }
}
