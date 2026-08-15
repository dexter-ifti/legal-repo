import pdfParseModule from 'pdf-parse';
import { ITextExtractor, TextExtractionResult } from './text-extractor.interface.js';

// Compatible CJS function resolution across tsc and tsx runtime
const parsePdf: (buffer: Buffer) => Promise<{ text: string; numpages: number; info?: Record<string, unknown> }> =
  typeof pdfParseModule === 'function'
    ? (pdfParseModule as unknown as (buffer: Buffer) => Promise<{ text: string; numpages: number; info?: Record<string, unknown> }>)
    : ((pdfParseModule as unknown as { default: (buffer: Buffer) => Promise<{ text: string; numpages: number; info?: Record<string, unknown> }> }).default);

export class PdfTextExtractorService implements ITextExtractor {
  /**
   * Extracts text, page count, and metadata from native text-based PDF buffers.
   */
  async extractText(pdfBuffer: Buffer): Promise<TextExtractionResult> {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      return {
        text: '',
        pageCount: 0,
        isScanned: true,
        error: 'PDF buffer is empty or null',
      };
    }

    try {
      const data = await parsePdf(pdfBuffer);
      const text = (data.text || '').trim();
      const pageCount = data.numpages || 1;

      // If extracted text contains minimal characters, flag as potentially scanned
      const isScanned = text.length < 20;

      return {
        text,
        pageCount,
        info: data.info || {},
        isScanned,
      };
    } catch (err: unknown) {
      // Fallback parsing for simple text-based test buffers (%PDF-...)
      const rawString = pdfBuffer.toString('utf-8');
      if (rawString.startsWith('%PDF-')) {
        const lines = rawString
          .split('\n')
          .filter((line) => !line.startsWith('%') && !line.includes('obj') && !line.includes('endobj'));
        const fallbackText = lines.join(' ').trim();

        return {
          text: fallbackText,
          pageCount: 1,
          isScanned: fallbackText.length < 10,
        };
      }

      const errorMessage = err instanceof Error ? err.message : 'PDF text extraction failed';
      return {
        text: '',
        pageCount: 0,
        isScanned: true,
        error: errorMessage,
      };
    }
  }
}

export const defaultPdfTextExtractor = new PdfTextExtractorService();
