import { IOcrProvider, OcrResult, OcrOptions } from './ocr-provider.interface.js';
import { sliceFirstPages } from './pdf-page-slicer.service.js';
import { stripInvalidTextChars } from '../../utils/text-sanitizer.js';

/**
 * Mock OCR provider for deterministic local testing and fallback.
 */
export class MockOcrProvider implements IOcrProvider {
  async extractText(pdfBuffer: Buffer, _options?: OcrOptions): Promise<OcrResult> {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return {
        text: '',
        confidence: 0,
        pageCount: 0,
        provider: 'mock-ocr',
        error: 'Empty PDF buffer provided to OCR',
      };
    }

    const raw = pdfBuffer.toString('utf-8');
    // If raw buffer has text content, return parsed text
    if (raw.includes('HIGH COURT') || raw.includes('SUIT') || raw.includes('ORDER')) {
      const cleanText = stripInvalidTextChars(
        raw
          .split('\n')
          .filter((line) => !line.startsWith('%') && !line.includes('obj'))
          .join(' ')
          .trim()
      );
      return {
        text: cleanText || 'HIGH COURT OF JUDICATURE AT BOMBAY COMMERCIAL SUIT NO. 1024 OF 2026',
        confidence: 0.95,
        pageCount: 1,
        provider: 'mock-ocr',
      };
    }

    return {
      text: 'IN THE HIGH COURT OF JUDICATURE AT BOMBAY\nCOMMERCIAL SUIT NO. 450 OF 2025\nBETWEEN: Mehta Enterprises PLAINTIFF AND Shah Logistics RESPONDENT\nORDER DATED 15/08/2026',
      confidence: 0.90,
      pageCount: 1,
      provider: 'mock-ocr',
    };
  }
}

/**
 * Mistral OCR Provider for processing scanned PDFs via Mistral's OCR service.
 */
export class MistralOcrProvider implements IOcrProvider {
  private apiKey: string;
  private baseUrl: string;
  private fallbackProvider: IOcrProvider;
  private readonly slicer: (buffer: Buffer, maxPages: number) => Promise<Buffer>;
  private readonly fetchImpl: typeof fetch;

  constructor(
    apiKey?: string,
    baseUrl: string = 'https://api.mistral.ai/v1/ocr',
    slicer: (buffer: Buffer, maxPages: number) => Promise<Buffer> = sliceFirstPages,
    fetchImpl?: typeof fetch
  ) {
    this.apiKey = apiKey || process.env.MISTRAL_API_KEY || '';
    this.baseUrl = baseUrl;
    this.fallbackProvider = new MockOcrProvider();
    this.slicer = slicer;
    this.fetchImpl = fetchImpl || fetch.bind(globalThis);
  }

  async extractText(pdfBuffer: Buffer, options?: OcrOptions): Promise<OcrResult> {
    if (!this.apiKey) {
      // When API key is missing, delegate safely to mock OCR fallback
      return this.fallbackProvider.extractText(pdfBuffer, options);
    }

    try {
      // Only send the leading pages to bound OCR cost on large files.
      const maxPages = options?.maxPages ?? DEFAULT_MAX_PAGES;
      const boundedBuffer = await this.slicer(pdfBuffer, maxPages);
      const base64Pdf = boundedBuffer.toString('base64');
      const response = await this.fetchImpl(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'mistral-ocr-latest',
          document: {
            type: 'document_url',
            document_url: `data:application/pdf;base64,${base64Pdf}`,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Mistral OCR API returned ${response.status}: ${errText}`);
      }

      const data = (await response.json()) as {
        pages?: Array<{ markdown?: string; text?: string }>;
      };

      const extractedText = stripInvalidTextChars(
        data.pages?.map((p) => p.markdown || p.text || '').join('\n\n') || ''
      );

      // Page-level breakdown preserves provenance for the ingestion pipeline.
      const pages = (data.pages || []).map((p, index) => ({
        pageNumber: index + 1,
        text: stripInvalidTextChars(p.markdown || p.text || ''),
        confidence: 0.98,
      }));
      const pageCount = data.pages?.length || 1;

      return {
        text: extractedText,
        confidence: 0.98,
        pageCount,
        provider: 'mistral-ocr',
        pages: pages.length > 0 ? pages : undefined,
        rawResponse: data as unknown as Record<string, unknown>,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Mistral OCR call failed';
      // Never substitute fabricated placeholder text for a real legal
      // document (spec §7: AI failure must never corrupt business state).
      // Return an explicit error result so callers can mark the affected
      // pages failed and retry them independently.
      return {
        text: '',
        confidence: 0,
        pageCount: 0,
        provider: 'mistral-ocr',
        error: `Mistral OCR Error (${errorMsg})`,
      };
    }
  }
}

const DEFAULT_MAX_PAGES = 2;

/**
 * Factory function to retrieve active OCR provider based on configuration.
 * Real OCR is never used in test mode unless FORCE_REAL_OCR=true is
 * explicitly set (e.g., fixture regression tests that require genuine OCR).
 */
export function getOcrProvider(): IOcrProvider {
  const forceRealInTest = process.env.FORCE_REAL_OCR === 'true' && !!process.env.MISTRAL_API_KEY;
  if (process.env.MISTRAL_API_KEY && (process.env.NODE_ENV !== 'test' || forceRealInTest)) {
    return new MistralOcrProvider();
  }
  return new MockOcrProvider();
}
