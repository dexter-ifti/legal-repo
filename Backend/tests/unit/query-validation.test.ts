import test from 'node:test';
import assert from 'node:assert';
import { searchQuerySchema } from '../../src/routes/search.routes.js';
import { auditQuerySchema } from '../../src/routes/audit.routes.js';

test('search query schema rejects non-numeric pagination params', () => {
  const result = searchQuerySchema.safeParse({ page: 'abc', limit: '10' });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0].message, /page must be a non-negative integer/);
  }
});

test('audit query schema rejects non-numeric pagination params', () => {
  const result = auditQuerySchema.safeParse({ page: '1', limit: '-5' });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0].message, /limit must be a non-negative integer/);
  }
});

test('search query schema transforms valid pagination params to numbers', () => {
  const result = searchQuerySchema.safeParse({ q: 'injunction', page: '3', limit: '25' });
  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data, { q: 'injunction', page: 3, limit: 25 });
  }
});

test('pagination schemas allow missing optional params', () => {
  const searchResult = searchQuerySchema.safeParse({});
  const auditResult = auditQuerySchema.safeParse({});
  assert.equal(searchResult.success, true);
  assert.equal(auditResult.success, true);
});
