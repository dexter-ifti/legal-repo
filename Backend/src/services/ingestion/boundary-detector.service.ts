import { INGESTION_CONFIG } from '../../config/ingestion.config.js';

export interface BoundarySignal {
  page: number;
  boundaryScore: number;
  signals: string[];
}

interface StrongPattern {
  name: string;
  weight: number;
  pattern: RegExp;
  /** Only match near the top of the page (first N lines). */
  topOnly?: boolean;
}

/**
 * Deterministic document-start patterns (spec §21-§23).
 * These are generalized legal-document headings — never sample-specific
 * page numbers.
 */
const STRONG_PATTERNS: StrongPattern[] = [
  { name: 'caveat heading', weight: 0.5, pattern: /\bCAVEAT\b/i, topOnly: true },
  { name: 'affidavit heading', weight: 0.45, pattern: /^\s*(?:COUNTER\s+|REJOINDER\s+|SUPPLEMENTARY\s+)?AFFIDAVIT\b/im, topOnly: true },
  { name: 'writ petition heading', weight: 0.5, pattern: /\bWRIT PETITION\b.*(?:NO\.?|U\/S|\(.*\))/i, topOnly: true },
  { name: 'application heading', weight: 0.4, pattern: /^\s*APPLICATION\s+(?:FOR\s+|UNDER\s+)/im, topOnly: true },
  { name: 'suit heading', weight: 0.5, pattern: /\bREGULAR SUIT NO\.?\s*\d+/i, topOnly: true },
  { name: 'vakalatnama', weight: 0.6, pattern: /^\s*VAKALATNAMA\b/im, topOnly: true },
  { name: 'verification section', weight: 0.35, pattern: /^\s*VERIFICATION\b/im, topOnly: true },
  { name: 'court fee receipt', weight: 0.6, pattern: /E-?\s*COURT FEE|E-STAMP\s+RECEIPT|COURT FEE RECEIPT/i, topOnly: true },
  { name: 'government letterhead', weight: 0.45, pattern: /^\s*GOVERNMENT OF\b/m, topOnly: true },
  { name: 'new court heading', weight: 0.4, pattern: /IN THE HON'?(?:BLE|OUR)\s+(?:HIGH )?COURT|IN THE COURT OF\s+[A-Z]/i, topOnly: true },
];

const SUPPORTING_SIGNALS: Array<{ name: string; weight: number; test: (text: string) => boolean }> = [
  { name: 'versus separator', weight: 0.2, test: (t) => /\bVERSUS\b|\bVS\.\s*[A-Z]/i.test(t) },
  { name: 'case number present', weight: 0.15, test: (t) => /\b(?:SUIT|CASE|APPLICATION|MISC\.?|WRIT)[A-Z\s.]*NO\.?\s*\d{1,6}/i.test(t) },
  { name: 'parties block', weight: 0.1, test: (t) => /\b(PETITIONER|RESPONDENT|PLAINTIFF|DEFENDANT|APPLICANT)S?:/i.test(t) },
  { name: 'annexure heading', weight: 0.2, test: (t) => /^\s*ANNEXURE\s+(?:NO\.?\s*)?[A-Z]?\.?\s*\d/im.test(t) },
];

/** Extracts the "top" portion of a page for top-only patterns. */
function topPortion(text: string, lineCount = 8): string {
  return text.split(/\r\n|\r|\n/).slice(0, lineCount).join('\n');
}

/**
 * Scores each page (after page 1) as a potential new-document start.
 * Multiple independent signals are required by weighting and thresholding —
 * a single match is not enough (spec §22).
 */
export function detectBoundaries(
  pageTexts: Map<number, string>,
  threshold = INGESTION_CONFIG.boundaryScoreThreshold
): BoundarySignal[] {
  const boundaries: BoundarySignal[] = [];
  const pageNumbers = [...pageTexts.keys()].sort((a, b) => a - b);

  for (const pageNumber of pageNumbers) {
    if (pageNumber === 1) continue;

    const text = pageTexts.get(pageNumber) || '';
    if (!text.trim()) continue;

    const top = topPortion(text);
    const signals: string[] = [];
    let score = 0;

    for (const pattern of STRONG_PATTERNS) {
      const target = pattern.topOnly ? top : text;
      if (pattern.pattern.test(target)) {
        score += pattern.weight;
        signals.push(pattern.name);
      }
    }

    for (const signal of SUPPORTING_SIGNALS) {
      if (signal.test(text)) {
        score += signal.weight;
        signals.push(signal.name);
      }
    }

    // Page numbering reset: strong supporting evidence when detectable
    const printed = extractStandalonePageNumber(text);
    const previousPrinted = extractStandalonePageNumber(pageTexts.get(pageNumber - 1) || '');
    if (printed !== null && previousPrinted !== null && printed < previousPrinted && printed <= 3) {
      score += 0.25;
      signals.push('page numbering reset');
    }

    if (score >= threshold) {
      boundaries.push({ page: pageNumber, boundaryScore: Number(score.toFixed(2)), signals });
    }
  }

  return boundaries;
}

function extractStandalonePageNumber(text: string): number | null {
  const lines = text.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of [...lines.slice(-2), ...lines.slice(0, 2)]) {
    const match = line.match(/^(\d{1,3})$/);
    if (match) return Number(match[1]);
  }
  return null;
}
