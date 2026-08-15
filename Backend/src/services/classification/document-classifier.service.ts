export type LegalDocumentType =
  | 'COURT_ORDER'
  | 'JUDGMENT'
  | 'PETITION'
  | 'APPLICATION'
  | 'AFFIDAVIT'
  | 'REPLY'
  | 'WRITTEN_STATEMENT'
  | 'EVIDENCE'
  | 'NOTICE'
  | 'VAKALATNAMA'
  | 'CORRESPONDENCE'
  | 'OTHER';

export interface ClassificationResult {
  documentType: LegalDocumentType;
  confidence: number;
  matchedKeywords: string[];
}

export class DocumentClassifierService {
  private typeRules: Array<{
    type: LegalDocumentType;
    keywords: string[];
    weight: number;
  }> = [
    {
      type: 'COURT_ORDER',
      keywords: ['ORDER DATED', 'IT IS ORDERED', 'INTERIM ORDER', 'CORAM', 'BEFORE THE COURT'],
      weight: 0.95,
    },
    {
      type: 'JUDGMENT',
      keywords: ['JUDGMENT', 'DECREE', 'PRONOUNCED IN OPEN COURT', 'HEARD AND DECIDED'],
      weight: 0.95,
    },
    {
      type: 'PETITION',
      keywords: ['WRIT PETITION', 'MEMORANDUM OF PETITION', 'SPECIAL LEAVE PETITION', 'PRAYER'],
      weight: 0.92,
    },
    {
      type: 'APPLICATION',
      keywords: ['INTERLOCUTORY APPLICATION', 'MISCELLANEOUS APPLICATION', 'APPLICATION UNDER SECTION', 'URGENT APPLICATION'],
      weight: 0.90,
    },
    {
      type: 'AFFIDAVIT',
      keywords: ['AFFIDAVIT OF SERVICE', 'AFFIDAVIT IN SUPPORT', 'SOLEMNLY AFFIRM', 'DEPONENT'],
      weight: 0.95,
    },
    {
      type: 'REPLY',
      keywords: ['REPLY AFFIDAVIT', 'REPLY TO APPLICATION', 'COUNTER AFFIDAVIT', 'RESPONSE TO'],
      weight: 0.90,
    },
    {
      type: 'WRITTEN_STATEMENT',
      keywords: ['WRITTEN STATEMENT', 'DEFENDANTS STATEMENT', 'REJOINER'],
      weight: 0.93,
    },
    {
      type: 'NOTICE',
      keywords: ['LEGAL NOTICE', 'SHOW CAUSE NOTICE', 'NOTICE OF MOTION', 'COMMERCIAL SUIT NOTICE'],
      weight: 0.92,
    },
    {
      type: 'VAKALATNAMA',
      keywords: ['VAKALATNAMA', 'MEMO OF APPEARANCE', 'AUTHORIZATION OF ADVOCATE', 'ADVOCATE FOR PLAINTIFF'],
      weight: 0.98,
    },
    {
      type: 'CORRESPONDENCE',
      keywords: ['LETTER DATED', 'DEAR SIR', 'KIND ATTN', 'EMAIL COMMUNICATION'],
      weight: 0.85,
    },
    {
      type: 'EVIDENCE',
      keywords: ['EXHIBIT', 'DOCUMENTARY EVIDENCE', 'PRODUCED HEREWITH', 'MARK AS EXHIBIT'],
      weight: 0.88,
    },
  ];

  /**
   * Classifies a legal document into the 12 MVP taxonomy types based on text content and filename.
   */
  classify(text: string, filename?: string): ClassificationResult {
    const combinedContent = `${filename || ''} ${text || ''}`.toUpperCase();

    let bestMatch: ClassificationResult = {
      documentType: 'OTHER',
      confidence: 0.50,
      matchedKeywords: [],
    };

    for (const rule of this.typeRules) {
      const matches = rule.keywords.filter((kw) => combinedContent.includes(kw));
      if (matches.length > 0) {
        // Boost confidence based on keyword density
        const confidenceScore = Math.min(0.99, rule.weight + (matches.length - 1) * 0.02);
        if (confidenceScore > bestMatch.confidence) {
          bestMatch = {
            documentType: rule.type,
            confidence: Number(confidenceScore.toFixed(2)),
            matchedKeywords: matches,
          };
        }
      }
    }

    return bestMatch;
  }
}

export const defaultDocumentClassifierService = new DocumentClassifierService();
