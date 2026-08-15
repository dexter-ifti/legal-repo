import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/db/client.js';

test('Express Case CRUD & Multi-Tenant Isolation Integration Tests', async (t) => {
  let tokenOrgA = '';
  let tokenOrgB = '';
  let createdCaseId = '';

  const userA = {
    email: `case-user-a-${Date.now()}@chambers-a.com`,
    password: 'Password123!',
    name: 'Advocate A',
  };

  const userB = {
    email: `case-user-b-${Date.now()}@chambers-b.com`,
    password: 'Password123!',
    name: 'Advocate B',
  };

  await t.test('Setup: Register User A and User B in distinct organizations', async () => {
    const resA = await request(app).post('/api/v1/auth/signup').send(userA);
    tokenOrgA = resA.body.data.session.token;
    const userAId = resA.body.data.user.id;

    // Create a new unique firm for User A so orgA has a clean state
    const newOrgResA = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ name: `Clean Chambers A ${Date.now()}` });

    assert.strictEqual(newOrgResA.status, 201);

    // Elevate userA to ADMIN so they have delete permissions
    await prisma.user.update({
      where: { id: userAId },
      data: { role: 'ADMIN' },
    });

    const resB = await request(app).post('/api/v1/auth/signup').send(userB);
    tokenOrgB = resB.body.data.session.token;

    // User B creates a new firm so they have a separate organizationId
    const newOrgResB = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ name: `Clean Chambers B ${Date.now()}` });

    assert.strictEqual(newOrgResB.status, 201);
  });

  await t.test('POST /api/v1/cases creates a new case for Organization A', async () => {
    const casePayload = {
      title: 'Mehta vs. Union of India',
      caseNumber: 'SLP/2026/808',
      cnrNumber: 'DLHC010098762026',
      court: 'Supreme Court of India',
      judge: 'Hon. Chief Justice',
      clientName: 'Sunil Mehta',
      opposingParty: 'Union of India',
      caseType: 'Special Leave Petition',
      notes: 'Constitutional matter pending hearing',
    };

    const res = await request(app)
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send(casePayload);

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.case.id);
    assert.strictEqual(res.body.data.case.title, 'Mehta vs. Union of India');
    assert.strictEqual(res.body.data.case.status, 'ACTIVE');

    createdCaseId = res.body.data.case.id;
  });

  await t.test('GET /api/v1/cases lists cases for Organization A', async () => {
    const res = await request(app)
      .get('/api/v1/cases')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.cases));
    assert.strictEqual(res.body.data.cases.length, 1);
    assert.strictEqual(res.body.data.pagination.total, 1);
  });

  await t.test('GET /api/v1/cases?search=Mehta filters cases by search keyword', async () => {
    const res = await request(app)
      .get('/api/v1/cases?search=Mehta')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.cases.length, 1);
    assert.strictEqual(res.body.data.cases[0].id, createdCaseId);
  });

  await t.test('GET /api/v1/cases/:id retrieves case details for owner', async () => {
    const res = await request(app)
      .get(`/api/v1/cases/${createdCaseId}`)
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.case.id, createdCaseId);
  });

  await t.test('PATCH /api/v1/cases/:id updates case fields', async () => {
    const res = await request(app)
      .patch(`/api/v1/cases/${createdCaseId}`)
      .set('Authorization', `Bearer ${tokenOrgA}`)
      .send({ status: 'IN_HEARING', notes: 'Hearing scheduled for next Monday' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.case.status, 'IN_HEARING');
    assert.strictEqual(res.body.data.case.notes, 'Hearing scheduled for next Monday');
  });

  await t.test('Tenant Isolation: User B cannot access or update Organization A case', async () => {
    const getRes = await request(app)
      .get(`/api/v1/cases/${createdCaseId}`)
      .set('Authorization', `Bearer ${tokenOrgB}`);

    assert.strictEqual(getRes.status, 404);

    const patchRes = await request(app)
      .patch(`/api/v1/cases/${createdCaseId}`)
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ title: 'Hacked Title' });

    assert.strictEqual(patchRes.status, 404);
  });

  await t.test('DELETE /api/v1/cases/:id removes case record when ADMIN', async () => {
    const delRes = await request(app)
      .delete(`/api/v1/cases/${createdCaseId}`)
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);

    const getRes = await request(app)
      .get(`/api/v1/cases/${createdCaseId}`)
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(getRes.status, 404);
  });
});
