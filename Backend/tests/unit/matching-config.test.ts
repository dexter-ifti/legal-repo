import test from 'node:test';
import assert from 'node:assert';
import {
  getMatchingThresholds,
  DEFAULT_MATCHING_THRESHOLDS,
} from '../../src/config/matching.config.js';

test('matching thresholds config', async (t) => {
  t.beforeEach(() => {
    delete process.env.MATCHING_AUTO_CONFIDENCE;
    delete process.env.MATCHING_AUTO_SCORE_MARGIN;
    delete process.env.MATCHING_CONFIRMATION_CONFIDENCE;
  });

  await t.test('returns conservative defaults when env is unset', () => {
    const thresholds = getMatchingThresholds();
    assert.deepStrictEqual(thresholds, DEFAULT_MATCHING_THRESHOLDS);
  });

  await t.test('reads valid overrides from environment', () => {
    process.env.MATCHING_AUTO_CONFIDENCE = '0.9';
    process.env.MATCHING_AUTO_SCORE_MARGIN = '0.2';
    process.env.MATCHING_CONFIRMATION_CONFIDENCE = '0.6';

    const thresholds = getMatchingThresholds();
    assert.strictEqual(thresholds.autoMatchConfidence, 0.9);
    assert.strictEqual(thresholds.autoMatchScoreMargin, 0.2);
    assert.strictEqual(thresholds.confirmationConfidence, 0.6);
  });

  await t.test('falls back to defaults for invalid values', () => {
    process.env.MATCHING_AUTO_CONFIDENCE = 'not-a-number';
    process.env.MATCHING_AUTO_SCORE_MARGIN = '1.5';
    process.env.MATCHING_CONFIRMATION_CONFIDENCE = '-0.1';

    const thresholds = getMatchingThresholds();
    assert.strictEqual(thresholds.autoMatchConfidence, DEFAULT_MATCHING_THRESHOLDS.autoMatchConfidence);
    assert.strictEqual(thresholds.autoMatchScoreMargin, DEFAULT_MATCHING_THRESHOLDS.autoMatchScoreMargin);
    assert.strictEqual(thresholds.confirmationConfidence, DEFAULT_MATCHING_THRESHOLDS.confirmationConfidence);
  });

  await t.test('rejects inverted threshold ordering', () => {
    process.env.MATCHING_AUTO_CONFIDENCE = '0.4';
    process.env.MATCHING_CONFIRMATION_CONFIDENCE = '0.6';

    const thresholds = getMatchingThresholds();
    assert.deepStrictEqual(thresholds, DEFAULT_MATCHING_THRESHOLDS);
  });
});
