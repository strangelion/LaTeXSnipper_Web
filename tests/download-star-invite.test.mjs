import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const downloadSource = await readFile(
  new URL('../download.html', import.meta.url),
  'utf8',
);

const deployedDownloadSource = await readFile(
  new URL('../deploy/download.html', import.meta.url),
  'utf8',
);

const downloadStyles = await readFile(
  new URL('../styles/download.css', import.meta.url),
  'utf8',
);

const deployedStyles = await readFile(
  new URL('../deploy/styles/download.css', import.meta.url),
  'utf8',
);

const deployMarker = '/* device-aware Windows bundle presentation */';

test('first desktop download is gated by an accessible star dialog', () => {
  assert.match(downloadSource, /<dialog[\s\S]{0,220}id="starInvite"/);
  assert.match(downloadSource, /aria-labelledby="starInviteTitle"/);
  assert.match(downloadSource, /aria-describedby="starInviteBody"/);
  assert.match(downloadSource, /data-lg-surface="clear"/);
  assert.match(downloadSource, /data-star-invite-star/);
  assert.match(downloadSource, /data-star-invite-download/);
  assert.match(downloadSource, /data-star-invite-close/);
  assert.match(downloadSource, /<button class="star-invite__download"[^>]*>继续下载<\/button>/);
});

test('the dialog intercepts the click and replays it when the visitor continues', () => {
  assert.match(downloadSource, /event\.preventDefault\(\)/);
  assert.match(downloadSource, /starInvite\.showModal\(\)/);
  assert.match(downloadSource, /starInvite\.close\(\)/);
  assert.match(downloadSource, /starInviteReplaying/);
  assert.match(downloadSource, /function resumeDownload\(\)/);
  assert.match(downloadSource, /trigger\.click\(\)/);
  assert.match(downloadSource, /starInviteTriggerElement = trigger \|\| null/);
});

