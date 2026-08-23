import { LegalRegexMatcher } from '../extraction/legal-regex-matcher.js';
import { INGESTION_CONFIG } from '../../config/ingestion.config.js';

/** Party/court/heading signals the spec requires us to look for (§10). */
const PARTY_LABELS = [
  'petitioner', 'petitioners', 'respondent', 'respondents', 'applicant', 'applicants',
  'opposite party', 'opposite parties', 'plaintiff', 'plaintiffs', 'defendant',
  'defendants', 'appellant', 'appellants',
] as const;

const COURT_HEADINGS = [
  /IN THE HON'?(?:BLE|OUR)\s+HIGH COURT/i,
  /IN THE HON'?(?:BLE|OUR)\s+(?:SUPREME )?COURT/i,
  /IN THE COURT OF\s+[A-Z]/i,
  /BEFORE\s+THE?\s+(?:HON'?(?:BLE|OUR)\s+)?(?:DISTRICT|SESSIONS|ADDITIONAL|CIVIL|CHIEF)/i,
  /BEFORE\s+THE?\s+HON'?(?:BLE|OUR)\s+COURT/i,
  /IN THE\s+(?:DISTRICT|SESSIONS|CIVIL)\s+COURT/i,
];

const CASE_TYPE_PATTERNS = [
  /\bWRIT\s+(?:PETITION|\(C\)|\(M\/S\)|-[A-Z]\b)/i,
  /\bREGULAR SUIT\b/i,
  /\bCIVIL SUIT\b/i,
  /\bCOMMERCIAL SUIT\b/i,
  /\bMISC(?:ELLANEOUS)?\s+(?:APPLICATION|APPEAL|CASE)\b/i,
  /\bCRIMINAL (?:APPEAL|REVISION|APPLICATION|MISC\.)\b/i,
  /\bFIRST APPEAL\b/i,
  /\bSECOND APPEAL\b/i,
  /\bEXECUTION APPLICATION\b/i,
  /\bCAVEAT\b/i,
  /\bAFFIDAVIT\b/i,
  /\bVAKALATNAMA\b/i,
  /\bREVISION PETITION\b/i,
  /\bTRANSFER (?:PETITION|APPLICATION)\b/i,
];

// Tolerant of OCR markdown prefixes like "# INDEX" or "**INDEX**"
const headingPattern = (keyword: string): RegExp =>
  new RegExp(`(?:^|\\n)[^\\w\\n]{0,8}\\s*${keyword}\\b`, 'i');

export const INDEX_HEADINGS = [
  headingPattern('INDEX'),
  headingPattern('TABLE OF CONTENTS'),
  headingPattern('LIST OF DOCUMENTS'),
  headingPattern('LIST OF ANNEXURES'),
  headingPattern('LIST OF ANNEXURE'),
  headingPattern('LIST OF ENCLOSURES'),
  headingPattern('DOCUMENT INDEX'),
  headingPattern('SCHEDULE OF DOCUMENTS'),
];

const VERSUS_PATTERN = /\bVERSUS\b|\bVS\.?\b/i;

export interface DiscoverySignals {
  document_type: string | null;
  bundle_detected: boolean;
  case_identity_detected: boolean;
  petitioner_detected: boolean;
  respondent_detected: boolean;
  index_detected: boolean;
  substantive_content_detected: boolean;
  additional_discovery_required: boolean;
}

export interface DiscoveryResult {
  signals: DiscoverySignals;
  /** Pages actually inspected during discovery (1-based, inclusive). */
  inspectedRange: { from: number; to: number };
  firstPageMetadata: Record<string, string>;
  indexEntries: Array<{ title: string; pageHint: number | null }>;
}

/**
 * Extracts structured legal metadata from a single page's text.
 * Deterministic-first: regex/label heuristics only — no LLM.
 */
export function extractFirstPageMetadata(pageText: string): Record<string, string> {
  const metadata: Record<string, string> = {};
  const lines = pageText.split(/\r\n|\r|\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // "Petitioner : Farooq Ali" / "Respondent No. 1 State of..."
    const labelMatch = line.match(/^([A-Z][A-Za-z .]{2,40}?)\s*(?:No\.?\s*\d+\s*)?[:\-–]\s*(.{2,120})$/);
    if (!labelMatch) continue;

    const label = labelMatch[1].toLowerCase().replace(/\s+/g, ' ').trim();
    const value = labelMatch[2].trim();

    if (PARTY_LABELS.some((p) => label === p || label.startsWith(p + ' no')) && value) {
      const canonical = canonicalPartyKey(label);
      metadata[canonical] = metadata[canonical] ? `${metadata[canonical]} | ${value}` : value;
      continue;
    }

    if ((label === 'court' || label === 'district' || label === 'police station' ||
         label === 'advocate' || label === 'category' || label === 'case number' ||
         label === 'case no' || label === 'case type') && value) {
      const key = label === 'case no' ? 'case_number'
        : label === 'case type' ? 'case_type'
        : label.replace(/\s+/g, '_');
      metadata[key] = metadata[key] ? `${metadata[key]} | ${value}` : value;
    }
  }

  // Court heading fallback
  if (!metadata.court) {
    for (const pattern of COURT_HEADINGS) {
      const match = pageText.match(pattern);
      if (match) {
        metadata.court_hint = match[0].trim();
        break;
      }
    }
  }

  return metadata;
}

function canonicalPartyKey(label: string): string {
  if (label.includes('petitioner')) return 'petitioners';
  if (label.includes('respondent')) return 'respondents';
  if (label.includes('applicant') || label.includes('opposite party')) return 'applicants';
  if (label.includes('plaintiff')) return 'plaintiffs';
  if (label.includes('defendant')) return 'defendants';
  return label.replace(/\s+/g, '_');
}

/** Detects an index/table-of-contents page and extracts its entries. */
export function detectIndexPage(pageText: string): { detected: boolean; entries: Array<{ title: string; pageHint: number | null }> } {
  let headerDetected = INDEX_HEADINGS.some((pattern) => pattern.test(pageText));

  // Entries: "1. Writ Petition ..... 2" or "Writ Petition .... 12"
  const entryPattern = /^\s*(?:\d{1,2}[.)]\s*)?(.{4,80}?)\s*[.·•\-—]{2,}\s*(\d{1,3})?\s*$/gm;
  const entries: Array<{ title: string; pageHint: number | null }> = [];

  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(pageText)) !== null) {
    const title = match[1].replace(/\s+/g, ' ').trim();
    if (title.length < 4) continue;
    entries.push({ title, pageHint: match[2] ? Number(match[2]) : null });
    if (entries.length >= 50) break;
  }

  // A dense dotted-leader list is itself evidence of an index even without a heading
  if (!headerDetected && entries.length >= 5) {
    headerDetected = true;
  }

  return { detected: headerDetected && entries.length > 0, entries };
}

