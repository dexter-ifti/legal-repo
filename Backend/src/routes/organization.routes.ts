import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  getOrganizationMembers,
} from '../services/organization.service.js';
import { sendSuccess, sendError } from '../utils/api-response.js';

const router = Router();

const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters long'),
});

const updateOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters long'),
});

router.post('/', authenticateToken, async (req: TenantRequest, res: Response) => {
  try {
    const parseResult = createOrgSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return sendError(res, issue.message, 400, 'VALIDATION_ERROR');
    }

    if (!req.user) {
      return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');
    }

    const { name } = parseResult.data;
    const organization = await createOrganization(name, req.user.id);

    return sendSuccess(res, { organization }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create organization';
    return sendError(res, message, 500, 'ORGANIZATION_CREATE_FAILED');
  }
});

router.get('/me', authenticateToken, requireTenant, async (req: TenantRequest, res: Response) => {
  try {
    if (!req.organizationId) {
      return sendError(res, 'Organization identity missing', 403, 'TENANT_REQUIRED');
    }

    const organization = await getOrganizationById(req.organizationId);
    if (!organization) {
      return sendError(res, 'Organization not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, { organization }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch organization';
    return sendError(res, message, 500, 'ORGANIZATION_FETCH_FAILED');
  }
});

router.patch('/me', authenticateToken, requireTenant, requireRole('ADMIN'), async (req: TenantRequest, res: Response) => {
  try {
    const parseResult = updateOrgSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return sendError(res, issue.message, 400, 'VALIDATION_ERROR');
    }

    if (!req.organizationId) {
      return sendError(res, 'Organization identity missing', 403, 'TENANT_REQUIRED');
    }

    const { name } = parseResult.data;
    const organization = await updateOrganization(req.organizationId, name);

    return sendSuccess(res, { organization }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update organization';
    return sendError(res, message, 500, 'ORGANIZATION_UPDATE_FAILED');
  }
});

router.get('/me/members', authenticateToken, requireTenant, async (req: TenantRequest, res: Response) => {
  try {
    if (!req.organizationId) {
      return sendError(res, 'Organization identity missing', 403, 'TENANT_REQUIRED');
    }

    const members = await getOrganizationMembers(req.organizationId);
    return sendSuccess(res, { members }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch members';
    return sendError(res, message, 500, 'MEMBERS_FETCH_FAILED');
  }
});

export default router;
