import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

test('release sync updates Desktop labels without hard-coding the homepage offline package version', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'ls-release-copy-'));
  try {
    const paths = ['index.html', 'download.html', 'src/data/siteContent.js', 'public/ocr.html', 'public/remote.html', 'public/open-source.html'];
    for (const path of paths) {
      const dest = join(dir, path);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, await readFile(new URL('../' + path, import.meta.url)));
    }
    const manifest = { version: '9.8.7', channel: 'LTS', releaseNotesUrl: 'https://github.com/SakuraMathcraft/LaTeXSnipper/releases/tag/v9.8.7-LTS' };
    await writeFile(join(dir, 'public/release-manifest.json'), JSON.stringify(manifest));
    const script = fileURLToPath(new URL('../scripts/apply-release-version.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const data = await readFile(join(dir, 'src/data/siteContent.js'), 'utf8');
    assert.match(data, /version:\s*["']9\.8\.7["']/);
    assert.ok(data.includes('Desktop ${DESKTOP_RELEASE_LABEL} 提供自包含离线安装包'));
    assert.ok(data.includes('version: DESKTOP_RELEASE_LABEL'));
    const landing = await readFile(new URL('../src/components/LandingPage.jsx', import.meta.url), 'utf8');
    assert.ok(landing.includes('Desktop ${DESKTOP_RELEASE_LABEL}'));
    for (const path of paths.filter(path => path.endsWith('.html') && path !== 'index.html')) {
      const html = await readFile(join(dir, path), 'utf8');
      const labels = [...html.matchAll(/<span\b[^>]*\bdata-release-label\b[^>]*>([^<]*)<\/span>/g)];
      assert.ok(labels.length, path);
      for (const label of labels) assert.equal(label[1], 'v9.8.7 LTS', path);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
