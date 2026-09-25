import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_CONFIG } from '@acad/contracts';

const PROTECTED_ROUTES = ['/dashboard', '/settings', '/profile', '/admin', '/create'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtectedRoute = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (isProtectedRoute) {
    const accessToken = request.cookies.get(COOKIE_CONFIG.ACCESS_TOKEN.NAME)?.value;
    const refreshToken = request.cookies.get(COOKIE_CONFIG.REFRESH_TOKEN.NAME)?.value;

    // Nếu không có cả access token lẫn refresh token thì chuyển hướng về /login
    if (!accessToken && !refreshToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      loginUrl.searchParams.set('reason', 'unauthenticated');
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Áp dụng middleware cho tất cả các đường dẫn ngoại trừ static files, favicon, _next
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
