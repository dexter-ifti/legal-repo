export interface TextExtractionResult {
  text: string;
  pageCount: number;
  info?: Record<string, unknown>;
  isScanned?: boolean;
  error?: string;
}

export interface ITextExtractor {
  extractText(pdfBuffer: Buffer): Promise<TextExtractionResult>;
}
