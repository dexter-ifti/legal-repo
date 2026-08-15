import test from 'node:test';
import assert from 'node:assert';
import { prisma } from '../../src/db/client.js';
import { checkDatabaseHealth } from '../../src/db/health.js';

test('Database Client & Health Check Tests', async (t) => {
  await t.test('Prisma client instance is initialized', () => {
    assert.ok(prisma);
    assert.strictEqual(typeof prisma.$queryRaw, 'function');
  });

  await t.test('checkDatabaseHealth handles missing database gracefully', async () => {
    const health = await checkDatabaseHealth();
    assert.strictEqual(typeof health.connected, 'boolean');
    if (!health.connected) {
      assert.ok(health.error);
    } else {
      assert.strictEqual(typeof health.latencyMs, 'number');
    }
  });
});
