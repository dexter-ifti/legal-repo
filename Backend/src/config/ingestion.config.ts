/**
 * Ingestion pipeline configuration. All thresholds are server-side
 * configurable so they can be tuned against real legal PDFs without
 * code changes.
 */

const num = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const INGESTION_CONFIG = {
  /** Discovery pass page batches (progressive expansion). */
  discoveryBatches: [
    [1, 5],
    [6, 15],
    [16, 30],
    [31, 50],
    [51, 75],
  ] as Array<[number, number]>,

  nativeTextQuality: {
    minWords: num(process.env.NATIVE_MIN_WORDS, 12),
    minChars: num(process.env.NATIVE_MIN_CHARS, 60),
    minAlphabeticRatio: num(process.env.NATIVE_MIN_ALPHA_RATIO, 0.3),
  },

  /** Full-extraction batch size for large documents. */
  extractionBatchSize: num(process.env.EXTRACTION_BATCH_SIZE, 50),

  /** OCR batch size when OCR is required for a range of pages. */
  ocrBatchSize: num(process.env.OCR_BATCH_SIZE, 10),

  /** Page-boundary score above which a new segment starts. */
  boundaryScoreThreshold: num(process.env.BOUNDARY_SCORE_THRESHOLD, 0.6),

  /** Max segments sent to Mistral Small per document (cost control). */
  maxSegmentClassifications: num(process.env.MAX_SEGMENT_CLASSIFICATIONS, 12),

  /**
   * Hard cap on pages OCR'd per document (cost control).
   * 0 or unset = unlimited. Tests set this low to bound runtime/spend.
   */
  maxOcrPages: num(process.env.INGESTION_MAX_OCR_PAGES, 0),
} as const;
