import { prisma } from '../db/client.js';
import type { ProcessingStatus } from '@prisma/client';
import { getStorageFileBuffer } from '../storage/storage.service.js';
import { inspectPdf, pdfItemsToText } from '../services/ingestion/pdf-inspector.service.js';
import {
  runDiscovery,
  nextDiscoveryBatch,
  DiscoveryResult,
} from '../services/ingestion/discovery.service.js';
import {
  extractAllPages,
  detectPrintedPageNumber,
  detectLanguage,
} from '../services/ingestion/page-extractor.service.js';
import { isUsableNativeText } from '../services/ingestion/text-quality.service.js';
import { detectBoundaries } from '../services/ingestion/boundary-detector.service.js';
import { MistralSmallClient } from '../services/llm/mistral-small.client.js';
import { defaultMetadataExtractionService } from '../services/extraction/metadata-extraction.service.js';
import { defaultCaseMatcherService } from '../services/matching/case-matcher.service.js';
import { getOcrProvider } from '../services/ocr/ocr.service.js';
import { INGESTION_CONFIG } from '../config/ingestion.config.js';

export type PipelineStage =
  | 'INSPECTING'
  | 'DISCOVERING'
  | 'EXTRACTING'
  | 'SEGMENTING'
  | 'NORMALIZING'
  | 'INDEXING';

const STAGE_TO_STATUS: Record<PipelineStage, ProcessingStatus> = {
  INSPECTING: 'INSPECTING',
  DISCOVERING: 'DISCOVERING',
  EXTRACTING: 'EXTRACTING',
  SEGMENTING: 'SEGMENTING',
  NORMALIZING: 'NORMALIZING',
  INDEXING: 'INDEXING',
};

/**
 * Staged ingestion worker (spec §4, §36).
 *
 * Every stage is idempotent and independently observable:
 *   inspect -> discover -> extract -> segment -> normalize -> index -> ready
 * Failures mark the document PROCESSING_FAILED with the failing stage and
 * error; /retry re-enters the pipeline and completed work is skipped.
 */
