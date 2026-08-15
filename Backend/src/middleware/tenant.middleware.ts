import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { sendError } from '../utils/api-response.js';

export interface TenantRequest extends AuthenticatedRequest {
  organizationId?: string;
}

export function requireTenant(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    return;
  }

  const organizationId = req.user.organizationId;
  if (!organizationId) {
    sendError(res, 'Organization identity missing or tenant unassigned', 403, 'TENANT_REQUIRED');
    return;
  }

  req.organizationId = organizationId;
  next();
}
