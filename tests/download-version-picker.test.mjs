import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  KNOWN_ASSET_IDS,
  LEGACY_ASSET_IDS,
  MAX_ARCHIVED_VERSIONS,
  buildVersionOptions,
  findVersionOption,
  formatVersionLabel,
  normalizeVersionEntry,
} from '../js/download-versions.js';

const readJson = async (relativePath) => JSON.parse(await readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8',
));

const manifest = await readJson('public/release-manifest.json');
const archived = await readJson('public/old-versions.json');
const downloadPage = await readFile(
  new URL('../download.html', import.meta.url),
  'utf8',
);

const windowsAsset = {
  id: 'windows-x86_64-cpu',
  edition: 'cpu',
  platform: 'windows',
  label: 'Windows',
  architecture: 'x86_64',
  requirements: 'Windows 10 / 11',
  href: '/dl/example.exe',
  sha256: 'a'.repeat(64),
  size: '100 MB',
};

test('archived releases stay valid standalone data', () => {
  assert.equal(archived.schemaVersion, 1);
  assert.ok(Array.isArray(archived.versions));
  assert.ok(archived.versions.length > 0);

  const versions = new Set();
  for (const entry of archived.versions) {
    assert.match(entry.version, /^\d+\.\d+\.\d+$/, `bad version ${entry.version}`);
    assert.ok(!versions.has(entry.version), `duplicate archived version ${entry.version}`);
    versions.add(entry.version);
    assert.ok(Array.isArray(entry.assets) && entry.assets.length > 0);

    const ids = new Set();
    for (const asset of entry.assets) {
      assert.ok(!ids.has(asset.id), `duplicate asset ${asset.id} in ${entry.version}`);
      ids.add(asset.id);
      assert.ok(
        KNOWN_ASSET_IDS.includes(asset.id),
        `archived asset ${asset.id} is not a renderable download id`,
      );
      /* The sync prunes every R2 object outside the live release. */
      assert.match(
        asset.href,
        /^https:\/\/github\.com\/SakuraMathcraft\/LaTeXSnipper\/releases\/download\//,
        `archived asset ${asset.id} must link to GitHub, not /dl/`,
      );
      assert.match(asset.sha256, /^[a-f0-9]{64}$/, `bad sha256 for ${asset.id}`);
    }
  }
});

test('every live manifest asset has an id the page can render', () => {
  /* Pre-3.2 manifests still use the legacy ids; those fold onto an edition. */
  for (const asset of manifest.assets) {
    const id = LEGACY_ASSET_IDS[asset.id] || asset.id;
    assert.ok(
      KNOWN_ASSET_IDS.includes(id),
      `manifest asset ${asset.id} is unknown; update KNOWN_ASSET_IDS and download.html`,
    );
  }
});

test('pre-3.2 asset ids fold onto a known edition instead of vanishing', () => {
  const entry = normalizeVersionEntry({
    version: '3.1.0',
    assets: [
      { id: 'windows-x86_64', href: '/dl/old.exe' },
      { id: 'linux-amd64', href: '/dl/old.deb' },
      { id: 'macos-arm64', href: '/dl/old.dmg' },
    ],
  });
  assert.deepEqual(
    entry.assets.map((asset) => [asset.id, asset.edition]),
    [
      ['windows-x86_64-cpu', 'cpu'],
      ['linux-amd64-cpu', 'cpu'],
      ['macos-arm64-cpu', 'cpu'],
    ],
  );
});

test('the live manifest is the newest option and archives are deduplicated', () => {
  const options = buildVersionOptions(manifest, archived);
  assert.ok(options.length >= 1);
  assert.equal(options[0].version, manifest.version);
  assert.equal(options[0].isLatest, true);

  const versions = options.map((option) => option.version);
  assert.equal(new Set(versions).size, versions.length);

  const rest = options.slice(1);
  for (const option of rest) {
    assert.equal(option.isLatest, false, `${option.version} must not claim to be latest`);
  }
  /* Newest release first: the picker must never open on an older build. */
  const numeric = versions.map((value) => value.split('.').map(Number));
  for (let index = 1; index < numeric.length; index += 1) {
    const previous = numeric[index - 1];
    const current = numeric[index];
    const ordered = previous[0] - current[0] || previous[1] - current[1] || previous[2] - current[2];
    assert.ok(ordered > 0, `${versions[index - 1]} must sort ahead of ${versions[index]}`);
  }
});

test('archived releases never pile up in the switcher', () => {
  const archivedMany = {
    versions: ['3.0.0', '2.5.0', '2.4.0', '2.3.0', '2.2.0'].map((version) => ({
      version,
      assets: [windowsAsset],
    })),
  };
  const options = buildVersionOptions(manifest, archivedMany);

  assert.equal(options.length, MAX_ARCHIVED_VERSIONS + 1);
  assert.equal(options[0].version, manifest.version);
  assert.deepEqual(
    options.slice(1).map((option) => option.version),
    ['3.0.0', '2.5.0', '2.4.0'],
  );
  assert.equal(buildVersionOptions(manifest, archivedMany, { maxArchived: 0 }).length, 1);
  assert.equal(buildVersionOptions(manifest, archivedMany, { maxArchived: 9 }).length, 6);
});

