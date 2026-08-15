import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/db/client.js';

test('Duplicate Document Detection & Cross-Tenant Hash Isolation Tests', async (t) => {
  let tokenOrgA = '';
  let tokenOrgB = '';
  let docIdOrgA = '';
  let docIdOrgB = '';

  const sharedPdfBuffer = Buffer.from(
    '%PDF-1.4\n% Shared Test PDF Document Content 2026\n1 0 obj << /Type /Catalog >> endobj\n%%EOF'
  );
  const targetSha256 = crypto.createHash('sha256').update(sharedPdfBuffer).digest('hex');

  await t.test('Setup: Register User A and User B in separate firms', async () => {
    await prisma.organization.deleteMany({
      where: { name: { startsWith: 'Dup Detect Test Org' } },
    });

    // 1. User & Org A
    const resA = await request(app).post('/api/v1/auth/signup').send({
      email: `dup-a-${Date.now()}@firm-a.com`,
      password: 'Password123!',
      name: 'Advocate A',
    });
    tokenOrgA = resA.body.data.session.token;

    const orgResA = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ name: `Dup Detect Test Org Alpha ${Date.now()}` });
    assert.strictEqual(orgResA.status, 201);

    // 2. User & Org B
    const resB = await request(app).post('/api/v1/auth/signup').send({
      email: `dup-b-${Date.now()}@firm-b.com`,
      password: 'Password123!',
      name: 'Advocate B',
    });
    tokenOrgB = resB.body.data.session.token;

    const orgResB = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ name: `Dup Detect Test Org Beta ${Date.now()}` });
    assert.strictEqual(orgResB.status, 201);
  });

  t.after(async () => {
    await prisma.organization.deleteMany({
      where: { name: { startsWith: 'Dup Detect Test Org' } },
    }).catch(() => {});
  });

  await t.test('GET /api/v1/documents/by-hash/:sha256 returns exists: false when unmapped', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/by-hash/${targetSha256}`)
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.exists, false);
    assert.strictEqual(res.body.data.document, null);
  });

  await t.test('POST /api/v1/documents/upload creates fresh document for Org A', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .attach('file', sharedPdfBuffer, 'Firm_A_Original.pdf');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.isDuplicate, false);
    assert.strictEqual(res.body.data.sha256, targetSha256);
    docIdOrgA = res.body.data.id;
    assert.ok(docIdOrgA);
  });

  await t.test('POST /api/v1/documents/upload returns HTTP 200 & isDuplicate: true on duplicate upload in Org A', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .attach('file', sharedPdfBuffer, 'Firm_A_Original_Copy.pdf');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.isDuplicate, true);
    assert.strictEqual(res.body.data.id, docIdOrgA);
  });

  await t.test('GET /api/v1/documents/by-hash/:sha256 returns existing document details in Org A', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/by-hash/${targetSha256}`)
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.exists, true);
    assert.strictEqual(res.body.data.document.id, docIdOrgA);
    assert.strictEqual(res.body.data.document.sha256, targetSha256);
  });

  await t.test('Cross-Tenant Isolation: Org B hash lookup for targetSha256 returns exists: false', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/by-hash/${targetSha256}`)
      .set('Authorization', `Bearer ${tokenOrgB}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.exists, false);
  });

  await t.test('Cross-Tenant Ingestion: Org B uploading same file gets an independent document', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .attach('file', sharedPdfBuffer, 'Firm_B_Independent.pdf');

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.isDuplicate, false);
    docIdOrgB = res.body.data.id;
    assert.ok(docIdOrgB);
    assert.notStrictEqual(docIdOrgB, docIdOrgA);
  });

  await t.test('Cross-Tenant Isolation: Org B hash lookup now returns Org B document', async () => {
    const res = await request(app)
      .get(`/api/v1/documents/by-hash/${targetSha256}`)
      .set('Authorization', `Bearer ${tokenOrgB}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.exists, true);
    assert.strictEqual(res.body.data.document.id, docIdOrgB);
  });

  await t.test('GET /api/v1/documents/by-hash/:sha256 rejects invalid hash format', async () => {
    const res = await request(app)
      .get('/api/v1/documents/by-hash/invalid-short-hash')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_HASH');
  });
});
