import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { authorizeResourceOwnership } from '../middleware/authz.middleware.js';
import {
  createCase,
  getCases,
  getCaseById,
  updateCase,
  deleteCase,
} from '../services/case.service.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { prisma } from '../db/client.js';

const router = Router();

export const createCaseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters long'),
  caseNumber: z.string().optional(),
  cnrNumber: z.string().optional(),
  court: z.string().optional(),
  judge: z.string().optional(),
  clientName: z.string().optional(),
  opposingParty: z.string().optional(),
  caseType: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCaseSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters long').optional(),
  caseNumber: z.string().optional(),
  cnrNumber: z.string().optional(),
  court: z.string().optional(),
  judge: z.string().optional(),
  clientName: z.string().optional(),
  opposingParty: z.string().optional(),
  caseType: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export const getCasesQuerySchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  caseType: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// Helper for fetching target case organizationId for resource authorization
const fetchCaseOrgId = async (req: TenantRequest) => {
  const caseId = req.params.id;
  const item = await prisma.case.findUnique({
    where: { id: caseId },
    select: { organizationId: true },
  });
  return item?.organizationId;
};

router.post('/', authenticateToken, requireTenant, async (req: TenantRequest, res: Response) => {
  try {
    const parseResult = createCaseSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return sendError(res, issue.message, 400, 'VALIDATION_ERROR');
    }

    if (!req.organizationId || !req.user) {
      return sendError(res, 'Organization identity missing', 403, 'TENANT_REQUIRED');
    }

    const createdCase = await createCase(req.organizationId, req.user.id, parseResult.data);
    return sendSuccess(res, { case: createdCase }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create case';
    return sendError(res, message, 500, 'CASE_CREATE_FAILED');
  }
});

router.get('/', authenticateToken, requireTenant, async (req: TenantRequest, res: Response) => {
  try {
    const queryResult = getCasesQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      const issue = queryResult.error.issues[0];
      return sendError(res, issue.message, 400, 'VALIDATION_ERROR');
    }

    if (!req.organizationId) {
      return sendError(res, 'Organization identity missing', 403, 'TENANT_REQUIRED');
    }

    const result = await getCases(req.organizationId, queryResult.data);
    return sendSuccess(res, result, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch cases';
    return sendError(res, message, 500, 'CASES_FETCH_FAILED');
  }
});

router.get('/:id', authenticateToken, requireTenant, authorizeResourceOwnership(fetchCaseOrgId, 'Case'), async (req: TenantRequest, res: Response) => {
  try {
    if (!req.organizationId) {
      return sendError(res, 'Organization identity missing', 403, 'TENANT_REQUIRED');
    }

    const caseItem = await getCaseById(req.params.id, req.organizationId);
    if (!caseItem) {
      return sendError(res, 'Case not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, { case: caseItem }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch case detail';
    return sendError(res, message, 500, 'CASE_FETCH_FAILED');
  }
});

router.patch('/:id', authenticateToken, requireTenant, authorizeResourceOwnership(fetchCaseOrgId, 'Case'), async (req: TenantRequest, res: Response) => {
  try {
    const parseResult = updateCaseSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return sendError(res, issue.message, 400, 'VALIDATION_ERROR');
    }

    if (!req.organizationId) {
      return sendError(res, 'Organization identity missing', 403, 'TENANT_REQUIRED');
    }

    const updatedCase = await updateCase(req.params.id, req.organizationId, parseResult.data);
    if (!updatedCase) {
      return sendError(res, 'Case not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, { case: updatedCase }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update case';
    return sendError(res, message, 500, 'CASE_UPDATE_FAILED');
  }
});

router.delete('/:id', authenticateToken, requireTenant, requireRole('ADMIN'), authorizeResourceOwnership(fetchCaseOrgId, 'Case'), async (req: TenantRequest, res: Response) => {
  try {
    if (!req.organizationId) {
      return sendError(res, 'Organization identity missing', 403, 'TENANT_REQUIRED');
    }

    const deleted = await deleteCase(req.params.id, req.organizationId);
    if (!deleted) {
      return sendError(res, 'Case not found', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, { message: 'Case deleted successfully' }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete case';
    return sendError(res, message, 500, 'CASE_DELETE_FAILED');
  }
});

export default router;
