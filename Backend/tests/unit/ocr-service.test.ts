import test from 'node:test';
import assert from 'node:assert';
import { MockOcrProvider, MistralOcrProvider, getOcrProvider } from '../../src/services/ocr/ocr.service.js';

test('OCR Service Abstraction Unit Tests', async (t) => {
  await t.test('MockOcrProvider handles empty buffer gracefully', async () => {
    const provider = new MockOcrProvider();
    const result = await provider.extractText(Buffer.from(''));
    assert.strictEqual(result.confidence, 0);
    assert.ok(result.error?.includes('Empty PDF buffer'));
  });

  await t.test('MockOcrProvider extracts fallback text from valid PDF buffer', async () => {
    const provider = new MockOcrProvider();
    const pdfBuffer = Buffer.from('%PDF-1.4 HIGH COURT OF BOMBAY COMMERCIAL SUIT NO. 1024 OF 2026');
    const result = await provider.extractText(pdfBuffer);
    assert.strictEqual(result.provider, 'mock-ocr');
    assert.ok(result.confidence > 0.8);
    assert.ok(result.text.includes('HIGH COURT') || result.text.includes('COMMERCIAL SUIT'));
  });

  await t.test('MistralOcrProvider safely uses fallback when API key is unconfigured or in test environment', async () => {
    const provider = new MistralOcrProvider();
    const pdfBuffer = Buffer.from('%PDF-1.4 HIGH COURT OF BOMBAY');
    const result = await provider.extractText(pdfBuffer);
    assert.ok(result.text.length > 0);
    assert.ok(result.confidence > 0.5);
  });

  await t.test('getOcrProvider factory returns valid provider instance', () => {
    const provider = getOcrProvider();
    assert.ok(provider);
    assert.strictEqual(typeof provider.extractText, 'function');
  });
});
