const DEFAULT_OCR_MAX_PAGES = 2;
const MIN_OCR_MAX_PAGES = 1;
const MAX_OCR_MAX_PAGES = 10;

/**
 * Number of leading pages to OCR per document. Legal documents carry
 * their identifying metadata in the opening pages, so a small prefix
 * keeps OCR cost/latency bounded on large files.
 */
export function getOcrMaxPages(): number {
  const raw = process.env.OCR_MAX_PAGES;
  if (raw === undefined || raw === '') return DEFAULT_OCR_MAX_PAGES;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < MIN_OCR_MAX_PAGES || parsed > MAX_OCR_MAX_PAGES) {
    console.warn(
      `[ProcessingConfig] Invalid OCR_MAX_PAGES "${raw}" (expected integer ${MIN_OCR_MAX_PAGES}-${MAX_OCR_MAX_PAGES}); using default ${DEFAULT_OCR_MAX_PAGES}.`
    );
    return DEFAULT_OCR_MAX_PAGES;
  }

  return parsed;
}
