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

const sceneDataSource = await readFile(
  new URL('../src/data/landingScenes.js', import.meta.url),
  'utf8',
);

const sceneStyles = await readFile(
  new URL('../src/components/scenes/Scenes.module.css', import.meta.url),
  'utf8',
);

const mathWorldSource = await readFile(
  new URL('../src/three/MathWorld.jsx', import.meta.url),
  'utf8',
);

const playgroundSource = await readFile(
  new URL('../src/p5/MathPlayground.jsx', import.meta.url),
  'utf8',
);

const astSceneSource = await readFile(
  new URL('../src/components/scenes/AstSection.jsx', import.meta.url),
  'utf8',
);

const transformSceneSource = await readFile(
  new URL('../src/components/scenes/TransformSection.jsx', import.meta.url),
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

const releaseLabel = `v${releaseManifest.version}${releaseManifest.channel ? ` ${releaseManifest.channel}` : ''}`;

test('homepage lists all project entries', () => {
  assert.match(contentSource, /name: "LaTeXSnipper Desktop"/);
  assert.match(contentSource, /name: "LaTeXSnipper Mobile"/);
  assert.match(contentSource, /name: "LaTeXSnipper Office"/);
  assert.match(contentSource, /name: "LaTeXSnipper Core"/);
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

test('homepage retains the planned DOM-first product journey', () => {
  for (const section of [
    'CaptureSection',
    'RecognizeSection',
    'AstSection',
    'TransformSection',
    'WorkspaceSection',
    'MathPlayground',
    'EcosystemScene',
    'FinalCta',
  ]) {
    assert.match(landingSource, new RegExp(`<${section}`));
  }
  assert.match(astSceneSource, /静态结构示例/);
  assert.match(transformSceneSource, /实际转换能力/);
  assert.match(astSceneSource, /SemanticGraph/);
  assert.match(transformSceneSource, /SemanticGraph/);
  assert.match(sceneStyles, /scroll-margin-top/);
});

test('math visualization avoids a page scroll listener', () => {
  assert.doesNotMatch(mathWorldSource, /addEventListener\(['"]scroll/);
  assert.match(mathWorldSource, /IntersectionObserver/);
});

test('math playground uses p5 lifecycle only when it approaches the viewport', () => {
  assert.match(playgroundSource, /import\("p5"\)/);
  assert.match(playgroundSource, /new P5/);
  assert.match(playgroundSource, /IntersectionObserver/);
  assert.match(playgroundSource, /p5Instance\?\.remove\(\)/);
});

test('homepage download CTA is platform-neutral', () => {
  assert.match(landingSource, /下载 LaTeXSnipper/);
  assert.doesNotMatch(landingSource, /<table/);
});

test('homepage mobile breakpoints exist', () => {
  assert.match(landingStyles, /max-width: 720px/);
  assert.match(landingStyles, /max-width: 420px/);
  assert.match(siteShellStyles, /sr-only/);
  assert.match(siteShellStyles, /scroll-padding-top/);
  assert.match(siteShellStyles, /site-navigation\.lg-surface/);
});

test('liquid glass components follow V2 pattern', () => {
  assert.match(landingSource, /LiquidGlassSurface/);
  assert.doesNotMatch(landingSource, /id="liquid-backdrop-refraction"/);
  assert.match(productShellScript, /liquid-backdrop-refraction/);
  assert.match(productShellScript, /liquid-navigation-refraction/);
  assert.match(productShellScript, /scale="12"/);
  assert.match(productShellScript, /navigationEdge/);
  assert.match(productShellScript, /scale="5"/);
  assert.match(liquidGlassStyles, /lg-backdrop/);
  assert.match(liquidGlassStyles, /lg-caustic/);
  assert.match(liquidGlassStyles, /lg-surface--control/);
  assert.match(liquidGlassStyles, /--lg-tint-strength:\s*24%/);
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

test('download page keeps desktop release labels aligned', () => {
  const desktopLabels = Array.from(
    downloadSource.matchAll(/<strong>LaTeXSnipper Desktop<\/strong><span>([^<]+)<\/span>/g),
    (match) => match[1],
  );
  assert.deepEqual(desktopLabels, [
    `${releaseLabel} · SakuraMathcraft · GPL-3.0`,
  ]);
  assert.match(
    downloadSource,
    new RegExp(`下载 SakuraMathcraft 维护的 Desktop ${releaseLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
  );
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

test('manual documents mobile and Office integrations', () => {
  assert.match(manualSource, /Android/);
  assert.match(manualSource, /LaTeXSnipper Mobile/);
  assert.match(manualSource, /Office 加载项指南/);
});

test('manual mobile hardening stays enabled', () => {
  assert.match(productShellScript, /user-scalable=no/);
  assert.match(productShellScript, /manual-mobile-fixes\.css/);
});
