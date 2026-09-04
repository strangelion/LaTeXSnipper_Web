import { useEffect, useState } from "react";
import { recognitionDemos } from "../data/siteContent";

function SectionHeading({ eyebrow, title, description }) {
  return (
    <header className="section-heading reveal">
      <span>{eyebrow}</span>
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

// Animated WebP demo. Rendered as a plain <img> so it always auto-plays and
// loops without depending on video autoplay policies; browsers load it lazily
// when the frame nears the viewport. Users who prefer reduced motion get the
// static first frame instead of the animation.
function DemoImage({ src, poster, alt }) {
  const reducedMotion = usePrefersReducedMotion();
  const image = reducedMotion ? poster : src;
  return (
    <img
      src={image}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={(event) => {
        const img = event.currentTarget;
        console.error(`Demo image failed to load: ${img.src}`);
      }}
    />
  );
}

export default function DemosSection() {
  return (
    <section
      id="demos"
      className="section-space demos-section"
      aria-labelledby="demos-title"
    >
      <div className="ls-container">
        <SectionHeading
          eyebrow="真实识别环境 / LIVE RECOGNITION DEMOS"
          title="识别，是每一步都看得见的过程。"
          description="三段录屏演示桌面端识别环境的实际运行：从截图、图片与 PDF 输入出发，公式与文字进入识别流程，成为可以继续编辑的数学内容。"
        />
        <div className="demos-grid">
          {recognitionDemos.map((demo) => (
            <article className="demo-card reveal" key={demo.id}>
              <div className="demo-frame">
                <div className="demo-frame-top" aria-hidden="true">
                  <span className="demo-frame-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="demo-frame-label">{demo.label}</span>
                  <span className="demo-frame-duration">DEMO</span>
                </div>
                <DemoImage
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
      </div>
    </section>
  );
}
