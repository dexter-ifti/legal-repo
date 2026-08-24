import { pdfItemsToText } from './pdf-inspector.service.js';
import type { PdfInspectionResult } from './pdf-inspector.service.js';
import { isUsableNativeText } from './text-quality.service.js';
import { IOcrProvider } from '../ocr/ocr-provider.interface.js';

export interface ExtractedPage {
  pageNumber: number;
  rawText: string | null;
  extractionMethod: 'native' | 'ocr' | 'failed';
  ocrProvider?: string;
  ocrConfidence?: number;
  wordCount: number;
  charCount: number;
  language: string;
  error?: string;
}

/**
 * Detects printed page numbers in header/footer areas of a page (spec §33).
 * Looks for standalone 1-4 digit lines near the start or end of the text.
 */
export function detectPrintedPageNumber(text: string | null | undefined): number | null {
  if (!text) return null;

  const lines = text.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
  const candidates = [...lines.slice(0, 2), ...lines.slice(-2)];

  for (const line of candidates) {
    const match = line.match(/^(?:Page\s*)?(\d{1,3})$/i);
    if (match) {
      const value = Number(match[1]);
      if (value >= 1 && value <= 999) return value;
    }
  }

  return null;
}

/** Crude per-page language detection preserving source language (spec §32). */
export function detectLanguage(text: string): 'en' | 'hi' | 'mixed' {
  const devanagari = (text.match(/[\u0900-\u097F]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const total = devanagari + latin;

  if (total === 0) return 'en';
  const hiRatio = devanagari / total;

  if (hiRatio > 0.7) return 'hi';
  if (hiRatio > 0.15) return 'mixed';
  return 'en';
}

/**
 * Extracts every page of the document:
 *   - native text where usable (cheap)
 *   - Mistral OCR only for unusable pages, batched into contiguous ranges
 *
 * Native text is extracted once here; OCR batches are sliced with pdf-lib so
 * each Mistral call covers exactly its contiguous page range (spec §18/§34).
 */
export async function extractAllPages(
  buffer: Buffer,
  inspection: PdfInspectionResult,
  ocrProvider: IOcrProvider,
  options: { maxOcrPages?: number } = {}
): Promise<ExtractedPage[]> {
  // 1. Native extraction for all pages (cheap even for large docs — spec §35)
  const results = new Map<number, ExtractedPage>();

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false });
  const doc = await loadingTask.promise;

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    try {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const rawText = pdfItemsToText(content.items);
      page.cleanup();

      const usable = isUsableNativeText(rawText);
      results.set(pageNumber, {
        pageNumber,
        rawText: rawText || null,
        // Unusable native text must not be recorded as a successful native
        // extraction — provenance stays truthful for retry/evaluation.
        extractionMethod: usable ? 'native' : 'failed',
        wordCount: rawText ? rawText.split(/\s+/).filter(Boolean).length : 0,
        charCount: rawText.length,
        language: detectLanguage(rawText),
        ...(usable ? {} : { error: 'native text unusable' }),
      });
    } catch (err: unknown) {
      results.set(pageNumber, {
        pageNumber,
        rawText: null,
        extractionMethod: 'failed',
        wordCount: 0,
        charCount: 0,
        language: 'en',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  await doc.cleanup();
  void loadingTask.destroy();

  // 2. Identify pages needing OCR (unusable or failed native extraction)
  const needsOcr = [...results.values()]
    .filter((p) => !isUsableNativeText(p.rawText))
    .map((p) => p.pageNumber)
    .sort((a, b) => a - b);

  if (needsOcr.length === 0) {
    return [...results.values()].sort((a, b) => a.pageNumber - b.pageNumber);
  }

  // 3. Group into contiguous ranges and OCR them in batches (spec §18/§34)
  const ranges = groupContiguousRanges(needsOcr);
  const maxOcrPages = options.maxOcrPages ?? Infinity;
  let ocrBudget = maxOcrPages;

  for (const [from, to] of ranges) {
    for (let batchStart = from; batchStart <= to; batchStart += INGESTION_BATCH_SIZE) {
      if (ocrBudget <= 0) break;

      const batchEnd = Math.min(batchStart + INGESTION_BATCH_SIZE - 1, to);
      const sliced = await sliceRange(buffer, batchStart, batchEnd);

      try {
        // Tell the provider how many pages this batch contains so its
        // internal cost-bounding slicer keeps the WHOLE batch instead of
        // re-slicing it to the default 2-page prefix (spec §18).
        const ocrResult = await ocrProvider.extractText(sliced, {
          maxPages: batchEnd - batchStart + 1,
        });
        const pages = ocrResult.pages || [];

        pages.forEach((pageResult, index) => {
          const pageNumber = batchStart + index;
          if (pageNumber > batchEnd || ocrBudget <= 0) return;

          const text = stripInvalid(pageResult.text || '');
          if (!text.trim()) return;

          ocrBudget -= 1;
          const existing = results.get(pageNumber);
          results.set(pageNumber, {
            pageNumber,
            rawText: text,
            extractionMethod: 'ocr',
            ocrProvider: ocrResult.provider,
            ocrConfidence: pageResult.confidence ?? ocrResult.confidence,
            wordCount: text.split(/\s+/).filter(Boolean).length,
            charCount: text.length,
            language: detectLanguage(text),
            error: undefined,
            ...(existing?.error && !text ? { error: existing.error } : {}),
          });
        });

      } catch (err: unknown) {
        for (let pageNumber = batchStart; pageNumber <= Math.min(batchEnd, to); pageNumber++) {
          const existing = results.get(pageNumber);
          if (existing && existing.extractionMethod !== 'ocr') {
            existing.error = err instanceof Error ? err.message : String(err);
          }
        }
      }

      if (ocrBudget <= 0) break;
    }
  }

  return [...results.values()].sort((a, b) => a.pageNumber - b.pageNumber);
}

const INGESTION_BATCH_SIZE = 10;

function stripInvalid(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

async function sliceRange(buffer: Buffer, from: number, to: number): Promise<Buffer> {
  // Slice full range in one operation: keep pages [from..to].
  // Never return the original buffer here — an oversized buffer would be
  // mis-aligned with the batch's page-number mapping downstream.
  const pdfLib = await import('pdf-lib');
  const source = await pdfLib.PDFDocument.load(buffer, { ignoreEncryption: true });
  const target = await pdfLib.PDFDocument.create();
  const indices: number[] = [];
  for (let i = from - 1; i <= Math.min(to, source.getPageCount()) - 1; i++) {
    indices.push(i);
  }
  if (indices.length === 0) return buffer;
  const copied = await target.copyPages(source, indices);
  copied.forEach((page) => target.addPage(page));
  return Buffer.from(await target.save());
}

function groupContiguousRanges(pages: number[]): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const pageNumber of pages) {
    const last = ranges[ranges.length - 1];
    if (last && pageNumber === last[1] + 1) {
      last[1] = pageNumber;
    } else {
      ranges.push([pageNumber, pageNumber]);
    }
  }
  return ranges;
}
