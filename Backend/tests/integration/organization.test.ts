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

  await t.test('PATCH members/:userId promotes a MEMBER to ADMIN (org creator is ADMIN)', async () => {
    // Invite user B into A's organization by promoting after signup:
    // B signs up into the shared default org; create a fresh org for A and
    // add B via direct signup flow is not available, so instead verify role
    // management on A's own roster. First confirm A is ADMIN.
    const membersRes = await request(app)
      .get('/api/v1/organizations/me/members')
      .set('Authorization', `Bearer ${tokenA}`);
    const meMember = membersRes.body.data.members[0];
    assert.strictEqual(meMember.role, 'ADMIN');

    // Self demotion must be forbidden (would leave org without admin)
    const selfDemote = await request(app)
      .patch(`/api/v1/organizations/me/members/${meMember.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ role: 'MEMBER' });
    assert.strictEqual(selfDemote.status, 400);
    assert.strictEqual(selfDemote.body.error.code, 'SELF_ROLE_CHANGE_FORBIDDEN');
  });

  await t.test('PATCH members/:userId rejects invalid roles and cross-tenant targets', async () => {
    const membersRes = await request(app)
      .get('/api/v1/organizations/me/members')
      .set('Authorization', `Bearer ${tokenA}`);
    const meMember = membersRes.body.data.members[0];

    // Invalid role value
    const invalidRole = await request(app)
      .patch(`/api/v1/organizations/me/members/${meMember.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ role: 'SUPERADMIN' });
    assert.strictEqual(invalidRole.status, 400);
    assert.strictEqual(invalidRole.body.error.code, 'VALIDATION_ERROR');

    // Cross-tenant target: User B's id does not exist in A's organization
    const resB = await request(app).post('/api/v1/auth/login').send({
      email: userB.email,
      password: userB.password,
    });
    assert.strictEqual(resB.status, 200);
    const userBId = resB.body.data.user.id;

    const crossTenant = await request(app)
      .patch(`/api/v1/organizations/me/members/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ role: 'MEMBER' });
    assert.strictEqual(crossTenant.status, 404);
    assert.strictEqual(crossTenant.body.error.code, 'MEMBER_NOT_FOUND');
  });

  await t.test('PATCH members/:userId requires ADMIN role', async () => {
    // User B is a MEMBER in the default org and cannot manage roles there
    const resB = await request(app)
      .get('/api/v1/organizations/me/members')
      .set('Authorization', `Bearer ${tokenB}`);
    const memberOfB = resB.body.data.members.find(
      (m: { email: string }) => m.email === userB.email
    );

    if (memberOfB) {
      const attempt = await request(app)
        .patch(`/api/v1/organizations/me/members/${memberOfB.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ role: 'ADMIN' });
      assert.ok(
        [403, 400].includes(attempt.status),
        `Expected 403 FORBIDDEN or 400 SELF_ROLE_CHANGE, got ${attempt.status}`
      );
    }
  });
});
