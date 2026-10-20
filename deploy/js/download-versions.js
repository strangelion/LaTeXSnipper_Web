/**
 * Download-page version catalogue.
 *
 * The newest release always comes from /release-manifest.json, which the release
 * sync workflow rewrites on every upstream release. Older releases come from
 * /old-versions.json, a hand-maintained list that the workflow never touches, so
 * publishing a new version never requires editing archived entries.
 *
 * Everything here is pure data shaping so it can be unit tested without a DOM.
 */

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)$/

/** Assets the download page can render. Unknown ids are ignored. */
export const KNOWN_ASSET_IDS = Object.freeze([
  'windows-x86_64-cpu',
  'windows-x86_64-gpu',
  'linux-amd64-cpu',
  'linux-amd64-gpu',
  'macos-arm64-cpu',
  'office-plugin-windows',
])

/**
 * Releases before 3.2 shipped one build per platform. They are still linked from
 * old-versions.json, so their ids are folded onto the edition they correspond to
 * instead of forcing every archived entry to be rewritten.
 */
export const LEGACY_ASSET_IDS = Object.freeze({
  'windows-x86_64': 'windows-x86_64-cpu',
  'linux-amd64': 'linux-amd64-cpu',
  'macos-arm64': 'macos-arm64-cpu',
})

/**
 * How many archived releases the picker may show below the live one.
 *
 * old-versions.json only grows when someone adds an entry, but a stale entry is
 * removed from R2 sooner or later; capping keeps the switcher a single row and
 * bounds the number of links that can rot.
 */
export const MAX_ARCHIVED_VERSIONS = 3

export function parseVersion(value) {
  const match = SEMVER_RE.exec(String(value || '').trim())
  if (!match) return null
  return match.slice(1).map(Number)
}

function compareVersionsDesc(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return right[index] - left[index]
  }
  return 0
}

function assetEdition(asset, id) {
  const declared = String(asset.edition || '').trim()
  if (declared) return declared
  if (/-gpu$/.test(id)) return 'gpu'
  if (/-cpu$/.test(id)) return 'cpu'
  return ''
}

function normalizeAsset(asset) {
  if (!asset || typeof asset !== 'object') return null
  const rawId = String(asset.id || '').trim()
  const id = LEGACY_ASSET_IDS[rawId] || rawId
  const href = String(asset.href || '').trim()
  if (!KNOWN_ASSET_IDS.includes(id) || !href) return null
  const sha256 = String(asset.sha256 || '').trim().toLowerCase()
  return {
    id,
    href,
    platform: String(asset.platform || '').trim(),
    label: String(asset.label || '').trim(),
    architecture: String(asset.architecture || '').trim(),
    requirements: String(asset.requirements || '').trim(),
    size: String(asset.size || '').trim(),
    // Archived releases link to GitHub once R2 drops them, so both forms exist.
    edition: assetEdition(asset, id),
    // An archived release may legitimately lack a checksum; never invent one.
    sha256: /^[a-f0-9]{64}$/.test(sha256) ? sha256 : '',
  }
}

/**
 * Shape one release (manifest or archived entry) into a render-ready option.
 * Returns null when the entry cannot be trusted, so a broken archive file can
 * never blank out the download page.
 */
export function normalizeVersionEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const version = String(entry.version || '').trim()
  const parsed = parseVersion(version)
  if (!parsed) return null
  const assets = (Array.isArray(entry.assets) ? entry.assets : [])
    .map(normalizeAsset)
    .filter(Boolean)
  if (assets.length === 0) return null
  const seen = new Set()
  const uniqueAssets = assets.filter((asset) => {
    if (seen.has(asset.id)) return false
    seen.add(asset.id)
    return true
  })
  return {
    version,
    parsed,
    channel: String(entry.channel || '').trim(),
    publishedAt: String(entry.publishedAt || '').trim(),
    releaseNotesUrl: String(entry.releaseNotesUrl || '').trim(),
    assets: uniqueAssets,
    isLatest: false,
  }
}

function asVersionArray(payload) {
  if (!payload || typeof payload !== 'object') return []
  return Array.isArray(payload.versions) ? payload.versions : []
}

/**
 * Merge the live manifest with archived releases into one newest-first list.
 *
 * The manifest always wins on a version collision: an archived entry that has
 * since been re-published keeps the live checksums and links.
 */
export function buildVersionOptions(
  manifest,
  archived,
  { maxArchived = MAX_ARCHIVED_VERSIONS } = {},
) {
  const options = []
  const latest = normalizeVersionEntry(manifest)
  if (latest) options.push(latest)

  const archivedEntries = Array.isArray(archived)
    ? archived
    : asVersionArray(archived)
  for (const entry of archivedEntries) {
    const option = normalizeVersionEntry(entry)
    if (!option) continue
    if (options.some((existing) => existing.version === option.version)) continue
    options.push(option)
  }

  options.sort((left, right) => compareVersionsDesc(left.parsed, right.parsed))

  /* Keep the live release plus the newest few archived ones, newest first. */
  const limit = Math.max(1, 1 + Math.max(0, Number(maxArchived) || 0))
  const kept = options.slice(0, limit)
  const newest = kept[0]
  for (const option of kept) {
    option.isLatest = option === newest
  }
  return kept.map(({ parsed: _parsed, ...option }) => option)
}

/** Resolve a `?version=` request, falling back to the newest release. */
export function findVersionOption(options, requested) {
  const list = Array.isArray(options) ? options : []
  if (list.length === 0) return null
  const wanted = String(requested || '').trim().replace(/^v/i, '')
  if (wanted) {
    const match = list.find((option) => option.version === wanted)
    if (match) return match
  }
  return list[0]
}

export function formatVersionLabel(option) {
  if (!option) return ''
  const suffix = option.channel ? ` ${option.channel}` : ''
  return `v${option.version}${suffix}`
}
