import test from 'node:test';
import assert from 'node:assert';
import { MetadataExtractionService } from '../../src/services/extraction/metadata-extraction.service.js';

test('filing_date anchoring — first page is authoritative (spec §10)', () => {
  const svc = new MetadataExtractionService();

  const bundleText =
    'Writ petition filed. Interim order dated 05/03/2026 passed. ' +
    'Counter affidavit filed on 12/04/2026. Court fee receipt dated 20/07/2026 attached.';
  const firstPageText = 'PROFORMA FOR FRESH FILING\nDate : 02/01/2026\nPetitioner — Farook Ali';

  // When the anchor page yields dates, ONLY those become filing_date —
  // incidental dates from receipts/orders deep in the bundle are ignored.
  const anchored = svc.extract(bundleText, 'OCR', firstPageText);
  const anchoredDates = anchored.allFields
    .filter((f) => f.fieldName === 'filing_date')
    .map((f) => f.fieldValue);
  assert.deepEqual(anchoredDates, ['02/01/2026']);

  // Without an anchor date, the FIRST date in reading order is used —
  // never the last one.
  const unanchored = svc.extract(
    'Receipt dated 20/07/2026 attached after order dated 05/03/2026.',
    'OCR'
  );
  const unanchoredDates = unanchored.allFields
    .filter((f) => f.fieldName === 'filing_date')
    .map((f) => f.fieldValue);
  assert.deepEqual(unanchoredDates, ['20/07/2026']);
});
