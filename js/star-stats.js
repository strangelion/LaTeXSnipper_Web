// Project counter formatting for the download page (stars and release downloads).
// Kept dependency-free so it can run in the browser and in node --test.

const COMPACT_THRESHOLD = 1000;
const SCALES = [
  { threshold: 1000000000, divisor: 1000000000, suffix: 'B' },
  { threshold: 1000000, divisor: 1000000, suffix: 'M' },
  { threshold: 1000, divisor: 1000, suffix: 'K' },
];
// The visible figure never grows past "999K+" style, so the layout never stretches.
const MAX_SCALED_DIGITS = 999;

/**
 * Scope and caveat wording for the download counter. The figure adds up two sources: GitHub's
 * own Release counter, plus this site's own batched counter for files served through /dl/
 * (those never reach GitHub). The site-side part is batched per isolate and can lose a few
 * increments, so it is always labelled as an approximation next to the figure.
 */
export const DOWNLOAD_COUNT_SCOPE = '含 GitHub Release 与本站下载';
export const DOWNLOAD_COUNT_DISCLAIMER = '本站部分为批量统计，可能有少量遗漏';

/**
 * Exact figure for tooltips and screen readers, for example 1234567 -> "1,234,567".
 */
export function formatExactCount(value) {
  const count = normalizeCount(value);
  if (count === null) return '';
  return new Intl.NumberFormat('zh-CN').format(count);
}

/**
 * Compact figure for the visible counter: exact below 1000, then 1.2K, 12K, 123K, 1.2M, 12M,
 * 1.2B. Abbreviated values are rounded down, carry a trailing "+" and are clamped at 999 of
 * their unit, so the rendered string stays at most five characters wide.
 */
export function formatCompactCount(value) {
  const count = normalizeCount(value);
  if (count === null) return '';
  if (count < COMPACT_THRESHOLD) return String(count);
  const scale = SCALES.find((entry) => count >= entry.threshold);
  const scaled = Math.min(count / scale.divisor, MAX_SCALED_DIGITS);
  const rounded = scaled < 10 ? scaled.toFixed(1) : String(Math.floor(scaled));
  return `${rounded}${scale.suffix}+`;
}

/**
 * Rejects missing or nonsensical counters so the page never renders an invented figure.
 */
export function normalizeCount(value) {
  const type = typeof value;
  if (type !== 'number' && type !== 'string') return null;
  if (value === '') return null;
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return null;
  return Math.round(count);
}
