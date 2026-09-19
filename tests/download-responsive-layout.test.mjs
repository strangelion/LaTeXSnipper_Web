import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(
  new URL('../scripts/apply-download-responsive-layout.mjs', import.meta.url),
  'utf8',
);

const downloadCss = await readFile(
  new URL('../styles/download.css', import.meta.url),
  'utf8',
);

test('Windows detection gates the optional liquid bundle treatment', () => {
  assert.ok(source.includes("dataset.detectedPlatform === 'windows'"));
  assert.ok(source.includes('detectCurrentDevice'));
  assert.ok(source.includes("detectedDevice.platform || 'unknown'"));
});

test('non-Windows bundle loses the special interactive panel treatment', () => {
  assert.ok(source.includes('normalizeNonWindowsBundleCard'));
  assert.ok(source.includes("card.removeAttribute('data-lg-interactive')"));
  assert.ok(source.includes("card.classList.remove('lg-surface', 'lg-surface--panel', 'is-pointer-lit')"));
});

test('canonical stylesheet owns a compact desktop grid', () => {
  assert.ok(downloadCss.includes('grid-template-columns: repeat(6, minmax(0, 1fr))'));
  assert.ok(downloadCss.includes('.platform-card:not(.recommended)'));
  assert.ok(downloadCss.includes('grid-column: span 2'));
  assert.ok(downloadCss.includes('width: min(100%, 920px)'));
  assert.match(
    downloadCss,
    /\.platform-card \.download-btn,[\s\S]{0,100}width: min\(100%, 220px\)/,
  );
});

test('narrow download layouts collapse to one safe column', () => {
  assert.ok(source.includes('@media (max-width: 760px)'));
  assert.ok(source.includes('grid-template-columns: minmax(0, 1fr) !important'));
  assert.ok(source.includes('grid-column: 1 !important'));
  assert.ok(source.includes('width: 100% !important'));
});
