import test from 'node:test';
import assert from 'node:assert';
import { computeTextStats, isUsableNativeText } from '../../src/services/ingestion/text-quality.service.js';
import {
  extractFirstPageMetadata,
  detectIndexPage,
  runDiscovery,
  nextDiscoveryBatch,
} from '../../src/services/ingestion/discovery.service.js';
import { detectBoundaries } from '../../src/services/ingestion/boundary-detector.service.js';

const LEGAL_PAGE_1 = `IN THE HON'BLE HIGH COURT OF JUDICATURE AT BOMBAY
CIVIL APPELLATE JURISDICTION
WRIT PETITION NO. 1234 OF 2026

Petitioner : Farooq Ali & Others
Versus
Respondent : State of Uttar Pradesh & Others

AFFIDAVIT IN SUPPORT`;

test('text-quality service', () => {
  const good = 'The Hon High Court delivered judgment in Commercial Suit 1024 directing mandatory interim injunction on the fifteenth of August.';
  assert.equal(isUsableNativeText(good), true);

  assert.equal(isUsableNativeText('short text'), false);
  assert.equal(isUsableNativeText(''), false);
  assert.equal(isUsableNativeText(null), false);

  // Garbage: high replacement-character ratio (broken font encoding)
  const garbage = 'a\uFFFDb\uFFFDc\uFFFDd\uFFFDe\uFFFFf\uFFFDg\uFFFDh\uFFFFi\uFFFDj\uFFFDk\uFFFFl\uFFFDm\uFFFD';
  assert.equal(isUsableNativeText(garbage), false);

  // Low alphabetic ratio (numbers/symbols soup)
  const numbers = '12 34 56 78 90 12 34 56 78 90 ++ -- == >> ?? 11 22 33 44 55 66 77';
  assert.equal(isUsableNativeText(numbers), false);

  const stats = computeTextStats('Hello world\u0000');
  assert.ok(stats.wordCount === 2);
});

test('first-page metadata discovery', () => {
  const metadata = extractFirstPageMetadata(LEGAL_PAGE_1);
  assert.equal(metadata.petitioners, 'Farooq Ali & Others');
  assert.equal(metadata.respondents, 'State of Uttar Pradesh & Others');

  const districtMeta = extractFirstPageMetadata('District : Lucknow\nCategory : Writ - C');
  assert.equal(districtMeta.district, 'Lucknow');
  assert.equal(districtMeta.category, 'Writ - C');
});

test('index / table-of-contents detection', () => {
  const indexPage = `INDEX

S.No.  Title of Document                        Page No.
1.     Writ Petition............................1
2.     Annexure No. 1...........................15
3.     Counter Affidavit........................24
4.     Vakalatnama..............................30`;

  const result = detectIndexPage(indexPage);
  assert.equal(result.detected, true);
  assert.ok(result.entries.length >= 4);
  assert.equal(result.entries[0].pageHint, 1);
  assert.match(result.entries[2].title, /Counter Affidavit/i);

  // A regular page is not an index
  assert.equal(detectIndexPage(LEGAL_PAGE_1).detected, false);
});

test('discovery signals over a bundle-like first page', () => {
  const pages = new Map<number, string>([
    [1, LEGAL_PAGE_1],
    [2, `INDEX\n\n1. Writ Petition..........1\n2. Caveat Application.....20\n3. Affidavit..............25`],
    [3, 'This is substantive body content of the petition which contains many words to satisfy the substantive content threshold for detection purposes and more than sixty words are present here in this particular discovered page of the document bundle being tested by the automated ingestion pipeline that we are building for legal document automation and case intelligence workflows across high courts and district courts with multiple parties annexures and supporting affidavits attached to the main writ petition filed before the registrar today.'],
  ]);

  const discovery = runDiscovery(pages);

  assert.equal(discovery.signals.case_identity_detected, true); // WRIT PETITION NO. 1234
  assert.equal(discovery.signals.petitioner_detected, true);
  assert.equal(discovery.signals.respondent_detected, true);
  assert.equal(discovery.signals.index_detected, true);
  assert.equal(discovery.signals.substantive_content_detected, true);
  assert.equal(discovery.signals.bundle_detected, true);
  assert.equal(discovery.signals.additional_discovery_required, false);
  assert.ok(discovery.firstPageMetadata.petitioners);
});

test('progressive discovery batch expansion', () => {
  // First batch is always 1-5
  assert.deepEqual(nextDiscoveryBatch(0, 100), [1, 5]);
  assert.deepEqual(nextDiscoveryBatch(5, 100), [6, 15]);
  assert.deepEqual(nextDiscoveryBatch(15, 100), [16, 30]);
  assert.deepEqual(nextDiscoveryBatch(75, 100), [76, 100]);

  // Expansion continues to the document end (signal-driven stopping)
  assert.deepEqual(nextDiscoveryBatch(50, 60), [51, 60]);
  // Fully inspected documents have no next batch
  assert.equal(nextDiscoveryBatch(60, 60), null);
  // Small documents stop early
  assert.equal(nextDiscoveryBatch(5, 4), null);
});

test('boundary detection on synthetic bundle pages', () => {
  const pageTexts = new Map<number, string>();

  pageTexts.set(1, LEGAL_PAGE_1);
  // Page 23: tail of previous document
  pageTexts.set(23, 'therefore it is most respectfully prayed that this Hon ble Court may be pleased to allow the present petition with costs as prayed above and pass such other order as deemed fit in the interest of justice and fairness for all parties concerned herein today.');
  // Page 24: strong new-document start (caveat)
  pageTexts.set(
    24,
    `CAVEAT APPLICATION
IN THE HON'BLE HIGH COURT OF JUDICATURE AT BOMBAY
Caveat Application No. 99 OF 2026
Petitioner : Ramesh Prasad
VERSUS
Respondent : State of Maharashtra`
  );

  const boundaries = detectBoundaries(pageTexts);
  assert.equal(boundaries.length, 1);
  assert.equal(boundaries[0].page, 24);
  assert.ok(boundaries[0].boundaryScore >= 0.6);
  assert.ok(boundaries[0].signals.includes('caveat heading'));
});
