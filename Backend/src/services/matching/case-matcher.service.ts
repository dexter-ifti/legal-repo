import { prisma } from '../../db/client.js';
import { buildTenantWhereClause, assertTenantOwnership, TenantAccessDeniedError } from '../../utils/authorization.js';
import { defaultCandidateGenerationService, CandidateGenerationService, CaseCandidate, DocumentSignals } from './candidate-generation.service.js';
import { getMatchingThresholds } from '../../config/matching.config.js';
import { MatchStatus, ProcessingStatus } from '@prisma/client';

export interface MatchingResult {
  documentId: string;
  matchStatus: MatchStatus;
  matchConfidence: number;
  matchedCaseId: string | null;
  candidates: CaseCandidate[];
}

export class CaseMatcherService {
  private candidateService: CandidateGenerationService;

  constructor(candidateService: CandidateGenerationService = defaultCandidateGenerationService) {
    this.candidateService = candidateService;
  }

  /**
   * Runs candidate generation and deterministic matching decision engine for a document.
   */
  async matchDocument(organizationId: string, documentId: string): Promise<MatchingResult> {
    if (!organizationId || !documentId) {
      throw new Error('organizationId and documentId are required for case matching');
    }

    const document = await prisma.document.findFirst({
      where: buildTenantWhereClause(organizationId, { id: documentId }),
      include: { metadata: true },
    });

    if (!document) {
      throw new TenantAccessDeniedError('Document not found or access denied', 404);
    }
    assertTenantOwnership(document.organizationId, organizationId);

    // Build document signals from extracted metadata rows
    const signals: DocumentSignals = {};
    for (const meta of document.metadata) {
      if (!meta.fieldValue) continue;
      if (meta.fieldName === 'case_number') signals.caseNumber = meta.fieldValue;
      if (meta.fieldName === 'cnr_number') signals.cnrNumber = meta.fieldValue;
      if (meta.fieldName === 'client_name') signals.clientName = meta.fieldValue;
      if (meta.fieldName === 'opposing_party') signals.opposingParty = meta.fieldValue;
      if (meta.fieldName === 'court') signals.court = meta.fieldValue;
    }

    // Generate candidates
    const candidates = await this.candidateService.generateCandidates(organizationId, signals);

    let matchStatus: MatchStatus = MatchStatus.NO_MATCH;
    let processingStatus: ProcessingStatus = ProcessingStatus.PROCESSING_COMPLETED;
    let matchedCaseId: string | null = null;
    let matchConfidence = 0;

    if (candidates.length > 0) {
      const topCandidate = candidates[0];
      const secondCandidate = candidates[1];
      matchConfidence = topCandidate.totalScore;

      const scoreMargin = secondCandidate ? topCandidate.totalScore - secondCandidate.totalScore : 1.0;

      // Decision thresholds come from server-side config (see src/config/matching.config.ts)
      const thresholds = getMatchingThresholds();

      if (topCandidate.totalScore >= thresholds.autoMatchConfidence && scoreMargin >= thresholds.autoMatchScoreMargin) {
        // High confidence single match -> AUTO_MATCHED
        matchStatus = MatchStatus.AUTO_MATCHED;
        matchedCaseId = topCandidate.caseId;
        processingStatus = ProcessingStatus.FILED;
      } else if (topCandidate.totalScore >= thresholds.confirmationConfidence) {
        // Medium confidence or close tie -> CONFIRMATION_REQUIRED
        matchStatus = MatchStatus.CONFIRMATION_REQUIRED;
        matchedCaseId = null;
        processingStatus = ProcessingStatus.AWAITING_CONFIRMATION;
      } else {
        // Low confidence -> NO_MATCH; processing is complete, nothing to review
        matchStatus = MatchStatus.NO_MATCH;
        matchedCaseId = null;
        processingStatus = ProcessingStatus.PROCESSING_COMPLETED;
      }
    }

    // Update document record in DB
    await prisma.document.update({
      where: { id: documentId },
      data: {
        matchStatus,
        processingStatus,
        matchConfidence,
        caseId: matchedCaseId,
      },
    });

    // Save candidates and decision details in metadata table for auditing and UI display
    await prisma.documentMetadata.upsert({
      where: {
        id: (
          await prisma.documentMetadata.findFirst({
            where: { documentId, fieldName: 'matching_candidates' },
          })
        )?.id || '00000000-0000-0000-0000-000000000000',
      },
      create: {
        documentId,
        fieldName: 'matching_candidates',
        fieldValue: JSON.stringify(candidates),
        confidence: matchConfidence,
        source: 'DETERMINISTIC_MATCHER',
      },
      update: {
        fieldValue: JSON.stringify(candidates),
        confidence: matchConfidence,
        source: 'DETERMINISTIC_MATCHER',
      },
    });

    // Create Audit Event
    await prisma.auditEvent.create({
      data: {
        organizationId,
        entityType: 'Document',
        entityId: documentId,
        eventType: 'DOCUMENT_MATCHED',
        metadata: {
          matchStatus,
          matchConfidence,
          matchedCaseId,
          candidateCount: candidates.length,
          thresholds: { ...getMatchingThresholds() },
        },
      },
    });

    return {
      documentId,
      matchStatus,
      matchConfidence,
      matchedCaseId,
      candidates,
    };
  }
}

export const defaultCaseMatcherService = new CaseMatcherService();
