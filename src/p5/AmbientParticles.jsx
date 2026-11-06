import { useEffect, useRef, memo } from "react";

/*
 * AmbientParticles — a very quiet p5.js particle field used as a scene backdrop.
 *
 * It is decoration only: pointer-events are off, nothing is announced to assistive
 * tech, and the canvas is skipped entirely under prefers-reduced-motion (a single
 * static frame is drawn instead). p5 is imported on approach, the loop stops when
 * the scene leaves the viewport or the tab is hidden, and the frame rate is capped
 * so a backdrop never competes with the page's own rendering.
 */

const MAX_PARTICLES = 64;
const LINK_DISTANCE = 132;
const FRAME_RATE = 30;

const readInk = () => {
  const theme = document.documentElement.getAttribute("data-theme");
  const dark =
    theme === "dark" || theme === "light"
      ? theme === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  return dark ? "150, 190, 255" : "32, 96, 214";
};

function AmbientParticles({ className = "" }) {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let loading = false;
    let instance = null;
    let isReady = false;
    let inViewport = false;
    let sketchState = null;

    const canAnimate = () => inViewport && !document.hidden && !reducedMotion;
    const syncPlayback = () => {
      if (!instance || !isReady) return;
      if (canAnimate()) instance.loop();
      else instance.noLoop();
    };

    const mount = async () => {
      if (cancelled || loading || instance) return;
      loading = true;

      try {
        const p5Module = await import("p5");
        const P5 = p5Module.default;
        if (cancelled || !P5) return;

        instance = new P5((p) => {
          const state = { w: 2, h: 2, points: [], ink: "32, 96, 214" };
          sketchState = state;

          const seedPoints = () => {
            const target = Math.max(
              12,
              Math.min(MAX_PARTICLES, Math.round((state.w * state.h) / 21000)),
            );
            state.points = Array.from({ length: target }, () => ({
              x: p.random(state.w),
              y: p.random(state.h),
              vx: p.random(-0.22, 0.22),
              vy: p.random(-0.18, 0.18),
              r: p.random(0.9, 2.1),
            }));
          };

          const draw = () => {
            const { w, h, points } = state;
            p.clear();
            if (w < 4 || h < 4) return;

            p.noStroke();
            for (const point of points) {
              p.fill(`rgba(${state.ink}, 0.7)`);
              p.circle(point.x, point.y, point.r * 2);
            }

            p.strokeWeight(0.6);
            for (let i = 0; i < points.length; i += 1) {
              for (let j = i + 1; j < points.length; j += 1) {
                const a = points[i];
                const b = points[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distance = Math.hypot(dx, dy);
                if (distance > LINK_DISTANCE) continue;
                p.stroke(`rgba(${state.ink}, ${(1 - distance / LINK_DISTANCE) * 0.16})`);
                p.line(a.x, a.y, b.x, b.y);
              }
            }
          };

          p.setup = () => {
            state.w = Math.max(2, host.clientWidth);
            state.h = Math.max(2, host.clientHeight);
            state.ink = readInk();
            p.pixelDensity(Math.min(window.devicePixelRatio || 1, 1.5));
            const canvas = p.createCanvas(state.w, state.h);
            canvas.parent(host);
            canvas.elt.setAttribute("aria-hidden", "true");
            canvas.elt.classList.add("ambient-p5");
            p.frameRate(FRAME_RATE);
            seedPoints();
            p.noLoop();
            isReady = true;
            if (canAnimate()) p.loop();
            else p.redraw();
          };

          p.windowResized = () => {
            if (cancelled) return;
            state.w = Math.max(2, host.clientWidth);
            state.h = Math.max(2, host.clientHeight);
            p.resizeCanvas(state.w, state.h, false);
            seedPoints();
            if (!canAnimate()) p.redraw();
          };

          p.draw = () => {
            const { w, h, points } = state;
            for (const point of points) {
              point.x += point.vx;
              point.y += point.vy;
              if (point.x < -12) point.x = w + 12;
              if (point.x > w + 12) point.x = -12;
              if (point.y < -12) point.y = h + 12;
              if (point.y > h + 12) point.y = -12;
            }
            draw();
          };
        }, host);
      } finally {
        loading = false;
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        inViewport = entries[0]?.isIntersecting ?? false;
        if (inViewport) void mount();
        syncPlayback();
      },
      { threshold: 0.05 },
    );
    const onVisibility = () => syncPlayback();
    const themeObserver = new MutationObserver(() => {
      if (!sketchState) return;
      sketchState.ink = readInk();
      instance?.redraw();
    });

    observer.observe(host);
    document.addEventListener("visibilitychange", onVisibility);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      cancelled = true;
      observer.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      instance?.remove();
      instance = null;
    };
  }, []);

  return <div ref={hostRef} className={`ambient-particles ${className}`.trim()} />;
}

export default memo(AmbientParticles);
