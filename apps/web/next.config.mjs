/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@acad/contracts', '@acad/auth-client'],
};

export default nextConfig;
