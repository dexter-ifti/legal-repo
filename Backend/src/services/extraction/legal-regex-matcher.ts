export interface RegexMatchResult {
  value: string;
  confidence: number;
  patternName: string;
}

export class LegalRegexMatcher {
  /**
   * Extract legal case numbers (e.g. WP 1234/2025, CRL.M.C. 1024/2026, Commercial Suit No. 450 of 2025).
   */
  static extractCaseNumbers(text: string): RegexMatchResult[] {
    if (!text) return [];

    const results: RegexMatchResult[] = [];
    const patterns: Array<{ name: string; regex: RegExp; confidence: number }> = [
      {
        name: 'COMMERCIAL_SUIT',
        regex: /(?:COMMERCIAL\s+SUIT|COMM\.?\s*SUIT)(?:\s+[A-Z]+)*?\s*(?:NO\.?|NUMBER)?\s*(\d+[\s/\-_]+(?:OF\s+)?\d{4})/gi,
        confidence: 0.98,
      },
      {
        name: 'WRIT_PETITION',
        regex: /(?:W\.?P\.?|(?:WRIT\s+PETITION))\s*(?:\([C|W]\))?(?:\s+[A-Z]+)*?\s*(?:NO\.?|NUMBER)?\s*(\d+[\s/\-_]+(?:OF\s+)?\d{4})/gi,
        confidence: 0.95,
      },
      {
        name: 'CRIMINAL_MISC',
        regex: /(?:CRL\.?\s*M\.?\s*C\.?|CRIMINAL\s+MISC(?:ELLANEOUS)?)(?:\s+[A-Z]+)*?\s*(?:NO\.?|NUMBER)?\s*(\d+[\s/\-_]+(?:OF\s+)?\d{4})/gi,
        confidence: 0.95,
      },
      {
        name: 'SLP',
        regex: /(?:S\.?L\.?P\.?|SPECIAL\s+LEAVE\s+PETITION)\s*(?:\([C|W]\))?(?:\s+[A-Z]+)*?\s*(?:NO\.?|NUMBER)?\s*(\d+[\s/\-_]+(?:OF\s+)?\d{4})/gi,
        confidence: 0.96,
      },
      {
        name: 'GENERIC_SUIT_APPEAL',
        regex: /(?:SUIT|APPEAL|APPLICATION|PETITION|MOTION)(?:\s+[A-Z]+)*?\s+(?:NO\.?|NUMBER)\s*(\d+[\s/\-_]+(?:OF\s+)?\d{4})/gi,
        confidence: 0.90,
      },
    ];

    for (const { name, regex, confidence } of patterns) {
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        const fullMatch = match[0].trim();
        const numberPart = match[1] ? match[1].trim() : fullMatch;

        const isDuplicate = results.some((r) => {
          const rLower = r.value.toLowerCase();
          const fLower = fullMatch.toLowerCase();
          return rLower.includes(fLower) || fLower.includes(rLower) || rLower.includes(numberPart.toLowerCase());
        });

        if (fullMatch && !isDuplicate) {
          results.push({
            value: fullMatch,
            confidence,
            patternName: name,
          });
        }
      }
    }

