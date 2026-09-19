import { useEffect, useRef, useState, memo } from "react";

/*
 * MathPlayground — interactive mathematical generative art.
 *
 * A selectable set of live math visualizations drawn by p5.js:
 *   - Fourier  : a chain of rotating vectors (epicycles) tracing a curve
 *   - Lissajous: x = sin(3t), y = sin(4t)
 *   - Field    : a pseudo-noise vector flow field
 *   - Rose     : r = cos(kθ)
 *
 * React owns the UI (mode buttons + aria); p5 owns the canvas lifecycle. The
 * drawing is a visual enhancement, never content. Theme-aware, reduced-motion
 * → static frame, off-screen / hidden tab → paused, and p5 loads on approach.
 */

const MODES = [
  { id: "fourier", label: "Fourier", title: "傅里叶向量链", equation: "f(t) = Σ rₖeⁱᵏᵗ", description: "旋转向量依次相加，末端留下可见的轨迹。" },
  { id: "knot", label: "Knot", title: "参数结", equation: "x(t), y(t), z(t)", description: "三维参数曲线投影到二维画布，展示旋转和拓扑关系。" },
  { id: "spirograph", label: "Spirograph", title: "摆线轨迹", equation: "(R-r)cos(t)+dcos((R-r)t/r)", description: "两个半径的比例改变，产生周期性的机械曲线。" },
  { id: "butterfly", label: "Butterfly", title: "蝴蝶曲线", equation: "r = eˢⁱⁿᵗ - 2cos(4t) - sin⁵((2t-π)/24)", description: "一个由极坐标公式生成的经典曲线。" },
  { id: "sierpinski", label: "Sierpinski", title: "谢尔宾斯基三角形", equation: "pₙ₊₁ = (pₙ + vᵢ) / 2", description: "随机迭代在确定的几何约束下逐渐显现分形结构。" },
  { id: "surface", label: "Surface", title: "波面采样", equation: "z = sin(πx)cos(πy)", description: "参数网格被投影为缓慢旋转的离散曲面。" },
  { id: "julia", label: "Julia", title: "Julia 集", equation: "zₙ₊₁ = zₙ² + c", description: "复平面上的迭代边界，会随常数 c 轻微变化。" },
  { id: "cloud", label: "Probability", title: "概率云", equation: "p(x) ∝ e⁻ˣ²", description: "采样点在高斯分布的约束下累积成概率密度。" },
];

