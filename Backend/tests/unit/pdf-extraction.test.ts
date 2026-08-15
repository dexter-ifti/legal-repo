import test from 'node:test';
import assert from 'node:assert';
import { PdfTextExtractorService } from '../../src/services/text-extraction/pdf-text-extractor.service.js';

test('PdfTextExtractorService Unit Tests', async (t) => {
  const extractor = new PdfTextExtractorService();

  await t.test('extractText handles empty or null buffer gracefully', async () => {
    const res = await extractor.extractText(Buffer.from(''));
    assert.strictEqual(res.text, '');
    assert.strictEqual(res.pageCount, 0);
    assert.strictEqual(res.isScanned, true);
    assert.ok(res.error);
  });

  await t.test('extractText parses text content from PDF header buffer', async () => {
    const textPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nIN THE HIGH COURT OF DELHI AT NEW DELHI\nWRIT PETITION NO. 4520 OF 2026\n%%EOF'
    );

    const res = await extractor.extractText(textPdfBuffer);
    assert.strictEqual(res.pageCount, 1);
    assert.ok(res.text.includes('HIGH COURT OF DELHI') || res.text.includes('WRIT PETITION'));
  });
});