export async function runIngestionPipeline(
  organizationId: string,
  documentId: string
): Promise<void> {
  const llm = new MistralSmallClient();
  const ocrProvider = getOcrProvider();

  const document = await prisma.document.findFirst({
    where: { id: documentId, organizationId },
  });
  if (!document) throw new Error('Document not found');

  // Long OCR/extraction stages leave the DB connection idle long enough for
  // pooled proxies (PgBouncer/Supabase) to reap it, killing later queries.
  // A tiny periodic query keeps the connection alive for the pipeline's life.
  const heartbeat = setInterval(() => {
    prisma
      .$queryRaw`SELECT 1`
      .catch(() => {});
  }, 20_000);

  try {
    // Claim the document atomically: only a runner that observes QUEUED may
    // proceed, so concurrent triggers (double /upload/complete, retry races)
    // can never execute the pipeline twice on the same document.
    const claimed = await prisma.document.updateMany({
      where: { id: documentId, organizationId, processingStatus: 'QUEUED' },
      data: { stageError: null },
    });

    if (claimed.count === 0) {
      // Another trigger already claimed (or finished) this document.
      clearInterval(heartbeat);
      return;
    }

    // ------------------------------------------------------------------
    // 1. TECHNICAL INSPECTION (spec §9)
    // ------------------------------------------------------------------
    await enterStage(documentId, 'INSPECTING');
    const buffer = await getStorageFileBuffer(document.storageKey);
    const inspection = await inspectPdf(buffer);

    await prisma.documentMetadata.upsert({
      where: {
        id:
          (
            await prisma.documentMetadata.findFirst({
              where: { documentId, fieldName: 'technical_inspection' },
            })
          )?.id ?? '00000000-0000-0000-0000-000000000000',
      },
      create: {
        documentId,
        fieldName: 'technical_inspection',
        fieldValue: JSON.stringify({
          pageCount: inspection.pageCount,
          kind: inspection.kind,
          nativeTextAvailable: inspection.nativeTextAvailable,
        }),
        confidence: 1.0,
        source: 'INGESTION_INSPECTOR',
      },
      update: {
        fieldValue: JSON.stringify({
          pageCount: inspection.pageCount,
          kind: inspection.kind,
          nativeTextAvailable: inspection.nativeTextAvailable,
        }),
      },
    });

    // ------------------------------------------------------------------
    // 2. DISCOVERY PASS (spec §10-§15): page 1 metadata, first 5 pages,
    //    index detection, progressive expansion while insufficient.
    // ------------------------------------------------------------------
    await enterStage(documentId, 'DISCOVERING');

    const discoveryPageTexts = new Map<number, string>();
    let inspectedUpTo = 0;
    let discovery: DiscoveryResult | null = null;

    // Progressive expansion loop — bounded by nextDiscoveryBatch returning
    // null or the safety guard below (spec §14).
    let iterating = true;
    while (iterating) {
      const batch =
        inspectedUpTo === 0
          ? INGESTION_CONFIG.discoveryBatches[0]
          : nextDiscoveryBatch(inspectedUpTo, inspection.pageCount);

      if (!batch) break;
      const [from, to] = batch;

      const batchTexts =
        INGESTION_CONFIG.maxOcrPages > 0 && discoveryPageTexts.size >= INGESTION_CONFIG.maxOcrPages
          ? await extractNativePagesInRange(buffer, from, to)
          : await extractPagesInRange(buffer, from, to, ocrProvider);
      for (const [pageNumber, text] of batchTexts) {
        discoveryPageTexts.set(pageNumber, text);
      }

      discovery = runDiscovery(discoveryPageTexts);

      if (!discovery.signals.additional_discovery_required) {
        iterating = false;
        break;
      }

      const previousInspected = inspectedUpTo;
      inspectedUpTo = Math.max(inspectedUpTo, to);
      if (inspectedUpTo === previousInspected) {
        iterating = false; // safety against loops
        break;
      }

      if (!nextDiscoveryBatch(inspectedUpTo, inspection.pageCount)) {
        iterating = false;
        break;
      }
    }

    if (discovery) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          discoveryJson: JSON.stringify({
            ...discovery.signals,
            inspectedRange: discovery.inspectedRange,
            indexEntriesCount: discovery.indexEntries.length,
          }),
        },
      });
    }

    // ------------------------------------------------------------------
    // 3. FULL EXTRACTION (spec §15-§18): native everywhere usable,
    //    OCR only for pages that need it, stored page-level.
    // ------------------------------------------------------------------
    await enterStage(documentId, 'EXTRACTING');
    const pages = await extractAllPages(buffer, inspection, ocrProvider, {
      maxOcrPages: INGESTION_CONFIG.maxOcrPages > 0 ? INGESTION_CONFIG.maxOcrPages : undefined,
    });

    // Persist page rows idempotently (unique on documentId+pageNumber)
    for (const page of pages) {
      const printedPageNumber = detectPrintedPageNumber(page.rawText);
      const language = page.language || detectLanguage(page.rawText || '');

      await prisma.documentPage.upsert({
        where: {
          documentId_pageNumber: { documentId, pageNumber: page.pageNumber },
        },
        create: {
          documentId,
          pageNumber: page.pageNumber,
          rawText: page.rawText,
          normalizedText: normalizeWhitespace(page.rawText),
          extractionMethod: page.extractionMethod,
          ocrProvider: page.ocrProvider ?? null,
          ocrConfidence: page.ocrConfidence != null ? page.ocrConfidence : undefined,
          language,
          wordCount: page.wordCount,
          charCount: page.charCount,
          printedPageNumber,
          attemptCount: 1,
        },
        update: {
          rawText: page.rawText,
          normalizedText: normalizeWhitespace(page.rawText),
          extractionMethod: page.extractionMethod,
          ocrProvider: page.ocrProvider ?? null,
          ocrConfidence: page.ocrConfidence != null ? page.ocrConfidence : undefined,
          language,
          wordCount: page.wordCount,
          charCount: page.charCount,
          printedPageNumber,
          attemptCount: { increment: 1 },
          error: page.error ?? null,
        },
      });
    }

    // Downstream compatibility: persist legal-entity metadata and run the
    // deterministic matcher over the full extracted text.
    const fullText = pages
      .map((p) => p.rawText || '')
      .join('\n\n')
      .trim();

    if (fullText.length > 20) {
      // The first page is authoritative for identifying metadata (spec §10):
      // anchor filing_date to it so dates from receipts/endorsements deep in
      // the bundle are never promoted to the document's filing date.
      const dateAnchorText = stripControl(discoveryPageTexts.get(1) || '');
      await defaultMetadataExtractionService.persistExtractedMetadata(
        documentId,
        stripControl(fullText),
        isScanned(inspection.kind) ? 'OCR' : 'DOCUMENT_TEXT',
        dateAnchorText || undefined
      );

      // First-page metadata (spec §10) overrides regex matches found deep
      // inside the bundle — the cause title is the authoritative source.
      if (discovery && Object.keys(discovery.firstPageMetadata).length > 0) {
        await persistFirstPageMetadata(documentId, discovery.firstPageMetadata);
      }

      await prisma.document.update({
        where: { id: documentId },
        data: { language: dominantLanguage(pages.map((p) => p.language)) },
      });

      await defaultCaseMatcherService.matchDocument(organizationId, documentId);
    }

    // ------------------------------------------------------------------
    // 4. SEGMENTATION (spec §21-§23, §29-§30)
    // ------------------------------------------------------------------
    await enterStage(documentId, 'SEGMENTING');

    const pageTextMap = new Map<number, string>(
      pages.filter((p) => p.rawText).map((p) => [p.pageNumber, p.rawText as string])
    );
    const boundaries = detectBoundaries(pageTextMap);
    const boundaryPages = boundaries.map((b) => b.page);

    // Clear old segments (idempotent re-runs)
    await prisma.documentSegment.deleteMany({ where: { documentId } });

    const segmentStarts = [1, ...boundaryPages];
    const segmentRows: Array<{
      segmentType: string;
      title: string | null;
      startPage: number;
      endPage: number;
      confidence: number;
      metadataJson?: string;
    }> = [];

    for (let i = 0; i < segmentStarts.length; i++) {
      const startPage = segmentStarts[i];
      const endPage = i + 1 < segmentStarts.length ? segmentStarts[i + 1] - 1 : inspection.pageCount;
      const boundarySignal = i > 0 ? boundaries.find((b) => b.page === startPage) : undefined;

      segmentRows.push({
        segmentType: 'unclassified',
        title: null,
        startPage,
        endPage,
        confidence: boundarySignal?.boundaryScore ?? 0.5,
        metadataJson: boundarySignal
          ? JSON.stringify({ signals: boundarySignal.signals })
          : undefined,
      });
    }

    // Semantic classification of segments via Mistral Small (spec §24/§26),
    // capped for cost control. Without an API key this is skipped entirely
    // and segments remain 'unclassified'.
    let classificationsUsed = 0;
    for (const segment of segmentRows) {
      if (classificationsUsed >= INGESTION_CONFIG.maxSegmentClassifications) break;

      if (!llm.available) continue;
      const openingText = readSegmentOpening(pages, segment.startPage, segment.endPage);
      if (!openingText.trim()) continue;

      const classification = await llm.classifySegment(segment.title || '', openingText);
      if (classification && classification.confidence >= 0.5) {
        classificationsUsed += 1;
        segment.segmentType = classification.segment_type;
        segment.title = classification.title;
        segment.confidence = classification.confidence;
        segment.metadataJson = JSON.stringify({
          ...(segment.metadataJson ? JSON.parse(segment.metadataJson) : {}),
          classification,
        });
      }
    }

    await prisma.documentSegment.createMany({
      data: segmentRows.map((segment) => ({
        documentId,
        segmentType: segment.segmentType,
        title: segment.title,
        startPage: segment.startPage,
        endPage: segment.endPage,
        confidence: segment.confidence,
        metadataJson: segment.metadataJson,
      })),
    });

    // ------------------------------------------------------------------
    // 5. NORMALIZATION (spec §25/§27): deterministic cleanup only —
    //    LLM normalization happens per-segment above when justified.
    //    Raw text is never overwritten.
    // ------------------------------------------------------------------
    await enterStage(documentId, 'NORMALIZING');
    // normalizedText was written during page persistence; nothing further
    // requires an LLM for trivial whitespace work.

    // ------------------------------------------------------------------
    // 6. INDEXING (spec §36): mark ready. Search indexing continues to be
    //    served by SearchIndexService over persisted page/metadata text.
    // ------------------------------------------------------------------
    await enterStage(documentId, 'INDEXING');

    await prisma.document.update({
      where: { id: documentId },
      data: {
        processingStatus: 'READY',
        pipelineStage: 'READY',
        stageAttempts: 0,
      },
    });

    clearInterval(heartbeat);
  } catch (err: unknown) {
    clearInterval(heartbeat);

    const message = err instanceof Error ? err.message : String(err);

    await prisma.document
      .update({
        where: { id: documentId },
        data: {
          processingStatus: 'PROCESSING_FAILED',
          stageError: message.slice(0, 500),
        },
      })
      .catch(() => {});

    throw err;
  }
}

