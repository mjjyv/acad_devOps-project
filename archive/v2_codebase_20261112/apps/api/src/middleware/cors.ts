import cors, { type CorsOptions } from 'cors';

export function configureCors() {
  const envOrigins = (process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const defaultOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:10000',
    'http://127.0.0.1:10000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'https://acad-web-client.onrender.com',
  ];

  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // 1. Allow non-browser requests (curl, server-to-server, mobile native apps)
      if (!origin) {
        return callback(null, true);
      }

      // 2. Allow wildcard if configured
      if (allowedOrigins.includes('*')) {
        return callback(null, true);
      }

      // 3. Exact match
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // 4. Dynamic Cloudflare / Self-hosted domain matching
      try {
        const url = new URL(origin);
        if (
          url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname.endsWith('.trycloudflare.com') ||
          url.hostname.endsWith('.onrender.com') ||
          process.env.NODE_ENV !== 'production' ||
          allowedOrigins.some((allowed) => allowed.includes(url.hostname))
        ) {
          return callback(null, true);
        }
      } catch {
        // Invalid origin format
      }

      // 5. Safely disallow without throwing unhandled 500 error
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Request-ID'],
    exposedHeaders: ['X-Correlation-ID', 'Retry-After'],
    maxAge: 86400, // 24 hours
  };

  return cors(corsOptions);
}
