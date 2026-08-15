import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { defaultSearchIndexService } from '../services/search/search-index.service.js';

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

    const results = await defaultSearchIndexService.search(user.organizationId, {
      query: (q as string) || '',
      documentType: documentType ? (documentType as string) : undefined,
      caseId: caseId ? (caseId as string) : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
    });

    res.json({
      success: true,
      data: results,
    });
  } catch (err) {
    next(err);
  }
});
