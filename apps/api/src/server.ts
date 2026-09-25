import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { AuthModule, createAuthModule } from '@acad/auth-service';
import { createAuthRouter } from './routes/auth-router.js';

export interface ServerInstance {
  server: ReturnType<typeof createServer>;
  port: number;
  authModule: AuthModule;
}

export interface ApiServerOptions {
  authModule?: AuthModule;
}

export function createApiServer(options: ApiServerOptions = {}) {
  const authModule = options.authModule || createAuthModule();
  const authRouter = createAuthRouter(authModule);

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Device-Fingerprint, X-Session-Id',
    );

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // =========================================================================
    // ENDPOINT HEALTHCHECK PHỤC VỤ DOCKER HEALTHCHECK VÀ RENDER KEEP-ALIVE
    // =========================================================================
    if (url.pathname === '/healthz' || url.pathname === '/api/v1/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'acad-community-api',
          version: '1.0.0',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    // =========================================================================
    // XỬ LÝ CÁC ROUTE AUTH (/api/v1/auth/*)
    // =========================================================================
    if (url.pathname.startsWith('/api/v1/auth')) {
      const handled = await authRouter(req, res, url);
      if (handled) return;
    }

    // Default route
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          name: 'Acad Community API Gateway',
          documentation: '/api/v1/openapi.yaml',
          status: 'running',
        }),
      );
      return;
    }

    // 404 Route Not Found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint không tồn tại' }));
  });

  return Object.assign(server, { authModule });
}

// Khởi chạy khi gọi trực tiếp tệp
if (process.env.NODE_ENV !== 'test' && import.meta.url === `file://${process.argv[1]}`) {
  const PORT = parseInt(process.env.PORT || process.env.API_PORT || '8080', 10);
  const server = createApiServer();
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Acad API Service] Máy chủ đang lắng nghe tại cổng http://0.0.0.0:${PORT}`);
    console.log(`[Acad API Service] Healthcheck endpoint sẵn sàng tại http://0.0.0.0:${PORT}/healthz`);
  });

  const shutdown = async () => {
    console.log('\n[Acad API Service] Nhận tín hiệu dừng, đang đóng máy chủ an toàn...');
    if (server.authModule) {
      await server.authModule.close();
    }
    server.close(() => {
      console.log('[Acad API Service] Máy chủ đã đóng kết nối thành công.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}
