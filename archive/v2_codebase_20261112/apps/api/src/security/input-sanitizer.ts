/**
 * ==============================================================================
 * INPUT SANITIZER & INJECTION SHIELD - UNIVERSAL SECURITY SHIELD
 * Triệt tiêu triệt để các nguy cơ:
 * 1. SQL Injection & Ltree Path Traversal Injection
 * 2. Cross-Site Scripting (XSS)
 * 3. Ký tự điều khiển (Control Characters) phá hoại bộ nhớ
 * ==============================================================================
 */

// Định dạng chuẩn PostgreSQL ltree node (chỉ chứa chữ thường, số, dấu gạch dưới)
const LTREE_PATH_REGEX = /^[a-z0-9_]+(\.[a-z0-9_]+)*$/;
const MAX_LTREE_DEPTH = 20;

// Các thẻ HTML độc hại có thể thực thi mã JavaScript hoặc nhúng payload
const DANGEROUS_HTML_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'applet',
  'meta',
  'link',
  'style',
  'base',
  'form',
  'input',
  'button',
];

export class InputSanitizer {
  /**
   * Khử độc và xác thực đường dẫn cây phân cấp ltree
   * Chống hoàn toàn Path Traversal (vd: ../..), SQL quotes, dấu chấm phẩy injection
   */
  public static sanitizeLtreePath(rawPath: string): string {
    if (!rawPath || typeof rawPath !== 'string') {
      throw new Error('Đường dẫn cây phân cấp ltree không hợp lệ.');
    }

    const trimmed = rawPath.trim().toLowerCase();

    // 1. Kiểm tra ký tự bằng Regex Base36
    if (!LTREE_PATH_REGEX.test(trimmed)) {
      throw new Error(
        `Phát hiện ký tự không hợp lệ trong ltree path: "${rawPath}". Chỉ chấp nhận [a-z0-9_] và dấu chấm.`,
      );
    }

    // 2. Kiểm tra độ sâu tối đa
    const depth = trimmed.split('.').length;
    if (depth > MAX_LTREE_DEPTH) {
      throw new Error(
        `Độ sâu cây phân cấp vượt quá giới hạn an toàn (${depth} > ${MAX_LTREE_DEPTH}).`,
      );
    }

    return trimmed;
  }

  /**
   * Khử độc nội dung HTML từ trình soạn thảo bài viết
   * Loại bỏ các thẻ script, iframe, các thuộc tính sự kiện inline on* và giao thức javascript:
   */
  public static sanitizeHtmlContent(rawHtml: string): string {
    if (!rawHtml || typeof rawHtml !== 'string') {
      return '';
    }

    let sanitized = rawHtml;

    // 1. Loại bỏ toàn bộ các thẻ độc hại (bao gồm cả nội dung bên trong)
    for (const tag of DANGEROUS_HTML_TAGS) {
      const tagRegex = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?<\\/${tag}>)?`, 'gi');
      sanitized = sanitized.replace(tagRegex, '');
    }

    // 2. Loại bỏ các thuộc tính bắt sự kiện JavaScript: onload, onerror, onclick, onmouseover...
    sanitized = sanitized.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
    sanitized = sanitized.replace(/\son\w+\s*=\s*[^>\s]+/gi, '');

    // 3. Loại bỏ giao thức javascript: và data: trong href / src
    sanitized = sanitized.replace(
      /(href|src)\s*=\s*(['"])\s*(javascript:|data:text\/html)[^'"]*\2/gi,
      '$1="#"',
    );

    return sanitized;
  }

  /**
   * Chuẩn hóa chuỗi văn bản thuần túy
   * Loại bỏ ký tự điều khiển ASCII độc hại, chuẩn hóa Unicode NFKC
   */
  public static sanitizePlainText(rawText: string, maxLength = 10000): string {
    if (!rawText || typeof rawText !== 'string') {
      return '';
    }

    // Loại bỏ ký tự điều khiển ngoại trừ xuống dòng (\n) và thụt lề (\t)
    const cleanText = Array.from(rawText)
      .filter((char) => {
        const code = char.charCodeAt(0);
        if (code === 10 || code === 9 || code === 13) return true;
        return code >= 32 && code !== 127;
      })
      .join('');

    // Chuẩn hóa Unicode Canonical Decomposition + Canonical Composition
    return cleanText.normalize('NFKC').trim().slice(0, maxLength);
  }
}
