import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/db/client.js';

test('Express Document Text Extraction API Integration Tests', async (t) => {
  let tokenOrgA = '';
  let tokenOrgB = '';
  let docIdOrgA = '';

  const samplePdfBuffer = Buffer.from(
    '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\nBEFORE THE HONBLE HIGH COURT OF BOMBAY\nCOMMERCIAL SUIT NO. 1024 OF 2026\nPLAINTIFF: MEHTA & SONS LTD\nDEFENDANT: STATE OF MAHARASHTRA\n%%EOF'
  );

  await t.test('Setup: Register User A and User B in distinct organizations', async () => {
    // Cleanup prior test records
    await prisma.user.deleteMany({
      where: { email: { contains: 'extract-' } },
    }).catch(() => {});
    await prisma.organization.deleteMany({
      where: { name: { startsWith: 'Doc Extract Test Org' } },
    }).catch(() => {});

    // 1. User & Org A
    const resA = await request(app).post('/api/v1/auth/signup').send({
      email: `extract-a-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@chambers.com`,
      password: 'Password123!',
      name: 'Advocate Extraction Alpha',
    });
    if (resA.status !== 201) {
      console.log('SIGNUP A ERROR:', JSON.stringify(resA.body, null, 2));
    }
    assert.strictEqual(resA.status, 201);
    tokenOrgA = resA.body.data.session.token;

    const orgResA = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ name: `Doc Extract Test Org Alpha ${Date.now()}-${Math.random().toString(36).substring(2, 7)}` });
    assert.strictEqual(orgResA.status, 201);

    // 2. User & Org B
    const resB = await request(app).post('/api/v1/auth/signup').send({
      email: `extract-b-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@chambers.com`,
      password: 'Password123!',
      name: 'Advocate Extraction Beta',
    });
    assert.strictEqual(resB.status, 201);
    tokenOrgB = resB.body.data.session.token;

    const orgResB = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ name: `Doc Extract Test Org Beta ${Date.now()}` });
    assert.strictEqual(orgResB.status, 201);

    // 3. Upload Document in Org A
    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .attach('file', samplePdfBuffer, 'Commercial_Suit_Notice.pdf');

    assert.strictEqual(uploadRes.status, 201);
    docIdOrgA = uploadRes.body.data.id;
    assert.ok(docIdOrgA);
  });

  t.after(async () => {
    await prisma.organization.deleteMany({
      where: { name: { startsWith: 'Doc Extract Test Org' } },
    }).catch(() => {});
  });

  await t.test('POST /api/v1/documents/:id/extract extracts text, metadata, classifies, and ends in a terminal status', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docIdOrgA}/extract`)
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'PROCESSING_COMPLETED');
    assert.ok(res.body.data.text.includes('HIGH COURT OF BOMBAY') || res.body.data.text.includes('COMMERCIAL SUIT'));

    // Check DB record
    const dbDoc = await prisma.document.findUnique({
      where: { id: docIdOrgA },
      include: { metadata: true },
    });
    assert.strictEqual(dbDoc?.processingStatus, 'PROCESSING_COMPLETED');

    const textMeta = dbDoc?.metadata.find((m) => m.fieldName === 'extracted_text');
    assert.ok(textMeta);
    assert.ok(textMeta.fieldValue?.includes('HIGH COURT OF BOMBAY') || textMeta.fieldValue?.includes('COMMERCIAL SUIT'));
  });

  await t.test('POST /api/v1/documents/:id/extract enforces cross-tenant boundary security', async () => {
    const res = await request(app)
      .post(`/api/v1/documents/${docIdOrgA}/extract`)
      .set('Authorization', `Bearer ${tokenOrgB}`);

    assert.strictEqual(res.status, 404);
  });
});