    return results;
  }

  /**
   * Extract 16-character alphanumeric Indian Court CNR (Case Number Record) identifiers.
   * Format: 4 uppercase letters + 12 digits (e.g. MHXX010012342025)
   */
  static extractCnrNumbers(text: string): RegexMatchResult[] {
    if (!text) return [];

    const results: RegexMatchResult[] = [];
    const cnrRegex = /\b([A-Z]{4}\d{12})\b/g;

    let match: RegExpExecArray | null;
    while ((match = cnrRegex.exec(text)) !== null) {
      const cnr = match[1];
      if (!results.some((r) => r.value === cnr)) {
        results.push({
          value: cnr,
          confidence: 0.99,
          patternName: 'CNR_16_CHAR',
        });
      }
    }

    return results;
  }

  /**
   * Extract party names (Plaintiff vs Defendant, Petitioner vs Respondent).
   */
  static extractParties(text: string): { plaintiffs: RegexMatchResult[]; defendants: RegexMatchResult[] } {
    const plaintiffs: RegexMatchResult[] = [];
    const defendants: RegexMatchResult[] = [];

    if (!text) return { plaintiffs, defendants };

    // Match patterns like "BETWEEN: Mehta Enterprises PLAINTIFF AND Shah Logistics DEFENDANT"
    const partyBetweenRegex = /(?:BETWEEN\s*:?\s*)?([A-Z0-9\s.,]+?)\s+(?:PLAINTIFF|PETITIONER|APPLICANT)\s+(?:AND|VS\.?|VERSUS)\s+([A-Z0-9\s.,]+?)\s+(?:DEFENDANT|RESPONDENT)/gi;

    let match: RegExpExecArray | null;
    while ((match = partyBetweenRegex.exec(text)) !== null) {
      const pName = match[1].trim();
      const dName = match[2].trim();

      if (pName && pName.length > 2 && pName.length < 100) {
        plaintiffs.push({ value: pName, confidence: 0.92, patternName: 'PLAINTIFF_TITLE' });
      }
      if (dName && dName.length > 2 && dName.length < 100) {
        defendants.push({ value: dName, confidence: 0.92, patternName: 'DEFENDANT_TITLE' });
      }
    }

    // Match single-party notices like "BETWEEN Patel Developers PETITIONER"
    // (no opposing party listed). Requires the BETWEEN anchor and a negative
    // lookahead so two-party documents are not double-captured.
    const singlePartyRegex = /BETWEEN\s*:?\s*([A-Z0-9\s.,]+?)\s+(?:PLAINTIFF|PETITIONER|APPLICANT)(?!\s+(?:AND|VS\.?|VERSUS))/gi;

    while ((match = singlePartyRegex.exec(text)) !== null) {
      const pName = match[1].trim();

      if (pName && pName.length > 2 && pName.length < 100) {
        const isDuplicate = plaintiffs.some((p) => p.value.toLowerCase() === pName.toLowerCase());
        if (!isDuplicate) {
          plaintiffs.push({ value: pName, confidence: 0.85, patternName: 'SINGLE_PARTY_TITLE' });
        }
      }
    }

    return { plaintiffs, defendants };
  }

  /**
   * Extract court names (e.g. HIGH COURT OF BOMBAY, SUPREME COURT OF INDIA, DISTRICT COURT).
   */
  static extractCourts(text: string): RegexMatchResult[] {
    if (!text) return [];

    const results: RegexMatchResult[] = [];
    const courtRegex = /(?:IN\s+THE\s+)?((?:HIGH\s+COURT\s+(?:OF\s+[A-Z\s]+)?)|(?:SUPREME\s+COURT\s+OF\s+INDIA)|(?:DISTRICT\s+AND\s+SESSIONS\s+COURT\s+(?:AT\s+[A-Z\s]+)?))/gi;

    let match: RegExpExecArray | null;
    while ((match = courtRegex.exec(text)) !== null) {
      const courtName = match[1].trim();
      if (courtName && !results.some((r) => r.value.toLowerCase() === courtName.toLowerCase())) {
        results.push({
          value: courtName,
          confidence: 0.95,
          patternName: 'COURT_NAME',
        });
      }
    }

    return results;
  }

  /**
   * Extract filing dates (e.g. 15/08/2026, 2026-08-15, 15-08-2026).
   */
  static extractDates(text: string): RegexMatchResult[] {
    if (!text) return [];

    const results: RegexMatchResult[] = [];
    const dateRegex = /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\b/g;

    let match: RegExpExecArray | null;
    while ((match = dateRegex.exec(text)) !== null) {
      const dateStr = match[1];
      if (!results.some((r) => r.value === dateStr)) {
        results.push({
          value: dateStr,
          confidence: 0.88,
          patternName: 'DATE_FORMAT',
        });
      }
    }

    return results;
  }
}
