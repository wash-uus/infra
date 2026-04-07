import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../config/logger';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-Id', id);
  (req as any).requestId = id;
  next();
}

export function errorHandler(
  err: Error & { status?: number; statusCode?: number },
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err.status ?? err.statusCode ?? 500;

  if (status >= 500) {
    logger.error('Unhandled error', {
      message: err.message,
      stack:   err.stack,
      path:    req.path,
      method:  req.method,
    });
  }

  res.status(status).json({
    success: false,
    message: status < 500 ? err.message : 'Internal server error',
  });
}

export class NotFoundError extends Error {
  status = 404;
  constructor(resource = 'Resource') { super(`${resource} not found`); }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(msg = 'Forbidden') { super(msg); }
}

export class BadRequestError extends Error {
  status = 400;
  constructor(msg: string) { super(msg); }
}
