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
    /\.platform-card \.download-actions \{[\s\S]{0,120}width: min\(100%, 220px\)/,
  );
  /* CPU and GPU share one card, so the button and its checksum move together. */
  assert.match(downloadCss, /\.recommended \.download-actions \{\s*grid-area: action;/);
  assert.ok(!downloadCss.includes('.recommended .download-btn {'));
  /* The checksum must live inside the stack, not in its own grid area. */
  assert.ok(!downloadCss.includes('grid-area: hash'));
});

test('CPU and GPU editions switch with CSS only', async () => {
  const downloadPageSource = await readFile(
    new URL('../download.html', import.meta.url),
    'utf8',
  );
  /* CPU is the default edition, so the first radio ships checked. */
  assert.match(
    downloadPageSource,
    /<input class="edition-input" type="radio" name="windows-edition" id="windows-edition-cpu" value="cpu" checked>/,
  );
  assert.match(
    downloadPageSource,
    /<input class="edition-input" type="radio" name="windows-edition" id="windows-edition-gpu" value="gpu">/,
  );
  assert.match(downloadPageSource, /<div class="download-action" data-edition="cpu">/);
  assert.match(downloadPageSource, /<div class="download-action" data-edition="gpu">/);
  assert.match(downloadPageSource, /<div class="edition-switch" hidden>/);
  /* The visible action is chosen by the checked radio, not by a click handler. */
  assert.ok(
    downloadCss.includes(
      '.edition-input[value="cpu"]:checked ~ .download-actions .download-action[data-edition="gpu"],',
    ),
  );
  assert.ok(
    downloadCss.includes(
      '.edition-input[value="gpu"]:checked ~ .download-actions .download-action[data-edition="cpu"] {\n  display: none;\n}',
    ),
  );
  assert.match(downloadCss, /\.edition-switch label \{\s*flex: 1 1 0;/);
  /* A release with a single edition hides the switch and falls back to CPU. */
  assert.ok(downloadPageSource.includes('editionSwitch.hidden = editions < 2'));
});

test('narrow download layouts collapse to one safe column', () => {
  assert.ok(source.includes('@media (max-width: 760px)'));
  assert.match(downloadCss, /\.platform-grid \{\s*--platform-columns: 1;/);
  /* The deploy patch must not re-declare grid geometry the canonical sheet owns. */
  assert.ok(!source.includes('grid-template-columns: minmax(0, 1fr) !important'));
  assert.ok(!source.includes('grid-column: 1 !important'));
  assert.ok(source.includes('max-width: 100%'));
});
