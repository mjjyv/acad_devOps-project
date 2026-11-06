import { AuthService, InMemorySessionStore, InMemoryUserRepository } from '@acad/auth-service';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { FileGuard } from '../src/security/file-guard.js';
import { InputSanitizer } from '../src/security/input-sanitizer.js';
import { SsrfGuard } from '../src/security/ssrf-guard.js';

describe('BẢO MẬT TOÀN DIỆN - UNIVERSAL SECURITY SHIELD (@acad/api-gateway)', () => {
  const userRepository = new InMemoryUserRepository();
  const sessionStore = new InMemorySessionStore();
  const authService = new AuthService(userRepository, sessionStore);

  describe('1. Tiêu Đề An Ninh (Security Headers & Hardening)', () => {
    it('Phản hồi phải chứa đầy đủ bộ Header an toàn OWASP và ẩn X-Powered-By', async () => {
      const app = createApp({
        authService,
        disableRateLimit: true,
      });

      const res = await request(app).get('/healthz');

      expect(res.status).toBe(200);

      // Phải triệt tiêu header tiết lộ công nghệ máy chủ
      expect(res.headers['x-powered-by']).toBeUndefined();

      // Kiểm tra bộ tiêu đề bảo mật tiêu chuẩn
      expect(res.headers['content-security-policy']).toBeDefined();
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
      expect(res.headers['x-frame-options']).toBe('DENY');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(res.headers['permissions-policy']).toContain('camera=()');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('2. Phòng Thủ Tấn Công Brute-Force & DoS (Rate Limiting)', () => {
    it('Chặn đứng tấn công vét cạn mật khẩu với mã HTTP 429 và tiêu đề Retry-After', async () => {
      const app = createApp({
        authService,
        disableRateLimit: false, // Bật Rate Limiter
      });

      // Gửi 10 yêu cầu hợp lệ liên tiếp (ngưỡng tối đa của Auth Tier là 10)
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/auth/login')
          .send({ email: `attacker_${i}@synapse.test`, password: 'wrong' });
        expect(res.headers['x-ratelimit-limit']).toBe('10');
      }

      // Yêu cầu thứ 11 phải bị từ chối với HTTP 429 Too Many Requests
      const blockedRes = await request(app)
        .post('/auth/login')
        .send({ email: 'attacker_11@synapse.test', password: 'wrong' });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body).toHaveProperty('title', 'Too Many Requests');
      expect(blockedRes.body).toHaveProperty('tier', 'auth');
      expect(blockedRes.headers['retry-after']).toBeDefined();
      expect(parseInt(blockedRes.headers['retry-after'] as string, 10)).toBeGreaterThan(0);
    });
  });

  describe('3. Chống Tấn Công Gián Điệp Nội Bộ & Cloud Metadata (SSRF Guard)', () => {
    it('Chặn đứng truy cập localhost và IPv6 loopback', () => {
      expect(SsrfGuard.isSafeUrl('http://localhost:3000').safe).toBe(false);
      expect(SsrfGuard.isSafeUrl('http://127.0.0.1:10000').safe).toBe(false);
      expect(SsrfGuard.isSafeUrl('http://[::1]:8080').safe).toBe(false);
    });

    it('Chặn đứng truy cập AWS/GCP/Azure Cloud Metadata (169.254.169.254)', () => {
      const cloudCheck = SsrfGuard.isSafeUrl('http://169.254.169.254/latest/meta-data/');
      expect(cloudCheck.safe).toBe(false);
      expect(cloudCheck.reason).toContain('dải mạng riêng tư/bảo mật');

      const gcpCheck = SsrfGuard.isSafeUrl('http://metadata.google.internal/computeMetadata/v1/');
      expect(gcpCheck.safe).toBe(false);
      expect(gcpCheck.reason).toContain('tài nguyên nội bộ bị từ chối');
    });

    it('Chặn đứng các dải IP riêng tư (RFC 1918 Private Networks)', () => {
      expect(SsrfGuard.isSafeUrl('http://192.168.1.1/admin').safe).toBe(false);
      expect(SsrfGuard.isSafeUrl('http://10.0.0.5/api').safe).toBe(false);
      expect(SsrfGuard.isSafeUrl('http://172.16.0.10/status').safe).toBe(false);
    });

    it('Chặn đứng các cổng dịch vụ nội bộ nguy hiểm (PostgreSQL, Redis, SSH)', () => {
      expect(SsrfGuard.isSafeUrl('http://example.com:5432/').safe).toBe(false);
      expect(SsrfGuard.isSafeUrl('http://example.com:6379/').safe).toBe(false);
      expect(SsrfGuard.isSafeUrl('http://example.com:22/').safe).toBe(false);
    });

    it('Chấp nhận các URL Internet công cộng hợp lệ', () => {
      const result = SsrfGuard.isSafeUrl('https://images.unsplash.com/photo-123456');
      expect(result.safe).toBe(true);
      expect(result.normalizedUrl).toBe('https://images.unsplash.com/photo-123456');
    });
  });

  describe('4. Chống Tấn Công SQL/Ltree Injection & XSS (Input Sanitizer)', () => {
    it('Chấp nhận đường dẫn cây phân cấp ltree Base36 hợp lệ', () => {
      expect(InputSanitizer.sanitizeLtreePath('tech.devops.docker')).toBe('tech.devops.docker');
      expect(InputSanitizer.sanitizeLtreePath('node1.node2_sub')).toBe('node1.node2_sub');
    });

    it('Chặn đứng triệt để ltree path traversal và SQL injection payload', () => {
      expect(() => InputSanitizer.sanitizeLtreePath('tech; DROP TABLE users;')).toThrow();
      expect(() => InputSanitizer.sanitizeLtreePath('../../etc/passwd')).toThrow();
      expect(() => InputSanitizer.sanitizeLtreePath("root' OR '1'='1")).toThrow();
      expect(() => InputSanitizer.sanitizeLtreePath('a'.repeat(30).split('').join('.'))).toThrow(
        /Độ sâu cây phân cấp/,
      );
    });

    it('Khử độc HTML: Loại bỏ thẻ <script>, iframe và sự kiện JavaScript inline', () => {
      const dirtyHtml = `
        <p>Chào mừng đến với SYNAPSE</p>
        <script>alert('HACKED!')</script>
        <iframe src="http://evil.com"></iframe>
        <img src="avatar.jpg" onerror="stealCookies()" />
        <a href="javascript:void(0)">Nhấp vào đây</a>
      `;

      const cleanHtml = InputSanitizer.sanitizeHtmlContent(dirtyHtml);

      expect(cleanHtml).not.toContain('<script>');
      expect(cleanHtml).not.toContain('HACKED!');
      expect(cleanHtml).not.toContain('<iframe>');
      expect(cleanHtml).not.toContain('onerror=');
      expect(cleanHtml).not.toContain('javascript:');
      expect(cleanHtml).toContain('<p>Chào mừng đến với SYNAPSE</p>');
    });

    it('Chuẩn hóa văn bản thuần túy và loại bỏ ký tự điều khiển ASCII độc', () => {
      const dirtyText = 'Hello\x00\x08World\x1B\t\nTest';
      const cleanText = InputSanitizer.sanitizePlainText(dirtyText);
      expect(cleanText).toBe('HelloWorld\t\nTest');
    });
  });

  describe('5. Chống Tải Lên Tệp Độc Hại & Magic Bytes Verification (File Guard)', () => {
    it('Xác thực đúng định dạng ảnh PNG và JPEG thật qua Magic Bytes', () => {
      // Buffer PNG chuẩn: 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      ]);
      const pngRes = FileGuard.validateUploadBuffer(pngBuffer, 'image/png');
      expect(pngRes.valid).toBe(true);
      expect(pngRes.detectedMime).toBe('image/png');

      // Buffer JPEG chuẩn: FF D8 FF
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const jpegRes = FileGuard.validateUploadBuffer(jpegBuffer, 'image/jpeg');
      expect(jpegRes.valid).toBe(true);
      expect(jpegRes.detectedMime).toBe('image/jpeg');
    });

    it('Từ chối tệp thực thi ngụy trang (PE .exe / Linux ELF đổi đuôi sang .png)', () => {
      // File PE (Windows .exe) bắt đầu bằng ký tự 'MZ' (0x4D, 0x5A)
      const fakeExeBuffer = Buffer.from([
        0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
      ]);
      const exeRes = FileGuard.validateUploadBuffer(fakeExeBuffer, 'image/png');
      expect(exeRes.valid).toBe(false);
      expect(exeRes.error).toContain('Phát hiện định dạng thực thi hoặc script độc hại');

      // File ELF (Linux binary) bắt đầu bằng 0x7F 'ELF'
      const fakeElfBuffer = Buffer.from([
        0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      const elfRes = FileGuard.validateUploadBuffer(fakeElfBuffer, 'image/png');
      expect(elfRes.valid).toBe(false);
      expect(elfRes.error).toContain('Phát hiện định dạng thực thi hoặc script độc hại');
    });

    it('Từ chối tệp SVG chứa mã JavaScript và PHP Web Shell ngụy trang', () => {
      const svgBuffer = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      );
      const svgRes = FileGuard.validateUploadBuffer(svgBuffer, 'image/svg+xml');
      expect(svgRes.valid).toBe(false);

      const phpBuffer = Buffer.from('<?php eval($_POST["cmd"]); ?>');
      const phpRes = FileGuard.validateUploadBuffer(phpBuffer, 'image/jpeg');
      expect(phpRes.valid).toBe(false);
    });

    it('Từ chối tệp khi MIME type khai báo không khớp với Magic Bytes thực tế', () => {
      // Buffer JPEG thật nhưng client khai báo là image/png
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const mismatchRes = FileGuard.validateUploadBuffer(jpegBuffer, 'image/png');
      expect(mismatchRes.valid).toBe(false);
      expect(mismatchRes.error).toContain('không khớp với Magic Bytes thực tế');
    });
  });
});
