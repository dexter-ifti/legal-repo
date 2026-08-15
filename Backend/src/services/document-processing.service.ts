import { prisma } from '../db/client.js';
import { buildTenantWhereClause, assertTenantOwnership } from '../utils/authorization.js';
import { getStorageFileBuffer } from '../storage/storage.service.js';
import { defaultPdfTextExtractor } from './text-extraction/pdf-text-extractor.service.js';
import { ITextExtractor } from './text-extraction/text-extractor.interface.js';

export class DocumentProcessingService {
  private extractor: ITextExtractor;

  constructor(extractor: ITextExtractor = defaultPdfTextExtractor) {
    this.extractor = extractor;
  }

  /**
   * Processes native PDF text extraction for a document within tenant boundaries.
   */
  async processTextExtraction(organizationId: string, documentId: string) {
    if (!organizationId || !documentId) {
      throw new Error('Tenant organizationId and documentId are required for text extraction');
    }

    // 1. Retrieve document with tenant security scoping
    const document = await prisma.document.findFirst({
      where: buildTenantWhereClause(organizationId, { id: documentId }),
    });

    if (!document) {
      throw new Error(`Document not found or unauthorized: ${documentId}`);
    }
    assertTenantOwnership(document.organizationId, organizationId);

    // 2. Update status to EXTRACTING
    await prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'EXTRACTING' },
    });

    try {
      // 3. Read file binary buffer from private object storage
      const fileBuffer = await getStorageFileBuffer(document.storageKey);

      // 4. Perform text extraction
      const extractionResult = await this.extractor.extractText(fileBuffer);

      if (extractionResult.error || (!extractionResult.text && extractionResult.isScanned)) {
        // Safe failure: mark status as PROCESSING_FAILED or UNSUPPORTED without throwing or losing file
        const failedStatus = extractionResult.isScanned ? 'UNSUPPORTED' : 'PROCESSING_FAILED';
        const updatedDoc = await prisma.document.update({
          where: { id: documentId },
          data: { processingStatus: failedStatus },
        });

        // Persist extraction error metadata
        await prisma.documentMetadata.create({
          data: {
            documentId,
            fieldName: 'extraction_error',
            fieldValue: extractionResult.error || 'No extractable text stream found in PDF (scanned or empty)',
            confidence: 0,
            source: 'native_pdf_extractor',
          },
        });

        return {
          success: false,
          status: failedStatus,
          document: updatedDoc,
          error: extractionResult.error || 'No text extracted',
        };
      }

      // 5. Persist extracted text and metadata into Prisma DocumentMetadata table
      await prisma.$transaction([
        // Delete any existing extracted_text metadata for idempotency
        prisma.documentMetadata.deleteMany({
          where: {
            documentId,
            fieldName: { in: ['extracted_text', 'page_count', 'is_scanned'] },
          },
        }),
        // Create fresh metadata entries
        prisma.documentMetadata.create({
          data: {
            documentId,
            fieldName: 'extracted_text',
            fieldValue: extractionResult.text,
            confidence: 1.0,
            source: 'native_pdf_extractor',
          },
        }),
        prisma.documentMetadata.create({
          data: {
            documentId,
            fieldName: 'page_count',
            fieldValue: String(extractionResult.pageCount),
            confidence: 1.0,
            source: 'native_pdf_extractor',
          },
        }),
        prisma.documentMetadata.create({
          data: {
            documentId,
            fieldName: 'is_scanned',
            fieldValue: String(Boolean(extractionResult.isScanned)),
            confidence: 1.0,
            source: 'native_pdf_extractor',
          },
        }),
        // Update document processing status to CLASSIFYING
        prisma.document.update({
          where: { id: documentId },
          data: { processingStatus: 'CLASSIFYING' },
        }),
      ]);

      const updatedDocument = await prisma.document.findUnique({
        where: { id: documentId },
        include: { metadata: true },
      });

      const formattedDocument = updatedDocument
        ? {
            ...updatedDocument,
            fileSize: updatedDocument.fileSize ? Number(updatedDocument.fileSize) : 0,
          }
        : null;

      return {
        success: true,
        status: 'CLASSIFYING',
        document: formattedDocument,
        text: extractionResult.text,
        pageCount: extractionResult.pageCount,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Text extraction pipeline error';

      await prisma.document.update({
        where: { id: documentId },
        data: { processingStatus: 'PROCESSING_FAILED' },
      }).catch(() => {});

      await prisma.documentMetadata.create({
        data: {
          documentId,
          fieldName: 'extraction_error',
          fieldValue: errorMessage,
          confidence: 0,
          source: 'native_pdf_extractor',
        },
      }).catch(() => {});

      return {
        success: false,
        status: 'PROCESSING_FAILED',
        error: errorMessage,
      };
    }
  }
}

export const defaultDocumentProcessingService = new DocumentProcessingService();
