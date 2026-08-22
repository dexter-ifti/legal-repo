import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/db/client.js';

test('Express Document Understanding Pipeline Integration Tests (Milestone 4)', async (t) => {
  let tokenOrgA = '';
  let tokenOrgB = '';
  let docIdOrgA = '';
  const samplePdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\nIN THE HIGH COURT OF JUDICATURE AT BOMBAY\nCOMMERCIAL SUIT NOTICE OF MOTION NO. 1024 OF 2026\nCNR NUMBER: MHXX010012342025\nBETWEEN Mehta Enterprises PLAINTIFF AND Shah Logistics DEFENDANT\nDATED 15/08/2026\nIT IS ORDERED THAT INTERIM INJUNCTION IS GRANTED.\n%%EOF'
  );

  const cleanup = async () => {
    await prisma.organization.deleteMany({
      where: { users: { some: { email: { contains: 'pipeline-' } } } },
    }).catch(() => {});
  };

  await t.test('Setup: Register User A & User B in distinct organizations and upload PDF', async () => {
    await cleanup();

    // 1. Register User A
    const resA = await request(app).post('/api/v1/auth/signup').send({
      email: `pipeline-a-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@chambers.com`,
      password: 'Password123!',
      name: 'Advocate Pipeline Alpha',
    });
    assert.strictEqual(resA.status, 201);
    tokenOrgA = resA.body.data.session.token;

    const orgResA = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ name: `Pipeline Test Org Alpha ${Date.now()}` });
    assert.strictEqual(orgResA.status, 201);

    // 2. Register User B
    const resB = await request(app).post('/api/v1/auth/signup').send({
      email: `pipeline-b-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@chambers.com`,
      password: 'Password123!',
      name: 'Advocate Pipeline Beta',
    });
    assert.strictEqual(resB.status, 201);
    tokenOrgB = resB.body.data.session.token;

    const orgResB = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ name: `Pipeline Test Org Beta ${Date.now()}` });
    assert.strictEqual(orgResB.status, 201);

    // 3. Upload document for Org A
    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .attach('file', samplePdfBuffer, 'Commercial_Suit_Notice.pdf');

    assert.ok(uploadRes.status === 201 || uploadRes.status === 200);
    docIdOrgA = uploadRes.body.data.id;
    assert.ok(docIdOrgA);
  });

  await t.test('POST /api/v1/documents/:id/extract processes text, metadata, classification, and ends in a terminal status', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docIdOrgA}/extract`)
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'PROCESSING_COMPLETED');
    assert.ok(res.body.data.document.documentType);

    // Verify DB Document status and metadata rows
    const dbDoc = await prisma.document.findUnique({
      where: { id: docIdOrgA },
      include: { metadata: true },
    });

    assert.ok(dbDoc);
    assert.strictEqual(dbDoc.processingStatus, 'PROCESSING_COMPLETED');
    assert.ok(dbDoc.documentType);

    // Check extracted metadata fields in DB
    const fieldNames = dbDoc.metadata.map((m) => m.fieldName);
    assert.ok(fieldNames.includes('extracted_text'));
    assert.ok(fieldNames.includes('case_number'));
    assert.ok(fieldNames.includes('cnr_number'));
    assert.ok(fieldNames.includes('court'));
  });

  await t.test('POST /api/v1/documents/:id/extract rejects cross-tenant processing', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docIdOrgA}/extract`)
      .set('Authorization', `Bearer ${tokenOrgB}`);

    if (res.status !== 404) {
      console.error('CROSS TENANT RES:', res.status, JSON.stringify(res.body, null, 2));
    }

    assert.strictEqual(res.status, 404);
  });

  t.after(async () => {
    await cleanup();
  });
});
