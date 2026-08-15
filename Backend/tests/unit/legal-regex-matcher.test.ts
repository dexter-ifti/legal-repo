import test from 'node:test';
import assert from 'node:assert';
import { LegalRegexMatcher } from '../../src/services/extraction/legal-regex-matcher.js';
import { MetadataExtractionService } from '../../src/services/extraction/metadata-extraction.service.js';

test('Legal Regex & Metadata Extraction Unit Tests', async (t) => {
  await t.test('extractCaseNumbers identifies Commercial Suit, Writ Petition, and SLP', () => {
    const text = `
      IN THE HIGH COURT OF JUDICATURE AT BOMBAY
      COMMERCIAL SUIT NO. 1024 OF 2026
      AND WRIT PETITION NO. 450/2025
      WITH SLP (C) NO. 99 OF 2024
    `;

    const matches = LegalRegexMatcher.extractCaseNumbers(text);
    assert.strictEqual(matches.length, 3);
    assert.ok(matches.some((m) => m.value.includes('1024')));
    assert.ok(matches.some((m) => m.value.includes('450')));
    assert.ok(matches.some((m) => m.value.includes('99')));
  });

  await t.test('extractCnrNumbers extracts 16-character Indian Court CNR number', () => {
    const text = 'Case Record Number for Maharashtra court is MHXX010012342025 in proceedings';
    const matches = LegalRegexMatcher.extractCnrNumbers(text);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].value, 'MHXX010012342025');
    assert.strictEqual(matches[0].confidence, 0.99);
  });

  await t.test('extractParties extracts Plaintiff and Defendant names', () => {
    const text = 'BETWEEN Mehta Enterprises PLAINTIFF AND Shah Logistics DEFENDANT';
    const { plaintiffs, defendants } = LegalRegexMatcher.extractParties(text);
    assert.strictEqual(plaintiffs.length, 1);
    assert.strictEqual(defendants.length, 1);
    assert.strictEqual(plaintiffs[0].value, 'Mehta Enterprises');
    assert.strictEqual(defendants[0].value, 'Shah Logistics');
  });

  await t.test('extractCourts extracts High Court and Supreme Court titles', () => {
    const text = 'IN THE HIGH COURT OF BOMBAY BEFORE THE HONBLE JUDGE';
    const matches = LegalRegexMatcher.extractCourts(text);
    assert.strictEqual(matches.length, 1);
    assert.ok(matches[0].value.includes('HIGH COURT OF BOMBAY'));
  });

  await t.test('extractDates parses standard slash and dash date formats', () => {
    const text = 'Order passed on 15/08/2026 and filed on 2026-08-15';
    const matches = LegalRegexMatcher.extractDates(text);
    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0].value, '15/08/2026');
    assert.strictEqual(matches[1].value, '2026-08-15');
  });

  await t.test('MetadataExtractionService gathers all fields cleanly', () => {
    const service = new MetadataExtractionService();
    const sampleText = `
      IN THE HIGH COURT OF BOMBAY
      COMMERCIAL SUIT NO. 1024 OF 2026
      BETWEEN Mehta Enterprises PLAINTIFF AND Shah Logistics DEFENDANT
      Dated 15/08/2026
    `;

    const result = service.extract(sampleText, 'DOCUMENT_TEXT');
    assert.ok(result.allFields.length >= 4);
    assert.ok(result.allFields.some((f) => f.fieldName === 'case_number'));
    assert.ok(result.allFields.some((f) => f.fieldName === 'court'));
    assert.ok(result.allFields.some((f) => f.fieldName === 'client_name'));
    assert.ok(result.allFields.some((f) => f.fieldName === 'opposing_party'));
  });
});
