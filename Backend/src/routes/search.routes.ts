import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { defaultSearchIndexService } from '../services/search/search-index.service.js';

export const searchQuerySchema = z.object({
  q: z.string().optional(),
  documentType: z.string().optional(),
  caseId: z.string().optional(),
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

export const searchRouter = Router();

// Apply auth middleware to all search endpoints
searchRouter.use(authenticateToken);

/**
 * GET /api/v1/search
 * Global tenant-isolated search across document metadata, case details, and extracted text
 */
searchRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as unknown as { user?: { id: string; organizationId: string } }).user;
    if (!user || !user.organizationId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required for search' },
      });
      return;
    }

    const { q, documentType, caseId, page, limit } = req.query;

    const queryResult = searchQuerySchema.safeParse({ q, documentType, caseId, page, limit });
    if (!queryResult.success) {
      const issue = queryResult.error.issues[0];
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: issue.message },
      });
      return;
    }

    const results = await defaultSearchIndexService.search(user.organizationId, {
      query: queryResult.data.q || '',
      documentType: queryResult.data.documentType,
      caseId: queryResult.data.caseId,
      page: Math.max(1, queryResult.data.page ?? 1),
      limit: Math.min(100, Math.max(1, queryResult.data.limit ?? 10)),
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    next(err);
  }
});
