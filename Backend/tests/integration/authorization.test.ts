import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import express, { Express, Response } from 'express';
import { authenticateToken } from '../../src/middleware/auth.middleware.js';
import { requireTenant, TenantRequest } from '../../src/middleware/tenant.middleware.js';
import { authorizeResourceOwnership } from '../../src/middleware/authz.middleware.js';
import { sendSuccess } from '../../src/utils/api-response.js';
import { app as mainApp } from '../../src/app.js';

test('Resource Authorization Middleware Integration Tests', async (t) => {
  let tokenOrgA = '';
  let tokenOrgB = '';
  let orgAId = '';

  await t.test('Setup: Create Org A & Org B Users with distinct Organizations', async () => {
    const userA = { email: `user-a-${Date.now()}@firm-a.com`, password: 'Password123!', name: 'User A' };
    const resA = await request(mainApp).post('/api/v1/auth/signup').send(userA);
    tokenOrgA = resA.body.data.session.token;
    orgAId = resA.body.data.organizationId;

    const userB = { email: `user-b-${Date.now()}@firm-b.com`, password: 'Password123!', name: 'User B' };
    const resB = await request(mainApp).post('/api/v1/auth/signup').send(userB);
    tokenOrgB = resB.body.data.session.token;

    // Create a distinct organization for User B so orgAId !== orgBId
    const newOrgRes = await request(mainApp)
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${tokenOrgB}`)
      .send({ name: 'Distinct Firm B Chambers' });

    assert.strictEqual(newOrgRes.status, 201);
    assert.notStrictEqual(newOrgRes.body.data.organization.id, orgAId);
  });

  await t.test('Nested Resource Access: Authorized owner can access resource', async () => {
    const testApp: Express = express();
    testApp.use(express.json());

    // Mock resource map: doc-1 belongs to orgAId
    const resourceStore: Record<string, { id: string; organizationId: string; title: string }> = {
      'doc-1': { id: 'doc-1', organizationId: orgAId, title: 'Confidential Filing.pdf' },
    };

    testApp.get(
      '/api/v1/documents/:id',
      authenticateToken,
      requireTenant,
      authorizeResourceOwnership(async (req: TenantRequest) => {
        const docId = req.params.id;
        return resourceStore[docId]?.organizationId;
      }, 'Document'),
      (req: TenantRequest, res: Response) => {
        const doc = resourceStore[req.params.id];
        return sendSuccess(res, { document: doc }, 200);
      }
    );

    const res = await request(testApp)
      .get('/api/v1/documents/doc-1')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.document.title, 'Confidential Filing.pdf');
  });

  await t.test('Nested Resource Access: Cross-tenant access is rejected with 404', async () => {
    const testApp: Express = express();
    testApp.use(express.json());

    const resourceStore: Record<string, { id: string; organizationId: string; title: string }> = {
      'doc-1': { id: 'doc-1', organizationId: orgAId, title: 'Confidential Filing.pdf' },
    };

    testApp.get(
      '/api/v1/documents/:id',
      authenticateToken,
      requireTenant,
      authorizeResourceOwnership(async (req: TenantRequest) => {
        const docId = req.params.id;
        return resourceStore[docId]?.organizationId;
      }, 'Document'),
      (req: TenantRequest, res: Response) => {
        const doc = resourceStore[req.params.id];
        return sendSuccess(res, { document: doc }, 200);
      }
    );

    // User B (from Distinct Firm B) tries to read doc-1 (owned by Org A)
    const res = await request(testApp)
      .get('/api/v1/documents/doc-1')
      .set('Authorization', `Bearer ${tokenOrgB}`);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
  });
});
