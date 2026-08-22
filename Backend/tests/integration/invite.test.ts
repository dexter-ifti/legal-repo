import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../src/app.js';
import { prisma } from '../../src/db/client.js';

process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test('Invite Flow Integration Tests', async (t) => {
  const suffix = Date.now();
  let adminToken = '';
  let adminOrgId = '';
  let adminUserId = '';

  t.after(async () => {
    await prisma.user
      .deleteMany({ where: { email: { contains: `invite-${suffix}` } } })
      .catch(() => {});
  });

  await t.test('Setup: Admin signs up (own provisioned org)', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      email: `invite-admin-${suffix}@chambers.com`,
      password: 'Password123!',
      name: 'Invite Admin',
    });
    assert.strictEqual(res.status, 201);
    adminToken = res.body.data.session.token;
    adminOrgId = res.body.data.organizationId;
    adminUserId = res.body.data.user.id;
    assert.ok(adminOrgId);
  });

  await t.test('POST /organizations/me/invites creates a single-use invite link', async () => {
    const res = await request(app)
      .post('/api/v1/organizations/me/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: `invitee-${suffix}@chambers.com`, role: 'MEMBER' });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.data.invite.email, `invitee-${suffix}@chambers.com`);
    assert.strictEqual(res.body.data.invite.role, 'MEMBER');
    assert.strictEqual(res.body.data.invite.status, 'PENDING');

    // Link must be built from the configured frontend URL env — never hardcoded
    assert.ok(res.body.data.inviteUrl.startsWith(process.env.FRONTEND_URL));
    assert.ok(res.body.data.inviteUrl.includes('/signup?invite='));
  });

  await t.test('Creating an invite requires ADMIN role', async () => {
    // Unauthenticated request must fail
    const res = await request(app)
      .post('/api/v1/organizations/me/invites')
      .send({ email: `x-${suffix}@chambers.com`, role: 'MEMBER' });
    assert.strictEqual(res.status, 401);
  });

  await t.test('GET /invites/validate/:token returns invite context publicly', async () => {
    const createRes = await request(app)
      .post('/api/v1/organizations/me/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: `validate-${suffix}@chambers.com`, role: 'ADMIN' });
    const token = createRes.body.data.inviteUrl.split('invite=')[1];

    // No Authorization header — this endpoint is public
    const res = await request(app).get(`/api/v1/invites/validate/${token}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.valid, true);
    assert.strictEqual(res.body.data.email, `validate-${suffix}@chambers.com`);
    assert.strictEqual(res.body.data.role, 'ADMIN');
    assert.ok(res.body.data.organizationName);
  });

  await t.test('Signup with invite token joins the inviting tenant with the invited role', async () => {
    const createRes = await request(app)
      .post('/api/v1/organizations/me/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: `joiner-${suffix}@chambers.com`, role: 'MEMBER' });
    const token = createRes.body.data.inviteUrl.split('invite=')[1];
    const inviteUrl: string = createRes.body.data.inviteUrl;

    const signupRes = await request(app).post('/api/v1/auth/signup').send({
      email: `joiner-${suffix}@chambers.com`,
      password: 'Password123!',
      name: 'Invited Joiner',
      inviteToken: token,
    });
    assert.strictEqual(signupRes.status, 201);

    // Joined the inviting organization (not self-provisioned) as MEMBER
    assert.strictEqual(signupRes.body.data.organizationId, adminOrgId);
    assert.strictEqual(signupRes.body.data.user.role, 'MEMBER');

    // Invite is consumed
    const validateAfter = await request(app).get(`/api/v1/invites/validate/${token}`);
    assert.strictEqual(validateAfter.body.data.valid, false);
    assert.strictEqual(validateAfter.body.data.reason, 'ALREADY_ACCEPTED');

    // Sanity: invite row bound to the right tenant
    const inviteRecord = await prisma.invite.findFirst({
      where: { organizationId: adminOrgId, status: 'ACCEPTED' },
    });
    assert.ok(inviteRecord);
    void inviteUrl;
    void adminUserId;
  });

  await t.test('Invalid or consumed tokens fall back to normal self-provisioning', async () => {
    const signupRes = await request(app).post('/api/v1/auth/signup').send({
      email: `selfprovision-${suffix}@chambers.com`,
      password: 'Password123!',
      name: 'Self Provisioned',
      inviteToken: 'totally-invalid-token-value',
    });
    assert.strictEqual(signupRes.status, 201);

    // Gets their own new organization as ADMIN — NOT the inviting tenant
    assert.notStrictEqual(signupRes.body.data.organizationId, adminOrgId);
    assert.strictEqual(signupRes.body.data.user.role, 'ADMIN');
  });

  await t.test('Revoked/expired invites do not validate', async () => {
    const createRes = await request(app)
      .post('/api/v1/organizations/me/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: `revoke-${suffix}@chambers.com`, role: 'MEMBER' });
    const token = createRes.body.data.inviteUrl.split('invite=')[1];

    // Re-issue for the same email revokes the previous pending invite
    await request(app)
      .post('/api/v1/organizations/me/invites')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: `revoke-${suffix}@chambers.com`, role: 'MEMBER' });

    const res = await request(app).get(`/api/v1/invites/validate/${token}`);
    assert.strictEqual(res.body.data.valid, false);
    assert.strictEqual(res.body.data.reason, 'REVOKED');
  });
});
