import React from 'react';
import { DOWNLOAD_COUNT_DISCLAIMER, DOWNLOAD_COUNT_SCOPE, formatCompactCount, formatExactCount } from '../../js/star-stats.js';

/**
 * Project counter surfaces for the landing page.
 *
 * A. GitHubStarCount   - compact chip inside the header GitHub link
 * B. HeroCounters      - one line inside the hero CTA cluster
 * C. ProjectStatsStrip - the metrics row directly below the hero
 *
 * All three read the same /api/stats payload (see useProjectStats) and render nothing
 * when a figure is unavailable, so no surface can show an invented number.
 */

const COUNT_UP_MS = 900;
const REPOSITORY_URL = 'https://github.com/SakuraMathcraft/LaTeXSnipper';
const RELEASES_URL = 'https://github.com/SakuraMathcraft/LaTeXSnipper/releases';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Ticks a raw count up to its target, then stops. Static under reduced motion. */
function useCountUp(target) {
  const [display, setDisplay] = React.useState(target === null ? null : 0);

  React.useEffect(() => {
    if (target === null) {
      setDisplay(null);
      return undefined;
    }

    if (prefersReducedMotion()) {
      setDisplay(target);
      return undefined;
    }

    let frame = 0;
    const startedAt = performance.now();

    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  return display;
}

function StarGlyph({ size = 13 }) {
  return (
    <svg
      className="star-glyph"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.6l2.58 5.23 5.77.84-4.17 4.07.98 5.75L12 16.77l-5.16 2.72.98-5.75-4.17-4.07 5.77-.84z" />
    </svg>
  );
}

/** A. Header chip. Decorative inside the existing GitHub link, so keep it out of the a11y name. */
export function GitHubStarCount({ counters }) {
  const stars = counters ? counters.stars : null;
  const shown = useCountUp(stars);

  if (shown === null) return null;

  return (
    <span
      className="github-star-count"
      aria-hidden="true"
      title={`${formatExactCount(stars)} 个 GitHub Star`}
    >
      <StarGlyph size={12} />
      <span className="github-star-count__value">{formatCompactCount(shown)}</span>
    </span>
  );
}

/** B. Hero line. Plain text, not another CTA: the two buttons stay the only actions. */
export function HeroCounters({ counters }) {
  const stars = counters ? counters.stars : null;
  const downloads = counters ? counters.downloads : null;
  const shownStars = useCountUp(stars);
  const shownDownloads = useCountUp(downloads);

  if (shownStars === null && shownDownloads === null) return null;

  const showBoth = shownStars !== null && shownDownloads !== null;

  return (
    <p className="hero-counters">
      {shownStars !== null && (
        <span
          className="hero-counters__item"
          title={`${formatExactCount(stars)} 个 GitHub Star`}
        >
          <StarGlyph size={14} />
          <strong>{formatCompactCount(shownStars)}</strong>
          <span>Stars</span>
        </span>
      )}
      {showBoth && (
        <span className="hero-counters__dot" aria-hidden="true">
          ·
        </span>
      )}
      {shownDownloads !== null && (
        <span
          className="hero-counters__item"
          title={`累计下载 ${formatExactCount(downloads)} 次（${DOWNLOAD_COUNT_SCOPE}，${DOWNLOAD_COUNT_DISCLAIMER}）`}
        >
          <strong>{formatCompactCount(shownDownloads)}</strong>
          <span>次下载*</span>
        </span>
      )}
    </p>
  );
}

function ProjectStatFigure({ value, label, detail, href, cta, title }) {
  const shown = useCountUp(value);

  if (shown === null) return null;

  return (
    <div className="project-stats__figure">
      <span className="project-stats__label">{label}</span>
      <strong className="project-stats__value" title={title || formatExactCount(value)}>
        {formatCompactCount(shown)}
      </strong>
      <p className="project-stats__detail">{detail}</p>
      <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">
        {cta}
        <svg
          className="arrow"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </a>
    </div>
  );
}

/** C. Metrics row directly below the hero. */
export function ProjectStatsStrip({ counters }) {
  if (!counters) return null;

  const { stars, downloads } = counters;
  if (stars === null && downloads === null) return null;

  return (
    <section className="project-stats" aria-label="项目公开数据">
      <div className="ls-container project-stats__grid">
        <ProjectStatFigure
          value={stars}
          label="GitHub Stars"
          detail="GitHub 仓库当前收到的 Star 数"
          href={REPOSITORY_URL}
          cta="查看仓库"
        />
        <ProjectStatFigure
          value={downloads}
          label="累计下载*"
          detail={DOWNLOAD_COUNT_SCOPE}
          title={`${formatExactCount(downloads)} 次（${DOWNLOAD_COUNT_SCOPE}，${DOWNLOAD_COUNT_DISCLAIMER}）`}
          href={RELEASES_URL}
          cta="查看 Release"
        />
        {downloads !== null && (
          <p className="project-stats__note">
            {'* '}
            {DOWNLOAD_COUNT_DISCLAIMER}
            。
          </p>
        )}
      </div>
    </section>
  );
}
