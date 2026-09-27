import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

const [
  remoteHtml,
  remoteScript,
  remoteStyles,
  landing,
  finalCta,
  workspace,
  download,
  manual,
  ocr,
  shellScript,
  shellStyles,
] = await Promise.all([
  read('../public/remote.html'),
  read('../public/js/remote.js'),
  read('../styles/remote.css'),
  read('../src/components/LandingPage.jsx'),
  read('../src/components/scenes/FinalCta.jsx'),
  read('../src/components/scenes/WorkspaceSection.jsx'),
  read('../download.html'),
  read('../user_manual.html'),
  read('../public/ocr.html'),
  read('../js/product-shell.js'),
  read('../styles/site-shell.css'),
]);

test('remote connection is discoverable from the shared site entry points', () => {
  for (const source of [landing, finalCta, workspace, download, manual, ocr]) {
    assert.match(source, /href=["']\/remote\.html["'][^>]*>远程连接</);
  }
  assert.match(remoteHtml, /href="\/remote\.html" aria-current="page">远程连接/);
});

test('remote onboarding presents connection before recognition', () => {
  const connection = remoteHtml.indexOf('id="remoteConnection"');
  const submit = remoteHtml.indexOf('id="remoteSubmit"');
  assert.ok(connection > -1);
  assert.ok(submit > connection);
  assert.doesNotMatch(remoteHtml, /id="rememberCheck"[^>]*checked/);
  assert.match(remoteHtml, /id="openSetupBtn"[^>]*aria-controls="connectionPanel"/);
});

test('remote input sources provide browser-aware fallbacks', () => {
  assert.match(remoteHtml, /id="remoteCamera"[^>]*capture="environment"/);
  assert.match(remoteHtml, /id="pasteBtn" hidden/);
  assert.match(remoteHtml, /id="screenBtn" hidden/);
  assert.match(remoteHtml, /id="drawingCanvas"/);
  assert.match(remoteScript, /navigator\.clipboard\.read/);
  assert.match(remoteScript, /getDisplayMedia/);
  assert.match(remoteScript, /stream\.getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(remoteScript, /document\.addEventListener\('paste', handleImagePaste\)/);
  assert.match(remoteScript, /addEventListener\('pointerdown', beginDrawing\)/);
});

test('same-device and HTTPS connection paths have actionable guidance', () => {
  assert.match(remoteHtml, /id="useLocalFileBtn"/);
  assert.match(remoteHtml, /%USERPROFILE%\\\.latexsnipper\\automation-api\.json/);
  assert.match(remoteHtml, /~\/\.latexsnipper\/automation-api\.json/);
  assert.match(remoteHtml, /Library\/Application Support\/LaTeXSnipper\/automation-api\.json/);
  assert.match(remoteHtml, /href="\/user_manual\.html#https-moshi"/);
  assert.match(remoteHtml, /证书 SAN/);
  assert.match(remoteHtml, /反向代理或 SSH/);
  assert.match(remoteHtml, /网页仍需要桌面端允许当前 Origin/);
  assert.match(remoteScript, /importLocalConnectionFile/);
  assert.match(remoteScript, /payload\.base_url/);
  assert.match(remoteScript, /payload\.token/);
  assert.match(remoteScript, /supportsTargetAddressSpace/);
  assert.match(remoteScript, /connectionSource === 'local-file'/);
});

test('remote target-address fallback handles asynchronous fetch rejection', () => {
  assert.match(remoteScript, /async function desktopFetch/);
  assert.match(remoteScript, /return await fetch\(url, \{ \.\.\.request, targetAddressSpace: space \}\)/);
});

test('remote page has unique element ids and keyboard-operable drop input', () => {
  const ids = Array.from(remoteHtml.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(remoteHtml, /id="dropZone" role="button" tabindex="0"/);
  assert.match(remoteScript, /event\.key !== 'Enter' && event\.key !== ' '/);
});

test('shared navigation collapses before the new entry can wrap', () => {
  assert.match(shellStyles, /@media \(max-width: 1040px\)/);
  assert.match(shellScript, /matchMedia\('\(max-width: 1040px\)'\)/);
  assert.match(landing, /matchMedia\("\(max-width: 1040px\)"\)/);
});

test('remote page avoids banned dash glyphs and includes responsive layouts', () => {
  assert.doesNotMatch(remoteHtml, /[—–]/);
  assert.doesNotMatch(remoteScript, /[—–]/);
  assert.match(remoteStyles, /grid-template-columns: minmax\(19rem, 0\.86fr\)/);
  assert.match(remoteStyles, /@media \(max-width: 860px\)/);
  assert.match(remoteStyles, /@media \(max-width: 600px\)/);
});
