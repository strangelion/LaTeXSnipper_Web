import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../scripts/apply-download-responsive-layout.mjs', import.meta.url),
  'utf8',
);

test('Windows bundle is featured only after Windows device detection', () => {
  assert.ok(source.includes('data-detected-platform="windows"'));
  assert.ok(source.includes(':root:not([data-detected-platform="windows"])'));
  assert.ok(source.includes('detectCurrentDevice'));
  assert.ok(source.includes("detectedDevice.platform || 'unknown'"));
});

test('non-Windows bundle loses the special interactive panel treatment', () => {
  assert.ok(source.includes('normalizeNonWindowsBundleCard'));
  assert.ok(source.includes("card.removeAttribute('data-lg-interactive')"));
  assert.ok(source.includes("card.classList.remove('lg-surface', 'lg-surface--panel', 'is-pointer-lit')"));
});

test('known non-Windows desktops keep a dense three-column grid', () => {
  assert.ok(source.includes('@media (min-width: 901px)'));
  assert.ok(source.includes('grid-template-columns: repeat(6, minmax(0, 1fr)) !important'));
  assert.ok(source.includes('grid-column: span 2 !important'));
  assert.ok(source.includes('grid-auto-flow: row dense'));
});

test('narrow download layouts collapse to one safe column', () => {
  assert.ok(source.includes('@media (max-width: 900px)'));
  assert.ok(source.includes('grid-template-columns: minmax(0, 1fr) !important'));
  assert.ok(source.includes('grid-column: 1 !important'));
  assert.ok(source.includes('width: 100% !important'));
});
