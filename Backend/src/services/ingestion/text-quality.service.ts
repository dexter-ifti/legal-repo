import { INGESTION_CONFIG } from '../../config/ingestion.config.js';

export interface TextQualityStats {
  wordCount: number;
  charCount: number;
  alphabeticRatio: number;
  replacementCharCount: number;
  garbageRatio: number;
}

/**
 * Computes quality statistics for a page of extracted text.
 * A page can be technically non-empty yet unusable (broken encoding,
 * ligature soup, embedded-font garbage), so we evaluate several signals.
 */
export function computeTextStats(text: string | null | undefined): TextQualityStats {
  if (!text) {
    return { wordCount: 0, charCount: 0, alphabeticRatio: 0, replacementCharCount: 0, garbageRatio: 1 };
  }

  const words = text.split(/\s+/).filter(Boolean);

  let alphabetic = 0;
  let replacement = 0;
  let garbage = 0;

  for (const ch of text) {
    if (/\p{L}/u.test(ch)) {
      alphabetic += 1;
    }
    if (ch === '\uFFFD') {
      replacement += 1;
    }
    // Control characters and private-use glyphs are extraction garbage.
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u001F\u007F-\u009F\uE000-\uF8FF]/.test(ch) && !/[\n\r\t]/.test(ch)) {
      garbage += 1;
    }
  }

  const len = Math.max(text.length, 1);
  return {
    wordCount: words.length,
    charCount: text.trim().length,
    alphabeticRatio: alphabetic / len,
    replacementCharCount: replacement,
    garbageRatio: garbage / len,
  };
}

/**
 * Evaluates whether natively extracted page text is usable without OCR.
 * Thresholds are configurable via ingestion config.
 */
export function isUsableNativeText(
  text: string | null | undefined,
  thresholds = INGESTION_CONFIG.nativeTextQuality
): boolean {
  if (!text || !text.trim()) {
    return false;
  }

  const stats = computeTextStats(text);

  if (stats.wordCount < thresholds.minWords) {
    return false;
  }
  if (stats.charCount < thresholds.minChars) {
    return false;
  }
  if (stats.alphabeticRatio < thresholds.minAlphabeticRatio) {
    return false;
  }
  // Excessive replacement characters indicate broken font encoding.
  if (stats.replacementCharCount / Math.max(stats.charCount, 1) > 0.05) {
    return false;
  }

  return true;
}
