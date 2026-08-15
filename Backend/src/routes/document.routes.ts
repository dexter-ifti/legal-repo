import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { authorizeResourceOwnership } from '../middleware/authz.middleware.js';
import { requireValidPdfUpload } from '../middleware/upload.middleware.js';
import { DocumentService } from '../services/document.service.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { TenantAccessDeniedError } from '../utils/authorization.js';
import { prisma } from '../db/client.js';

const router = Router();

// Helper for fetching target document organizationId for resource authorization
const fetchDocumentOrgId = async (req: TenantRequest) => {
  const documentId = req.params.id;
  const item = await prisma.document.findUnique({
    where: { id: documentId },
    select: { organizationId: true },
  });
  return item?.organizationId;
};

/**
 * POST /api/v1/documents/upload
 * Protected by authenticateToken and requireTenant.
 * Accepts multipart/form-data with field "file" (PDF).
 * If duplicate SHA-256 exists in organization, returns HTTP 200 with isDuplicate: true.
 */
router.post(
  '/upload',
  authenticateToken,
  requireTenant,
  requireValidPdfUpload,
  async (req: TenantRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.organizationId!;
      const userId = req.user!.id;
      const file = req.file!;
      const { caseId, documentType } = req.body || {};

      const result = await DocumentService.uploadDocument({
        organizationId,
        uploadedBy: userId,
        fileBuffer: file.buffer,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        caseId: caseId || null,
        documentType: documentType || null,
      });

      const doc = result.document;
      const statusCode = result.isDuplicate ? 200 : 201;

      sendSuccess(
        res,
        {
          id: doc.id,
          organizationId: doc.organizationId,
          caseId: doc.caseId,
          originalFilename: doc.originalFilename,
          storageKey: doc.storageKey,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize ? Number(doc.fileSize) : 0,
          sha256: doc.sha256,
          documentType: doc.documentType,
          processingStatus: doc.processingStatus,
          matchStatus: doc.matchStatus,
          uploadedAt: doc.uploadedAt,
          isDuplicate: result.isDuplicate,
        },
        statusCode
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to upload document';
      if (message.includes('Target case not found')) {
        sendError(res, message, 404, 'CASE_NOT_FOUND');
        return;
      }

      sendError(res, message, 500, 'DOCUMENT_UPLOAD_ERROR');
    }
  }
);

/**
 * GET /api/v1/documents/by-hash/:sha256
 * Protected by authenticateToken and requireTenant.
 * Checks if a document with the given SHA-256 hash already exists in the organization.
 */
router.get(
  '/by-hash/:sha256',
  authenticateToken,
  requireTenant,
  async (req: TenantRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.organizationId!;
      const { sha256 } = req.params;

      if (!sha256 || sha256.length !== 64) {
        sendError(res, 'Invalid SHA-256 hash format (64 hex characters expected).', 400, 'INVALID_HASH');
        return;
      }

      const existingDoc = await DocumentService.findDuplicateBySha256(organizationId, sha256);

      if (!existingDoc) {
        sendSuccess(res, { exists: false, document: null }, 200);
        return;
      }

      sendSuccess(
        res,
        {
          exists: true,
          document: {
            id: existingDoc.id,
            organizationId: existingDoc.organizationId,
            caseId: existingDoc.caseId,
            case: existingDoc.case,
            originalFilename: existingDoc.originalFilename,
            storageKey: existingDoc.storageKey,
            sha256: existingDoc.sha256,
            processingStatus: existingDoc.processingStatus,
            matchStatus: existingDoc.matchStatus,
            uploadedAt: existingDoc.uploadedAt,
          },
        },
        200
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to query document by hash';
      sendError(res, message, 500, 'HASH_LOOKUP_ERROR');
    }
  }
);

/**
 * GET /api/v1/documents/:id
 * Protected by authenticateToken, requireTenant, and authorizeResourceOwnership.
 */