test('the gate appears once per cooldown window and never after a follow-through', () => {
  assert.match(downloadSource, /const STAR_INVITE_KEY = 'latexSnipper-starInvite'/);
  assert.match(
    downloadSource,
    /const STAR_INVITE_COOLDOWN_MS = 30 \* 24 \* 60 \* 60 \* 1000/,
  );
  assert.match(downloadSource, /writeStarInviteState\('shown'\)/);
  assert.match(downloadSource, /closeStarInvite\('starred'\)/);
  assert.match(downloadSource, /closeStarInvite\('dismissed'\)/);
  assert.match(downloadSource, /if \(state\.status === 'starred'\) return false/);
  assert.match(downloadSource, /Date\.now\(\) - madeAt >= STAR_INVITE_COOLDOWN_MS/);
  assert.match(downloadSource, /starInvite\.addEventListener\('close'/);
});

test('the gate stays off the Android card and off disabled controls', () => {
  assert.match(downloadSource, /card\.dataset\.platform === 'android'/);
  assert.match(downloadSource, /button\.classList\.contains\('disabled'\)/);
  assert.match(downloadSource, /platformGrid\.addEventListener\('click'/);
});

test('the dialog shows live project counters from the same-origin stats endpoint', () => {
  assert.match(downloadSource, /const STAR_INVITE_STATS_PATH = '\/api\/stats'/);
  assert.match(downloadSource, /data-star-invite-stats/);
  assert.match(downloadSource, /data-star-invite-stat="stars"/);
  assert.match(downloadSource, /data-star-invite-stat="downloads"/);
  assert.match(downloadSource, /data\.available === false/);
  assert.match(downloadSource, /prefers-reduced-motion: reduce/);
  assert.match(downloadSource, /window\.requestAnimationFrame\(tick\)/);
  assert.match(
    downloadSource,
    /import \{[\s\S]{0,200}formatCompactCount,[\s\S]{0,120}\} from '\.\/js\/star-stats\.js'/,
  );
  // The download figure is a two-source number and must carry its scope note.
  assert.match(downloadSource, /data-star-invite-download-note/);
  assert.match(downloadSource, /DOWNLOAD_COUNT_SCOPE/);
  assert.match(downloadSource, /DOWNLOAD_COUNT_DISCLAIMER/);
  assert.match(downloadSource, /<span class="star-invite__stat-label">累计下载\*<\/span>/);
});

test('the dialog stays a viewport-fixed modal whatever the page does', () => {
  // .lg-surface declares position: relative, which would otherwise beat the browser's own
  // modal positioning and let the dialog scroll out of the viewport.
  assert.match(
    downloadStyles,
    /\.star-invite \{[\s\S]{0,700}position: fixed;\s*\n\s*inset: 0;\s*\n\s*margin: auto;/,
  );
  assert.match(downloadStyles, /\.star-invite \{[\s\S]{0,900}max-height: calc\(100dvh - 28px\)/);
  assert.match(
    downloadStyles,
    /\.star-invite > \.lg-content \{[\s\S]{0,200}overflow: auto;[\s\S]{0,120}overscroll-behavior: contain;/,
  );
  assert.match(downloadSource, /function lockPageScroll\(\)/);
  assert.match(downloadSource, /function unlockPageScroll\(\)/);
  assert.match(downloadSource, /root\.classList\.add\('star-invite-locked'\)/);
  assert.match(downloadSource, /'--star-invite-scrollbar'/);
  assert.match(downloadStyles, /html\.star-invite-locked \{\s*overflow: hidden;\s*padding-right: var\(--star-invite-scrollbar/);
});

test('gated dialog styling follows the site material system', () => {
  assert.match(downloadStyles, /\.star-invite \{[\s\S]{0,120}width: min\(420px, calc\(100vw - 32px\)\)/);
  assert.match(downloadStyles, /\.star-invite::backdrop \{[\s\S]{0,140}background: rgb\(8 18 32 \/ 0\.32\)/);
  // Legible near-solid base, glass only as an upgrade where backdrop-filter is supported.
  assert.match(downloadStyles, /background: var\(--site-bg-elevated\)/);
  assert.match(
    downloadStyles,
    /@supports \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\) \{[\s\S]{0,120}color-mix\(in srgb, var\(--site-bg-elevated\) 84%, transparent\)/,
  );
  assert.match(downloadStyles, /@keyframes star-invite-enter/);
  assert.match(downloadStyles, /\.star-invite__stat-value \{[\s\S]{0,200}font-variant-numeric: tabular-nums/);
  assert.match(downloadStyles, /\.star-invite__stats\[hidden\] \{\s*display: none;/);
  assert.match(downloadStyles, /\.star-invite__note \{[\s\S]{0,160}grid-column: 1 \/ -1;/);
  assert.match(
    downloadStyles,
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.star-invite\[open\] \{\s*animation: none;/,
  );
  assert.match(downloadStyles, /\.star-invite__star:not\(\.lg-surface\)/);
  assert.match(downloadStyles, /\.star-invite__download:not\(\.lg-surface\)/);
});

test('committed deploy output carries the gated dialog', () => {
  assert.match(deployedDownloadSource, /data-star-invite-download/);
  assert.match(deployedDownloadSource, /js\/star-stats\.js/);
  assert.match(deployedStyles, /\.star-invite__download/);
  const dialogIndex = deployedStyles.indexOf('.star-invite {');
  const markerIndex = deployedStyles.indexOf(deployMarker);
  assert.ok(
    dialogIndex > -1 && markerIndex > -1 && dialogIndex < markerIndex,
    'canonical star dialog styles must precede the deploy-only responsive patch',
  );
});

test('deployed counter formatter matches the source module', async () => {
  const source = await readFile(new URL('../js/star-stats.js', import.meta.url), 'utf8');
  const deployed = await readFile(new URL('../deploy/js/star-stats.js', import.meta.url), 'utf8');
  assert.equal(deployed, source);
});
