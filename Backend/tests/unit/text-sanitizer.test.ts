import test from 'node:test';
import assert from 'node:assert';
import { stripInvalidTextChars } from '../../src/utils/text-sanitizer.js';
import { defaultPdfTextExtractor } from '../../src/services/text-extraction/pdf-text-extractor.service.js';

test('stripInvalidTextChars Unit Tests', () => {
  // NUL bytes are the PostgreSQL TEXT killer (error 22021)
  assert.strictEqual(stripInvalidTextChars('IN THE HIGH\u0000 COURT OF BOMBAY'), 'IN THE HIGH COURT OF BOMBAY');
  assert.strictEqual(stripInvalidTextChars('\u0000\u0000'), '');

  // Preserves meaningful whitespace
  assert.strictEqual(stripInvalidTextChars('line one\nline two\ttabbed\r\nend'), 'line one\nline two\ttabbed\r\nend');

  // Strips other control characters but keeps normal printable text intact
  assert.strictEqual(stripInvalidTextChars('a\u0007b\u001Bc'), 'abc');
});

test('PDF text extraction sanitizes binary control characters', async () => {
  const bufferWithNulls = Buffer.from(
    '%PDF-1.4\nIN THE HIGH COURT OF JUDICATURE AT BOMBAY\u0000\nCOMMERCIAL SUIT NO. 1024 OF 2026\u0001',
    'binary'
  );

  const result = await defaultPdfTextExtractor.extractText(bufferWithNulls);
  assert.ok(result.text.length > 0);
  assert.ok(!result.text.includes('\u0000'), 'extracted text must not contain NUL bytes');
  // eslint-disable-next-line no-control-regex
  assert.ok(!/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/.test(result.text), 'extracted text must not contain control characters');
});
