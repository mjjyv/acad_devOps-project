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
  ChatDatabaseError,
  ChatRequestNotFoundError,
  DuplicateChatRequestError,
  NotChannelMemberError,
  ParentMessageNotFoundError,
  RecipientNotFoundError,
  UserBlockedError,
} from '@acad/chat-service';
import {
  CommentNotFoundError,
  CommunityDatabaseError,
  DuplicateFlairError,
  DuplicateSlugError,
  InsufficientSpacePermissionError,
  InvalidMediaFileError,
  SpaceNotFoundError,
  TargetNotFoundError,
  ThreadLockedError,
  ThreadNotFoundError,
} from '@acad/community-service';
import type { ProblemDetails } from '@acad/contracts';
import {
  DuplicateReportError,
  InvalidReportActionError,
  ModerationDatabaseError,
  ModTargetNotFoundError,
  ReportNotFoundError,
  UnauthorizedAdminActionError,
} from '@acad/moderation-service';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

function sendProblem(
  res: Response,
  status: number,
  payload: Omit<ProblemDetails, 'status'> & { headers?: Record<string, string> },
): void {
  res.setHeader('Content-Type', 'application/problem+json');
  if (payload.headers) {
    for (const [k, v] of Object.entries(payload.headers)) {
      res.setHeader(k, v);
    }
  }
  const { headers: _headers, ...body } = payload;
  res.status(status).json({
    ...body,
    status,
  });
}

function isBadRequestError(err: unknown): err is Error {
  return (
    err instanceof CannotChatWithSelfError ||
    err instanceof CannotCreateSoloGroupError ||
    err instanceof InvalidReportActionError ||
    err instanceof InvalidMediaFileError
  );
}

function isUnauthorizedError(err: unknown): err is Error {
  return (
    err instanceof AuthenticationError ||
    err instanceof TokenExpiredError ||
    err instanceof TokenReuseError
  );
}

function isForbiddenError(err: unknown): err is Error {
  return (
    err instanceof AccountSuspendedError ||
    err instanceof InsufficientSpacePermissionError ||
    err instanceof ThreadLockedError ||
    err instanceof NotChannelMemberError ||
    err instanceof UserBlockedError ||
    err instanceof UnauthorizedAdminActionError
  );
}

function isNotFoundError(err: unknown): err is Error {
  return (
    err instanceof SpaceNotFoundError ||
    err instanceof ThreadNotFoundError ||
    err instanceof CommentNotFoundError ||
    err instanceof TargetNotFoundError ||
    err instanceof ChatChannelNotFoundError ||
    err instanceof ChatRequestNotFoundError ||
    err instanceof ParentMessageNotFoundError ||
    err instanceof RecipientNotFoundError ||
    err instanceof ReportNotFoundError ||
    err instanceof ModTargetNotFoundError
  );
}

function isConflictError(err: unknown): err is Error {
  return (
    err instanceof DuplicateUserError ||
    err instanceof DuplicateSlugError ||
    err instanceof DuplicateFlairError ||
    err instanceof DuplicateChatRequestError ||
    err instanceof DuplicateReportError
  );
}

function isDatabaseUnavailableError(err: unknown): err is Error {
  return (
    err instanceof DatabaseConnectionError ||
    err instanceof CommunityDatabaseError ||
    err instanceof ChatDatabaseError ||
    err instanceof ModerationDatabaseError
  );
}

export function errorHandler() {
  return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    const instance = req.originalUrl || req.url;
    const correlationId = req.correlationId;

    if (err instanceof ZodError) {
      sendProblem(res, 400, {
        type: 'https://api.acad.vn/errors/validation-error',
        title: 'Validation Failed',
        detail: 'The payload provided does not conform to the required schema.',
        code: 'VALIDATION_FAILED',
        instance,
        correlationId,
        invalidParams: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      });
      return;
    }

    if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
      sendProblem(res, 400, {
        type: 'https://api.acad.vn/errors/malformed-json',
        title: 'Malformed JSON',
        detail: 'The request body does not contain valid JSON.',
        code: 'MALFORMED_JSON',
        instance,
        correlationId,
      });
      return;
    }

    if (isBadRequestError(err)) {
      sendProblem(res, 400, {
        type: 'https://api.acad.vn/errors/bad-request',
        title: 'Bad Request',
        detail: err.message,
        code: 'BAD_REQUEST',
        instance,
        correlationId,
      });
      return;
    }

    if (isUnauthorizedError(err)) {
      sendProblem(res, 401, {
        type: 'https://api.acad.vn/errors/unauthorized',
        title: 'Unauthorized',
        detail: err.message,
        code: 'UNAUTHORIZED',
        instance,
        correlationId,
      });
      return;
    }

    if (isForbiddenError(err)) {
      sendProblem(res, 403, {
        type: 'https://api.acad.vn/errors/forbidden',
        title: 'Forbidden',
        detail: err.message,
        code: 'FORBIDDEN',
        instance,
        correlationId,
      });
      return;
    }

    if (isNotFoundError(err)) {
      sendProblem(res, 404, {
        type: 'https://api.acad.vn/errors/not-found',
        title: 'Resource Not Found',
        detail: err.message,
        code: 'NOT_FOUND',
        instance,
        correlationId,
      });
      return;
    }

    if (isConflictError(err)) {
      sendProblem(res, 409, {
        type: 'https://api.acad.vn/errors/conflict',
        title: 'Resource Conflict',
        detail: err.message,
        code: 'CONFLICT',
        instance,
        correlationId,
      });
      return;
    }

    if (isDatabaseUnavailableError(err)) {
      console.error(`[DATABASE ERROR] [${correlationId}]:`, err.message);
      sendProblem(res, 503, {
        type: 'https://api.acad.vn/errors/service-unavailable',
        title: 'Database Service Unavailable',
        detail:
          'The database cluster is temporarily unreachable. Please retry with exponential backoff.',
        code: 'SERVICE_UNAVAILABLE',
        instance,
        correlationId,
        headers: { 'Retry-After': '5' },
      });
      return;
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const detail = isProduction
      ? 'An unexpected internal error occurred. Please contact support with the correlation ID.'
      : err instanceof Error
        ? err.message
        : String(err);

    console.error(`[UNHANDLED ERROR] [${correlationId}]:`, err);

    sendProblem(res, 500, {
      type: 'https://api.acad.vn/errors/internal-error',
      title: 'Internal Server Error',
      detail,
      code: 'INTERNAL_ERROR',
      instance,
      correlationId,
    });
  };
}
