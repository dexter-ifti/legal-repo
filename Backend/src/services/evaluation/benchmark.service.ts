import { LegalRegexMatcher } from '../extraction/legal-regex-matcher.js';
import { DocumentClassifierService } from '../classification/document-classifier.service.js';
import { CandidateGenerationService, DocumentSignals } from '../matching/candidate-generation.service.js';
import { EVALUATION_CASES, generateEvaluationSamples, EvaluationSample } from './evaluation-dataset.js';

export interface BenchmarkMetrics {
  totalSamples: number;
  top1Accuracy: number;       // Ratio of samples where rank-1 candidate matches ground truth case
  top3Recall: number;         // Ratio of samples where ground truth case is in top-3 candidates
  autoMatchPrecision: number; // Correct AUTO_MATCH / Total AUTO_MATCH predictions
  falseAutoMatchRate: number; // Wrong AUTO_MATCH / Total AUTO_MATCH predictions (Goal: 0.0)
  automationRate: number;     // Total AUTO_MATCH predictions / Total non-NoMatch samples
  documentTaxonomyAccuracy: number; // Correct classification / Total samples
  thresholds: {
    autoMatch: number;
    confirmation: number;
  };
}

export class BenchmarkEvaluationService {
  private classifier: DocumentClassifierService;
  private candidateService: CandidateGenerationService;

  constructor() {
    this.classifier = new DocumentClassifierService();
    this.candidateService = new CandidateGenerationService();
  }

  /**
   * Runs evaluation harness against 100 ground-truth samples (TASK-035 & TASK-036).
   */
  runEvaluation(
    autoMatchThreshold: number = 0.90,
    confirmationThreshold: number = 0.45
  ): BenchmarkMetrics {
    const samples: EvaluationSample[] = generateEvaluationSamples();

    let correctTop1 = 0;
    let correctTop3 = 0;
    let totalAutoMatches = 0;
    let correctAutoMatches = 0;
    let wrongAutoMatches = 0;
    let correctTaxonomyCount = 0;
    let nonNoMatchCount = 0;

    let nonAmbiguousCount = 0;

    for (const sample of samples) {
      // 1. Taxonomy classification evaluation
      const classification = this.classifier.classify(sample.rawText, sample.filename);
      if (classification.documentType === sample.expectedDocumentType) {
        correctTaxonomyCount++;
      }

      // 2. Metadata extraction
      const extractedCnr = LegalRegexMatcher.extractCnrNumbers(sample.rawText)[0]?.value || null;
      const extractedCaseNum = LegalRegexMatcher.extractCaseNumbers(sample.rawText)[0]?.value || null;
      const parties = LegalRegexMatcher.extractParties(sample.rawText);

      const signals: DocumentSignals = {
        cnrNumber: extractedCnr,
        caseNumber: extractedCaseNum,
        clientName: parties.plaintiffs[0]?.value || null,
        opposingParty: parties.defendants[0]?.value || null,
      };

      // 3. Candidate scoring against mock case database
      const mockCases = EVALUATION_CASES.map((c) => ({
        id: c.id,
        organizationId: c.organizationId,
        title: c.title,
        caseNumber: c.caseNumber,
        cnrNumber: c.cnrNumber,
        court: c.court,
        judge: null,
        clientName: c.clientName,
        opposingParty: c.opposingParty,
        caseType: c.caseType,
        status: c.status,
        notes: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const candidates = this.candidateService.scoreCandidateCases(mockCases, signals);
      const topCandidate = candidates[0];

      if (!sample.isNoMatch) {
        nonNoMatchCount++;
        if (!sample.isAmbiguous) {
          nonAmbiguousCount++;
        }
      }

      // 4. Top-1 & Top-3 Recall evaluation
      if (topCandidate && !sample.isNoMatch) {
        const expectedCase = EVALUATION_CASES.find((c) => c.cnrNumber === sample.expectedCnrNumber);
        
        if (!sample.isAmbiguous && expectedCase && topCandidate.caseId === expectedCase.id) {
          correctTop1++;
        }

        const inTop3 = candidates.slice(0, 3).some((cand) => expectedCase && cand.caseId === expectedCase.id);
        if (inTop3) {
          correctTop3++;
        }
      }

      // 5. Match Status prediction based on calibrated thresholds
      let status: 'AUTO_MATCH' | 'CONFIRMATION_REQUIRED' | 'NO_MATCH' = 'NO_MATCH';
      if (topCandidate) {
        if (topCandidate.totalScore >= autoMatchThreshold) {
          status = 'AUTO_MATCH';
        } else if (topCandidate.totalScore >= confirmationThreshold) {
          status = 'CONFIRMATION_REQUIRED';
        }
      }

      // 6. Evaluate AUTO_MATCH precision & false auto-match rate
      if (status === 'AUTO_MATCH') {
        totalAutoMatches++;
        const expectedCase = EVALUATION_CASES.find((c) => c.cnrNumber === sample.expectedCnrNumber);

        if (!sample.isNoMatch && expectedCase && topCandidate.caseId === expectedCase.id) {
          correctAutoMatches++;
        } else {
          wrongAutoMatches++;
        }
      }
    }

    const totalSamples = samples.length;

    return {
      totalSamples,
      top1Accuracy: nonAmbiguousCount > 0 ? Number((correctTop1 / nonAmbiguousCount).toFixed(4)) : 1.0,
      top3Recall: Number((correctTop3 / nonNoMatchCount).toFixed(4)),
      autoMatchPrecision: totalAutoMatches > 0 ? Number((correctAutoMatches / totalAutoMatches).toFixed(4)) : 1.0,
      falseAutoMatchRate: totalAutoMatches > 0 ? Number((wrongAutoMatches / totalAutoMatches).toFixed(4)) : 0.0,
      automationRate: Number((totalAutoMatches / nonNoMatchCount).toFixed(4)),
      documentTaxonomyAccuracy: Number((correctTaxonomyCount / totalSamples).toFixed(4)),
      thresholds: {
        autoMatch: autoMatchThreshold,
        confirmation: confirmationThreshold,
      },
    };
  }
}

export const defaultBenchmarkService = new BenchmarkEvaluationService();
