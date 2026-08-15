import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../src/app.js';

test('Express Organization & Tenant Isolation Integration Tests', async (t) => {
  const userA = {
    email: `advocate-a-${Date.now()}@chambers.com`,
    password: 'Password123!',
    name: 'Advocate A',
  };

  const userB = {
    email: `advocate-b-${Date.now()}@chambers.com`,
    password: 'Password123!',
    name: 'Advocate B',
  };

  let tokenA = '';
  let tokenB = '';

  await t.test('Setup: Register User A and User B', async () => {
    const resA = await request(app).post('/api/v1/auth/signup').send(userA);
    assert.strictEqual(resA.status, 201);
    tokenA = resA.body.data.session.token;

    const resB = await request(app).post('/api/v1/auth/signup').send(userB);
    assert.strictEqual(resB.status, 201);
    tokenB = resB.body.data.session.token;
  });

  await t.test('GET /api/v1/organizations/me returns active organization profile', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/me')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.organization.id);
    assert.ok(res.body.data.organization.name);
  });

  await t.test('POST /api/v1/organizations creates a new custom firm', async () => {
    const res = await request(app)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'High Court Advocates Association' });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.organization.name, 'High Court Advocates Association');
  });

  await t.test('PATCH /api/v1/organizations/me updates organization name when ADMIN', async () => {
    const res = await request(app)
      .patch('/api/v1/organizations/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'High Court Advocates Chambers LLP' });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.organization.name, 'High Court Advocates Chambers LLP');
  });

  await t.test('GET /api/v1/organizations/me/members returns isolated member roster', async () => {
    const res = await request(app)
      .get('/api/v1/organizations/me/members')
      .set('Authorization', `Bearer ${tokenA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.members));
    assert.strictEqual(res.body.data.members.length, 1);
    assert.strictEqual(res.body.data.members[0].email, userA.email);
  });

  await t.test('Tenant Isolation: User B cannot see members of User A organization', async () => {
    const resB = await request(app)
      .get('/api/v1/organizations/me/members')
      .set('Authorization', `Bearer ${tokenB}`);

    assert.strictEqual(resB.status, 200);
    const emailsInB = resB.body.data.members.map((m: { email: string }) => m.email);
    assert.strictEqual(emailsInB.includes(userA.email), false);
  });
});
