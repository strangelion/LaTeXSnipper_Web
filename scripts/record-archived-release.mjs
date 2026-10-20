/**
 * Move the release that is about to be replaced into public/old-versions.json.
 *
 * The download page reads its "latest" entry from public/release-manifest.json
 * and the older entries from public/old-versions.json. The release sync workflow
 * overwrites the manifest, so this script must run while the outgoing manifest is
 * still in place; it copies that manifest into the archive list and trims the list
 * to the same depth the page is willing to render (MAX_ARCHIVED_VERSIONS).
 *
 * Usage: node scripts/record-archived-release.mjs /tmp/release-manifest.json
 *
 * The argument is the incoming manifest, used only to tell whether a release is
 * actually being replaced. Running it without the argument is a no-op so the
 * workflow never rewrites the archive list by accident.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const MANIFEST_PATH = 'public/release-manifest.json';
const ARCHIVE_PATH = 'public/old-versions.json';

/* Keep in sync with MAX_ARCHIVED_VERSIONS in js/download-versions.js. */
const MAX_ARCHIVED_VERSIONS = 3;

const ARCHIVE_COMMENT =
  'Archived Desktop releases offered by the download page version picker. ' +
  'Maintained automatically: scripts/record-archived-release.mjs moves the ' +
  'release that a new sync displaces to the top of this list and keeps the ' +
  'newest entries only (MAX_ARCHIVED_VERSIONS in js/download-versions.js). ' +
  'Delete an entry by hand when its /dl/ object is removed from R2.';

function readJson(path) {
  const raw = readFileSync(path, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Cannot parse JSON in ${path}: ${error.message}`, { cause: error });
  }
}

function normalizeEntry(manifest) {
  const version = String(manifest?.version || '').trim();
  if (!version) return null;
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  return {
    version,
    channel: String(manifest.channel || '').trim(),
    publishedAt: String(manifest.publishedAt || '').trim(),
    releaseNotesUrl: String(manifest.releaseNotesUrl || '').trim(),
    assets: assets.filter((asset) => asset && asset.id && asset.href),
  };
}

function main() {
  const incomingPath = process.argv[2];
  if (!incomingPath) {
    console.log('[archive] No incoming manifest given; leaving the archive list untouched.');
    return;
  }
  if (!existsSync(incomingPath)) {
    console.log(`[archive] ${incomingPath} is missing; leaving the archive list untouched.`);
    return;
  }

  const incoming = readJson(incomingPath);
  const incomingVersion = String(incoming?.version || '').trim();
  if (!incomingVersion) {
    throw new Error(`[archive] ${incomingPath} has no version field.`);
  }

  if (!existsSync(MANIFEST_PATH)) {
    console.log(`[archive] ${MANIFEST_PATH} is missing; nothing to archive.`);
    return;
  }

  const outgoing = readJson(MANIFEST_PATH);
  const outgoingEntry = normalizeEntry(outgoing);
  if (!outgoingEntry) {
    console.log(`[archive] ${MANIFEST_PATH} has no version field; nothing to archive.`);
    return;
  }
  if (outgoingEntry.version === incomingVersion) {
    console.log(`[archive] ${outgoingEntry.version} is still the live release; archive list untouched.`);
    return;
  }

  const archive = existsSync(ARCHIVE_PATH)
    ? readJson(ARCHIVE_PATH)
    : { schemaVersion: 1, versions: [] };
  const existing = Array.isArray(archive.versions) ? archive.versions : [];
  const withoutDuplicate = existing.filter(
    (entry) => String(entry?.version || '').trim() !== outgoingEntry.version,
  );

  const versions = [outgoingEntry, ...withoutDuplicate].slice(0, MAX_ARCHIVED_VERSIONS);
  const next = {
    $comment: ARCHIVE_COMMENT,
    schemaVersion: Number(archive.schemaVersion) || 1,
    versions,
  };

  writeFileSync(ARCHIVE_PATH, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  const dropped = withoutDuplicate.length + 1 - versions.length;
  console.log(
    `[archive] Archived ${outgoingEntry.version}; ${versions.length} entries kept` +
      (dropped > 0 ? `, ${dropped} older entries dropped.` : '.'),
  );
}

main();
