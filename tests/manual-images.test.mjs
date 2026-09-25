import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const MANIFEST_URL = new URL('../assets/images/.manual-images.json', import.meta.url);

// Every committed copy of the manual page must stay consistent.
const PAGES = ['user_manual.html', 'dist/user_manual.html', 'deploy/user_manual.html'];
const TREE_COPIES = ['dist/', 'deploy/'];

const typSource = await readFile(new URL('../user_manual.typ', import.meta.url), 'utf8');

/** Local image references of the manual source, in source order. */
const imageReferences = [...typSource.matchAll(/image\(\s*"([^"]+)"/g)]
  .map((match) => match[1].trim())
  .filter((ref) => ref && !/^(https?:|data:|assets\/|\/assets\/)/.test(ref));

/**
 * Deployment path of a manual image. Mirrors build_manual.py, which flattens
 * references such as "../docs/latexsnipper.png" to assets/images/docs/...
 */
function deployedImage(ref) {
  return `assets/images/${ref.replace(/\\/g, '/').replace(/^(\.\.?\/)+/, '')}`;
}

function repoPath(relative) {
  return fileURLToPath(new URL(`../${relative}`, import.meta.url));
}

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('manual source references at least one local image', () => {
  assert.ok(imageReferences.length > 0, 'found no image() reference in user_manual.typ');
});

test('every referenced manual image exists at its deployment path', () => {
  for (const ref of imageReferences) {
    const target = deployedImage(ref);
    assert.ok(existsSync(repoPath(target)), `${ref} does not resolve to ${target}`);
  }
});

test('committed manual pages embed every image with lazy loading', async () => {
  for (const page of PAGES) {
    const html = await readFile(repoPath(page), 'utf8');
    assert.ok(
      !html.includes('assets/images/../'),
      `${page} still contains an unresolved "../" image path`,
    );

    for (const ref of imageReferences) {
      const src = deployedImage(ref);
      const tag = html.match(new RegExp(`<img src="${escapeForRegExp(src)}"[^>]*>`));
      assert.ok(tag, `${page} has no <img> tag for ${src}`);
      assert.ok(tag[0].includes('loading="lazy"'), `${page} loads ${src} eagerly`);
      assert.ok(tag[0].includes('decoding="async"'), `${page} decodes ${src} synchronously`);
    }
  }
});

test('deployment trees ship every referenced manual image', () => {
  for (const tree of TREE_COPIES) {
    for (const ref of imageReferences) {
      const relative = `${tree}${deployedImage(ref)}`;
      assert.ok(
        existsSync(repoPath(relative)),
        `${relative} is missing; scripts/copy-assets.cjs must copy manual images`,
      );
    }
  }
});

test('manual pages only embed images that exist', async () => {
  for (const page of PAGES) {
    const html = await readFile(repoPath(page), 'utf8');
    const pageDir = page.includes('/') ? page.slice(0, page.lastIndexOf('/') + 1) : '';

    for (const [, src] of html.matchAll(/<img src="([^"]+)"/g)) {
      if (/^(https?:|data:)/.test(src)) continue;
      // Absolute sources are served from the published root (deploy/).
      const relative = src.startsWith('/') ? `deploy${src}` : `${pageDir}${src}`;
      assert.ok(existsSync(repoPath(relative)), `${page} embeds ${src} which is missing`);
    }
  }
});

test('renamed cover image keeps the manual-cover-visual wrapper', async () => {
  const cover = imageReferences.find((ref) => /latexsnipper/i.test(ref));
  assert.ok(cover, 'user_manual.typ no longer references the LaTeXSnipper cover image');

  for (const page of PAGES) {
    const html = await readFile(repoPath(page), 'utf8');
    assert.ok(
      html.includes('class="manual-cover-visual"'),
      `${page} lost the cover wrapper class`,
    );
  }
});

test('cover title block keeps the manual-cover class', async () => {
  // Upstream rewrites the cover release line every release ("长期支持版" became
  // "适用于 v3.0.0-LTS"), so build_manual.py must key the class off a release
  // marker. styles/manual-mobile-fixes.css targets .manual-cover to keep the
  // version tag from being clipped on narrow viewports.
  assert.ok(
    /长期支持|LTS|\bv\d+(?:\.\d+)+/i.test(typSource),
    'user_manual.typ has no cover release marker; check build_manual.py COVER_VERSION_RE',
  );

  for (const page of PAGES) {
    const html = await readFile(repoPath(page), 'utf8');
    assert.ok(
      html.includes('<div class="manual-cover">'),
      `${page} demoted the cover title block to a generic centered block`,
    );
  }
});

test('image sync manifest lists every referenced manual image', async () => {
  const manifest = JSON.parse(await readFile(MANIFEST_URL, 'utf8'));
  const synced = manifest.images ?? [];

  for (const ref of imageReferences) {
    const entry = deployedImage(ref).replace('assets/images/', '');
    assert.ok(
      synced.includes(entry),
      `assets/images/.manual-images.json is missing ${entry}; run scripts/sync-manual-images.py`,
    );
  }
});
