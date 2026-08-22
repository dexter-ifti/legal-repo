import { Request, Response, NextFunction } from 'express';

// Endpoints that would flood the request log without adding signal.
const SKIPPED_PATHS = new Set(['/health', '/api/v1/health', '/favicon.ico']);

/**
 * Uvicorn-style request logging:
 *   INFO: GET /api/v1/documents 200 12ms
 *
 * Disabled entirely by setting LOG_LEVEL=silent.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (process.env.LOG_LEVEL === 'silent') {
    next();
    return;
  }

  const start = Date.now();

  res.on('finish', () => {
    if (SKIPPED_PATHS.has(req.originalUrl.split('?')[0])) {
      return;
    }

    const durationMs = Date.now() - start;
    console.log(`INFO: ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
  });

  next();
}
