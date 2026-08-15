import test from 'node:test';
import assert from 'node:assert';
import { createCaseSchema, updateCaseSchema, getCasesQuerySchema } from '../../src/routes/case.routes.js';

test('Case Route Zod Validation Schemas Unit Tests', async (t) => {
  await t.test('createCaseSchema validates required title field', () => {
    const validPayload = {
      title: 'State vs. Rajesh Sharma',
      caseNumber: 'WP/2026/101',
      court: 'High Court of Bombay',
    };
    const result = createCaseSchema.safeParse(validPayload);
    assert.strictEqual(result.success, true);
  });

  await t.test('createCaseSchema rejects missing or short title', () => {
    const invalidPayload = {
      title: 'A',
    };
    const result = createCaseSchema.safeParse(invalidPayload);
    assert.strictEqual(result.success, false);
  });

  await t.test('updateCaseSchema allows partial fields update', () => {
    const partialUpdate = {
      status: 'CLOSED',
      notes: 'Final judgment delivered',
    };
    const result = updateCaseSchema.safeParse(partialUpdate);
    assert.strictEqual(result.success, true);
  });

  await t.test('getCasesQuerySchema parses query parameters correctly', () => {
    const query = {
      search: 'Sharma',
      status: 'ACTIVE',
      page: '2',
      limit: '15',
    };
    const result = getCasesQuerySchema.safeParse(query);
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.page, 2);
      assert.strictEqual(result.data.limit, 15);
      assert.strictEqual(result.data.search, 'Sharma');
    }
  });
});
