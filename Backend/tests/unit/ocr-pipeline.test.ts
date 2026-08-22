import test from 'node:test';
import assert from 'node:assert';
import { PDFDocument } from 'pdf-lib';
import { sliceFirstPages } from '../../src/services/ocr/pdf-page-slicer.service.js';
import { getOcrMaxPages } from '../../src/config/processing.config.js';

async function createMultiPagePdf(pageCount: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([595, 842]); // A4
  }
  return Buffer.from(await doc.save());
}

test('sliceFirstPages Unit Tests', async (t) => {
  t.beforeEach(() => {
    delete process.env.OCR_MAX_PAGES;
  });

  await t.test('slices a large PDF to the first N pages', async () => {
    const fivePagePdf = await createMultiPagePdf(5);
    const sliced = await sliceFirstPages(fivePagePdf, 2);

    const parsed = await PDFDocument.load(sliced);
    assert.strictEqual(parsed.getPageCount(), 2);
  });

  await t.test('returns original buffer when document has fewer pages than the limit', async () => {
    const onePagePdf = await createMultiPagePdf(1);
    const sliced = await sliceFirstPages(onePagePdf, 2);

    assert.strictEqual(sliced, onePagePdf);
  });

  await t.test('returns original buffer unchanged on invalid input', async () => {
    const pdf = await createMultiPagePdf(3);
    const empty = Buffer.alloc(0);
    assert.strictEqual(await sliceFirstPages(pdf, 0), pdf);
    assert.strictEqual(await sliceFirstPages(empty, 2), empty);
  });
});

test('getOcrMaxPages Config Tests', async (t) => {
  t.beforeEach(() => {
    delete process.env.OCR_MAX_PAGES;
  });

  await t.test('defaults to 2 pages', () => {
    assert.strictEqual(getOcrMaxPages(), 2);
  });

  await t.test('reads valid override', () => {
    process.env.OCR_MAX_PAGES = '5';
    assert.strictEqual(getOcrMaxPages(), 5);
  });

  await t.test('falls back to default on invalid values', () => {
    process.env.OCR_MAX_PAGES = '0';
    assert.strictEqual(getOcrMaxPages(), 2);
    process.env.OCR_MAX_PAGES = '99';
    assert.strictEqual(getOcrMaxPages(), 2);
    process.env.OCR_MAX_PAGES = 'two';
    assert.strictEqual(getOcrMaxPages(), 2);
  });
});
