import test from 'node:test';
import assert from 'node:assert';
import supertest from 'supertest';
import { app } from '../../src/app.js';
import { setAuthProvider } from '../../src/services/auth.service.js';
import { MockAuthProvider } from '../../src/auth/MockAuthProvider.js';

test('Auth Routes Integration & Validation Tests', async (t) => {
  const mockProvider = new MockAuthProvider();
  setAuthProvider(mockProvider);

  await t.test('POST /api/v1/auth/signup rejects password shorter than 8 characters', async () => {
    const res = await supertest(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'test@chambers.com',
        password: '123',
        name: 'Test Advocate',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(res.body.error.message, 'Password must be at least 8 characters long');
  });

  await t.test('POST /api/v1/auth/signup rejects invalid email format', async () => {
    const res = await supertest(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'not-an-email',
        password: 'Password123!',
        name: 'Test Advocate',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(res.body.error.message, 'Invalid email address format');
  });

  await t.test('POST /api/v1/auth/signup creates account with valid credentials', async () => {
    const res = await supertest(app)
      .post('/api/v1/auth/signup')
      .send({
        email: 'valid.advocate@lexflow.app',
        password: 'ValidPassword123!',
        name: 'Valid Advocate',
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.user);
    assert.strictEqual(res.body.data.user.email, 'valid.advocate@lexflow.app');
    assert.ok(res.body.data.session.token);
  });

  await t.test('POST /api/v1/auth/login authenticates registered user', async () => {
    const res = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'valid.advocate@lexflow.app',
        password: 'ValidPassword123!',
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.user.email, 'valid.advocate@lexflow.app');
    assert.ok(res.body.data.session.token);
  });

  await t.test('POST /api/v1/auth/login rejects wrong password', async () => {
    const res = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'valid.advocate@lexflow.app',
        password: 'WrongPassword999!',
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.error.code, 'INVALID_CREDENTIALS');
  });
});
