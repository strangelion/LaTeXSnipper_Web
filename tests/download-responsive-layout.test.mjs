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

test('Windows detection feeds the download page presentation', () => {
  assert.ok(source.includes('detectCurrentDevice'));
  assert.ok(source.includes("detectedDevice.platform || 'unknown'"));
  assert.ok(source.includes("dataset.detectedPlatform = 'unknown'"));
});

test('download page no longer lists a separately uploaded Windows bundle', async () => {
  const downloadPageSource = await readFile(
    new URL('../download.html', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(downloadPageSource, /windows-x86_64-bundle/);
  assert.doesNotMatch(downloadPageSource, /一键整合包/);
});

test('deployed ecosystem metadata mirrors its public source', async () => {
  const publicCopy = await readFile(
    new URL('../public/js/ecosystem-metadata.js', import.meta.url),
    'utf8',
  );
  const deployedCopy = await readFile(
    new URL('../deploy/js/ecosystem-metadata.js', import.meta.url),
    'utf8',
  );
  assert.equal(deployedCopy, publicCopy);
  assert.ok(publicCopy.includes('syncEcosystemMetadata();'));
});

test('canonical stylesheet owns a centred platform grid', () => {
  assert.ok(downloadCss.includes('--platform-columns: 3'));
  assert.ok(downloadCss.includes('justify-content: center'));
  assert.ok(downloadCss.includes('.platform-card:not(.recommended)'));
  assert.ok(
    downloadCss.includes(
      'flex: 0 1 calc((100% - (var(--platform-columns) - 1) * 12px) / var(--platform-columns))',
    ),
  );
  assert.match(downloadCss, /\.platform-card\[hidden\] \{\s*display: none;/);
  assert.ok(downloadCss.includes('width: min(100%, 920px)'));
  assert.match(
    downloadCss,
    /\.platform-card \.download-btn,[\s\S]{0,100}width: min\(100%, 220px\)/,
  );
});

test('narrow download layouts collapse to one safe column', () => {
  assert.ok(source.includes('@media (max-width: 760px)'));
  assert.match(downloadCss, /\.platform-grid \{\s*--platform-columns: 1;/);
  /* The deploy patch must not re-declare grid geometry the canonical sheet owns. */
  assert.ok(!source.includes('grid-template-columns: minmax(0, 1fr) !important'));
  assert.ok(!source.includes('grid-column: 1 !important'));
  assert.ok(source.includes('max-width: 100%'));
});
