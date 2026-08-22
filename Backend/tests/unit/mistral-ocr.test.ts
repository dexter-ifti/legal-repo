import test from 'node:test';
import assert from 'node:assert';
import { PDFDocument } from 'pdf-lib';
import { MistralOcrProvider } from '../../src/services/ocr/ocr.service.js';

async function createMultiPagePdf(pageCount: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    doc.addPage([595, 842]);
  }
  return Buffer.from(await doc.save());
}

type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status?: number;
  text?: () => Promise<string>;
  json: () => Promise<unknown>;
}>;

test('MistralOcrProvider page-limited OCR', async (t) => {
  t.beforeEach(() => {
    process.env.MISTRAL_API_KEY = 'test-key';
  });
  t.after(() => {
    delete process.env.MISTRAL_API_KEY;
  });

  await t.test('sends only the first maxPages pages to the OCR API', async () => {
    const fivePagePdf = await createMultiPagePdf(5);
    let capturedBody = '';

    const fetchImpl: FetchLike = async (_url, init) => {
      capturedBody = init?.body || '';
      return {
        ok: true,
        json: async () => ({ pages: [{ markdown: 'page text' }] }),
      };
    };

    const provider = new MistralOcrProvider(
      'test-key',
      'https://api.mistral.ai/v1/ocr',
      async (_buffer, maxPages) => {
        // Simulate slicing using the same library the real slicer uses
        const source = await PDFDocument.load(fivePagePdf);
        const target = await PDFDocument.create();
        const pages = await target.copyPages(source, Array.from({ length: Math.min(maxPages, source.getPageCount()) }, (_, i) => i));
        pages.forEach((p) => target.addPage(p));
        return Buffer.from(await target.save());
      },
      fetchImpl as unknown as typeof fetch
    );

    const result = await provider.extractText(fivePagePdf, { maxPages: 2 });

    assert.strictEqual(result.provider, 'mistral-ocr');
    assert.strictEqual(result.text, 'page text');

    // Decode the base64 document sent to the API and verify page count
    const match = capturedBody.match(/data:application\/pdf;base64,([A-Za-z0-9+/=]+)/);
    assert.ok(match, 'Request must embed a base64 PDF document_url');
    const sentPdf = await PDFDocument.load(Buffer.from(match![1], 'base64'));
    assert.strictEqual(sentPdf.getPageCount(), 2);
  });

  await t.test('delegates to fallback provider when the API key is missing', async () => {
    delete process.env.MISTRAL_API_KEY;
    const provider = new MistralOcrProvider('');
    const result = await provider.extractText(await createMultiPagePdf(3), { maxPages: 2 });
    assert.strictEqual(result.provider, 'mock-ocr');
  });
});
