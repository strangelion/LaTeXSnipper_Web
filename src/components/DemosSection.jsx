import { useEffect, useRef, useState } from "react";
import { recognitionDemos } from "../data/siteContent";

function SectionHeading({ eyebrow, title, description }) {
  return (
    <header className="section-heading reveal">
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

// Screen recordings for the demo cards. H.264 keeps the three clips around 1.8 MB in
// total (the animated WebP versions were 13.7 MB) and every browser decodes it in
// hardware. Clips only play while the card is on screen, and users who prefer
// reduced motion get the static poster instead of the loop.
function DemoMedia({ src, poster, alt }) {
  const reducedMotion = usePrefersReducedMotion();
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const played = video.play();
          if (played && typeof played.catch === "function") {
            played.catch(() => {});
          }
        } else {
          video.pause();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [reducedMotion]);

  if (reducedMotion) {
    return (
      <img
        src={poster}
        alt={alt}
        width="960"
        height="540"
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      width="960"
      height="540"
      aria-label={alt}
    />
  );
}

function DemoGrid() {
  return (
    <div className="demos-grid">
      {recognitionDemos.map((demo) => (
        <article className="demo-card reveal" key={demo.id}>
          <div className="demo-frame">
            <DemoMedia
              src={demo.image}
              poster={demo.poster}
              alt={`${demo.title}演示：${demo.tagline}`}
            />
          </div>
          <div className="demo-card-copy">
            <h3>{demo.title}</h3>
            <span className="demo-tagline">{demo.tagline}</span>
            <p>{demo.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function DemosSection({ embedded = false }) {
  if (embedded) {
    return (
      <div className="demos-embedded">
        <DemoGrid />
      </div>
    );
  }

  return (
    <section
      id="demos"
      className="section-space demos-section"
      aria-labelledby="demos-title"
    >
      <div className="ls-container">
        <SectionHeading
          title="识别，是每一步都看得见的过程。"
          description="三段录屏演示桌面端识别环境的实际运行。"
        />
        <DemoGrid />
      </div>
    </section>
  );
}
