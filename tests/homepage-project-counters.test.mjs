import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const hookSource = await readFile(
  new URL('../src/hooks/useProjectStats.js', import.meta.url),
  'utf8',
);

const countersSource = await readFile(
  new URL('../src/components/ProjectCounters.jsx', import.meta.url),
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

test('landing counters reuse the shared stats endpoint and formatter', () => {
  assert.match(hookSource, /fetch\('\/api\/stats'/);
  assert.match(hookSource, /data\.available === false/);
  assert.match(hookSource, /new AbortController\(\)/);
  assert.match(
    hookSource,
    /import \{ normalizeCount \} from '\.\.\/\.\.\/js\/star-stats\.js'/,
  );
  assert.match(hookSource, /const downloads = normalizeCount\(data\.totalDownloads\)/);
  assert.match(
    countersSource,
    /import \{[\s\S]{0,200}formatCompactCount,[\s\S]{0,120}\} from '\.\.\/\.\.\/js\/star-stats\.js'/,
  );
  assert.match(countersSource, /DOWNLOAD_COUNT_SCOPE/);
  assert.match(countersSource, /DOWNLOAD_COUNT_DISCLAIMER/);
  // The counters must not fetch on their own: one request per page view.
  assert.doesNotMatch(countersSource, /fetch\(/);
  assert.equal(
    landingSource.split('useProjectStats()').length - 1,
    1,
    'the landing page reads the counters once and passes them down',
  );
});

test('each counter surface stays hidden instead of inventing a number', () => {
  const hiddenGuards = countersSource.match(/if \(shown === null\) return null;/g) || [];
  assert.equal(hiddenGuards.length, 2, 'header chip and metrics figure');
  assert.match(countersSource, /if \(shownStars === null && shownDownloads === null\) return null;/);
  assert.match(countersSource, /if \(stars === null && downloads === null\) return null;/);
  assert.match(countersSource, /title=\{title \|\| formatExactCount\(value\)\}/);
  assert.ok(
    (countersSource.match(/formatExactCount\(/g) || []).length >= 3,
    'chip, hero and strip titles all expose the exact figure',
  );
});

test('reduced motion skips the count-up animation', () => {
  assert.match(countersSource, /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)/);
  assert.match(countersSource, /window\.requestAnimationFrame\(step\)/);
  assert.match(countersSource, /window\.cancelAnimationFrame\(frame\)/);
});

test('the download figure in the strip carries its scope note', () => {
  assert.match(countersSource, /label="累计下载\*"/);
  assert.match(countersSource, /detail=\{DOWNLOAD_COUNT_SCOPE\}/);
  assert.match(countersSource, /\{'\* '\}/);
  assert.match(countersSource, /downloads !== null && \(\s*<p className="project-stats__note">/);
  assert.match(countersSource, /次下载\*/);
});

test('the three placements are wired into the landing page', () => {
  assert.match(landingSource, /<SiteHeader counters=\{counters\} \/>/);
  assert.match(landingSource, /<HeroSection counters=\{counters\} \/>/);
  assert.match(landingSource, /<ProjectStatsStrip counters=\{counters\} \/>/);
  assert.match(
    landingSource,
    /<HeroSection counters=\{counters\} \/>\s*<ProjectStatsStrip counters=\{counters\} \/>/,
    'the metrics strip sits directly below the hero',
  );
  assert.match(landingSource, /className="site-github-link"[\s\S]{0,160}<GitHubStarCount counters=\{counters\} \/>/);
  assert.match(landingSource, /className="hero-actions"[\s\S]{0,420}<HeroCounters counters=\{counters\} \/>/);
});

test('counter styling keeps the strip and chip within the site system', () => {
  assert.match(landingStyles, /\.hero-counters \{[\s\S]{0,220}font: 500 0\.88rem/);
  assert.match(landingStyles, /\.hero-counters__item strong \{[\s\S]{0,160}font-variant-numeric: tabular-nums/);
  assert.match(landingStyles, /\.project-stats \{[\s\S]{0,120}border-block: 1px solid var\(--site-line\)/);
  assert.match(landingStyles, /\.project-stats__value \{[\s\S]{0,220}var\(--site-mono\)/);
  assert.match(landingStyles, /\.github-star-count \{[\s\S]{0,320}border-radius: 999px/);
  assert.match(landingStyles, /\.project-stats__note \{[\s\S]{0,180}grid-column: 1 \/ -1;/);
  assert.match(
    landingStyles,
    /@media \(max-width: 1080px\) \{\s*\/\*[^*]*\*\/\s*\.github-star-count \{\s*display: none;/,
  );
  assert.match(landingStyles, /@media \(max-width: 720px\) \{\s*\.hero-counters \{[\s\S]{0,160}\.project-stats__grid \{\s*grid-template-columns: minmax\(0, 1fr\)/);
});
