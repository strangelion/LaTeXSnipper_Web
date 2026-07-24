import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const contentSource = await readFile(
  new URL('../src/data/siteContent.js', import.meta.url),
  'utf8',
);

const landingSource = await readFile(
  new URL('../src/components/LandingPage.jsx', import.meta.url),
  'utf8',
);

const landingStyles = await readFile(
  new URL('../src/styles/landing.css', import.meta.url),
  'utf8',
);

const downloadSource = await readFile(
  new URL('../download.html', import.meta.url),
  'utf8',
);

const manualSource = await readFile(
  new URL('../user_manual.typ', import.meta.url),
  'utf8',
);

const generatedManualSource = await readFile(
  new URL('../user_manual.html', import.meta.url),
  'utf8',
);

const ocrSource = await readFile(
  new URL('../public/ocr.html', import.meta.url),
  'utf8',
);

const productShellScript = await readFile(
  new URL('../js/product-shell.js', import.meta.url),
  'utf8',
);

const productShellStyles = await readFile(
  new URL('../styles/product-shell.css', import.meta.url),
  'utf8',
);

const siteShellStyles = await readFile(
  new URL('../styles/site-shell.css', import.meta.url),
  'utf8',
);

const liquidGlassStyles = await readFile(
  new URL('../styles/liquid-glass.css', import.meta.url),
  'utf8',
);

const downloadStyles = await readFile(
  new URL('../styles/download.css', import.meta.url),
  'utf8',
);

const ocrStyles = await readFile(
  new URL('../styles/ocr.css', import.meta.url),
  'utf8',
);

const manualStyles = await readFile(
  new URL('../styles/manual.css', import.meta.url),
  'utf8',
);

const liquidLabSource = await readFile(
  new URL('../design/liquid-glass-lab.html', import.meta.url),
  'utf8',
);

const releaseManifest = JSON.parse(await readFile(
  new URL('../public/release-manifest.json', import.meta.url),
  'utf8',
));

test('homepage lists all project entries', () => {
  assert.match(contentSource, /name: 'LaTeXSnipper Desktop'/);
  assert.match(contentSource, /name: 'LaTeXSnipper Mobile'/);
  assert.match(contentSource, /name: 'LaTeXSnipper Office'/);
  assert.match(contentSource, /name: 'LaTeXSnipper Core'/);
});

test('homepage images use imports, not inline paths', () => {
  assert.match(contentSource, /import heroWorkspaceImage from/);
  assert.match(contentSource, /import ocrResultImage from/);
  assert.match(contentSource, /import officeWordImage from/);
  assert.doesNotMatch(contentSource, /image: '\/assets\/images\/product\//);
});

test('homepage hero section is present', () => {
  assert.match(landingSource, /snipper-girl/);
  assert.match(landingSource, /把数学/);
});

test('homepage download CTA is platform-neutral', () => {
  assert.match(landingSource, /下载 LaTeXSnipper/);
  assert.doesNotMatch(landingSource, /<table/);
});

test('homepage mobile breakpoints exist', () => {
  assert.match(landingStyles, /max-width: 720px/);
  assert.match(landingStyles, /max-width: 420px/);
  assert.match(siteShellStyles, /sr-only/);
});

test('liquid glass components follow V2 pattern', () => {
  assert.match(landingSource, /LiquidGlassSurface/);
  assert.match(landingSource, /liquid-backdrop-refraction/);
  assert.match(liquidGlassStyles, /lg-backdrop/);
  assert.match(liquidGlassStyles, /lg-caustic/);
  assert.match(liquidGlassStyles, /lg-surface--control/);
});

test('release manifest is well-formed', () => {
  assert.equal(releaseManifest.schemaVersion, 1);
  assert.ok(releaseManifest.assets.length > 0);
  for (const asset of releaseManifest.assets) {
    assert.match(asset.href, /^\/dl\/[A-Za-z0-9._-]+$/);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/i);
  }
});

test('download page renders from release manifest', () => {
  assert.match(downloadSource, /release-manifest\.json/);
  assert.match(downloadSource, /data-asset-id="windows-x86_64"/);
  assert.match(downloadSource, /detectCurrentDevice/);
});

test('download page lists ecosystem projects', () => {
  assert.match(downloadSource, /LaTeXSnipper Mobile/);
  assert.match(downloadSource, /LaTeXSnipper Office/);
  assert.match(downloadSource, /latexsnipper-core/);
});

test('download and manual share the site shell', () => {
  assert.match(downloadSource, /site-shell\.css/);
  assert.match(downloadSource, /product-shell\.js/);
  assert.match(generatedManualSource, /manual\.css/);
  assert.match(productShellStyles, /site-tokens\.css/);
});

test('OCR workspace uses the product shell', () => {
  assert.match(ocrSource, /ocr-page/);
  assert.match(ocrSource, /product-shell\.js/);
  assert.match(ocrSource, /dropZone/);
  assert.match(ocrSource, /coreRuntimeStatus/);
});

test('product shell provides liquid glass filter injection', () => {
  assert.match(productShellScript, /ensureLiquidGlassFilterDefs/);
  assert.match(productShellScript, /liquid-backdrop-refraction/);
  assert.match(productShellScript, /svg-backdrop-refraction/);
});

test('static pages use one shared filter injector', () => {
  for (const source of [downloadSource, ocrSource, generatedManualSource]) {
    assert.match(source, /product-shell\.js/);
  }
});

test('lab debug page is present', () => {
  assert.match(liquidLabSource, /Current Engine/);
  assert.match(liquidLabSource, /data-debug-toggle/);
});

test('manual documents current version', () => {
  assert.match(manualSource, /Android/);
  assert.match(manualSource, /\bGPL-3\.0(?:-only)?\b/);
  assert.match(manualSource, /不要与独立 Office 项目混淆/);
});
