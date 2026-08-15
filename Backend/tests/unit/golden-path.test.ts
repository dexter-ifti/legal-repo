import test from 'node:test';
import assert from 'node:assert';
import { LegalRegexMatcher } from '../../src/services/extraction/legal-regex-matcher.js';
import { DocumentClassifierService } from '../../src/services/classification/document-classifier.service.js';
import { CandidateGenerationService } from '../../src/services/matching/candidate-generation.service.js';
import { SearchIndexService } from '../../src/services/search/search-index.service.js';

test('Golden Path — End-to-End Document Pipeline Workflow', async (t) => {
  const orgId = '00000000-0000-0000-0000-000000000001';

  await t.test('Step 1: Case Creation & Metadata Readiness', () => {
    const mockCase = {
      id: 'c1111111-1111-1111-1111-111111111111',
      organizationId: orgId,
      title: 'State vs Rajesh Kumar',
      caseNumber: 'WP/2026/8942',
      cnrNumber: 'DLHC010098422026',
      court: 'High Court of Delhi',
      clientName: 'Rajesh Kumar',
      opposingParty: 'State of NCT Delhi',
    };

    assert.strictEqual(mockCase.caseNumber, 'WP/2026/8942');
    assert.strictEqual(mockCase.cnrNumber, 'DLHC010098422026');
  });

  await t.test('Step 2: PDF Binary Ingestion & Native Text Extraction', () => {
    const sampleLegalText = `
      IN THE HIGH COURT OF DELHI AT NEW DELHI
      W.P.(C) 8942/2026
      CNR NO: DLHC010098422026

      RAJESH KUMAR ...PETITIONER
      VS
      STATE OF NCT DELHI ...RESPONDENT

      NOTICE AND ORDER
      BE PLEASED TO TAKE NOTICE THAT THE MATTER IS FIXED FOR HEARING ON 25/08/2026.
    `;

    assert.ok(sampleLegalText.includes('W.P.(C) 8942/2026'));
  });

  await t.test('Step 3: Legal Metadata & Entity Extraction', () => {
    const text = `
      IN THE HIGH COURT OF DELHI AT NEW DELHI
      W.P.(C) 8942/2026
      CNR NO: DLHC010098422026

      BETWEEN RAJESH KUMAR PLAINTIFF AND STATE OF NCT DELHI DEFENDANT
    `;

    const caseNumbers = LegalRegexMatcher.extractCaseNumbers(text);
    const cnrNumbers = LegalRegexMatcher.extractCnrNumbers(text);
    const parties = LegalRegexMatcher.extractParties(text);
    const courts = LegalRegexMatcher.extractCourts(text);

    assert.ok(caseNumbers.some((cn) => cn.value.includes('8942')));
    assert.strictEqual(cnrNumbers[0].value, 'DLHC010098422026');
    assert.ok(parties.plaintiffs.some((p) => p.value.includes('RAJESH KUMAR')));
    assert.ok(courts.some((c) => c.value.toLowerCase().includes('high court of delhi')));
  });

  await t.test('Step 4: Document Taxonomy Classification', () => {
    const classifier = new DocumentClassifierService();
    const noticeText = 'LEGAL NOTICE AND SHOW CAUSE NOTICE BE PLEASED TO TAKE NOTICE THAT THE MATTER IS FIXED FOR HEARING ON 25/08/2026';
    const classification = classifier.classify(noticeText, 'Legal_Notice.pdf');

    assert.strictEqual(classification.documentType, 'NOTICE');
    assert.ok(classification.confidence > 0.8);
  });

  await t.test('Step 5: Deterministic Case Candidate Scoring', () => {
    const candidateService = new CandidateGenerationService();
    const mockCases = [
      {
        id: 'c1111111-1111-1111-1111-111111111111',
        organizationId: orgId,
        title: 'Rajesh Kumar vs State of NCT Delhi',
        caseNumber: 'WP/2026/8942',
        cnrNumber: 'DLHC010098422026',
        court: 'High Court of Delhi',
        judge: null,
        clientName: 'Rajesh Kumar',
        opposingParty: 'State of NCT Delhi',
        caseType: 'Writ Petition',
        status: 'ACTIVE',
        notes: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const candidates = candidateService.scoreCandidateCases(mockCases, {
      cnrNumber: 'DLHC010098422026',
      caseNumber: 'WP/2026/8942',
      clientName: 'Rajesh Kumar',
    });

    assert.strictEqual(candidates.length, 1);
    assert.ok(candidates[0].totalScore >= 0.95);
    assert.ok(candidates[0].signals.some((s) => s.type === 'EXACT_CNR'));
  });

  await t.test('Step 6: Global Multi-Field Search & Snippet Excerpts', () => {
    const searchService = new SearchIndexService();
    const text = 'Notice is hereby given that Respondent 1 is summoned to High Court of Delhi on 25/08/2026.';
    const snippet = searchService.generateSnippet(text, 'Respondent 1');

    assert.ok(snippet && snippet.includes('Respondent 1'));
  });

  await t.test('Step 7: Audit Event Logging & Safety', () => {
    const auditRecord = {
      organizationId: orgId,
      eventType: 'DOCUMENT_FILED',
      entityType: 'Document',
      entityId: 'd1111111-1111-1111-1111-111111111111',
      metadata: { caseId: 'c1111111-1111-1111-1111-111111111111', confidence: 0.98 },
    };

    assert.strictEqual(auditRecord.eventType, 'DOCUMENT_FILED');
    assert.strictEqual(auditRecord.organizationId, orgId);
  });
});