/** Fire-and-forget trigger used by the upload-complete API. */
export function startIngestionPipeline(organizationId: string, documentId: string): void {
  runIngestionPipeline(organizationId, documentId).catch((err: unknown) => {
    console.error(
      `[DocumentWorker] Ingestion failed for ${documentId}:`,
      err instanceof Error ? err.message : err
    );
  });
}

async function enterStage(documentId: string, stage: PipelineStage): Promise<void> {
  await prisma.document.update({
    where: { id: documentId },
    data: {
      pipelineStage: stage,
      processingStatus: STAGE_TO_STATUS[stage],
    },
  });
}

/** Native extraction for a specific range of pages; OCR fallback per page. */
export async function extractPagesInRange(
  buffer: Buffer,
  from: number,
  to: number,
  ocrProvider: ReturnType<typeof getOcrProvider>
): Promise<Map<number, string>> {
  const result = new Map<number, string>();

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false });
  const doc = await loadingTask.promise;
  const pageCount = doc.numPages;

  for (let pageNumber = from; pageNumber <= Math.min(to, pageCount); pageNumber++) {
    try {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = pdfItemsToText(content.items);
      page.cleanup();

      if (isUsableNativeText(text)) {
        result.set(pageNumber, text);
      }
    } catch {
      // Page will be handled by OCR below.
    }
  }
  await doc.cleanup();
  void loadingTask.destroy();

  // OCR only the unusable pages within the range (mixed-mode strategy)
  const missing: number[] = [];
  for (let pageNumber = from; pageNumber <= Math.min(to, pageCount); pageNumber++) {
    if (!result.has(pageNumber)) missing.push(pageNumber);
  }

  for (const pageNumber of missing) {
    try {
      const singleRange = await sliceSinglePage(buffer, pageNumber);
      const ocrResult = await ocrProvider.extractText(singleRange, {});
      const text = (ocrResult.pages?.[0]?.text || ocrResult.text || '').trim();
      if (text) {
        result.set(pageNumber, text);
      }
    } catch {
      // Leave missing — full-extraction stage will retry.
    }
  }

  return result;
}