test('a manifest entry wins over a stale archived copy of the same version', () => {
  const options = buildVersionOptions(
    { ...manifest, assets: [{ ...windowsAsset, href: '/dl/live.exe' }] },
    {
      versions: [
        {
          version: manifest.version,
          assets: [{ ...windowsAsset, href: '/dl/archived.exe' }],
        },
      ],
    },
  );
  assert.equal(options.length, 1);
  assert.equal(options[0].assets[0].href, '/dl/live.exe');
});

test('unusable entries are skipped instead of breaking the picker', () => {
  assert.equal(normalizeVersionEntry(null), null);
  assert.equal(normalizeVersionEntry({ version: 'v3.1.0', assets: [windowsAsset] }), null);
  assert.equal(normalizeVersionEntry({ version: '3.1.0', assets: [] }), null);
  assert.equal(normalizeVersionEntry({ version: '3.1.0', assets: [{ id: 'unknown', href: '/dl/x' }] }), null);

  const options = buildVersionOptions(
    { version: 'not-a-version', assets: [windowsAsset] },
    { versions: [{ version: '3.0.0', assets: [windowsAsset] }] },
  );
  assert.deepEqual(options.map((option) => option.version), ['3.0.0']);
  assert.equal(options[0].isLatest, true);
});

test('an archived release without a checksum never invents one', () => {
  const entry = normalizeVersionEntry({
    version: '3.0.0',
    assets: [{ ...windowsAsset, sha256: '' }],
  });
  assert.equal(entry.assets[0].sha256, '');
});

test('?version= selects an archived release and falls back to the newest one', () => {
  const options = buildVersionOptions(manifest, archived);
  const archivedVersion = options[options.length - 1].version;

  assert.equal(findVersionOption(options, archivedVersion).version, archivedVersion);
  assert.equal(findVersionOption(options, `v${archivedVersion}`).version, archivedVersion);
  assert.equal(findVersionOption(options, '9.9.9').version, options[0].version);
  assert.equal(findVersionOption(options, '').version, options[0].version);
  assert.equal(findVersionOption([], '3.1.0'), null);
});

test('version labels render the channel without duplicated spacing', () => {
  assert.equal(formatVersionLabel({ version: '3.2.0', channel: 'LTS' }), 'v3.2.0 LTS');
  assert.equal(formatVersionLabel({ version: '3.2.0', channel: '' }), 'v3.2.0');
  assert.equal(formatVersionLabel(null), '');
});

