export interface OcrOptions {
  /**
   * Limit OCR to the first N pages of the document. Legal documents
   * carry their identifying metadata (court, case number, parties) in
   * the opening pages, so scanning a small prefix keeps cost and
   * latency bounded on large files.
   */
  maxPages?: number;
}

export interface OcrResult {
  text: string;
  confidence: number;
  pageCount: number;
  provider: string;
  rawResponse?: Record<string, unknown>;
  error?: string;
}

export interface IOcrProvider {
  extractText(pdfBuffer: Buffer, options?: OcrOptions): Promise<OcrResult>;
}
