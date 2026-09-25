import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@acad/contracts': path.resolve(__dirname, '../../packages/contracts/dist/index.js'),
      '@acad/auth-service': path.resolve(__dirname, '../../services/auth/dist/index.js'),
      '@acad/community-service': path.resolve(__dirname, '../../services/community/dist/index.js'),
    },
  },
});
