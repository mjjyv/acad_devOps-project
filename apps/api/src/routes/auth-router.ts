import { type AuthService, TokenManager } from '@acad/auth-service';
import {
  LoginInputSchema,
  RefreshTokenInputSchema,
  RegisterInputSchema,
  UserSearchQuerySchema,
} from '@acad/contracts';
import { type NextFunction, type Request, type Response, Router } from 'express';
import { authGuard } from '../middleware/auth-guard.js';

export function createAuthRouter(
  authService: AuthService,
  jwtSecret: string = TokenManager.DEFAULT_SECRET,
): Router {
  const router = Router();
  const guard = authGuard(jwtSecret);

  router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedInput = RegisterInputSchema.parse(req.body);
      const result = await authService.register(validatedInput, {
        ipAddress: req.ip || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      });

      res.status(201).json({
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenType: 'Bearer',
          expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedInput = LoginInputSchema.parse(req.body);
      const result = await authService.login(validatedInput, {
        ipAddress: req.ip || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      });

      res.status(200).json({
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          tokenType: 'Bearer',
          expiresIn: TokenManager.ACCESS_TOKEN_TTL_SECONDS,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedInput = RefreshTokenInputSchema.parse(req.body);
      if (!validatedInput.refreshToken) {
        res.setHeader('Content-Type', 'application/problem+json');
        res.status(400).json({
          type: 'https://api.acad.vn/errors/bad-request',
          title: 'Missing Refresh Token',
          status: 400,
          detail: 'Trường refreshToken là bắt buộc trong body.',
          instance: req.originalUrl || req.url,
          correlationId: req.correlationId,
        });
        return;
      }

      const rotationResult = await authService.refresh(validatedInput.refreshToken);

      if (rotationResult.status === 'SUCCESS') {
        res.status(200).json({
          accessToken: rotationResult.tokenPair.accessToken,
          refreshToken: rotationResult.tokenPair.refreshToken,
          tokenType: 'Bearer',
          expiresIn: rotationResult.tokenPair.expiresIn,
        });
        return;
      }

      if (rotationResult.status === 'GRACE_PERIOD_RENEWED') {
        res.status(200).json({
          accessToken: rotationResult.accessToken,
          refreshToken: validatedInput.refreshToken,
          tokenType: 'Bearer',
          expiresIn: rotationResult.expiresIn,
        });
        return;
      }

      res.setHeader('Content-Type', 'application/problem+json');
      res.status(401).json({
        type: 'https://api.acad.vn/errors/unauthorized',
        title:
          rotationResult.status === 'TOKEN_REUSE_DETECTED'
            ? 'Token Reuse Attack Detected'
            : 'Unauthorized',
        status: 401,
        detail: rotationResult.error,
        instance: req.originalUrl || req.url,
        correlationId: req.correlationId,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        const payload = TokenManager.verifyAccessToken(token, jwtSecret);
        if (payload) {
          await authService.logout(payload.sub, payload.sessionId);
        }
      }

      res.status(200).json({
        message: 'Đăng xuất thành công',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        res.status(401).json({ title: 'Unauthorized', status: 401 });
        return;
      }

      const profile = await authService.getProfile(userId);
      if (!profile) {
        res.setHeader('Content-Type', 'application/problem+json');
        res.status(404).json({
          type: 'https://api.acad.vn/errors/not-found',
          title: 'User Not Found',
          status: 404,
          detail: 'Không tìm thấy hồ sơ người dùng tương ứng.',
          instance: req.originalUrl || req.url,
        });
        return;
      }

      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  });

  // GET /users/search?q=...&limit=... MUST be registered BEFORE /users/:username
  router.get('/users/search', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawQ = typeof req.query.q === 'string' ? req.query.q : '';
      if (!rawQ.trim()) {
        res.status(200).json({ users: [] });
        return;
      }
      const parsed = UserSearchQuerySchema.parse({
        q: rawQ,
        limit: req.query.limit,
      });
      const users = await authService.searchActiveUsers(parsed.q, req.user?.sub, parsed.limit);
      res.status(200).json({ users });
    } catch (err) {
      next(err);
    }
  });

  router.get('/users/:username', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const username = (req.params.username as string) || '';
      const publicProfile = await authService.getPublicProfileByUsername(username);
      if (!publicProfile) {
        res.setHeader('Content-Type', 'application/problem+json');
        res.status(404).json({
          type: 'https://api.acad.vn/errors/not-found',
          title: 'User Not Found',
          status: 404,
          detail: `Không tìm thấy người dùng u/${username}.`,
          instance: req.originalUrl || req.url,
        });
        return;
      }

      res.status(200).json(publicProfile);
    } catch (err) {
      next(err);
    }
  });

  router.get('/sessions', guard, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.sub;
      const sessionId = req.user?.sessionId;
      if (!userId) {
        res.status(401).json({ title: 'Unauthorized', status: 401 });
        return;
      }

      const sessions = await authService.listSessions(userId, sessionId);
      res.status(200).json({ sessions });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/sessions/:sessionId/revoke',
    guard,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const userId = req.user?.sub;
        const targetSessionId = req.params.sessionId;
        if (!userId || !targetSessionId) {
          res.status(400).json({ title: 'Bad Request', status: 400 });
          return;
        }

        await authService.revokeSession(userId, targetSessionId);
        res.status(200).json({
          message: 'Thu hồi phiên thành công',
        });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
