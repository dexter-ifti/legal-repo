import { computeTextStats, isUsableNativeText, TextQualityStats } from './text-quality.service.js';

export type ContentKind = 'native_text' | 'scanned' | 'mixed' | 'unknown';

export interface PageInspection {
  pageNumber: number;
  charCount: number;
  wordCount: number;
  lineCount: number;
  alphabeticRatio: number;
  replacementCharCount: number;
  garbageRatio: number;
  usableNativeText: boolean;
  width?: number;
  height?: number;
}

export interface PdfInspectionResult {
  pageCount: number;
  fileSize: number;
  kind: ContentKind;
  nativeTextAvailable: boolean;
  pages: PageInspection[];
}

type TextItem = { str?: string; hasEOL?: boolean };

/**
 * Converts pdf.js text-content items into line-preserving text.
 * Honors hasEOL so headings/footers remain on their own lines —
 * critical for boundary detection and printed-page-number extraction.
 */
export function pdfItemsToText(items: Array<unknown>): string {
  const parts: string[] = [];
  for (const item of items as TextItem[]) {
    if (typeof item.str !== 'string') continue;
    parts.push(item.str);
    if (item.hasEOL) {
      parts.push('\n');
    }
  }
  return parts.join('').replace(/[ \t]+\n/g, '\n').trim();
}

/**
 * Loads a PDF with pdf.js and produces per-page technical statistics.
 * This is the cheap pass that decides where OCR is needed — it never
 * classifies on its own (spec §9).
 */
export async function inspectPdf(
  buffer: Buffer,
  evaluate: (text: string | null | undefined) => boolean = isUsableNativeText
): Promise<PdfInspectionResult> {
  const pdfjs = await loadPdfJs();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    // Never fetch external resources while inspecting untrusted PDFs.
    useSystemFonts: false,
  });
  const doc = await loadingTask.promise;

  const pages: PageInspection[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = pdfItemsToText(content.items);

    const stats: TextQualityStats = computeTextStats(text);
    const viewport = page.getViewport({ scale: 1 });

    pages.push({
      pageNumber,
      charCount: stats.charCount,
      wordCount: stats.wordCount,
      lineCount: text ? text.split(/\r\n|\r|\n/).length : 0,
      alphabeticRatio: Number(stats.alphabeticRatio.toFixed(4)),
      replacementCharCount: stats.replacementCharCount,
      garbageRatio: Number(stats.garbageRatio.toFixed(4)),
      usableNativeText: evaluate(text),
      width: Math.round(viewport.width),
      height: Math.round(viewport.height),
    });

    page.cleanup();
  }

  await doc.cleanup();
  await loadingTask.destroy();

  const usablePages = pages.filter((p) => p.usableNativeText).length;
  let kind: ContentKind = 'unknown';

  if (pages.length === 0) {
    kind = 'unknown';
  } else if (usablePages === 0) {
    kind = 'scanned';
  } else if (usablePages === pages.length) {
    kind = 'native_text';
  } else if (usablePages / pages.length >= 0.3) {
    // Majority-native documents are treated as mixed only when a meaningful
    // minority of pages genuinely need OCR.
    kind = usablePages === pages.length - 1 && pages.length <= 2 ? 'mixed' : 'mixed';
  } else {
    kind = 'mixed';
  }

  return {
    pageCount: pages.length,
    fileSize: buffer.length,
    kind,
    nativeTextAvailable: usablePages > 0,
    pages,
  };
}

let pdfJsModule: typeof import('pdfjs-dist/legacy/build/pdf.mjs') | null = null;

async function loadPdfJs() {
  if (!pdfJsModule) {
    pdfJsModule = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfJsModule;
}
