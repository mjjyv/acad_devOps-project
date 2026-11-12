import {
  AccountSuspendedError,
  AuthenticationError,
  DatabaseConnectionError,
  DuplicateUserError,
  TokenExpiredError,
  TokenReuseError,
} from '@acad/auth-service';
import {
  CannotChatWithSelfError,
  CannotCreateSoloGroupError,
  ChatChannelNotFoundError,
  ChatRequestNotFoundError,
  DuplicateChatRequestError,
  NotChannelMemberError,
  ParentMessageNotFoundError,
  RecipientNotFoundError,
  UserBlockedError,
} from '@acad/chat-service';
import {
  CommentNotFoundError,
  DuplicateFlairError,
  DuplicateSlugError,
  InsufficientSpacePermissionError,
  SpaceNotFoundError,
  TargetNotFoundError,
  ThreadNotFoundError,
} from '@acad/community-service';
import {
  DuplicateReportError,
  InvalidReportActionError,
  TargetNotFoundError as ModTargetNotFoundError,
  ReportNotFoundError,
  UnauthorizedAdminActionError,
} from '@acad/moderation-service';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export interface RFC7807Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  invalidParams?: Array<{ path: string; message: string; code: string }> | undefined;
  correlationId?: string | undefined;
}

export function errorHandler() {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const instance = req.originalUrl || req.url;
    const correlationId = req.correlationId;

    res.setHeader('Content-Type', 'application/problem+json');

    // 1. Zod Validation Errors -> 400 Bad Request
    if (err instanceof ZodError) {
      const invalidParams = err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));

      const problem: RFC7807Problem = {
        type: 'https://api.acad.vn/errors/validation-error',
        title: 'Validation Failed',
        status: 400,
        detail: 'The payload provided does not conform to the required schema.',
        instance,
        invalidParams,
        correlationId,
      };

      res.status(400).json(problem);
      return;
    }

    // 1.1. Bad Request Errors -> 400 Bad Request
    if (
      err instanceof CannotChatWithSelfError ||
      err instanceof CannotCreateSoloGroupError ||
      err instanceof InvalidReportActionError
    ) {
      const problem: RFC7807Problem = {
        type: 'https://api.acad.vn/errors/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: (err as Error).message,
        instance,
        correlationId,
      };

      res.status(400).json(problem);
      return;
    }

    // 2. Conflict Errors (Duplicate username, email, slug, flair, chat request, report) -> 409 Conflict
    if (
      err instanceof DuplicateUserError ||
      err instanceof DuplicateSlugError ||
      err instanceof DuplicateFlairError ||
      err instanceof DuplicateChatRequestError ||
      err instanceof DuplicateReportError
    ) {
      const problem: RFC7807Problem = {
        type: 'https://api.acad.vn/errors/conflict',
        title: 'Resource Conflict',
        status: 409,
        detail: (err as Error).message,
        instance,
        correlationId,
      };

      res.status(409).json(problem);
      return;
    }

    // 2.1. Not Found Errors (Space, Thread, Comment, Chat Channel, Chat Request, Message, Report) -> 404 Not Found
    if (
      err instanceof SpaceNotFoundError ||
      err instanceof ThreadNotFoundError ||
      err instanceof CommentNotFoundError ||
      err instanceof TargetNotFoundError ||
      err instanceof ModTargetNotFoundError ||
      err instanceof ChatChannelNotFoundError ||
      err instanceof ChatRequestNotFoundError ||
      err instanceof ParentMessageNotFoundError ||
      err instanceof RecipientNotFoundError ||
      err instanceof ReportNotFoundError
    ) {
      const problem: RFC7807Problem = {
        type: 'https://api.acad.vn/errors/not-found',
        title: 'Resource Not Found',
        status: 404,
        detail: (err as Error).message,
        instance,
        correlationId,
      };

      res.status(404).json(problem);
      return;
    }

    // 2.2. Forbidden Errors (e.g. Insufficient Space Permission, Not Chat Member, User Blocked, Unauthorized Admin) -> 403 Forbidden
    if (
      err instanceof InsufficientSpacePermissionError ||
      err instanceof NotChannelMemberError ||
      err instanceof UserBlockedError ||
      err instanceof UnauthorizedAdminActionError
    ) {
      const problem: RFC7807Problem = {
        type: 'https://api.acad.vn/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: (err as Error).message,
        instance,
        correlationId,
      };

      res.status(403).json(problem);
      return;
    }

    // 3. Authentication & Credential Errors -> 401 Unauthorized
    if (
      err instanceof AuthenticationError ||
      err instanceof TokenExpiredError ||
      err instanceof TokenReuseError ||
      (err instanceof Error &&
        (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError'))
    ) {
      const problem: RFC7807Problem = {
        type: 'https://api.acad.vn/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: err instanceof Error ? err.message : 'Invalid or expired credentials',
        instance,
        correlationId,
      };

      res.status(401).json(problem);
      return;
    }

    // 4. Forbidden Errors (e.g. Account Suspended) -> 403 Forbidden
    if (err instanceof AccountSuspendedError) {
      const problem: RFC7807Problem = {
        type: 'https://api.acad.vn/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: err.message,
        instance,
        correlationId,
      };

      res.status(403).json(problem);
      return;
    }

    // 5. Database Connection Errors -> 503 Service Unavailable with Retry-After: 5
    if (err instanceof DatabaseConnectionError) {
      res.setHeader('Retry-After', '5');
      const problem: RFC7807Problem = {
        type: 'https://api.acad.vn/errors/service-unavailable',
        title: 'Database Service Unavailable',
        status: 503,
        detail:
          'The database cluster is temporarily unreachable. Please retry with exponential backoff.',
        instance,
        correlationId,
      };

      res.status(503).json(problem);
      return;
    }

    // 6. Unhandled / Unexpected Errors -> 500 Internal Server Error (Mask internal secrets in production)
    const isProduction = process.env.NODE_ENV === 'production';
    const detail = isProduction
      ? 'An unexpected internal error occurred. Please contact support with the correlation ID.'
      : err instanceof Error
        ? err.message
        : String(err);

    console.error(`[UNHANDLED ERROR] [${correlationId}]:`, err);

    const problem: RFC7807Problem = {
      type: 'https://api.acad.vn/errors/internal-error',
      title: 'Internal Server Error',
      status: 500,
      detail,
      instance,
      correlationId,
    };

    res.status(500).json(problem);
  };
}
