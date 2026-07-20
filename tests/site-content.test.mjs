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

const manualBuilderSource = await readFile(
  new URL('../build_manual.py', import.meta.url),
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

const releaseManifest = JSON.parse(await readFile(
  new URL('../public/release-manifest.json', import.meta.url),
  'utf8',
));

test('homepage keeps project ownership and license boundaries explicit', () => {
  assert.match(contentSource, /name: 'LaTeXSnipper Desktop'[\s\S]*author: 'SakuraMathcraft'[\s\S]*license: 'GPL-3\.0'/);
  assert.match(contentSource, /name: 'LaTeXSnipper Mobile'[\s\S]*author: 'strangelion'[\s\S]*license: 'AGPL-3\.0'/);
  assert.match(contentSource, /name: 'LaTeXSnipper Office'[\s\S]*author: 'strangelion'[\s\S]*license: 'AGPL-3\.0'/);
  assert.match(contentSource, /name: 'LaTeXSnipper Core'[\s\S]*version: 'v3\.0\.1'[\s\S]*author: 'strangelion'/);
});

test('homepage uses an eager product stage and lazy follow-up story images', () => {
  assert.match(contentSource, /import heroWorkspaceImage from/);
  assert.match(contentSource, /import ocrResultImage from/);
  assert.match(contentSource, /import officeWordImage from/);
  assert.doesNotMatch(contentSource, /image: '\/assets\/images\/product\//);
  assert.match(landingSource, /fetchPriority=\{mascot\.enabled \? 'auto' : 'high'\}/);
  assert.match(landingSource, /loading="lazy"/);
});

test('homepage uses the approved three-zone Hero with responsive character art', () => {
  assert.match(landingStyles, /grid-template-columns:\s*minmax\(390px, 38%\) minmax\(0, 62%\)/);
  assert.match(landingSource, /src: '\/assets\/brand\/snipper-girl\.webp'/);
  assert.match(landingSource, /enabled: true/);
  assert.match(landingStyles, /\.hero-visual\.has-mascot \.hero-math-layer[\s\S]*width:\s*58%/);
  assert.match(landingStyles, /\.hero-mascot[\s\S]*right:\s*2%[\s\S]*height:\s*92%/);
  assert.match(landingSource, /把数学，<br \/>从图像重新<br \/>变成知识。/);
});

test('homepage has one platform-neutral download CTA and no compatibility tables', () => {
  assert.match(landingSource, /下载 LaTeXSnipper/);
  assert.doesNotMatch(landingSource, /下载 \{preferred\.label\} 版/);
  assert.doesNotMatch(landingSource, /<table/);
});

test('homepage keeps mobile navigation text visually hidden and constrains hero media', () => {
  assert.match(siteShellStyles, /\.sr-only\s*\{[\s\S]*clip-path:\s*inset\(50%\)/);
  assert.match(landingStyles, /@media \(max-width: 720px\)[\s\S]*\.hero-visual\s*\{[\s\S]*overflow:\s*hidden/);
  assert.match(landingStyles, /@media \(max-width: 420px\)[\s\S]*\.formula-sheet\s*\{[\s\S]*width:\s*calc\(100% - 20px\)/);
});

test('liquid glass uses layered refraction and respects reduced motion', () => {
  assert.match(landingSource, /function LiquidGlassSurface/);
  assert.match(landingSource, /id="liquid-edge-refraction"/);
  assert.match(liquidGlassStyles, /backdrop-filter:\s*blur\(var\(--glass-blur\)\) saturate\(var\(--glass-saturate\)\)/);
  assert.match(liquidGlassStyles, /filter:\s*url\("#liquid-edge-refraction"\)/);
  assert.match(liquidGlassStyles, /\.liquid-surface--control/);
  assert.match(liquidGlassStyles, /\.liquid-surface--navigation/);
  assert.match(liquidGlassStyles, /\.liquid-surface--floating/);
  assert.match(liquidGlassStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(landingSource, /className="formula-sheet standard-surface"/);
  assert.match(landingSource, /assets\/formula-gaussian-integral\.svg/);
  assert.match(landingStyles, /\.download-cta-panel\s*\{[\s\S]*background:\s*var\(--ls-surface-strong\)/);
});

test('release manifest declares only safe, verifiable direct download assets', () => {
  assert.equal(releaseManifest.schemaVersion, 1);
  assert.ok(releaseManifest.assets.length > 0);
  for (const asset of releaseManifest.assets) {
    assert.match(asset.href, /^\/dl\/[A-Za-z0-9._-]+$/);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/i);
  }
});

test('download page renders Desktop links from the release manifest only', () => {
  assert.match(downloadSource, /fetch\('\/release-manifest\.json'/);
  assert.match(downloadSource, /data-asset-id="windows-x86_64" hidden/);
  assert.doesNotMatch(downloadSource, /href="\/dl\//);
  assert.match(downloadSource, /detectCurrentDevice/);
  assert.match(downloadSource, /CPU 架构未确认/);
});

test('download page distinguishes Desktop packages from independent ecosystem projects', () => {
  assert.match(downloadSource, /Desktop 内置 Office 插件/);
  assert.match(downloadSource, /属于 LaTeXSnipper Desktop · SakuraMathcraft · GPL-3\.0/);
  assert.match(downloadSource, /LaTeXSnipper Mobile[\s\S]*v1\.3\.0 · strangelion · AGPL-3\.0/);
  assert.match(downloadSource, /LaTeXSnipper Office[\s\S]*v1\.4\.2 · strangelion · AGPL-3\.0/);
  assert.match(downloadSource, /latexsnipper-core[\s\S]*v3\.0\.1 · strangelion · AGPL-3\.0/);
});

test('download and generated manual share the unified site shell', () => {
  assert.match(downloadSource, /styles\/site-tokens\.css/);
  assert.match(downloadSource, /styles\/site-shell\.css/);
  assert.match(downloadSource, /styles\/download\.css/);
  assert.match(manualBuilderSource, /styles\/manual\.css/);
  assert.match(generatedManualSource, /styles\/manual\.css/);
  assert.doesNotMatch(generatedManualSource, /<style>/);
  assert.match(manualBuilderSource, /assets\/images\/icon-96\.png/);
  assert.match(downloadSource, /js\/product-shell\.js/);
  assert.match(manualBuilderSource, /js\/product-shell\.js/);
  assert.match(productShellStyles, /site-tokens\.css/);
  assert.match(productShellStyles, /liquid-glass\.css/);
});

test('OCR workspace shares the product shell without changing runtime hooks', () => {
  assert.match(ocrSource, /class="ocr-page"/);
  assert.match(ocrSource, /styles\/site-shell\.css/);
  assert.match(ocrSource, /styles\/ocr\.css/);
  assert.match(ocrSource, /js\/product-shell\.js/);
  assert.match(ocrSource, /id="dropZone"/);
  assert.match(ocrSource, /id="coreRuntimeStatus"/);
  assert.match(ocrStyles, /\.drop-zone[\s\S]*border:\s*1px dashed var\(--site-line-strong\)/);
});

test('liquid controls use a reduced-motion-safe pointer highlight', () => {
  assert.match(productShellScript, /prefers-reduced-motion: reduce/);
  assert.match(productShellScript, /pointer: fine/);
  assert.match(productShellScript, /requestAnimationFrame\(updateHighlight\)/);
  assert.match(productShellScript, /--glass-x/);
  assert.doesNotMatch(productShellScript, /'\.platform-card'/);
  assert.match(liquidGlassStyles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(downloadStyles, /\.platform-card\.recommended[\s\S]*backdrop-filter:\s*blur\(var\(--glass-blur\)\)/);
  assert.match(downloadStyles, /\.recommended-badge[\s\S]*position:\s*absolute/);
});

test('manual documents the current Mobile runtime boundary and ecosystem ownership', () => {
  assert.match(manualSource, /Android 7\.0\+（API 24/);
  assert.match(manualSource, /当前版本：#text\(weight: "bold"\)\[v1\.3\.0\]/);
  assert.match(manualSource, /许可证：AGPL-3\.0/);
  assert.match(manualSource, /目前没有与 Android 等价的原生 OCR 适配/);
  assert.match(manualSource, /不要与独立 Office 项目混淆/);
});