/**
 * Runs structural discovery over provided page texts (spec §11-§15).
 * `pageTexts` maps 1-based page numbers to their extracted text (native or OCR).
 * The caller decides which batches of pages to feed based on the returned
 * `signals.additional_discovery_required` flag and INGESTION_CONFIG.discoveryBatches.
 */
export function runDiscovery(
  pageTexts: Map<number, string>
): DiscoveryResult {
  const pageNumbers = [...pageTexts.keys()].sort((a, b) => a - b);
  const combined = [...pageTexts.values()].join('\n\n');

  // First page gets special treatment (spec §10)
  const firstPageText = pageNumbers.length > 0 ? pageTexts.get(Math.min(...pageNumbers)) || '' : '';
  const firstPageMetadata = extractFirstPageMetadata(firstPageText);

  // Index detection across all discovered pages so far
  let indexDetected = false;
  const indexEntries: Array<{ title: string; pageHint: number | null }> = [];
  for (const pageNumber of pageNumbers) {
    const result = detectIndexPage(pageTexts.get(pageNumber) || '');
    if (result.detected && result.entries.length > indexEntries.length) {
      indexDetected = true;
      indexEntries.push(...result.entries);
    } else if (result.detected) {
      indexDetected = true;
    }
  }

  // Case identity via existing deterministic extractors
  const cnrNumbers = LegalRegexMatcher.extractCnrNumbers(combined);
  const caseNumbers = LegalRegexMatcher.extractCaseNumbers(combined);
  const caseIdentityDetected = cnrNumbers.length > 0 || caseNumbers.length > 0;

  // Parties
  const lower = combined.toLowerCase();
  const petitionerDetected = PARTY_LABELS.some(
    (p) => (p === 'petitioner' || p === 'applicant' || p === 'plaintiff') && lower.includes(p)
  );
  const respondentDetected = PARTY_LABELS.some(
    (p) => (p === 'respondent' || p === 'opposite party' || p === 'defendant') && lower.includes(p)
  );
  const versusDetected = VERSUS_PATTERN.test(combined);

  // Document type
  let documentType: string | null = null;
  for (const pattern of CASE_TYPE_PATTERNS) {
    const match = combined.match(pattern);
    if (match) {
      documentType = match[0].toUpperCase().replace(/\s+/g, ' ').trim();
      break;
    }
  }

  // Bundle indicators: several distinct strong document-start headings present
  const bundleHeadings = [
    /\bCAVEAT\b/i, /\bAFFIDAVIT\b/i, /\bWRIT PETITION\b/i, /\bVAKALATNAMA\b/i,
    /\bREGULAR SUIT\b/i, /\bE-?COURT FEE RECEIPT\b/i, /\bCOUNTER AFFIDAVIT\b/i,
    /\bREJOINDER\b/i, /\bstay application\b/i, /\bINTERIM (?:RELIEF|APPLICATION)\b/i,
  ];
  const distinctHeadingCount = new Set(
    bundleHeadings.filter((p) => p.test(combined)).map((p) => p.source)
  ).size;
  const bundleDetected = distinctHeadingCount >= 2 || (indexDetected && distinctHeadingCount >= 1);

  // Substantive content: any discovered page with meaningful body text
  const substantiveContentDetected = pageNumbers.some(
    (pageNumber) => (pageTexts.get(pageNumber) || '').split(/\s+/).length > 40
  );

  const signals: DiscoverySignals = {
    document_type: documentType,
    bundle_detected: bundleDetected,
    case_identity_detected: caseIdentityDetected,
    petitioner_detected: petitionerDetected,
    respondent_detected: respondentDetected || versusDetected,
    index_detected: indexDetected,
    substantive_content_detected: substantiveContentDetected,
    additional_discovery_required:
      !(caseIdentityDetected && (petitionerDetected || respondentDetected)) &&
      !(documentType && substantiveContentDetected),
  };

  const lastInspected = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 0;

  return {
    signals,
    inspectedRange: { from: pageNumbers.length > 0 ? Math.min(...pageNumbers) : 1, to: lastInspected },
    firstPageMetadata,
    indexEntries,
  };
}

/**
 * Computes the next discovery batch range given what has been inspected.
 * Returns null when discovery is exhausted (capped by config).
 */
export function nextDiscoveryBatch(inspectedUpTo: number, totalPages: number): [number, number] | null {
  for (const [from, to] of INGESTION_CONFIG.discoveryBatches) {
    if (to <= inspectedUpTo) continue;
    const cappedTo = Math.min(to, totalPages);
    // Clamp the batch start past what has already been inspected.
    const effectiveFrom = Math.max(from, inspectedUpTo + 1);
    if (effectiveFrom > cappedTo) continue;
    return [effectiveFrom, cappedTo];
  }

  // Config exhausted but the document is larger — extend in chunks sized
  // like the last configured batch. Stopping is signal-driven (spec §14):
  // runDiscovery decides whether more structural information is needed.
  const [lastFrom, lastTo] = INGESTION_CONFIG.discoveryBatches[INGESTION_CONFIG.discoveryBatches.length - 1];
  const chunkSize = lastTo - lastFrom + 1;
  const from = inspectedUpTo + 1;
  if (from > totalPages) {
    return null;
  }
  const to = Math.min(from + chunkSize - 1, totalPages);
  return [from, to];
}
