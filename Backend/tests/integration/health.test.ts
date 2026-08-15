import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../src/app.js';

test('Express API Integration Tests', async (t) => {
  await t.test('GET /health returns HTTP 200 with ok status', async () => {
    const response = await request(app).get('/health');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['content-type'].includes('application/json'), true);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.status, 'ok');
    assert.strictEqual(response.body.data.service, 'legal-saas-backend');
  });

  await t.test('GET /api/v1/health returns HTTP 200 with v1 health data', async () => {
    const response = await request(app).get('/api/v1/health');
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.version, '1.0.0');
    assert.strictEqual(response.body.data.service, 'legal-saas-backend-api-v1');
  });

  await t.test('GET /non-existent-route returns HTTP 404', async () => {
    const response = await request(app).get('/non-existent-route');
    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'NOT_FOUND');
  });
});