router.get(
  '/:id',
  authenticateToken,
  requireTenant,
  authorizeResourceOwnership(fetchDocumentOrgId, 'Document'),
  async (req: TenantRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.organizationId!;
      const documentId = req.params.id;

      const document = await DocumentService.getDocumentById(organizationId, documentId);

      if (!document) {
        sendError(res, `Document with ID ${documentId} not found.`, 404, 'DOCUMENT_NOT_FOUND');
        return;
      }

      sendSuccess(res, {
        id: document.id,
        organizationId: document.organizationId,
        caseId: document.caseId,
        case: document.case,
        originalFilename: document.originalFilename,
        storageKey: document.storageKey,
        mimeType: document.mimeType,
        fileSize: document.fileSize ? Number(document.fileSize) : 0,
        sha256: document.sha256,
        documentType: document.documentType,
        processingStatus: document.processingStatus,
        matchStatus: document.matchStatus,
        uploadedBy: document.uploadedBy,
        uploader: document.uploader,
        uploadedAt: document.uploadedAt,
      }, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve document';
      sendError(res, message, 500, 'DOCUMENT_RETRIEVAL_ERROR');
    }
  }
);

/**
 * POST /api/v1/documents/:id/extract
 * Protected by authenticateToken, requireTenant, and authorizeResourceOwnership.
 * Triggers native PDF text extraction and metadata persistence.
 */
router.post(
  '/:id/extract',
  authenticateToken,
  requireTenant,
  authorizeResourceOwnership(fetchDocumentOrgId, 'Document'),
  async (req: TenantRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.organizationId!;
      const documentId = req.params.id;

      const { defaultDocumentProcessingService } = await import('../services/document-processing.service.js');
      const result = await defaultDocumentProcessingService.processTextExtraction(organizationId, documentId);

      if (!result.success) {
        sendError(res, result.error || 'Text extraction failed', 400, 'EXTRACTION_FAILED', [
          { field: 'documentId', message: result.error || 'Text extraction failed' },
        ]);
        return;
      }

      sendSuccess(res, result, 200);
    } catch (err: unknown) {
      if (err instanceof TenantAccessDeniedError) {
        sendError(res, err.message, err.statusCode, err.errorCode);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to process document text extraction';
      sendError(res, message, 500, 'EXTRACTION_ERROR');
    }
  }
);

/**
 * POST /api/v1/documents/:id/match
 * Protected by authenticateToken, requireTenant, and authorizeResourceOwnership.
 * Triggers candidate generation & deterministic case matching.
 */
router.post(
  '/:id/match',
  authenticateToken,
  requireTenant,
  authorizeResourceOwnership(fetchDocumentOrgId, 'Document'),
  async (req: TenantRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.organizationId!;
      const documentId = req.params.id;

      const { defaultCaseMatcherService } = await import('../services/matching/case-matcher.service.js');
      const result = await defaultCaseMatcherService.matchDocument(organizationId, documentId);

      sendSuccess(res, result, 200);
    } catch (err: unknown) {
      if (err instanceof TenantAccessDeniedError) {
        sendError(res, err.message, err.statusCode, err.errorCode);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to execute case matching';
      sendError(res, message, 500, 'MATCHING_ERROR');
    }
  }
);

/**
 * POST /api/v1/documents/:id/confirm-match
 * Protected by authenticateToken, requireTenant, and authorizeResourceOwnership.
 * Confirms case association for a document, updating status to CONFIRMED and FILED.
 */
