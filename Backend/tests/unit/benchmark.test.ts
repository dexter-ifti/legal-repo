import test from 'node:test';
import assert from 'node:assert';
import { BenchmarkEvaluationService } from '../../src/services/evaluation/benchmark.service.js';
import { generateEvaluationSamples } from '../../src/services/evaluation/evaluation-dataset.js';

test('Milestone 8 Evaluation & Benchmark Unit Tests', async (t) => {
  const benchmarkService = new BenchmarkEvaluationService();

  await t.test('Verify 100 ground-truth evaluation samples generation', () => {
    const samples = generateEvaluationSamples();
    assert.strictEqual(samples.length, 100);
  });

  await t.test('Run benchmark harness with calibrated thresholds (AUTO_MATCH=0.90, CONFIRM=0.45)', () => {
    const metrics = benchmarkService.runEvaluation(0.90, 0.45);

    assert.strictEqual(metrics.totalSamples, 100);
    assert.ok(metrics.top1Accuracy >= 0.90, `Expected top1Accuracy >= 0.90, got ${metrics.top1Accuracy}`);
    assert.ok(metrics.top3Recall >= 0.95, `Expected top3Recall >= 0.95, got ${metrics.top3Recall}`);
    assert.strictEqual(
      metrics.falseAutoMatchRate,
      0.0,
      `Expected falseAutoMatchRate to be 0.0 (0% wrong filings), got ${metrics.falseAutoMatchRate}`
    );
    assert.strictEqual(
      metrics.autoMatchPrecision,
      1.0,
      `Expected autoMatchPrecision to be 1.0 (100%), got ${metrics.autoMatchPrecision}`
    );
    assert.ok(
      metrics.documentTaxonomyAccuracy >= 0.90,
      `Expected taxonomy accuracy >= 0.90, got ${metrics.documentTaxonomyAccuracy}`
    );
  });
});
