import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { defaultAuditService } from '../services/audit/audit.service.js';
import { sendError } from '../utils/api-response.js';

export const auditRouter = Router();

// Apply auth & tenant middleware to all audit endpoints
auditRouter.use(authenticateToken);
auditRouter.use(requireTenant);

/**
 * GET /api/v1/audit-logs
 * Protected by authenticateToken and requireTenant.
 * Returns tenant-isolated audit events.
 */
auditRouter.get('/', async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const organizationId = req.organizationId;
    if (!organizationId) {
      sendError(res, 'Tenant context missing', 400, 'MISSING_TENANT');
      return;
    }

    const eventType = typeof req.query.eventType === 'string' ? req.query.eventType : undefined;
    const entityType = typeof req.query.entityType === 'string' ? req.query.entityType : undefined;
    const entityId = typeof req.query.entityId === 'string' ? req.query.entityId : undefined;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const result = await defaultAuditService.getAuditLogs({
      organizationId,
      eventType,
      entityType,
      entityId,
      page,
      limit,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve audit logs';
    sendError(res, message, 500, 'AUDIT_LOG_ERROR');
  }
});
