import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/db/client.js';
import { findSourcePage } from '../../src/services/extraction/metadata-extraction.service.js';

test('findSourcePage resolves the origin page of extracted values', () => {
  const pages = new Map<number, string>([
    [1, 'PROFORMA FOR FRESH FILING\nPetitioner — Farook Ali & Ors'],
    [2, 'INDEX\n1. Writ Petition .... 1'],
    [3, 'WRIT PETITION NO. 1234 OF 2026\nIN THE HIGH COURT'],
  ]);

  assert.equal(findSourcePage(pages, 'Farook Ali & Ors'), 1);
  // Whitespace-insensitive: OCR line breaks must not hide matches.
  assert.equal(findSourcePage(pages, 'Writ   Petition\nNo. 1234'), 3);
  assert.equal(findSourcePage(pages, 'Not Present Anywhere'), null);
});

test('PATCH /api/v1/documents/:id/metadata — user field correction', async (t) => {
  let tokenOrgA = '';
  let tokenOrgB = '';
  let docIdOrgA = '';

  await t.test('Setup: register users, create org + document', async () => {
    await prisma.organization.deleteMany({
      where: { name: { startsWith: 'Metadata Edit Test Org' } },
    });

    const resA = await request(app).post('/api/v1/auth/signup').send({
      email: `meta-edit-a-${Date.now()}@chambers.com`,
      password: 'Password123!',
      name: 'Advocate Alpha',
    });
    tokenOrgA = resA.body.data.session.token;

    const resB = await request(app).post('/api/v1/auth/signup').send({
      email: `meta-edit-b-${Date.now()}@chambers.com`,
      password: 'Password123!',
      name: 'Advocate Beta',
    });
    tokenOrgB = resB.body.data.session.token;

    const orgRes = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ name: `Metadata Edit Test Org A ${Date.now()}` });
    assert.strictEqual(orgRes.status, 201);

    const docRes = await request(app)
      .post('/api/v1/documents/upload/init')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ filename: 'edit-test.pdf', size: 1024, mime_type: 'application/pdf' });
    assert.strictEqual(docRes.status, 201);
    docIdOrgA = docRes.body.data.documentId;
  });

  await t.test('creates a USER-sourced metadata row with audit event', async () => {
    const res = await request(app)
      .patch(`/api/v1/documents/${docIdOrgA}/metadata`)
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ fieldName: 'client_name', fieldValue: 'Farook Ali & Ors' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.metadata.source, 'USER');
    assert.strictEqual(res.body.data.metadata.fieldValue, 'Farook Ali & Ors');

    const row = await prisma.documentMetadata.findFirst({
      where: { documentId: docIdOrgA, fieldName: 'client_name' },
    });
    assert.ok(row);
    assert.strictEqual(row.source, 'USER');

    const audit = await prisma.auditEvent.findFirst({
      where: { entityId: docIdOrgA, eventType: 'METADATA_CORRECTED' },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(audit);
    assert.strictEqual(audit.metadata?.fieldName, 'client_name');
    assert.strictEqual(audit.metadata?.newValue, 'Farook Ali & Ors');
  });

  await t.test('updates an existing row idempotently, preserving provenance', async () => {
    const createRes = await request(app)
      .patch(`/api/v1/documents/${docIdOrgA}/metadata`)
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ fieldName: 'case_number', fieldValue: 'WRIT C 1234 OF 2026' });
    assert.strictEqual(createRes.status, 200);

    const updateRes = await request(app)
      .patch(`/api/v1/documents/${docIdOrgA}/metadata`)
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ fieldName: 'case_number', fieldValue: 'WRIT C 9999 OF 2026' });
    assert.strictEqual(updateRes.status, 200);

    const rows = await prisma.documentMetadata.findMany({
      where: { documentId: docIdOrgA, fieldName: 'case_number' },
    });
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].fieldValue, 'WRIT C 9999 OF 2026');
  });

  await t.test('rejects invalid field names and cross-tenant access', async () => {
    // Unknown field
    const badField = await request(app)
      .patch(`/api/v1/documents/${docIdOrgA}/metadata`)
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ fieldName: 'not_a_real_field', fieldValue: 'x' });
    assert.strictEqual(badField.status, 400);

    // Cross-tenant access is rejected with 404 (no existence leak)
    const crossTenant = await request(app)
      .patch(`/api/v1/documents/${docIdOrgA}/metadata`)
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ fieldName: 'client_name', fieldValue: 'Injected' });
    assert.strictEqual(crossTenant.status, 404);

    const injected = await prisma.documentMetadata.findFirst({
      where: { documentId: docIdOrgA, fieldName: 'client_name', source: 'USER' },
    });
    assert.notStrictEqual(injected?.fieldValue, 'Injected');

    // Unauthenticated
    const noAuth = await request(app)
      .patch(`/api/v1/documents/${docIdOrgA}/metadata`)
      .send({ fieldName: 'client_name', fieldValue: 'x' });
    assert.ok([401, 403].includes(noAuth.status));
  });

  await t.test('Cleanup', async () => {
    await prisma.organization.deleteMany({
      where: { name: { startsWith: 'Metadata Edit Test Org' } },
    });
  });
});
