import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/db/client.js';

test('Express Case Matching & Filing Pipeline Integration Tests (Milestone 5)', async (t) => {
  let tokenOrgA = '';
  let tokenOrgB = '';
  let caseId1 = '';
  let caseId2 = '';
  let docIdAuto = '';
  let docIdAmbiguous = '';

  const samplePdfAutoMatch = Buffer.from(
    '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\nIN THE HIGH COURT OF JUDICATURE AT BOMBAY\nCOMMERCIAL SUIT NOTICE OF MOTION NO. 1024 OF 2026\nCNR NUMBER: MHXX010012342025\nBETWEEN Mehta Enterprises PLAINTIFF AND Shah Logistics DEFENDANT\nDATED 15/08/2026\nIT IS ORDERED THAT INTERIM INJUNCTION IS GRANTED.\n%%EOF'
  );

  const samplePdfAmbiguous = Buffer.from(
    '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\nIN THE HIGH COURT OF JUDICATURE AT BOMBAY\nMISCELLANEOUS APPLICATION NO. 7777 OF 2026\nBETWEEN Patel Developers PETITIONER\nDATED 15/08/2026\nNOTICE ISSUED TO RESPONDENTS.\n%%EOF'
  );

  const cleanup = async () => {
    await prisma.organization.deleteMany({
      where: { users: { some: { email: { contains: 'matching-' } } } },
    }).catch(() => {});
  };

  await t.test('Setup: Register Users, create Organizations & Cases', async () => {
    await cleanup();

    // 1. User A & Org A
    const resA = await request(app).post('/api/v1/auth/signup').send({
      email: `matching-a-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@chambers.com`,
      password: 'Password123!',
      name: 'Advocate Match Alpha',
    });
    assert.strictEqual(resA.status, 201);
    tokenOrgA = resA.body.data.session.token;

    const orgResA = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ name: `Matching Test Org Alpha ${Date.now()}` });
    assert.strictEqual(orgResA.status, 201);

    // 2. User B & Org B
    const resB = await request(app).post('/api/v1/auth/signup').send({
      email: `matching-b-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@chambers.com`,
      password: 'Password123!',
      name: 'Advocate Match Beta',
    });
    assert.strictEqual(resB.status, 201);
    tokenOrgB = resB.body.data.session.token;

    const orgResB = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ name: `Matching Test Org Beta ${Date.now()}` });
    assert.strictEqual(orgResB.status, 201);

    // 3. Create Case 1 & Case 2 in Org A
    const case1Res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({
        title: 'Mehta Enterprises vs Shah Logistics Injunction',
        caseNumber: 'COMMERCIAL SUIT NO. 1024 OF 2026',
        cnrNumber: 'MHXX010012342025',
        clientName: 'Mehta Enterprises',
        opposingParty: 'Shah Logistics',
        court: 'High Court of Bombay',
      });
    assert.strictEqual(case1Res.status, 201);
    caseId1 = case1Res.body.data.id;

    const case2Res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({
        title: 'Patel Land Petition',
        caseNumber: 'W.P. 5050 OF 2025',
        cnrNumber: 'MHXX010099992025',
        clientName: 'Patel Developers',
        court: 'High Court of Bombay',
      });
    assert.strictEqual(case2Res.status, 201);
    caseId2 = case2Res.body.data.id;
  });

  await t.test('Auto-Matching Pipeline: High confidence upload automatically matches Case 1', async () => {
    // Upload document
    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .attach('file', samplePdfAutoMatch, 'Commercial_Suit_Notice.pdf');

    assert.ok(uploadRes.status === 201 || uploadRes.status === 200);
    docIdAuto = uploadRes.body.data.id;

    // Run extraction & matching pipeline
    const extractRes = await request(app)
      .post(`/api/v1/documents/${docIdAuto}/extract`)
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(extractRes.status, 200);
    assert.strictEqual(extractRes.body.data.matchStatus, 'AUTO_MATCHED');
    assert.strictEqual(extractRes.body.data.status, 'FILED');
    assert.strictEqual(extractRes.body.data.document.caseId, caseId1);
  });

  await t.test('Ambiguous Matching Pipeline: Partial signals trigger CONFIRMATION_REQUIRED', async () => {
    // Upload document
    const uploadRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .attach('file', samplePdfAmbiguous, 'Patel_Application.pdf');

    assert.ok(uploadRes.status === 201 || uploadRes.status === 200);
    docIdAmbiguous = uploadRes.body.data.id;

    // Run extraction & matching pipeline
    const extractRes = await request(app)
      .post(`/api/v1/documents/${docIdAmbiguous}/extract`)
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(extractRes.status, 200);
    assert.strictEqual(extractRes.body.data.matchStatus, 'CONFIRMATION_REQUIRED');
    assert.strictEqual(extractRes.body.data.status, 'AWAITING_CONFIRMATION');
    assert.strictEqual(extractRes.body.data.document.caseId, null);
  });

  await t.test('Confirm Match API: User confirms caseId2 for ambiguous upload', async () => {
    const confirmRes = await request(app)
      .post(`/api/v1/documents/${docIdAmbiguous}/confirm-match`)
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ caseId: caseId2 });

    assert.strictEqual(confirmRes.status, 200);
    assert.strictEqual(confirmRes.body.data.matchStatus, 'CONFIRMED');
    assert.strictEqual(confirmRes.body.data.processingStatus, 'FILED');
    assert.strictEqual(confirmRes.body.data.caseId, caseId2);
    assert.ok(confirmRes.body.data.systemFilename.includes('W_P__5050_OF_2025'));
  });

  await t.test('Reassignment API: User reassigns document from Case 2 to Case 1', async () => {
    const reassignRes = await request(app)
      .post(`/api/v1/documents/${docIdAmbiguous}/reassign`)
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ newCaseId: caseId1, reason: 'Correcting document assignment to main commercial suit' });

    assert.strictEqual(reassignRes.status, 200);
    assert.strictEqual(reassignRes.body.data.matchStatus, 'REASSIGNED');
    assert.strictEqual(reassignRes.body.data.caseId, caseId1);
  });

  await t.test('Cross-Tenant Security: User B cannot confirm or reassign User A documents', async () => {
    const confirmResB = await request(app)
      .post(`/api/v1/documents/${docIdAuto}/confirm-match`)
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ caseId: caseId1 });

    assert.strictEqual(confirmResB.status, 404);

    const reassignResB = await request(app)
      .post(`/api/v1/documents/${docIdAuto}/reassign`)
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ newCaseId: caseId2 });

    assert.strictEqual(reassignResB.status, 404);
  });

  t.after(async () => {
    await cleanup();
  });
});
