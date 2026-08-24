import { prisma } from '../../db/client.js';
import { LegalRegexMatcher, RegexMatchResult } from './legal-regex-matcher.js';

export interface ExtractedField {
  fieldName: string;
  fieldValue: string;
  confidence: number;
  source: string;
}

export interface MetadataExtractionResult {
  caseNumbers: RegexMatchResult[];
  cnrNumbers: RegexMatchResult[];
  courts: RegexMatchResult[];
  parties: { plaintiffs: RegexMatchResult[]; defendants: RegexMatchResult[] };
  dates: RegexMatchResult[];
  allFields: ExtractedField[];
}

export class MetadataExtractionService {
  /**
   * Extracts legal entities from text using deterministic matchers.
   *
   * `dateAnchorText` (e.g. the authoritative first page) overrides date
   * sourcing: legal bundles accumulate incidental dates on receipts,
   * endorsements and orders deep inside the file, and a `filing_date` taken
   * from the last page is wrong. When the anchor yields dates, only those are
   * used; otherwise the FIRST date in reading order is used — later matches
   * are never promoted to filing_date.
   */
  extract(text: string, source: string = 'DOCUMENT_TEXT', dateAnchorText?: string): MetadataExtractionResult {
    const caseNumbers = LegalRegexMatcher.extractCaseNumbers(text);
    const cnrNumbers = LegalRegexMatcher.extractCnrNumbers(text);
    const courts = LegalRegexMatcher.extractCourts(text);
    const parties = LegalRegexMatcher.extractParties(text);

    const anchorDates = dateAnchorText ? LegalRegexMatcher.extractDates(dateAnchorText) : [];
    const dates = anchorDates.length > 0
      ? anchorDates
      : LegalRegexMatcher.extractDates(text).slice(0, 1);

    const allFields: ExtractedField[] = [];

    caseNumbers.forEach((cn) => {
      allFields.push({ fieldName: 'case_number', fieldValue: cn.value, confidence: cn.confidence, source });
    });

    cnrNumbers.forEach((cnr) => {
      allFields.push({ fieldName: 'cnr_number', fieldValue: cnr.value, confidence: cnr.confidence, source });
    });

    courts.forEach((c) => {
      allFields.push({ fieldName: 'court', fieldValue: c.value, confidence: c.confidence, source });
    });

    parties.plaintiffs.forEach((p) => {
      allFields.push({ fieldName: 'client_name', fieldValue: p.value, confidence: p.confidence, source });
    });

    parties.defendants.forEach((d) => {
      allFields.push({ fieldName: 'opposing_party', fieldValue: d.value, confidence: d.confidence, source });
    });

    dates.forEach((d) => {
      allFields.push({ fieldName: 'filing_date', fieldValue: d.value, confidence: d.confidence, source });
    });

    return {
      caseNumbers,
      cnrNumbers,
      courts,
      parties,
      dates,
      allFields,
    };
  }

  /**
   * Persists extracted metadata into database within a single transaction.
   * Idempotent: existing rows for the same field names are replaced so
   * pipeline retries never create duplicate signals.
   */
  async persistExtractedMetadata(
    documentId: string,
    text: string,
    source: string = 'DOCUMENT_TEXT',
    dateAnchorText?: string
  ) {
    const extracted = this.extract(text, source, dateAnchorText);

    if (extracted.allFields.length > 0) {
      const fieldNames = [...new Set(extracted.allFields.map((f) => f.fieldName))];

      await prisma.$transaction([
        prisma.documentMetadata.deleteMany({
          where: { documentId, fieldName: { in: fieldNames } },
        }),
        ...extracted.allFields.map((field) =>
          prisma.documentMetadata.create({
            data: {
              documentId,
              fieldName: field.fieldName,
              fieldValue: field.fieldValue,
              confidence: field.confidence,
              source: field.source,
            },
          })
        ),
      ]);
    }

    return extracted;
  }
}

export const defaultMetadataExtractionService = new MetadataExtractionService();
