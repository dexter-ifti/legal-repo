import test from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../../src/app.js';

test('Express Auth Endpoints Integration Tests', async (t) => {
  const userCredentials = {
    email: `test-${Date.now()}@chambers.com`,
    password: 'Password123!',
    name: 'Advocate Sarah',
  };
  let authToken = '';

  await t.test('POST /api/v1/auth/signup validates body payload', async () => {
    const invalidRes = await request(app).post('/api/v1/auth/signup').send({
      email: 'invalid-email',
      password: 'short',
    });
    assert.strictEqual(invalidRes.status, 400);
    assert.strictEqual(invalidRes.body.success, false);
    assert.strictEqual(invalidRes.body.error.code, 'VALIDATION_ERROR');
  });

  await t.test('POST /api/v1/auth/signup creates account and returns 201', async () => {
    const response = await request(app).post('/api/v1/auth/signup').send(userCredentials);
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.user.email, userCredentials.email);
    assert.strictEqual(response.body.data.user.name, userCredentials.name);
    assert.ok(response.body.data.session.token);
    authToken = response.body.data.session.token;
  });

  await t.test('GET /api/v1/auth/me returns current user when authenticated', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.user.email, userCredentials.email);
  });

  await t.test('GET /api/v1/auth/me rejects request without token', async () => {
    const response = await request(app).get('/api/v1/auth/me');
    assert.strictEqual(response.status, 401);
    assert.strictEqual(response.body.success, false);
    assert.strictEqual(response.body.error.code, 'UNAUTHORIZED');
  });

  await t.test('POST /api/v1/auth/login succeeds with valid credentials', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: userCredentials.email,
      password: userCredentials.password,
    });
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.user.email, userCredentials.email);
    assert.ok(response.body.data.session.token);
  });

  await t.test('POST /api/v1/auth/forgot-password sends reset instructions', async () => {
    const response = await request(app).post('/api/v1/auth/forgot-password').send({
      email: userCredentials.email,
    });
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
    assert.strictEqual(response.body.data.message, 'Password reset instructions sent to email');
  });

  await t.test('POST /api/v1/auth/logout revokes session', async () => {
    const response = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${authToken}`);
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.success, true);
  });
});