test('the download page mounts a version picker backed by both data files', () => {
  assert.match(downloadPage, /id="releaseVersionPanel"[^>]*role="listbox"/);
  assert.match(downloadPage, /<summary class="release-picker__trigger"/);
  assert.match(downloadPage, /id="releasePicker"[^>]*hidden/);
  assert.match(downloadPage, /data-release-label/);
  assert.match(downloadPage, /'\/old-versions\.json'/);
  assert.match(downloadPage, /buildVersionOptions\(/);
  assert.match(downloadPage, /findVersionOption\(versionOptions, query\.get\('version'\)\)/);
});

test('release copy rewriting targets the same version label the picker updates', async () => {
  const script = await readFile(
    new URL('../scripts/apply-release-version.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(script.includes('(<span data-release-label>)'));
  assert.match(downloadPage, /<span data-release-label>v\d+\.\d+\.\d+[^<]*<\/span>/);
});
const GITHUB_RELEASES = 'https://github.com/SakuraMathcraft/LaTeXSnipper/releases';
const archiveScript = fileURLToPath(
  new URL('../scripts/record-archived-release.mjs', import.meta.url),
);

const buildManifest = (version, fileStem) => ({
  schemaVersion: 1,
  product: 'LaTeXSnipper Desktop',
  version,
  channel: 'LTS',
  publishedAt: '2026-10-03T07:39:24Z',
  releaseNotesUrl: `${GITHUB_RELEASES}/tag/v${version}-LTS`,
  assets: [
    {
      id: 'windows-x86_64',
      platform: 'windows',
      label: 'Windows',
      architecture: 'x86_64',
      requirements: 'Windows 10 / 11',
      href: `/dl/${fileStem}.exe`,
      sha256: 'b'.repeat(64),
      size: '100 MB',
    },
  ],
});

const makeWorkspace = async ({ live, incoming, archive }) => {
  const dir = await mkdtemp(join(tmpdir(), 'ls-archive-'));
  await mkdir(join(dir, 'public'), { recursive: true });
  const write = (name, value) => writeFile(join(dir, name), JSON.stringify(value), 'utf8');
  if (live) await write('public/release-manifest.json', live);
  if (incoming) await write('incoming.json', incoming);
  if (archive) await write('public/old-versions.json', archive);
  return dir;
};

const runArchive = (dir, { incoming = true } = {}) => spawnSync(
  process.execPath,
  [archiveScript, ...(incoming ? [join(dir, 'incoming.json')] : [])],
  { cwd: dir, encoding: 'utf8' },
);

const readArchive = async (dir) => {
  try {
    return JSON.parse(await readFile(join(dir, 'public', 'old-versions.json'), 'utf8'));
  } catch {
    return null;
  }
};

test('the sync archives the release it displaces', async () => {
  const dir = await makeWorkspace({
    live: buildManifest('3.1.0', 'live'),
    incoming: buildManifest('3.2.0', 'incoming'),
  });
  const result = runArchive(dir);
  assert.equal(result.status, 0, result.stderr);

  const archive = await readArchive(dir);
  assert.deepEqual(archive.versions.map((entry) => entry.version), ['3.1.0']);
  assert.equal(archive.versions[0].channel, 'LTS');
  /* Archived links move to GitHub so R2 pruning cannot break them. */
  assert.equal(
    archive.versions[0].assets[0].href,
    `${GITHUB_RELEASES}/download/v3.1.0-LTS/live.exe`,
  );
  assert.equal(archive.versions[0].assets[0].id, 'windows-x86_64-cpu');
  assert.equal(archive.versions[0].assets[0].edition, 'cpu');
  assert.match(archive.$comment, /record-archived-release\.mjs/);
});

test('the archive keeps three entries, newest first, without duplicates', async () => {
  const dir = await makeWorkspace({
    live: buildManifest('3.2.0', 'live'),
    incoming: buildManifest('3.3.0', 'incoming'),
    archive: {
      schemaVersion: 1,
      versions: [
        { version: '3.2.0', assets: [] },
        { version: '3.1.0', assets: [] },
        { version: '3.0.0', assets: [] },
      ],
    },
  });
  const result = runArchive(dir);
  assert.equal(result.status, 0, result.stderr);

  const archive = await readArchive(dir);
  assert.deepEqual(archive.versions.map((entry) => entry.version), ['3.2.0', '3.1.0', '3.0.0']);
  assert.equal(
    archive.versions[0].assets[0].href,
    `${GITHUB_RELEASES}/download/v3.2.0-LTS/live.exe`,
  );
});

test('unchanged or missing manifests leave the archive alone', async () => {
  const sameRelease = await makeWorkspace({
    live: buildManifest('3.2.0', 'live'),
    incoming: buildManifest('3.2.0', 'incoming'),
    archive: { schemaVersion: 1, versions: [{ version: '3.0.0', assets: [] }] },
  });
  assert.equal(runArchive(sameRelease).status, 0);
  assert.deepEqual(
    (await readArchive(sameRelease)).versions.map((entry) => entry.version),
    ['3.0.0'],
  );

  const noArgument = await makeWorkspace({
    live: buildManifest('3.1.0', 'live'),
    incoming: buildManifest('3.2.0', 'incoming'),
  });
  assert.equal(runArchive(noArgument, { incoming: false }).status, 0);
  assert.equal(await readArchive(noArgument), null);

  const noLiveManifest = await makeWorkspace({
    incoming: buildManifest('3.2.0', 'incoming'),
  });
  assert.equal(runArchive(noLiveManifest).status, 0);
  assert.equal(await readArchive(noLiveManifest), null);
});

test('a release without a GitHub tag is never archived with a dead link', async () => {
  const dir = await makeWorkspace({
    live: {
      ...buildManifest('3.1.0', 'live'),
      releaseNotesUrl: 'https://example.invalid/tag/v3.1.0-LTS',
    },
    incoming: buildManifest('3.2.0', 'incoming'),
  });
  const result = runArchive(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await readArchive(dir), null);
});

test('the sync workflow archives before overwriting the manifest', async () => {
  const workflow = await readFile(
    new URL('../.github/workflows/sync_release.yml', import.meta.url),
    'utf8',
  );
  const archiveCall = workflow.indexOf('node scripts/record-archived-release.mjs /tmp/release-manifest.json');
  const overwrite = workflow.indexOf('cp /tmp/release-manifest.json public/release-manifest.json');
  assert.ok(archiveCall > 0, 'the sync must call the archiving script');
  assert.ok(overwrite > archiveCall, 'the archive must run before the manifest is replaced');
  assert.ok(workflow.includes('public/old-versions.json \\'), 'the sync must commit the archive list');
});

test('a renamed asset never inherits the previous checksum', async () => {
  const workflow = await readFile(
    new URL('../.github/workflows/sync_release.yml', import.meta.url),
    'utf8',
  );
  // Reusing a recorded hash for a different file name rejected the 3.2.0
  // office build, whose upstream metadata carries no checksum of its own.
  assert.ok(
    workflow.includes('if old.get("href") != f"/dl/{name}":'),
    'the sync must drop the recorded metadata once the file name changes',
  );
  const guard = workflow.indexOf('if old.get("href")');
  const fallback = workflow.indexOf('asset.get("sha256") or old.get("sha256"');
  assert.ok(guard > 0 && guard < fallback, 'the guard must run before any reuse');
});
