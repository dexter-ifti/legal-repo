import { prisma } from '../db/client.js';
import { buildTenantWhereClause, assertTenantOwnership, TenantAccessDeniedError } from '../utils/authorization.js';
import { getStorageFileBuffer } from '../storage/storage.service.js';
import { defaultPdfTextExtractor } from './text-extraction/pdf-text-extractor.service.js';
import { ITextExtractor } from './text-extraction/text-extractor.interface.js';
import { getOcrProvider } from './ocr/ocr.service.js';
import { IOcrProvider } from './ocr/ocr-provider.interface.js';
import { defaultMetadataExtractionService } from './extraction/metadata-extraction.service.js';
import { defaultDocumentClassifierService } from './classification/document-classifier.service.js';
import { defaultCaseMatcherService } from './matching/case-matcher.service.js';

export class DocumentProcessingService {
  private extractor: ITextExtractor;
  private ocrProvider: IOcrProvider;

  constructor(
    extractor: ITextExtractor = defaultPdfTextExtractor,
    ocrProvider: IOcrProvider = getOcrProvider()
  ) {
    this.extractor = extractor;
    this.ocrProvider = ocrProvider;
  }

  /**
   * Performs native text extraction (TASK-016 compatibility).
   */
  async processTextExtraction(organizationId: string, documentId: string) {
    return this.processDocumentPipeline(organizationId, documentId);
  }

