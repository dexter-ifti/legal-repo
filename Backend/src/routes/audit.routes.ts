import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { defaultAuditService } from '../services/audit/audit.service.js';
import { sendError } from '../utils/api-response.js';

export const auditQuerySchema = z.object({
  eventType: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  page: z
    .string()
    .regex(/^\d+$/, 'page must be a non-negative integer')
    .transform(Number)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/, 'limit must be a non-negative integer')
    .transform(Number)
    .optional(),
});

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

    const queryResult = auditQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      const issue = queryResult.error.issues[0];
      sendError(res, issue.message, 400, 'VALIDATION_ERROR');
      return;
    }

    const result = await defaultAuditService.getAuditLogs({
      organizationId,
      eventType: queryResult.data.eventType,
      entityType: queryResult.data.entityType,
      entityId: queryResult.data.entityId,
      page: Math.max(1, queryResult.data.page ?? 1),
      limit: Math.min(100, Math.max(1, queryResult.data.limit ?? 20)),
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
