/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: [
    '@acad/contracts',
    '@acad/ui-tokens',
    '@acad/auth-client',
    '@acad/tree-virtualizer',
  ],
};

export default nextConfig;
