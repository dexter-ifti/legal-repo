export interface OcrResult {
  text: string;
  confidence: number;
  pageCount: number;
  provider: string;
  rawResponse?: Record<string, unknown>;
  error?: string;
}

export interface IOcrProvider {
  extractText(pdfBuffer: Buffer): Promise<OcrResult>;
}
