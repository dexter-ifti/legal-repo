export interface MatchingThresholds {
  /** Minimum top-candidate score required for AUTO_MATCHED. */
  autoMatchConfidence: number;
  /** Minimum margin between top and second candidate required for AUTO_MATCHED. */
  autoMatchScoreMargin: number;
  /** Minimum top-candidate score required for CONFIRMATION_REQUIRED (below -> NO_MATCH). */
  confirmationConfidence: number;
}

/**
 * Conservative defaults. Do not change casually: thresholds decide whether
 * legal documents are auto-filed. Recalibrate only with evaluation data
 * (see tests/unit/benchmark.test.ts).
 */
export const DEFAULT_MATCHING_THRESHOLDS: MatchingThresholds = {
  autoMatchConfidence: 0.85,
  autoMatchScoreMargin: 0.15,
  confirmationConfidence: 0.5,
};

const isUnitInterval = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

const readThreshold = (envValue: string | undefined, fallback: number): number => {
  if (envValue === undefined || envValue === '') return fallback;
  const parsed = Number(envValue);
  if (!isUnitInterval(parsed)) return fallback;
  return parsed;
};

/**
 * Resolves matching thresholds from server-side environment config,
 * falling back to conservative defaults for missing/invalid values.
 * Invalid configurations never crash the matcher; they degrade to defaults.
 */
export function getMatchingThresholds(): MatchingThresholds {
  const thresholds: MatchingThresholds = {
    autoMatchConfidence: readThreshold(
      process.env.MATCHING_AUTO_CONFIDENCE,
      DEFAULT_MATCHING_THRESHOLDS.autoMatchConfidence
    ),
    autoMatchScoreMargin: readThreshold(
      process.env.MATCHING_AUTO_SCORE_MARGIN,
      DEFAULT_MATCHING_THRESHOLDS.autoMatchScoreMargin
    ),
    confirmationConfidence: readThreshold(
      process.env.MATCHING_CONFIRMATION_CONFIDENCE,
      DEFAULT_MATCHING_THRESHOLDS.confirmationConfidence
    ),
  };

  if (thresholds.autoMatchConfidence <= thresholds.confirmationConfidence) {
    console.warn(
      '[MatchingConfig] MATCHING_AUTO_CONFIDENCE must be greater than MATCHING_CONFIRMATION_CONFIDENCE; using defaults.'
    );
    return { ...DEFAULT_MATCHING_THRESHOLDS };
  }

  return thresholds;
}
