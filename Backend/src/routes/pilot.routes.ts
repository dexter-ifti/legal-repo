import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { defaultPilotReadinessService } from '../services/pilot/pilot-readiness.service.js';
import { sendError } from '../utils/api-response.js';

export const pilotRouter = Router();

/**
 * GET /api/v1/pilot/status
 * Returns Pilot Readiness Telemetry and Status Report (TASK-039)
 */
pilotRouter.get(
  '/status',
  authenticateToken,
  requireTenant,
  async (req: TenantRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.organizationId;
      if (!organizationId) {
        sendError(res, 'Tenant context missing', 400, 'MISSING_TENANT');
        return;
      }

      const statusReport = await defaultPilotReadinessService.getPilotStatus(organizationId);

      res.status(200).json({
        success: true,
        data: statusReport,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to retrieve pilot status report';
      sendError(res, message, 500, 'PILOT_STATUS_ERROR');
    }
  }
);
