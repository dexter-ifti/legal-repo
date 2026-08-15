import test from 'node:test';
import assert from 'node:assert';
import { DocumentClassifierService } from '../../src/services/classification/document-classifier.service.js';

test('Legal Document Classifier Unit Tests', async (t) => {
  const classifier = new DocumentClassifierService();

  await t.test('classifies NOTICE correctly', () => {
    const text = 'COMMERCIAL SUIT NOTICE OF MOTION BEFORE THE HIGH COURT OF BOMBAY';
    const result = classifier.classify(text, 'Commercial_Suit_Notice.pdf');
    assert.strictEqual(result.documentType, 'NOTICE');
    assert.ok(result.confidence >= 0.90);
  });

  await t.test('classifies COURT_ORDER correctly', () => {
    const text = 'BEFORE THE HONBLE HIGH COURT. IT IS ORDERED THAT INTERIM INJUNCTION BE GRANTED. CORAM: HONBLE JUSTICES.';
    const result = classifier.classify(text);
    assert.strictEqual(result.documentType, 'COURT_ORDER');
    assert.ok(result.confidence >= 0.95);
  });

  await t.test('classifies AFFIDAVIT correctly', () => {
    const text = 'IN THE HIGH COURT. AFFIDAVIT OF SERVICE. I SOLEMNLY AFFIRM THAT DEPONENT HAS SERVED NOTICE.';
    const result = classifier.classify(text);
    assert.strictEqual(result.documentType, 'AFFIDAVIT');
    assert.ok(result.confidence >= 0.95);
  });

  await t.test('classifies VAKALATNAMA correctly', () => {
    const text = 'VAKALATNAMA AND MEMO OF APPEARANCE AUTHORIZATION OF ADVOCATE';
    const result = classifier.classify(text);
    assert.strictEqual(result.documentType, 'VAKALATNAMA');
    assert.strictEqual(result.confidence, 0.99);
  });

  await t.test('returns OTHER for generic non-matching text', () => {
    const text = 'Random generic note without legal headers or keywords.';
    const result = classifier.classify(text);
    assert.strictEqual(result.documentType, 'OTHER');
    assert.strictEqual(result.confidence, 0.5);
  });
});