router.post(
  '/:id/confirm-match',
  authenticateToken,
  requireTenant,
  authorizeResourceOwnership(fetchDocumentOrgId, 'Document'),
  async (req: TenantRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.organizationId!;
      const documentId = req.params.id;
      const { caseId } = req.body || {};

      if (!caseId) {
        sendError(res, 'caseId is required for match confirmation', 400, 'VALIDATION_ERROR', [
          { field: 'caseId', message: 'caseId is required' },
        ]);
        return;
      }

      // Verify case exists in user's tenant organization
      const targetCase = await prisma.case.findFirst({
        where: { id: caseId, organizationId },
      });

      if (!targetCase) {
        sendError(res, 'Target case not found in organization', 404, 'CASE_NOT_FOUND');
        return;
      }

      const existingDoc = await prisma.document.findUnique({
        where: { id: documentId },
      });

      const caseNumSanitized = (targetCase.caseNumber || 'CASE').replace(/[^a-zA-Z0-9_-]/g, '_');
      const docTypeSanitized = (existingDoc?.documentType || 'DOC').replace(/[^a-zA-Z0-9_-]/g, '_');
      const systemFilename = `${caseNumSanitized}_${docTypeSanitized}_${existingDoc?.originalFilename || 'document.pdf'}`;

      const updatedDoc = await prisma.document.update({
        where: { id: documentId },
        data: {
          caseId: targetCase.id,
          matchStatus: 'CONFIRMED',
          processingStatus: 'FILED',
          systemFilename,
        },
        include: { case: true, metadata: true },
      });

      await prisma.auditEvent.create({
        data: {
          organizationId,
          userId: req.user!.id,
          entityType: 'Document',
          entityId: documentId,
          eventType: 'DOCUMENT_CONFIRMED',
          metadata: {
            confirmedCaseId: targetCase.id,
            caseNumber: targetCase.caseNumber,
            systemFilename,
          },
        },
      });

      sendSuccess(res, updatedDoc, 200);
    } catch (err: unknown) {
      if (err instanceof TenantAccessDeniedError) {
        sendError(res, err.message, err.statusCode, err.errorCode);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to confirm case match';
      sendError(res, message, 500, 'MATCH_CONFIRM_ERROR');
    }
  }
);

/**
 * POST /api/v1/documents/:id/reassign
 * Protected by authenticateToken, requireTenant, and authorizeResourceOwnership.
 * Reassigns document to a different case or detaches it, logging structured feedback.
 */
router.post(
  '/:id/reassign',
  authenticateToken,
  requireTenant,
  authorizeResourceOwnership(fetchDocumentOrgId, 'Document'),
  async (req: TenantRequest, res: Response): Promise<void> => {
    try {
      const organizationId = req.organizationId!;
      const documentId = req.params.id;
      const { newCaseId, reason } = req.body || {};

      let targetCase = null;
      if (newCaseId) {
        targetCase = await prisma.case.findFirst({
          where: { id: newCaseId, organizationId },
        });

        if (!targetCase) {
          sendError(res, 'Target case not found in organization', 404, 'CASE_NOT_FOUND');
          return;
        }
      }

      const existingDoc = await prisma.document.findUnique({
        where: { id: documentId },
      });

      const oldCaseId = existingDoc?.caseId || null;

      const updatedDoc = await prisma.document.update({
        where: { id: documentId },
        data: {
          caseId: targetCase ? targetCase.id : null,
          matchStatus: 'REASSIGNED',
          processingStatus: targetCase ? 'FILED' : 'MATCHING',
        },
        include: { case: true, metadata: true },
      });

      // Capture structured prediction correction feedback
      await prisma.documentMetadata.create({
        data: {
          documentId,
          fieldName: 'matching_reassignment_feedback',
          fieldValue: JSON.stringify({
            oldCaseId,
            newCaseId: targetCase?.id || null,
            reason: reason || 'User manual reassignment',
            reassignedAt: new Date().toISOString(),
          }),
          confidence: 1.0,
          source: 'USER_FEEDBACK',
        },
      });

      await prisma.auditEvent.create({
        data: {
          organizationId,
          userId: req.user!.id,
          entityType: 'Document',
          entityId: documentId,
          eventType: 'DOCUMENT_REASSIGNED',
          metadata: {
            oldCaseId,
            newCaseId: targetCase?.id || null,
            reason,
          },
        },
      });

      sendSuccess(res, updatedDoc, 200);
    } catch (err: unknown) {
      if (err instanceof TenantAccessDeniedError) {
        sendError(res, err.message, err.statusCode, err.errorCode);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to reassign document case';
      sendError(res, message, 500, 'REASSIGN_ERROR');
    }
  }
);

export default router;
