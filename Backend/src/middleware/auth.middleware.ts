import { Request, Response, NextFunction } from 'express';
import { verifyUserToken } from '../services/auth.service.js';
import { sendError } from '../utils/api-response.js';
import { AuthUser } from '../auth/AuthProvider.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    sendError(res, 'Authentication token required', 401, 'UNAUTHORIZED');
    return;
  }

  try {
    const user = await verifyUserToken(token);
    req.user = user;
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid token';
    sendError(res, message, 401, 'UNAUTHORIZED');
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
      return;
    }

    if (req.user.role && !roles.includes(req.user.role)) {
      sendError(res, 'Forbidden: insufficient role permissions', 403, 'FORBIDDEN');
      return;
    }

    next();
  };
}
