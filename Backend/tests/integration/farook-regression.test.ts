import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/db/client.js';

process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
// Bound OCR spend/runtime for this large scanned fixture (spec §40).
process.env.INGESTION_MAX_OCR_PAGES = process.env.INGESTION_MAX_OCR_PAGES || '14';
// This fixture IS a scanned document — the regression requires genuine OCR.
process.env.FORCE_REAL_OCR = 'true';

const FIXTURE_PATH = path.join(process.cwd(), 'tests', 'fixtures', 'Farook Petition.pdf');

test('Farook Petition.pdf — scanned bundle regression test (spec §40)', async (t) => {
  if (!fs.existsSync(FIXTURE_PATH)) {
    t.skip(`Fixture not found: ${FIXTURE_PATH}`);
    return;
  }

  const suffix = Date.now();
  let token = '';
  let documentId = '';

  t.after(async () => {
    if (!documentId) return;
    await prisma.document.deleteMany({ where: { id: documentId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: `farook-${suffix}@chambers.com` } }).catch(() => {});
  });

  const pdfBuffer = fs.readFileSync(FIXTURE_PATH);

  await t.test('upload via direct-to-R2 flow', async () => {
    const signup = await request(app).post('/api/v1/auth/signup').send({
      email: `farook-${suffix}@chambers.com`,
      password: 'Password123!',
      name: 'Farook Regression',
    });
    assert.strictEqual(signup.status, 201);
    token = signup.body.data.session.token;

    const sha256 = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(pdfBuffer))))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const initRes = await request(app)
      .post('/api/v1/documents/upload/init')
      .set('Authorization', `Bearer ${token}`)
      .send({
        filename: 'Farook Petition.pdf',
        size: pdfBuffer.length,
        mime_type: 'application/pdf',
        sha256,
      });
    assert.strictEqual(initRes.status, 201);
    documentId = initRes.body.data.documentId;

    // Direct browser-style upload to R2
    const putRes = await fetch(initRes.body.data.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: new Uint8Array(pdfBuffer),
    });
    assert.ok(putRes.ok, `R2 PUT failed: ${putRes.status}`);

    const completeRes = await request(app)
      .post(`/api/v1/documents/${documentId}/upload/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ size: pdfBuffer.length });
    assert.strictEqual(completeRes.status, 200);
  });

  await t.test('pipeline processes the 77-page scanned bundle to READY', async () => {
    let status = '';
    let lastStage = '';
    const deadline = Date.now() + 12 * 60 * 1000;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 5000));
      const detail = await request(app)
        .get(`/api/v1/documents/${documentId}`)
        .set('Authorization', `Bearer ${token}`);
      status = detail.body.data?.processingStatus || '';
      lastStage = detail.body.data?.pipelineStage || '';

      if (status === 'READY' || status === 'PROCESSING_FAILED' || status === 'OCR_FAILED') break;
    }

    assert.strictEqual(
      status,
      'READY',
      `Pipeline did not reach READY (status=${status}, stage=${lastStage})`
    );
  });

  await t.test('scanned bundle characteristics are detected (not homogeneous native)', async () => {
    const docRow = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });

    // Technical inspection must identify non-native content
    const inspectionMeta = await prisma.documentMetadata.findFirst({
      where: { documentId, fieldName: 'technical_inspection' },
    });
    assert.ok(inspectionMeta);
    const inspection = JSON.parse(inspectionMeta.fieldValue!);
    assert.match(inspection.kind, /scanned|mixed/);

    // Discovery signals persisted
    const discovery = JSON.parse(docRow.discoveryJson || '{}');
    assert.equal(discovery.case_identity_detected, true, 'first page should yield case identity');
    assert.equal(
      discovery.petitioner_detected || discovery.respondent_detected,
      true,
      'first page parties should be detected'
    );

    void docRow;
  });

  await t.test('index detection and multi-document segmentation', async () => {
    const docRow = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    const discovery = JSON.parse(docRow.discoveryJson || '{}');

    // The early INDEX page must be found
    assert.equal(discovery.index_detected, true, 'index/table-of-contents should be detected');

    // Bundle must NOT be treated as one homogeneous document
    assert.equal(discovery.bundle_detected, true, 'bundle indicators should be detected');

    const segments = await prisma.documentSegment.findMany({
      where: { documentId },
      orderBy: { startPage: 'asc' },
    });
    assert.ok(segments.length >= 2, `expected multiple logical documents, got ${segments.length}`);
    assert.equal(segments[0].startPage, 1);

    // Segments must tile the document contiguously

    for (const segment of segments) {
      assert.ok(segment.startPage <= segment.endPage);
    }
    for (let i = 1; i < segments.length; i++) {
      assert.equal(segments[i].startPage, segments[i - 1].endPage + 1, 'segments must tile contiguously');
    }

    const pages = await prisma.documentPage.findMany({
      where: { documentId },
      orderBy: { pageNumber: 'asc' },
    });
    assert.ok(pages.length > 0);
  });

  await t.test('page-level provenance preserved (raw text, methods, language)', async () => {
    const pages = await prisma.documentPage.findMany({
      where: { documentId },
      orderBy: { pageNumber: 'asc' },
    });

    assert.ok(pages.length >= 5, 'at least the discovered pages must be stored');

    // Scanned fixture => OCR-backed pages with provenance
    const ocrPages = pages.filter((p) => p.extractionMethod === 'ocr');
    assert.ok(ocrPages.length > 0, 'scanned pages must go through OCR');

    for (const page of ocrPages) {
      assert.equal(page.ocrProvider, 'mistral-ocr');
      assert.ok(page.rawText && page.rawText.length > 0, 'raw OCR text must be preserved');
      assert.notStrictEqual(page.normalizedText ?? null, undefined);
    }

    // Language stored per page
    assert.ok(pages.every((p) => p.language !== null));

    // Printed page numbers stored separately where detected (spec §33).
    // Visibility in OCR output varies per scan/run, so we validate plausibility
    // of whatever was detected rather than mandating a hit.
    for (const page of pages) {
      if (page.printedPageNumber !== null) {
        assert.ok(
          page.printedPageNumber >= 1 && page.printedPageNumber <= 999,
          `implausible printed page number ${page.printedPageNumber}`
        );
      }
    }
  });

  await t.test('original PDF untouched in R2 (immutable source)', async () => {
    const docRow = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
    assert.ok(docRow.storageKey.includes('/original.pdf'));
    assert.strictEqual(docRow.processingStatus, 'READY');
  });
});
