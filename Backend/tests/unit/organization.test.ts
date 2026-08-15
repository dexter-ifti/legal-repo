import test from 'node:test';
import assert from 'node:assert';
import { requireTenant, TenantRequest } from '../../src/middleware/tenant.middleware.js';
import { Response } from 'express';

interface MockResponsePayload {
  success?: boolean;
  error?: {
    code?: string;
    message?: string;
  };
}

test('Tenant Middleware Unit Tests', async (t) => {
  await t.test('requireTenant rejects unauthenticated request with 401', () => {
    const req = {} as TenantRequest;
    let statusCode = 0;
    let responseBody: MockResponsePayload = {};

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: MockResponsePayload) {
        responseBody = body;
        return this;
      },
    } as unknown as Response;

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    requireTenant(req, res, next);
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(responseBody.success, false);
    assert.strictEqual(nextCalled, false);
  });

  await t.test('requireTenant rejects user without organization with 403', () => {
    const req = {
      user: {
        id: 'user-1',
        email: 'test@chambers.com',
      },
    } as TenantRequest;
    let statusCode = 0;
    let responseBody: MockResponsePayload = {};

    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: MockResponsePayload) {
        responseBody = body;
        return this;
      },
    } as unknown as Response;

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    requireTenant(req, res, next);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(responseBody.error?.code, 'TENANT_REQUIRED');
    assert.strictEqual(nextCalled, false);
  });

  await t.test('requireTenant attaches organizationId when present', () => {
    const req = {
      user: {
        id: 'user-1',
        email: 'test@chambers.com',
        organizationId: 'org-uuid-1234',
      },
    } as TenantRequest;

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    const res = {} as Response;

    requireTenant(req, res, next);
    assert.strictEqual(req.organizationId, 'org-uuid-1234');
    assert.strictEqual(nextCalled, true);
  });
});
