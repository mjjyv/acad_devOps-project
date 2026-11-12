/** @type {import('next').NextConfig} */
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:10000';

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@acad/contracts', '@acad/auth-client'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: http: blob:; connect-src 'self' https: http: wss:; font-src 'self' data:; object-src 'none'; frame-ancestors 'none';",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: `${INTERNAL_API_URL}/auth/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${INTERNAL_API_URL}/api/:path*`,
      },
      {
        source: '/healthz',
        destination: `${INTERNAL_API_URL}/healthz`,
      },
    ];
  },
};

export default nextConfig;
