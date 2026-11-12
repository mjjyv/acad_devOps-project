import type { NextFunction, Request, Response } from 'express';

/**
 * ==============================================================================
 * SECURITY HEADERS MIDDLEWARE - UNIVERSAL SECURITY SHIELD
 * Áp dụng các tiêu đề bảo mật theo khuyến nghị tối cao của OWASP
 * ==============================================================================
 */
export function securityHeaders() {
  return (_req: Request, res: Response, next: NextFunction): void => {
    // 1. Content Security Policy (CSP)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; connect-src 'self' https: wss:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );

    // 2. Chống Clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // 3. Chống MIME-Type Sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 4. HTTP Strict Transport Security (HSTS - 1 năm, bao gồm subdomains)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // 5. Chính sách Referrer
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // 6. Permissions Policy (Chặn truy cập camera, micro, GPS)
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    );

    // 7. Chống XSS Legacy Browsers
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // 8. Cross-Origin Policies
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    next();
  };
}
