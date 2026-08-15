export interface EvaluationSample {
  id: string;
  filename: string;
  rawText: string;
  expectedCaseNumber: string | null;
  expectedCnrNumber: string | null;
  expectedDocumentType: string;
  expectedCaseTitle: string | null;
  isAmbiguous: boolean; // Expects CONFIRMATION_REQUIRED
  isNoMatch: boolean;   // Expects NO_MATCH
}

export interface EvaluationCaseFixture {
  id: string;
  organizationId: string;
  title: string;
  caseNumber: string;
  cnrNumber: string;
  court: string;
  clientName: string;
  opposingParty: string;
  caseType: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

/**
 * 100 Labeled Ground-Truth Evaluation Scenarios (TASK-034)
 */
export const EVALUATION_CASES: EvaluationCaseFixture[] = Array.from({ length: 20 }, (_, idx) => {
  const caseId = `case-eval-${String(idx + 1).padStart(3, '0')}`;
  const cnrNumber = `DLHC01${String(idx + 1000).padStart(6, '0')}2026`;
  const caseNum = `W.P. ${1000 + idx}/2026`;
  
  const clients = ['Rajesh Kumar', 'Sunita Devi', 'Amit Shah', 'Priya Sharma', 'Ramesh Verma'];
  const respondents = ['State of NCT Delhi', 'Delhi Development Authority', 'Union of India', 'Municipal Corporation Delhi', 'ICICI Bank Ltd'];
  const courts = ['High Court of Delhi', 'District Court Saket', 'Supreme Court of India', 'Tis Hazari Court'];

  return {
    id: caseId,
    organizationId: '00000000-0000-0000-0000-000000000001',
    title: `${clients[idx % clients.length]} ${idx + 1} vs ${respondents[idx % respondents.length]} ${idx + 1}`,
    caseNumber: caseNum,
    cnrNumber: cnrNumber,
    court: courts[idx % courts.length],
    clientName: `${clients[idx % clients.length]} ${idx + 1}`,
    opposingParty: `${respondents[idx % respondents.length]} ${idx + 1}`,
    caseType: 'Writ Petition',
    status: 'ACTIVE',
  };
});

/**
 * Generate 100 labeled document samples (5 per case fixture)
 */
export function generateEvaluationSamples(): EvaluationSample[] {
  const samples: EvaluationSample[] = [];
  let sampleId = 1;

  for (let cIdx = 0; cIdx < EVALUATION_CASES.length; cIdx++) {
    const targetCase = EVALUATION_CASES[cIdx];

    // Sample 1: Exact CNR Match (AUTO_MATCH candidate)
    samples.push({
      id: `sample-${String(sampleId++).padStart(3, '0')}`,
      filename: `Notice_CNR_${targetCase.caseNumber.replace(/\//g, '_')}.pdf`,
      rawText: `
        IN THE ${targetCase.court.toUpperCase()}
        CNR NO: ${targetCase.cnrNumber}
        ${targetCase.caseNumber}
        BETWEEN ${targetCase.clientName} PLAINTIFF AND ${targetCase.opposingParty} DEFENDANT
        LEGAL NOTICE AND SHOW CAUSE NOTICE
      `,
      expectedCaseNumber: targetCase.caseNumber,
      expectedCnrNumber: targetCase.cnrNumber,
      expectedDocumentType: 'NOTICE',
      expectedCaseTitle: targetCase.title,
      isAmbiguous: false,
      isNoMatch: false,
    });

    // Sample 2: Exact Case Number + Party Match (AUTO_MATCH candidate)
    samples.push({
      id: `sample-${String(sampleId++).padStart(3, '0')}`,
      filename: `CourtOrder_${targetCase.caseNumber.replace(/\//g, '_')}.pdf`,
      rawText: `
        IN THE ${targetCase.court.toUpperCase()}
        ${targetCase.caseNumber}
        ${targetCase.clientName} VS ${targetCase.opposingParty}
        IT IS HEREBY ORDERED THAT THE MATTER IS ADJOURNED TO 10/09/2026. INTERIM ORDER TO CONTINUE.
      `,
      expectedCaseNumber: targetCase.caseNumber,
      expectedCnrNumber: targetCase.cnrNumber,
      expectedDocumentType: 'COURT_ORDER',
      expectedCaseTitle: targetCase.title,
      isAmbiguous: false,
      isNoMatch: false,
    });

    // Sample 3: Partial Match / Ambiguous (CONFIRMATION_REQUIRED candidate)
    samples.push({
      id: `sample-${String(sampleId++).padStart(3, '0')}`,
      filename: `Vakalatnama_Partial_${cIdx}.pdf`,
      rawText: `
        VAKALATNAMA
        BEFORE THE HON'BLE ${targetCase.court.toUpperCase()}
        BETWEEN ${targetCase.clientName} PLAINTIFF AND ${targetCase.opposingParty} DEFENDANT
        I HEREBY APPOINT AND RETAIN ADVOCATE ON MY BEHALF.
      `,
      expectedCaseNumber: targetCase.caseNumber,
      expectedCnrNumber: targetCase.cnrNumber,
      expectedDocumentType: 'VAKALATNAMA',
      expectedCaseTitle: targetCase.title,
      isAmbiguous: true,
      isNoMatch: false,
    });

    // Sample 4: Affidavit (AUTO_MATCH / High Confidence)
    samples.push({
      id: `sample-${String(sampleId++).padStart(3, '0')}`,
      filename: `Affidavit_${targetCase.caseNumber.replace(/\//g, '_')}.pdf`,
      rawText: `
        AFFIDAVIT IN SUPPORT OF APPLICATION
        CNR NO: ${targetCase.cnrNumber}
        ${targetCase.caseNumber}
        I, ${targetCase.clientName}, AGED 45 YEARS, DO HEREBY SOLEMNLY AFFIRM AND STATE ON OATH.
      `,
      expectedCaseNumber: targetCase.caseNumber,
      expectedCnrNumber: targetCase.cnrNumber,
      expectedDocumentType: 'AFFIDAVIT',
      expectedCaseTitle: targetCase.title,
      isAmbiguous: false,
      isNoMatch: false,
    });

    // Sample 5: No Match (NO_MATCH / New Case)
    samples.push({
      id: `sample-${String(sampleId++).padStart(3, '0')}`,
      filename: `Unrelated_Notice_Unknown_${cIdx}.pdf`,
      rawText: `
        IN THE HIGH COURT OF BOMBAY
        COMMERCIAL SUIT NO 9999 OF 2026
        CNR NO: MHOS019999992026
        UNKNOWN ENTERPRISES VS UNKNOWN INFRASTRUCTURE
        NOTICE OF MOTION
      `,
      expectedCaseNumber: null,
      expectedCnrNumber: null,
      expectedDocumentType: 'NOTICE',
      expectedCaseTitle: null,
      isAmbiguous: false,
      isNoMatch: true,
    });
  }

  return samples;
}
