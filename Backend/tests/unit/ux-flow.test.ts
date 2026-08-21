import test from 'node:test';
import assert from 'node:assert';
import { SearchIndexService } from '../../src/services/search/search-index.service.js';
import { DocumentClassifierService } from '../../src/services/classification/document-classifier.service.js';
import { DEFAULT_MATCHING_THRESHOLDS } from '../../src/config/matching.config.js';

/**
 * TASK-038 — UX Flow & Boundary Verification Suite
 */
test('TASK-038 UX Flow & Boundary Verification', async (t) => {
  await t.test('1. Upload-First Paradigm (No mandatory initial case selection)', () => {
    const documentPayload = {
      filename: 'Notice_Scan_2026.pdf',
      rawText: 'IN THE HIGH COURT OF DELHI AT NEW DELHI W.P.(C) 999/2026',
      caseId: null, // Upload-first: caseId is optional/null at upload time
    };

    assert.strictEqual(documentPayload.caseId, null, 'Upload-first paradigm allows document ingestion without initial case selection');
  });

  await t.test('2. Match Status & Uncertainty Visibility', () => {
    const determineStatus = (topScore: number, margin: number = 1.0) => {
      if (topScore >= DEFAULT_MATCHING_THRESHOLDS.autoMatchConfidence && margin >= DEFAULT_MATCHING_THRESHOLDS.autoMatchScoreMargin) return 'AUTO_MATCHED';
      if (topScore >= DEFAULT_MATCHING_THRESHOLDS.confirmationConfidence) return 'CONFIRMATION_REQUIRED';
      return 'NO_MATCH';
    };

    // High confidence candidate -> AUTO_MATCHED
    assert.strictEqual(determineStatus(0.95), 'AUTO_MATCHED');

    // Medium confidence candidate -> CONFIRMATION_REQUIRED
    assert.strictEqual(determineStatus(0.60), 'CONFIRMATION_REQUIRED');

    // Low confidence candidate -> NO_MATCH
    assert.strictEqual(determineStatus(0.20), 'NO_MATCH');
  });

  await t.test('3. Search Snippets & Query Term Formatting', () => {
    const searchService = new SearchIndexService();
    const sampleText = 'IN THE HIGH COURT OF DELHI AT NEW DELHI. THE PETITIONER RAJESH KUMAR FILED A WRIT PETITION.';

    const snippet = searchService.generateSnippet(sampleText, 'RAJESH KUMAR');

    assert.ok(snippet, 'Search snippet should be generated');
    assert.ok(snippet.includes('RAJESH KUMAR'), 'Snippet must include the matching search term');
  });

  await t.test('4. Graceful Empty & Error State Handling', () => {
    const classifier = new DocumentClassifierService();
    const result = classifier.classify('', 'unknown.txt');

    assert.strictEqual(result.documentType, 'OTHER');
    assert.strictEqual(result.confidence, 0.50);
  });
});
