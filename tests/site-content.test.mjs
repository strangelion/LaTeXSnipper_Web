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

const downloadSource = await readFile(
  new URL('../download.html', import.meta.url),
  'utf8',
);

const manualSource = await readFile(
  new URL('../user_manual.typ', import.meta.url),
  'utf8',
);

test('homepage keeps project ownership and license boundaries explicit', () => {
  assert.match(contentSource, /name: 'LaTeXSnipper Desktop'[\s\S]*author: 'SakuraMathcraft'[\s\S]*license: 'GPL-3\.0'/);
  assert.match(contentSource, /name: 'LaTeXSnipper Mobile'[\s\S]*author: 'strangelion'[\s\S]*license: 'AGPL-3\.0'/);
  assert.match(contentSource, /name: 'LaTeXSnipper Office'[\s\S]*author: 'strangelion'[\s\S]*license: 'AGPL-3\.0'/);
  assert.match(contentSource, /name: 'LaTeXSnipper Core'[\s\S]*version: 'v3\.0\.1'[\s\S]*author: 'strangelion'/);
});

test('homepage product screenshots are bundled and do not rely on lazy loading', () => {
  assert.match(contentSource, /import heroWorkspaceImage from/);
  assert.match(contentSource, /import ocrResultImage from/);
  assert.match(contentSource, /import officeWordImage from/);
  assert.doesNotMatch(contentSource, /image: '\/assets\/images\/product\//);
  assert.match(landingSource, /loading="eager"/);
  assert.doesNotMatch(landingSource, /loading=.*lazy/);
});

test('download page distinguishes Desktop packages from independent ecosystem projects', () => {
  assert.match(downloadSource, /Desktop 内置 Office 插件/);
  assert.match(downloadSource, /属于 LaTeXSnipper Desktop · SakuraMathcraft · GPL-3\.0/);
  assert.match(downloadSource, /LaTeXSnipper Mobile[\s\S]*v1\.3\.0 · strangelion · AGPL-3\.0/);
  assert.match(downloadSource, /LaTeXSnipper Office[\s\S]*v1\.4\.2 · strangelion · AGPL-3\.0/);
  assert.match(downloadSource, /latexsnipper-core[\s\S]*v3\.0\.1 · strangelion · AGPL-3\.0/);
});

test('manual documents the current Mobile runtime boundary and ecosystem ownership', () => {
  assert.match(manualSource, /Android 7\.0\+（API 24/);
  assert.match(manualSource, /当前版本：#text\(weight: "bold"\)\[v1\.3\.0\]/);
  assert.match(manualSource, /许可证：AGPL-3\.0/);
  assert.match(manualSource, /目前没有与 Android 等价的原生 OCR 适配/);
  assert.match(manualSource, /不要与独立 Office 项目混淆/);
});
