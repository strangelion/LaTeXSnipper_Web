import { readFileSync, writeFileSync } from 'node:fs';

const manifestPath = 'public/release-manifest.json';

function readManifest(path) {
  const raw = readFileSync(path, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Cannot parse release manifest ${path}: ${error.message}`, { cause: error });
  }
}

const manifest = readManifest(manifestPath);
const version = String(manifest.version || '').trim();
const channel = String(manifest.channel || '').trim();
const releaseNotesUrl = String(manifest.releaseNotesUrl || '').trim();

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Invalid release version in ${manifestPath}: ${version || '(empty)'}`);
}

const releaseLabel = `v${version}${channel ? ` ${channel}` : ''}`;

function rewrite(path, transform) {
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) {
    console.log(`  = ${path}`);
    return;
  }
  writeFileSync(path, after, 'utf8');
  console.log(`  ✓ ${path}`);
}

console.log(`Applying website release copy: ${releaseLabel}`);

rewrite('src/data/siteContent.js', (source) => {
  let next = source;
  next = next.replace(
    /(export const FALLBACK_RELEASE\s*=\s*\{[\s\S]*?version:\s*')[^']+(')/,
    `$1${version}$2`,
  );
  next = next.replace(
    /(export const FALLBACK_RELEASE\s*=\s*\{[\s\S]*?releaseNotesUrl:\s*\n?\s*')[^']+(')/,
    `$1${releaseNotesUrl || 'https://github.com/SakuraMathcraft/LaTeXSnipper/releases'}$2`,
  );
  next = next.replace(
    /(name:\s*'LaTeXSnipper Desktop',[\s\S]*?version:\s*')[^']+(')/,
    `$1${releaseLabel}$2`,
  );
  return next;
});

rewrite('index.html', (source) => source.replace(
  /("softwareVersion"\s*:\s*")[^"]+("\s*,?)/,
  `$1${version}$2`,
));

rewrite('download.html', (source) => {
  let next = source;
  next = next.replace(
    /(<span data-release-label>)v\d+\.\d+\.\d+(?:\s+[A-Za-z0-9._-]+)?(<\/span>)/,
    `$1${releaseLabel}$2`,
  );
  next = next.replace(
    /(<a href="https:\/\/github\.com\/SakuraMathcraft\/LaTeXSnipper"[^>]*><strong>LaTeXSnipper Desktop<\/strong><span>)v\d+\.\d+\.\d+(?:\s+[A-Za-z0-9._-]+)?(\s*·\s*SakuraMathcraft\s*·\s*GPL-3\.0<\/span><\/a>)/,
    `$1${releaseLabel}$2`,
  );
  return next;
});

rewrite('src/components/HeroSection.jsx', (source) => source.replace(
  /(<div className="hero-badge">)v\d+\.\d+\.\d+(?:\s+[A-Za-z0-9._-]+)?(\s*·)/,
  `$1${releaseLabel}$2`,
));
