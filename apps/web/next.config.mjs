/** @type {import('next').NextConfig} */
const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'http://127.0.0.1:10000';

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@acad/contracts', '@acad/auth-client'],
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
