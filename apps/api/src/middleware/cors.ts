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
  ];

  const allowedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

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
        // Invalid origin
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-Request-ID'],
    exposedHeaders: ['X-Correlation-ID', 'Retry-After'],
    maxAge: 86400,
  };

  return cors(corsOptions);
}