  /**
   * Complete Milestone 4 & 5 Document Pipeline:
   * Text Extraction -> OCR Fallback -> Legal Metadata -> Classification -> Case Matching Engine.
   */
  async processDocumentPipeline(organizationId: string, documentId: string) {
    if (!organizationId || !documentId) {
      throw new Error('Tenant organizationId and documentId are required for document processing pipeline');
    }

    // 1. Retrieve document with tenant security scoping
    const document = await prisma.document.findFirst({
      where: buildTenantWhereClause(organizationId, { id: documentId }),
    });

    if (!document) {
      throw new TenantAccessDeniedError('Document not found or access denied', 404);
    }
    assertTenantOwnership(document.organizationId, organizationId);

    // Update status to EXTRACTING
    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'EXTRACTING' },
    });

    try {
      // 2. Read binary file from Object Storage
      const fileBuffer = await getStorageFileBuffer(document.storageKey);

      // 3. Attempt native PDF text extraction
      let extractedText = '';
      let pageCount = 1;
      let isScanned = false;
      let extractionSource = 'DOCUMENT_TEXT';

      try {
        const extractionResult = await this.extractor.extractText(fileBuffer);
        extractedText = extractionResult.text.trim();
        pageCount = extractionResult.pageCount || 1;
      } catch (err: unknown) {
        console.warn(`Native text extraction failed for doc ${documentId}, falling back to OCR:`, err);
      }

      // 4. OCR Fallback if native text is empty or insufficient
      if (!extractedText || extractedText.length < 20) {
        isScanned = true;
        extractionSource = 'OCR';

        const ocrResult = await this.ocrProvider.extractText(fileBuffer);

        if (ocrResult.text && !ocrResult.error && ocrResult.text.trim().length > 0) {
          extractedText = ocrResult.text.trim();
          pageCount = ocrResult.pageCount || pageCount;
        } else {
          // If OCR also yields empty text, mark as OCR_FAILED or UNSUPPORTED
          const failedStatus = ocrResult.error?.includes('unsupported') ? 'UNSUPPORTED' : 'OCR_FAILED';
          const updatedDoc = await prisma.document.update({
            where: { id: documentId },
            data: { processingStatus: failedStatus },
          });

          await prisma.documentMetadata.create({
            data: {
              documentId,
              fieldName: 'extraction_error',
              fieldValue: ocrResult.error || 'Text extraction and OCR fallback yielded empty text',
              confidence: 0,
              source: 'ocr_fallback',
            },
          });

          return {
            success: false,
            status: failedStatus,
            document: updatedDoc,
            error: ocrResult.error || 'No extractable text',
          };
        }
      }

      // 5. Persist extracted text metadata
      await prisma.$transaction([
        prisma.documentMetadata.deleteMany({
          where: {
            documentId,
            fieldName: { in: ['extracted_text', 'page_count', 'is_scanned'] },
          },
        }),
        prisma.documentMetadata.create({
          data: {
            documentId,
            fieldName: 'extracted_text',
            fieldValue: extractedText,
            confidence: 1.0,
            source: extractionSource,
          },
        }),
        prisma.documentMetadata.create({
          data: {
            documentId,
            fieldName: 'page_count',
            fieldValue: String(pageCount),
            confidence: 1.0,
            source: extractionSource,
          },
        }),
        prisma.documentMetadata.create({
          data: {
            documentId,
            fieldName: 'is_scanned',
            fieldValue: String(isScanned),
            confidence: 1.0,
            source: extractionSource,
          },
        }),
      ]);

      // 6. Metadata Extraction (TASK-018 & TASK-019)
      const metadataResult = await defaultMetadataExtractionService.persistExtractedMetadata(
        documentId,
        extractedText,
        extractionSource
      );

      // 7. Legal Document Classification (TASK-020)
      const classification = defaultDocumentClassifierService.classify(
        extractedText,
        document.originalFilename
      );

      // 8. Update Document model with classification result & set processingStatus to MATCHING
      await prisma.document.update({
        where: { id: documentId },
        data: {
          documentType: classification.documentType,
          processingStatus: 'MATCHING',
        },
      });

      // Log Audit Event
      await prisma.auditEvent.create({
        data: {
          organizationId: document.organizationId,
          userId: document.uploadedBy,
          entityType: 'DOCUMENT',
          entityId: document.id,
          eventType: 'DOCUMENT_CLASSIFIED',
          metadata: {
            documentType: classification.documentType,
            confidence: classification.confidence,
            extractedMetadataCount: metadataResult.allFields.length,
          },
        },
      });

      // 9. Case Matching Engine (TASK-021, TASK-022, TASK-023)
      const matchingResult = await defaultCaseMatcherService.matchDocument(organizationId, documentId);

      const finalDoc = await prisma.document.findUnique({
        where: { id: documentId },
        include: { metadata: true, case: true },
      });

      return {
        success: true,
        status: finalDoc?.processingStatus,
        matchStatus: matchingResult.matchStatus,
        matchConfidence: matchingResult.matchConfidence,
        document: finalDoc,
        text: extractedText,
        metadata: metadataResult.allFields,
        candidates: matchingResult.candidates,
      };
    } catch (err: unknown) {
      console.error(`Document pipeline execution failed for ${documentId}:`, err);

      const failedDoc = await prisma.document.update({
        where: { id: documentId },
        data: { processingStatus: 'PROCESSING_FAILED' },
      });

      return {
        success: false,
        status: 'PROCESSING_FAILED',
        document: failedDoc,
        error: err instanceof Error ? err.message : 'Processing failure',
      };
    }
  }

  /**
   * Idempotent Pipeline Retry Handler (TASK-032).
   * Safe retry mechanism resetting metadata errors without deleting original upload binaries.
   */
  async retryDocumentPipeline(organizationId: string, documentId: string) {
    if (!organizationId || !documentId) {
      throw new Error('organizationId and documentId are required for pipeline retry');
    }

    const document = await prisma.document.findFirst({
      where: buildTenantWhereClause(organizationId, { id: documentId }),
    });

    if (!document) {
      throw new TenantAccessDeniedError('Document not found or access denied', 404);
    }
    assertTenantOwnership(document.organizationId, organizationId);

    // Clear previous extraction errors idempotently
    await prisma.documentMetadata.deleteMany({
      where: {
        documentId,
        fieldName: 'extraction_error',
      },
    });

    // Reset status to QUEUED
    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'QUEUED' },
    });

    // Emit Audit Event for RETRY action
    await prisma.auditEvent.create({
      data: {
        organizationId: document.organizationId,
        userId: document.uploadedBy,
        entityType: 'DOCUMENT',
        entityId: document.id,
        eventType: 'DOCUMENT_RETRIED',
        metadata: {
          previousStatus: document.processingStatus,
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Re-trigger pipeline execution
    return this.processDocumentPipeline(organizationId, documentId);
  }
}

export const defaultDocumentProcessingService = new DocumentProcessingService();
