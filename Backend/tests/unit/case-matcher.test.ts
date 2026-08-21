import test from 'node:test';
import assert from 'node:assert';
import {
  defaultCandidateGenerationService,
  normalizeIdentifier,
  normalizeCourtTokens,
} from '../../src/services/matching/candidate-generation.service.js';

test('normalizeIdentifier Unit Tests', () => {
  assert.strictEqual(normalizeIdentifier('W.P. NO. 1024 / 2026'), 'WPNO10242026');
  assert.strictEqual(normalizeIdentifier('MHXX010012342025'), 'MHXX010012342025');
  assert.strictEqual(normalizeIdentifier(null), '');
  assert.strictEqual(normalizeIdentifier(undefined), '');
});

test('CandidateGenerationService Unit Tests', async (t) => {
  await t.test('returns empty array when signals are empty or no cases match', async () => {
    const candidates = await defaultCandidateGenerationService.generateCandidates('non-existent-org', {
      caseNumber: 'WP 9999/9999',
    });
    assert.strictEqual(candidates.length, 0);
  });

  await t.test('scores exact CNR and Case Number matches with high confidence (>0.90)', () => {
    const sampleCases = [
      {
        id: 'c1',
        title: 'Mehta Injunction',
        caseNumber: 'COMMERCIAL SUIT NO. 1024 OF 2026',
        cnrNumber: 'MHXX010012342025',
        clientName: 'Mehta Enterprises',
        opposingParty: 'Shah Logistics',
        court: 'High Court of Bombay',
      },
      {
        id: 'c2',
        title: 'Patel Petition',
        caseNumber: 'W.P. 5050 OF 2025',
        cnrNumber: 'MHXX010099992025',
        clientName: 'Patel Developers',
        court: 'High Court of Bombay',
      },
    ];

    const result = defaultCandidateGenerationService.scoreCandidateCases(sampleCases, {
      caseNumber: 'COMMERCIAL SUIT NO. 1024 OF 2026',
      cnrNumber: 'MHXX010012342025',
      clientName: 'Mehta Enterprises',
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].caseId, 'c1');
    assert.ok(result[0].totalScore >= 0.90);
    assert.ok(result[0].signals.some((s) => s.type === 'EXACT_CNR'));
    assert.ok(result[0].signals.some((s) => s.type === 'EXACT_CASE_NUMBER'));
  });

  await t.test('scores party name and court matches with medium confidence (0.40 - 0.70)', () => {
    const sampleCases = [
      {
        id: 'c2',
        title: 'Patel Petition',
        caseNumber: 'W.P. 5050 OF 2025',
        cnrNumber: 'MHXX010099992025',
        clientName: 'Patel Developers',
        court: 'High Court of Bombay',
      },
    ];

    const result = defaultCandidateGenerationService.scoreCandidateCases(sampleCases, {
      clientName: 'Patel Developers',
      court: 'High Court of Bombay',
    });

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].caseId, 'c2');
    assert.ok(result[0].totalScore >= 0.40 && result[0].totalScore <= 0.70);
  });

  await t.test('matches court names across naming conventions (Judicature/filler words)', () => {
    const sampleCases = [
      {
        id: 'c2',
        title: 'Patel Petition',
        caseNumber: 'W.P. 5050 OF 2025',
        cnrNumber: 'MHXX010099992025',
        clientName: 'Patel Developers',
        court: 'High Court of Bombay',
      },
    ];

    const result = defaultCandidateGenerationService.scoreCandidateCases(sampleCases, {
      clientName: 'Patel Developers',
      court: 'high court of judicature at bombay',
    });

    assert.strictEqual(result.length, 1);
    assert.ok(result[0].signals.some((s) => s.type === 'COURT'));
  });

  await t.test('does not match different courts', () => {
    const sampleCases = [
      {
        id: 'c3',
        title: 'Delhi Matter',
        caseNumber: 'W.P. 1 OF 2025',
        court: 'High Court of Delhi',
      },
    ];

    const result = defaultCandidateGenerationService.scoreCandidateCases(sampleCases, {
      court: 'High Court of Bombay',
    });

    assert.strictEqual(result.length, 0);
  });
});

test('normalizeCourtTokens Unit Tests', () => {
  assert.deepStrictEqual(
    normalizeCourtTokens('High Court of Judicature at Bombay'),
    new Set(['high', 'court', 'bombay'])
  );
  assert.deepStrictEqual(normalizeCourtTokens(null), new Set());
});
