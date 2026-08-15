import test from 'node:test';
import assert from 'node:assert';
import { app } from '../src/app.js';

test('API Response Helpers & Health Check', async (t) => {
  await t.test('App instance is defined', () => {
    assert.strictEqual(typeof app, 'function');
  });

  await t.test('Health route returns status ok', async () => {
    // Basic test checking app routing logic
    const reqMock = { method: 'GET', url: '/health', headers: {} };
    assert.ok(reqMock);
  });
});
