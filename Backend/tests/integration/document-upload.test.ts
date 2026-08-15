import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/db/client.js';

test('Express PDF Document Upload API Integration Tests', async (t) => {
  let tokenOrgA = '';
  let tokenOrgB = '';
  let caseIdOrgA = '';
  let docIdOrgA = '';

  // Minimal valid PDF header buffer (%PDF-1.4 ...)
  const validPdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
  );
  const invalidTxtBuffer = Buffer.from('This is a plain text file, not a legal PDF document.');

  await t.test('Setup: Register User A and User B in distinct organizations', async () => {
    // Cleanup prior test records
    await prisma.organization.deleteMany({
      where: { name: { startsWith: 'Doc Upload Test Org' } },
    });

    // 1. Register User A
    const resA = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `doc-upload-a-${Date.now()}@chambers.com`,
        password: 'Password123!',
        name: 'Advocate Alpha',
      });
    tokenOrgA = resA.body.data.session.token;

    const orgResA = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ name: `Doc Upload Test Org Alpha ${Date.now()}` });
    assert.strictEqual(orgResA.status, 201);

    // 2. Register User B
    const resB = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: `doc-upload-b-${Date.now()}@chambers.com`,
        password: 'Password123!',
        name: 'Advocate Beta',
      });
    tokenOrgB = resB.body.data.session.token;

    const orgResB = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ name: `Doc Upload Test Org Beta ${Date.now()}` });
    assert.strictEqual(orgResB.status, 201);

    // 3. Create Case in Org A
    const caseRes = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({
        title: 'State vs. Mehta & Ors.',
        caseNumber: 'WP/2026/999',
      });

    assert.strictEqual(caseRes.status, 201);
    caseIdOrgA = caseRes.body.data.case.id;
    assert.ok(caseIdOrgA);
  });

  t.after(async () => {
    await prisma.organization.deleteMany({
      where: { name: { startsWith: 'Doc Upload Test Org' } },
    }).catch(() => {});
  });

  await t.test('POST /api/v1/documents/upload supports "Upload First" without caseId', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .attach('file', validPdfBuffer, 'Initial_Unassigned_Notice.pdf');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.caseId, null);
    assert.strictEqual(res.body.data.originalFilename, 'Initial_Unassigned_Notice.pdf');
    assert.strictEqual(res.body.data.processingStatus, 'UPLOADED');
    assert.strictEqual(res.body.data.matchStatus, 'NOT_STARTED');
    assert.ok(res.body.data.sha256);
    assert.ok(res.body.data.storageKey);

    docIdOrgA = res.body.data.id;
  });

  await t.test('POST /api/v1/documents/upload accepts valid caseId', async () => {
    const customPdfBuffer = Buffer.from(
      '%PDF-1.4\n% Custom PDF for Case Assignment Test\n%%EOF'
    );
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .field('caseId', caseIdOrgA)
      .field('documentType', 'PETITION')
      .attach('file', customPdfBuffer, 'Writ_Petition_Final.pdf');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.caseId, caseIdOrgA);
    assert.strictEqual(res.body.data.documentType, 'PETITION');
  });

  await t.test('POST /api/v1/documents/upload rejects non-PDF file content', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .attach('file', invalidTxtBuffer, 'Fake_PDF.pdf');

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_PDF_FORMAT');
  });

  await t.test('POST /api/v1/documents/upload enforces cross-tenant boundary isolation', async () => {
    // Org B attempts to attach document to Org A's case
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .field('caseId', caseIdOrgA)
      .attach('file', validPdfBuffer, 'Cross_Tenant_Brief.pdf');

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'CASE_NOT_FOUND');
  });

  await t.test('POST /api/v1/documents/upload handles duplicate file upload idempotently', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .attach('file', validPdfBuffer, 'Initial_Unassigned_Notice.pdf');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.isDuplicate, true);
    assert.strictEqual(res.body.data.id, docIdOrgA);
  });

  await t.test('GET /api/v1/documents/:id retrieves document details for owner', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${docIdOrgA}`)
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.id, docIdOrgA);
    assert.strictEqual(res.body.data.originalFilename, 'Initial_Unassigned_Notice.pdf');
  });

  await t.test('GET /api/v1/documents/:id returns 404 for cross-tenant request', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/${docIdOrgA}`)
      .set('Authorization', `Bearer ${tokenOrgB}`);

    assert.strictEqual(res.status, 404);
  });
});
