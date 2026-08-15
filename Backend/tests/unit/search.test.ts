import test from 'node:test';
import assert from 'node:assert';
import { SearchIndexService } from '../../src/services/search/search-index.service.js';

test('SearchIndexService Unit Tests', async (t) => {
  const searchService = new SearchIndexService();

  await t.test('generateSnippet extracts context around matching query terms', () => {
    const text = 'The Hon High Court of Bombay delivered judgment in Commercial Suit 1024 of 2026 directing mandatory interim injunction on 15th August.';
    const snippet = searchService.generateSnippet(text, 'injunction');

    assert.ok(snippet);
    assert.ok(snippet.toLowerCase().includes('injunction'));
    assert.ok(snippet.length <= 190);
  });

  await t.test('generateSnippet handles null text or empty queries gracefully', () => {
    assert.strictEqual(searchService.generateSnippet(null, 'test'), null);
    assert.strictEqual(searchService.generateSnippet('', 'test'), null);
  });

  await t.test('search method validates mandatory organizationId', async () => {
    await assert.rejects(
      async () => {
        await searchService.search('', { query: 'test' });
      },
      { message: 'organizationId is required for tenant search' }
    );
  });
});
