import { Router, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireTenant, TenantRequest } from '../middleware/tenant.middleware.js';
import { authorizeResourceOwnership } from '../middleware/authz.middleware.js';
import { requireValidPdfUpload } from '../middleware/upload.middleware.js';
import { DocumentService } from '../services/document.service.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
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

export default router;
