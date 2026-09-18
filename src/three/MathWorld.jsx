import { memo, useEffect, useRef } from "react";

/*
 * MathWorld — Three.js "mathematical universe" for the Hero.
 *
 * A 3D field of floating math-glyph sprites (∫ ∑ √ π ∞ λ θ ∂ Δ ∇ …) drifting in
 * a light volume, with:
 *   - mouse parallax on the camera (the world leans toward the pointer)
 *   - an intersection-driven "evolution" that gently concentrates the field
 *   - theme-aware colour (blue on paper, light-blue on ink)
 *   - performance guards: capped DPR, pause off-screen / tab-hidden, a single
 *     static frame under `prefers-reduced-motion`, and three.js loaded lazily
 *     so it never blocks the first paint
 *
 * React owns the UI; this is one isolated leaf that renders only a transparent
 * canvas behind the copy, never content, so accessibility / SEO text is DOM.
 */

const GLYPHS = [
  "∫", "∑", "√", "π", "∞", "λ", "θ", "∂", "Δ", "∇",
  "α", "β", "γ", "Σ", "ω", "φ", "ψ", "≈", "∈", "⊗",
];

const isDark = () => {
  const a = document.documentElement.getAttribute("data-theme");
  if (a === "dark" || a === "light") return a === "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

function makeGlyphTexture(THREE, glyph, color) {
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.font = '600 104px "Iowan Old Style", "Noto Serif SC", "Songti SC", serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.fillText(glyph, size / 2, size / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 1;
  return tex;
}

function MathWorld() {
  const hostRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let observer = null;
    let disposed = false;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const state = {
      sprites: [],
      textures: [],
      t: 0,
      mouse: { x: 0, y: 0 },
      camTarget: { x: 0, y: 0 },
      spread: 1,
      w: 0,
      h: 0,
      initialZ: 4.2,
    };

    let renderer = null;
    let scene = null;
    let camera = null;
    let raf = 0;
    const clock = { last: 0 };

    const onVisible = (entries) => {
      const entry = entries[0];
      state.spread = 0.55 + entry.intersectionRatio * 0.45;
      if (reducedMotion || !renderer) return;
      entry.isIntersecting && !document.hidden ? start() : stop();
    };
    const onVisibility = () => {
      if (reducedMotion || !renderer) return;
      document.hidden ? stop() : start();
    };
    const onPointer = (e) => {
      state.mouse.x = (e.clientX / state.w) * 2 - 1;
      state.mouse.y = -(e.clientY / state.h) * 2 + 1;
    };
    const onResize = () => {
      if (cancelled || !renderer) return;
      const r = host.getBoundingClientRect();
      state.w = Math.max(2, Math.floor(r.width));
      state.h = Math.max(2, Math.floor(r.height));
      camera.aspect = state.w / state.h;
      camera.updateProjectionMatrix();
      renderer.setSize(state.w, state.h);
    };

    const start = () => {
      if (cancelled || !renderer || raf) return;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    function loop() {
      if (cancelled || !renderer) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - clock.last) / 1000);
      clock.last = now;
      state.t += dt;

      for (const s of state.sprites) {
        const u = s.userData;
        s.position.x = u.base.x + Math.sin(state.t * u.speed + u.phase) * u.amp;
        s.position.y = u.base.y + Math.cos(state.t * u.speed * 0.8 + u.phase * 1.3) * u.amp;
        s.position.z = u.base.z + Math.sin(state.t * u.speed * 0.5 + u.phase) * u.amp * 0.5;
      }

      state.camTarget.x += (state.mouse.x * 0.7 - state.camTarget.x) * 0.05;
      state.camTarget.y += (state.mouse.y * 0.4 - state.camTarget.y) * 0.05;
      if (camera) {
        camera.position.x += (state.camTarget.x - camera.position.x) * 0.06;
        camera.position.y += (-state.camTarget.y - camera.position.y) * 0.06;
        camera.position.z = state.initialZ + (1 - state.spread) * 2.2;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }

    // Load three lazily so the initial paint is never blocked by the 3D world.
    import("three").then((mod) => {
      const THREE = mod;
      if (cancelled || !host || disposed) return;

      const rect = host.getBoundingClientRect();
      state.w = Math.max(2, Math.floor(rect.width));
      state.h = Math.max(2, Math.floor(rect.height));

      const sceneRef = new THREE.Scene();
      scene = sceneRef;
      camera = new THREE.PerspectiveCamera(55, state.w / state.h, 0.1, 100);
      camera.position.z = state.initialZ;

      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });
      } catch {
        renderer = null;
        return; // no WebGL: silently degrade, DOM still renders
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(state.w, state.h);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      host.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 1.4));

      const color = isDark() ? "#8b7cff" : "#6c63ff";
      const count = state.w < 768 ? 18 : 30;
      const glyphSet = [...new Set(GLYPHS)];

      for (let i = 0; i < count; i++) {
        const glyph = glyphSet[i % glyphSet.length];
        const tex = makeGlyphTexture(THREE, glyph, color);
        state.textures.push(tex);
        const mat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
          opacity: 0.16,
        });
        const sprite = new THREE.Sprite(mat);
        const radius = Math.random() * 3.4 + 0.4;
        const ang = Math.random() * Math.PI * 2;
        const x = Math.cos(ang) * radius;
        const y = (Math.random() - 0.5) * 5.2;
        const z = (Math.random() - 0.5) * 5.5 - 2.2;
        sprite.position.set(x, y, z);
        const s = Math.random() * 0.42 + 0.22;
        sprite.scale.set(s, s, 1);
        sprite.material.opacity = Math.random() * 0.16 + 0.1;
        sprite.userData = {
          base: new THREE.Vector3(x, y, z),
          amp: 0.25 + Math.random() * 0.6,
          speed: 0.18 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
        };
        scene.add(sprite);
        state.sprites.push(sprite);
      }

      clock.last = performance.now();
      if (reducedMotion) renderer.render(scene, camera);
      else start();

      observer = new IntersectionObserver(onVisible, {
        threshold: [0, 0.05, 0.25, 0.5, 0.75, 1],
      });
      observer.observe(host);
      window.addEventListener("resize", onResize);
      window.addEventListener("pointermove", onPointer, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
    });

    return () => {
      cancelled = true;
      disposed = true;
      stop();
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const s of state.sprites) {
        s.material?.dispose();
        scene?.remove(s);
      }
      for (const t of state.textures) t.dispose();
      renderer?.dispose();
      if (renderer?.domElement && host.contains(renderer.domElement)) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={hostRef} className="hero-p5 hero-p5--three" aria-hidden="true" />;
}

export default memo(MathWorld);