const isDark = () => {
  const a = document.documentElement.getAttribute("data-theme");
  if (a === "dark" || a === "light") return a === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

function MathPlayground() {
  const hostRef = useRef(null);
  const [mode, setMode] = useState("fourier");
  const [detail, setDetail] = useState(0.56);
  const modeRef = useRef("fourier");
  const detailRef = useRef(0.56);
  const resetRef = useRef(null);
  modeRef.current = mode;
  detailRef.current = detail;
  const activeMode = MODES.find((item) => item.id === mode) || MODES[0];

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let cancelled = false;
    let loading = false;
    let p5Instance = null;
    let resizeObserver = null;
    let visibilityObserver = null;
    let isReady = false;
    let inViewport = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canAnimate = () => inViewport && !document.hidden && !reducedMotion;
    const syncPlayback = () => {
      if (!p5Instance || !isReady) return;
      if (canAnimate()) {
        p5Instance.loop();
      } else {
        p5Instance.noLoop();
        if (reducedMotion) p5Instance.redraw();
      }
    };

    const mountP5 = async () => {
      if (cancelled || loading || p5Instance) return;
      loading = true;

      try {
        const p5Module = await import("p5");
        const P5 = p5Module.default;
        if (cancelled || !P5) return;

        p5Instance = new P5((p) => {
          const state = { w: 2, h: 2, t: 0, trace: [], intensity: detailRef.current };
          let ctx = null;

          const measure = () => ({
            w: Math.max(2, host.clientWidth || Math.floor(host.getBoundingClientRect().width) || 320),
            h: Math.max(2, host.clientHeight || Math.floor(host.getBoundingClientRect().height) || 420),
          });

          const color = () =>
            isDark()
              ? { l: "rgba(128,172,255,", g: "rgba(150,194,255," }
              : { l: "rgba(32,88,216,", g: "rgba(84,150,255," };

          const resize = () => {
            const next = measure();
            state.w = next.w;
            state.h = next.h;
            p.resizeCanvas(next.w, next.h, false);
            ctx = p.drawingContext;
            state.trace = [];
          };

          const draw = () => {
            const { w, h } = state;
            if (!ctx || w < 4 || h < 4) return;
            state.intensity = detailRef.current;
            ctx.clearRect(0, 0, w, h);
            // A soft designed backdrop so the panel reads as intentional, not blank.
            const bg = ctx.createRadialGradient(
              w * 0.5, h * 0.5, 10,
              w * 0.5, h * 0.5, Math.max(w, h) * 0.62,
            );
            const c = color();
            bg.addColorStop(0, c.l + "0.08)");
            bg.addColorStop(1, c.l + "0)");
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, w, h);

            ctx.save();
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.shadowBlur = 14;
            ctx.shadowColor = c.l + "0.4)";
            switch (modeRef.current) {
              case "knot":
                drawKnot(ctx, state, c, w, h);
                break;
              case "spirograph":
                drawSpirograph(ctx, state, c, w, h);
                break;
              case "butterfly":
                drawButterfly(ctx, state, c, w, h);
                break;
              case "sierpinski":
                drawSierpinski(ctx, state, c, w, h);
                break;
              case "surface":
                drawSurface(ctx, state, c, w, h);
                break;
              case "julia":
                drawJulia(ctx, state, c, w, h);
                break;
              case "cloud":
                drawCloud(ctx, state, c, w, h);
                break;
              default:
                drawFourier(ctx, state, c, w, h);
            }
            ctx.restore();
          };

          p.setup = () => {
            const initial = measure();
            state.w = initial.w;
            state.h = initial.h;
            p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
            const canvas = p.createCanvas(initial.w, initial.h);
            canvas.parent(host);
            canvas.elt.classList.add("playground-p5");
            ctx = p.drawingContext;
            p.noLoop();

            resizeObserver = new ResizeObserver(() => {
              if (cancelled) return;
              resize();
              if (!canAnimate()) p.redraw();
            });
            resizeObserver.observe(host);

            resetRef.current = () => {
              state.t = 0;
              state.trace = [];
              state.parts = [];
              state.chaos = null;
              p.redraw();
            };
            isReady = true;
            if (canAnimate()) p.loop();
            else p.redraw();
          };

          p.draw = () => {
            if (!reducedMotion) state.t += 0.016;
            draw();
          };
        }, host);
      } finally {
        loading = false;
      }
    };

    const onVisible = (entries) => {
      inViewport = entries[0]?.isIntersecting ?? false;
      if (inViewport) void mountP5();
      syncPlayback();
    };
    const onDocumentVisibility = () => syncPlayback();

    visibilityObserver = new IntersectionObserver(onVisible, { threshold: 0.05 });
    visibilityObserver.observe(host);
    document.addEventListener("visibilitychange", onDocumentVisibility);

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      visibilityObserver?.disconnect();
      document.removeEventListener("visibilitychange", onDocumentVisibility);
      resetRef.current = null;
      p5Instance?.remove();
      p5Instance = null;
    };
  }, []);

  return (
    <section id="explore" className="section-space playground-section" aria-labelledby="playground-title">
      <div className="ls-container">
        <header className="section-heading reveal">
          <span className="scene-index">EXPLORE · MATHEMATICAL PLAYGROUND</span>
          <h2 id="playground-title">把结构，也变成可探索的图形。</h2>
          <p>这组浏览器内生成的数学实验是视觉层，不会替代 OCR、AST 或转换结果。</p>
        </header>
        <div className="playground-stage reveal">
          <div className="playground-toolbar" role="tablist" aria-label="选择数学实验">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={mode === m.id ? "is-active" : ""}
                role="tab"
                aria-selected={mode === m.id}
                aria-controls="math-experiment-panel"
                onClick={() => {
                  setMode(m.id);
                  window.requestAnimationFrame(() => resetRef.current?.());
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <div className="playground-panel" id="math-experiment-panel" role="tabpanel">
            <div className="playground-copy">
              <div>
                <span>P5.JS EXPERIMENT</span>
                <h3>{activeMode.title}</h3>
              </div>
              <code>{activeMode.equation}</code>
              <p>{activeMode.description}</p>
            </div>
            <div ref={hostRef} className="playground-canvas" aria-label={`${activeMode.title} 数学可视化`} />
            <div className="playground-controls">
              <label htmlFor="math-detail">
                图形细节 <output>{Math.round(detail * 100)}%</output>
              </label>
              <input
                id="math-detail"
                type="range"
                min="0.2"
                max="1"
                step="0.02"
                value={detail}
                onChange={(event) => setDetail(Number(event.target.value))}
              />
              <button type="button" onClick={() => resetRef.current?.()}>重置实验</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function drawFourier(ctx, state, c, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const base = Math.min(w, h) * 0.18;
  let x = cx;
  let y = cy;
  const N = Math.round(10 + state.intensity * 28);
  ctx.lineWidth = 1;
  for (let k = 0; k < N; k++) {
    const ang = state.t * (k + 1) * 2.2;
    const r = base / (k + 1);
    const nx = x + Math.cos(ang) * r;
    const ny = y + Math.sin(ang) * r;
    ctx.strokeStyle = c.l + "0.5)";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(nx, ny);
    ctx.stroke();
    x = nx;
    y = ny;
  }
  state.trace.push({ x, y });
  if (state.trace.length > Math.round(80 + state.intensity * 160)) state.trace.shift();
  ctx.strokeStyle = c.l + "0.95)";
  ctx.beginPath();
  for (let i = 0; i < state.trace.length; i++) {
    const p = state.trace[i];
    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.fillStyle = c.l + "1)";
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function grad(ctx, h1, h2, w, h) {
  const dark = isDark();
  const s = dark ? 70 : 76;
  const l1 = dark ? 62 : 42;
  const l2 = dark ? 74 : 58;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${h1} ${s}% ${l1}%)`);
  g.addColorStop(1, `hsl(${h2} ${s}% ${l2}%)`);
  return g;
}

function drawSpirograph(ctx, state, c, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const S = Math.min(w, h) * 0.32;
  const R = 0.9;
  const r = 0.32;
  const d = 0.5;
  const tEnd = Math.min(40, state.t) * Math.PI * 2;
  ctx.strokeStyle = grad(ctx, 190, 262, w, h);
  ctx.beginPath();
  const points = Math.round(650 + state.intensity * 1150);
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * tEnd;
    const x = (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
    const px = cx + x * S;
    const py = cy + y * S;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function drawKnot(ctx, state, c, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const S = Math.min(w, h) * 0.28;
  const rot = state.t * 0.6;
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = grad(ctx, 252, 330, w, h);
  ctx.beginPath();
  const points = Math.round(260 + state.intensity * 520);
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * Math.PI * 2;
    let x = Math.sin(t) + 2 * Math.sin(2 * t);
    let y = Math.cos(t) - 2 * Math.cos(2 * t);
    let z = -Math.sin(3 * t);
    const cA = Math.cos(rot);
    const sA = Math.sin(rot);
    const x1 = x * cA - z * sA;
    const z1 = x * sA + z * cA;
    const cB = Math.cos(rot * 0.8);
    const sB = Math.sin(rot * 0.8);
    const y2 = y * cB - z1 * sB;
    const px = cx + x1 * S;
    const py = cy + y2 * S;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function drawButterfly(ctx, state, c, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const S = Math.min(w, h) * 0.32;
  // Draw the full iconic butterfly once (t ∈ [0, 12π]) and stop; no retrace.
  const tEnd = Math.min(12 * Math.PI, state.t * 4);
  ctx.strokeStyle = grad(ctx, 16, 330, w, h);
  ctx.beginPath();
  const points = Math.round(650 + state.intensity * 750);
  for (let i = 0; i <= points; i++) {
    const t = (i / points) * tEnd;
    const r =
      Math.exp(Math.sin(t)) -
      2 * Math.cos(4 * t) -
      Math.pow(Math.sin((2 * t - Math.PI) / 24), 5);
    const x = r * Math.sin(t);
    const y = -r * Math.cos(t);
    const px = cx + x * S;
    const py = cy + y * S;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.stroke();
}

function drawSierpinski(ctx, state, c, w, h) {
  const v = [
    [w * 0.5, h * 0.1],
    [w * 0.14, h * 0.88],
    [w * 0.86, h * 0.88],
  ];
  if (!state.chaos) {
    state.chaos = {
      x: (v[0][0] + v[1][0] + v[2][0]) / 3,
      y: (v[0][1] + v[1][1] + v[2][1]) / 3,
      pts: [],
    };
  }
  const ch = state.chaos;
  for (let i = 0; i < Math.round(20 + state.intensity * 90); i++) {
    const n = Math.floor(Math.random() * 3);
    ch.x = (ch.x + v[n][0]) / 2;
    ch.y = (ch.y + v[n][1]) / 2;
    ch.pts.push([ch.x, ch.y]);
  }
  const maxPoints = Math.round(1400 + state.intensity * 4200);
  if (ch.pts.length > maxPoints) ch.pts.splice(0, ch.pts.length - maxPoints);
  ctx.lineWidth = 1;
  const g = grad(ctx, 22, 42, w, h);
  ctx.strokeStyle = g;
  ctx.beginPath();
  ctx.moveTo(v[0][0], v[0][1]);
  ctx.lineTo(v[1][0], v[1][1]);
  ctx.lineTo(v[2][0], v[2][1]);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = g;
  for (const p of ch.pts) ctx.fillRect(p[0], p[1], 1.4, 1.4);
}

// A rotating 3D parametric "wave surface" rendered as a drifting point cloud.
function drawSurface(ctx, state, c, w, h) {
  const cx = w * 0.5;
  const cy = h * 0.5;
  const S = Math.min(w, h) * 0.33;
  const rot = state.t * 0.5;
  const g = grad(ctx, 200, 290, w, h);
  ctx.fillStyle = g;
  const uMax = Math.min(1.2, state.t * 0.04);
  const step = 0.12 - state.intensity * 0.07;
  for (let u = 0; u < uMax; u += step) {
    for (let v = 0; v < uMax; v += step) {
      const x = u * 2 - 1;
      const y = v * 2 - 1;
      const zz = Math.sin(x * Math.PI) * Math.cos(y * Math.PI) * 0.3;
      const cA = Math.cos(rot);
      const sA = Math.sin(rot);
      const x1 = x * cA - zz * sA;
      const z1 = x * sA + zz * cA;
      const cB = Math.cos(rot * 0.7);
      const sB = Math.sin(rot * 0.7);
      const y1 = y * cB - z1 * sB;
      ctx.fillRect(cx + x1 * S, cy + y1 * S, 1.8, 1.8);
    }
  }
}

// Julia set, rendered at a reduced resolution then scaled (cheap enough to
// animate: the constant c drifts so the fractal morphs over time).
function drawJulia(ctx, state, c, w, h) {
  const off = document.createElement("canvas");
  // Higher resolution (2x on typical sizes) keeps it crisp; cap iterations for
  // frame rate.
  const n = state.intensity > 0.72 && w * h < 300000 ? 2 : 3;
  const rw = Math.ceil(w / n);
  const rh = Math.ceil(h / n);
  off.width = rw;
  off.height = rh;
  const octx = off.getContext("2d");
  const img = octx.createImageData(rw, rh);
  const data = img.data;
  const cxa = rw / 2;
  const cya = rh / 2;
  const S = Math.min(rw, rh) * 0.55;
  const t = state.t;
  const ca = -0.7 + 0.03 * Math.sin(t * 0.2);
  const cb = 0.27 + 0.03 * Math.cos(t * 0.26);
  let idx = 0;
  const maxIter = Math.round(18 + state.intensity * 18);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      let zx = (x - cxa) / S;
      let zy = (y - cya) / S;
      let i = 0;
      while (i < maxIter && zx * zx + zy * zy < 4) {
        const nx = zx * zx - zy * zy + ca;
        zy = 2 * zx * zy + cb;
        zx = nx;
        i++;
      }
      let r, g, b;
      if (i >= maxIter) {
        r = 5;
        g = 9;
        b = 18;
      } else {
        const m = i / maxIter;
        r = Math.floor(40 + m * 150);
        g = Math.floor(80 + m * 40);
        b = Math.floor(180 + m * 70);
      }
      data[idx++] = r;
      data[idx++] = g;
      data[idx++] = b;
      data[idx++] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, 0, 0, w, h);
}

// A drifting Gaussian "probability cloud" of accumulating points.
function drawCloud(ctx, state, c, w, h) {
  if (!state.parts) state.parts = [];
  const cx = w * 0.5;
  const cy = h * 0.5;
  const S = Math.min(w, h) * 0.32;
  const g = grad(ctx, 150, 262, w, h);
  ctx.fillStyle = g;
  for (let i = 0; i < Math.round(15 + state.intensity * 55); i++) {
    const cxc = (Math.random() - 0.5) * 0.4;
    const cyc = (Math.random() - 0.5) * 0.4;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(-2 * Math.log(1 - Math.random() + 1e-6)) * 0.32;
    state.parts.push([cx + (cxc + Math.cos(a) * r) * S, cy + (cyc + Math.sin(a) * r) * S]);
  }
  const maxParticles = Math.round(1200 + state.intensity * 3600);
  if (state.parts.length > maxParticles) state.parts.splice(0, state.parts.length - maxParticles);
  for (const p of state.parts) ctx.fillRect(p[0], p[1], 1.4, 1.4);
}

export default memo(MathPlayground);
