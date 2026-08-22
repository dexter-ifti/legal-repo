import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  getOrganizationMembers,
  updateMemberRole,
} from '../services/organization.service.js';
import { createInvite, InviteUrlConfigError } from '../services/invite.service.js';
import { sendSuccess, sendError } from '../utils/api-response.js';

const router = Router();

const createOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters long'),
});

const updateOrgSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters long'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER'], {
    errorMap: () => ({ message: 'Role must be ADMIN or MEMBER' }),
  }),
});

const createInviteSchema = z.object({
  email: z.string().email('Invalid email address format'),
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
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

/**
 * PATCH /api/v1/organizations/me/members/:userId
 * ADMIN-only. Changes a member's role within the authenticated tenant.
 * The target user must belong to the same organization (enforced in service).
 */
router.patch(
  '/me/members/:userId',
  authenticateToken,
  requireTenant,
  requireRole('ADMIN'),
  async (req: TenantRequest, res: Response) => {
    try {
      const parseResult = updateMemberRoleSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return sendError(res, issue.message, 400, 'VALIDATION_ERROR');
      }

      if (!req.organizationId || !req.user) {
        return sendError(res, 'Organization identity missing', 403, 'TENANT_REQUIRED');
      }

      try {
        const member = await updateMemberRole(
          req.organizationId,
          req.params.userId,
          parseResult.data.role,
          req.user.id
        );
        return sendSuccess(res, { member }, 200);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update member';
        if (message === 'Member not found in this organization') {
          return sendError(res, message, 404, 'MEMBER_NOT_FOUND');
        }
        if (message === 'You cannot change your own admin role') {
          return sendError(res, message, 400, 'SELF_ROLE_CHANGE_FORBIDDEN');
        }
        throw err;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update member role';
      return sendError(res, message, 500, 'MEMBER_UPDATE_FAILED');
    }
  }
);

/**
 * POST /api/v1/organizations/me/invites
 * ADMIN-only. Creates a single-use invite bound to the authenticated tenant
 * and returns the shareable signup link (frontend base URL comes from env).
 */
router.post(
  '/me/invites',
  authenticateToken,
  requireTenant,
  requireRole('ADMIN'),
  async (req: TenantRequest, res: Response) => {
    try {
      const parseResult = createInviteSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issue = parseResult.error.issues[0];
        return sendError(res, issue.message, 400, 'VALIDATION_ERROR');
      }

      if (!req.organizationId || !req.user) {
        return sendError(res, 'Organization identity missing', 403, 'TENANT_REQUIRED');
      }

      try {
        const { invite, inviteUrl } = await createInvite(
          req.organizationId,
          req.user.id,
          parseResult.data.email,
          parseResult.data.role
        );
        return sendSuccess(
          res,
          {
            invite: {
              id: invite.id,
              email: invite.email,
              role: invite.role,
              status: invite.status,
              expiresAt: invite.expiresAt,
            },
            inviteUrl,
          },
          201
        );
      } catch (err: unknown) {
        if (err instanceof InviteUrlConfigError) {
          return sendError(res, err.message, 500, 'INVITE_URL_NOT_CONFIGURED');
        }
        throw err;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create invite';
      return sendError(res, message, 500, 'INVITE_CREATE_FAILED');
    }
  }
);

export default router;