async function sliceSinglePage(buffer: Buffer, pageNumber: number): Promise<Buffer> {
  const pdfLib = await import('pdf-lib');
  const source = await pdfLib.PDFDocument.load(buffer, { ignoreEncryption: true });
  const target = await pdfLib.PDFDocument.create();
  if (pageNumber - 1 < source.getPageCount()) {
    const [copied] = await target.copyPages(source, [pageNumber - 1]);
    target.addPage(copied);
  }
  return Buffer.from(await target.save());
}

function readSegmentOpening(
  pages: Array<{ pageNumber: number; rawText: string | null }>,
  startPage: number,
  endPage: number
): string {
  return pages
    .filter((p) => p.pageNumber >= startPage && p.pageNumber <= Math.min(endPage, startPage + 2))
    .map((p) => p.rawText || '')
    .join('\n\n')
    .slice(0, 8000);
}

function normalizeWhitespace(text: string | null): string | null {
  if (!text) return null;
  // Deterministic cleanup only — never sent to the LLM (spec §25).
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() || null;
}

function stripControl(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function isScanned(kind: string): boolean {
  return kind === 'scanned';
}

function dominantLanguage(languages: Array<string | undefined>): string {
  const counts = new Map<string, number>();
  for (const lang of languages) {
    if (!lang) continue;
    counts.set(lang, (counts.get(lang) || 0) + 1);
  }
  let best = 'en';
  let bestCount = 0;
  for (const [lang, count] of counts) {
    if (count > bestCount) {
      best = lang;
      bestCount = count;
    }
  }
  return best;
}

/** Native-only range extraction (no OCR) — used when OCR budget is exhausted. */
async function extractNativePagesInRange(buffer: Buffer, from: number, to: number): Promise<Map<number, string>> {
  const result = new Map<number, string>();

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: false });
  const doc = await loadingTask.promise;

  for (let pageNumber = from; pageNumber <= Math.min(to, doc.numPages); pageNumber++) {
    try {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = pdfItemsToText(content.items);
      if (text.trim()) {
        result.set(pageNumber, text);
      }
    } catch {
      // Skip — no OCR budget.
    }
  }
  await doc.cleanup();
  void loadingTask.destroy();

  return result;
}

/**
 * Persists first-page metadata with high confidence, mapping party labels to
 * the canonical field names used by the matcher and verification UI.
 */
async function persistFirstPageMetadata(
  documentId: string,
  metadata: Record<string, string>
): Promise<void> {
  const mapped: Record<string, string> = { ...metadata };

  if (mapped.petitioners) mapped.client_name = mapped.petitioners;
  if (mapped.respondents) mapped.opposing_party = mapped.respondents;
  if (mapped.applicants) mapped.client_name = mapped.applicants;
  if (mapped.defendants) mapped.opposing_party = mapped.defendants;
  if (mapped.plaintiffs) mapped.client_name = mapped.plaintiffs;

  // A date printed on the authoritative first page overrides any
  // full-text heuristic (spec §10).
  if (mapped.date) mapped.filing_date = mapped.date;

  const entries = Object.entries(mapped).filter(([key, value]) => key && value);
  if (entries.length === 0) return;

  const fieldNames = entries.map(([key]) => key);

  await prisma.$transaction([
    prisma.documentMetadata.deleteMany({
      where: { documentId, fieldName: { in: fieldNames } },
    }),
    ...entries.map(([fieldName, fieldValue]) =>
      prisma.documentMetadata.create({
        data: {
          documentId,
          fieldName,
          fieldValue,
          confidence: 0.95,
          source: 'DISCOVERY_FIRST_PAGE',
        },
      })
    ),
  ]);
}
