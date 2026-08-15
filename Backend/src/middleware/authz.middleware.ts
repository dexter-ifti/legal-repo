import { Response, NextFunction } from 'express';
import { TenantRequest } from './tenant.middleware.js';
import { assertTenantOwnership, TenantAccessDeniedError } from '../utils/authorization.js';
import { sendError } from '../utils/api-response.js';

export type ResourceOrgIdFetcher = (req: TenantRequest) => Promise<string | null | undefined>;

export function authorizeResourceOwnership(
  fetchResourceOrgId: ResourceOrgIdFetcher,
  resourceName = 'Resource'
) {
  return async (req: TenantRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.organizationId) {
        sendError(res, 'Organization identity missing in request', 403, 'TENANT_REQUIRED');
        return;
      }

      const resourceOrgId = await fetchResourceOrgId(req);
      assertTenantOwnership(resourceOrgId, req.organizationId, resourceName);

      next();
    } catch (err: unknown) {
      if (err instanceof TenantAccessDeniedError) {
        sendError(res, err.message, err.statusCode, err.errorCode);
        return;
      }

      const message = err instanceof Error ? err.message : 'Authorization failure';
      sendError(res, message, 500, 'AUTHORIZATION_ERROR');
    }
  };
}
