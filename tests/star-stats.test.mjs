import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DOWNLOAD_COUNT_DISCLAIMER,
  DOWNLOAD_COUNT_SCOPE,
  formatCompactCount,
  formatExactCount,
  normalizeCount,
} from '../js/star-stats.js';

test('counters stay exact below one thousand', () => {
  assert.equal(formatCompactCount(0), '0');
  assert.equal(formatCompactCount(962), '962');
  assert.equal(formatCompactCount(999), '999');
});

test('counters abbreviate to K above one thousand', () => {
  assert.equal(formatCompactCount(1000), '1.0K+');
  assert.equal(formatCompactCount(1234), '1.2K+');
  assert.equal(formatCompactCount(12345), '12K+');
  assert.equal(formatCompactCount(123456), '123K+');
  assert.equal(formatCompactCount(999999), '999K+');
});

test('counters abbreviate to M above one million', () => {
  assert.equal(formatCompactCount(1000000), '1.0M+');
  assert.equal(formatCompactCount(1234567), '1.2M+');
  assert.equal(formatCompactCount(23456789), '23M+');
});

test('counters abbreviate to B and never grow past five characters', () => {
  assert.equal(formatCompactCount(1000000000), '1.0B+');
  assert.equal(formatCompactCount(1234567890), '1.2B+');
  assert.equal(formatCompactCount(23456789012), '23B+');
  // Clamped, so a runaway number cannot stretch the layout.
  assert.equal(formatCompactCount(999999999999), '999B+');
  assert.equal(formatCompactCount(Number.MAX_SAFE_INTEGER), '999B+');
  for (const value of [0, 999, 1000, 12345, 123456, 1234567, 123456789, 1e12]) {
    assert.ok(
      formatCompactCount(value).length <= 5,
      `${value} formats wider than five characters`,
    );
  }
});

test('the download counter always ships its scope and caveat wording', () => {
  assert.match(DOWNLOAD_COUNT_SCOPE, /GitHub Release/);
  assert.match(DOWNLOAD_COUNT_SCOPE, /本站/);
  assert.match(DOWNLOAD_COUNT_DISCLAIMER, /近似|遗漏|批量/);
  assert.ok(DOWNLOAD_COUNT_DISCLAIMER.length <= 24, 'the footnote must stay short');
});

test('exact formatting keeps the full figure for tooltips and screen readers', () => {
  assert.equal(formatExactCount(1234567), '1,234,567');
  assert.equal(formatExactCount(962), '962');
});

test('missing counters are rejected instead of rendered as numbers', () => {
  for (const value of [null, undefined, '', 'abc', Number.NaN, -5, {}]) {
    assert.equal(normalizeCount(value), null);
    assert.equal(formatCompactCount(value), '');
    assert.equal(formatExactCount(value), '');
  }
  assert.equal(normalizeCount('452'), 452);
  assert.equal(normalizeCount(452.6), 453);
});
