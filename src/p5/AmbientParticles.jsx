import { useEffect, useRef, memo } from "react";

/*
 * AmbientParticles — lightweight native Canvas 2D particle field used as a scene backdrop.
 *
 * Decoration only: pointer-events are off, hidden from assistive tech, pauses when
 * off-screen or tab-hidden, and draws a single static frame under prefers-reduced-motion.
 */

const MAX_PARTICLES = 54;
const LINK_DISTANCE = 132;
const FRAME_INTERVAL_MS = 1000 / 30;

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
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "ambient-p5";
    canvas.style.cssText = "display:block;width:100%;height:100%;";
    host.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return () => canvas.remove();

    const state = { w: 2, h: 2, dpr: 1, points: [], ink: readInk() };
    let rafId = 0;
    let lastTick = 0;
    let inViewport = false;

    const seedPoints = () => {
      const target = Math.max(
        10,
        Math.min(MAX_PARTICLES, Math.round((state.w * state.h) / 24000)),
      );
      state.points = Array.from({ length: target }, () => ({
        x: Math.random() * state.w,
        y: Math.random() * state.h,
        vx: (Math.random() - 0.5) * 0.42,
        vy: (Math.random() - 0.5) * 0.34,
        r: 0.9 + Math.random() * 1.15,
      }));
    };

    const drawFrame = () => {
      const { w, h, dpr, points, ink } = state;
      if (w < 4 || h < 4) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = `rgba(${ink}, 0.58)`;
      for (const point of points) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineWidth = 0.65;
      for (let i = 0; i < points.length; i += 1) {
        const a = points[i];
        for (let j = i + 1; j < points.length; j += 1) {
          const b = points[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (distance > LINK_DISTANCE) continue;
          ctx.strokeStyle = `rgba(${ink}, ${(1 - distance / LINK_DISTANCE) * 0.14})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    };

    const resize = () => {
      state.w = Math.max(2, host.clientWidth);
      state.h = Math.max(2, host.clientHeight);
      state.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(state.w * state.dpr);
      canvas.height = Math.round(state.h * state.dpr);
      seedPoints();
      drawFrame();
    };

    const stop = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const tick = (now) => {
      rafId = 0;
      if (!inViewport || document.hidden || reducedMotion) return;
      if (now - lastTick >= FRAME_INTERVAL_MS) {
        lastTick = now;
        const { w, h, points } = state;
        for (const point of points) {
          point.x += point.vx;
          point.y += point.vy;
          if (point.x < -12) point.x = w + 12;
          if (point.x > w + 12) point.x = -12;
          if (point.y < -12) point.y = h + 12;
          if (point.y > h + 12) point.y = -12;
        }
        drawFrame();
      }
      rafId = requestAnimationFrame(tick);
    };

    const syncPlayback = () => {
      if (inViewport && !document.hidden && !reducedMotion) {
        if (!rafId) rafId = requestAnimationFrame(tick);
      } else {
        stop();
      }
    };

    resize();

    const observer = new IntersectionObserver(
      (entries) => {
        inViewport = entries[0]?.isIntersecting ?? false;
        syncPlayback();
      },
      { threshold: 0.05 },
    );
    const resizeObserver = new ResizeObserver(resize);
    const themeObserver = new MutationObserver(() => {
      state.ink = readInk();
      drawFrame();
    });

    observer.observe(host);
    resizeObserver.observe(host);
    document.addEventListener("visibilitychange", syncPlayback);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      themeObserver.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      canvas.remove();
    };
  }, []);

  return <div ref={hostRef} className={`ambient-particles ${className}`.trim()} />;
}

export default memo(AmbientParticles);
