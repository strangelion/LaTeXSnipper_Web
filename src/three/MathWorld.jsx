import { memo, useEffect, useRef } from "react";

/*
 * The canvas is a decorative enhancement. All copy, navigation, and actions
 * remain in HeroSection's DOM so the page does not depend on WebGL.
 */
const MATH_OBJECTS = [
  { glyph: "∫", label: "INTEGRAL", group: "operator", radius: 2.75, angle: 0.2, y: 0.8, z: -0.4, size: 0.78 },
  { glyph: "∑", label: "OPERATOR", group: "operator", radius: 2.2, angle: 1.48, y: -1.35, z: -0.9, size: 0.58 },
  { glyph: "√", label: "RADICAL", group: "operator", radius: 3.25, angle: 2.55, y: 1.68, z: -1.8, size: 0.56 },
  { glyph: "π", label: "CONSTANT", group: "constant", radius: 2.9, angle: 3.45, y: -0.52, z: -0.25, size: 0.55 },
  { glyph: "∞", label: "BOUND", group: "relation", radius: 2.4, angle: 4.36, y: 1.72, z: -1.35, size: 0.5 },
  { glyph: "x²", label: "VARIABLE", group: "variable", radius: 3.55, angle: 5.25, y: -1.88, z: -2.1, size: 0.5 },
  { glyph: "aⁿ", label: "POWER", group: "variable", radius: 1.88, angle: 0.82, y: 0.12, z: 0.5, size: 0.43 },
  { glyph: "Δ", label: "DELTA", group: "geometry", radius: 3.2, angle: 1.95, y: 2.05, z: -2.5, size: 0.48 },
  { glyph: "∇", label: "GRADIENT", group: "geometry", radius: 2.7, angle: 3, y: -2.1, z: -1.35, size: 0.46 },
  { glyph: "lim", label: "LIMIT", group: "relation", radius: 3.8, angle: 4.05, y: 0.26, z: -2.8, size: 0.42 },
  { glyph: "det", label: "MATRIX", group: "geometry", radius: 3.05, angle: 5.7, y: 1.02, z: -2.45, size: 0.42 },
  { glyph: "θ", label: "ANGLE", group: "variable", radius: 1.6, angle: 2.2, y: -0.12, z: 0.8, size: 0.4 },
];

const THEME_COLORS = {
  light: {
    operator: "#639aff", constant: "#00a878", variable: "#6e99ea",
    geometry: "#5986d9", relation: "#6f99e8", grid: "#a6bfed", particle: "#83a7eb",
  },
  dark: {
    operator: "#9dbfff", constant: "#48d7a0", variable: "#97bbff",
    geometry: "#86b0ff", relation: "#a4c4ff", grid: "#4c679a", particle: "#8bb4ff",
  },
};

function getThemeName() {
  const current = document.documentElement.getAttribute("data-theme");
  if (current === "dark" || current === "light") return current;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const TAU = Math.PI * 2;

function clampUnit(value) {
  return Math.max(-1, Math.min(1, value));
}

function createObjectTexture(THREE, object, color) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, 256, 256);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = 18;
  context.font = '600 120px "STIX Two Math", "Cambria Math", serif';
  context.fillText(object.glyph, 128, 104);
  context.shadowBlur = 0;
  context.globalAlpha = 0.8;
  context.font = '700 16px "Aptos", "Segoe UI", sans-serif';
  context.fillText(object.label, 128, 194);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 1;
  return texture;
}

function createOrbit(THREE, radius, opacity, rotation) {
  const points = [];
  for (let index = 0; index < 96; index += 1) {
    const angle = (index / 96) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.48, 0));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const line = new THREE.LineLoop(geometry, material);
  line.rotation.set(rotation.x, rotation.y, rotation.z);
  return line;
}

function MathWorld() {
  const hostRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const label = labelRef.current;
    if (!host || !label) return undefined;

    let THREE = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let observer = null;
    let resizeObserver = null;
    let themeObserver = null;
    let animationFrame = 0;
    let running = false;
    let cancelled = false;
    let focusedSprite = null;
    const resources = [];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = {
      width: 2,
      height: 2,
      lastFrame: 0,
      time: 0,
      visibility: 1,
      pointer: { x: 0, y: 0 },
      parallax: { x: 0, y: 0 },
      cameraTarget: { x: 0, y: 0 },
      sprites: [],
      world: null,
      orbitGroup: null,
      ambientGrid: null,
      particleField: null,
    };

    const stop = () => {
      running = false;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const start = () => {
      if (cancelled || !renderer || running || reducedMotion) return;
      running = true;
      animationFrame = requestAnimationFrame(renderFrame);
    };

    const updateFocus = (sprite, event) => {
      if (focusedSprite === sprite) return;
      if (focusedSprite) {
        focusedSprite.material.opacity = focusedSprite.userData.baseOpacity;
        focusedSprite.scale.copy(focusedSprite.userData.baseScale);
      }
      focusedSprite = sprite;
      if (!sprite) {
        label.classList.remove("is-visible");
        host.removeAttribute("data-math-focus");
        return;
      }
      sprite.material.opacity = 0.96;
      sprite.scale.copy(sprite.userData.baseScale).multiplyScalar(1.18);
      label.textContent = `${sprite.userData.object.glyph}  ${sprite.userData.object.label}`;
      const bounds = host.getBoundingClientRect();
      label.style.left = `${event.clientX - bounds.left + 14}px`;
      label.style.top = `${event.clientY - bounds.top + 14}px`;
      label.classList.add("is-visible");
      host.dataset.mathFocus = sprite.userData.object.group;
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const bounds = host.getBoundingClientRect();
      state.width = Math.max(2, Math.floor(bounds.width));
      state.height = Math.max(2, Math.floor(bounds.height));
      camera.aspect = state.width / state.height;
      camera.updateProjectionMatrix();
      renderer.setSize(state.width, state.height, false);
    };

    const applyTheme = () => {
      if (!THREE || !scene) return;
      const colors = THEME_COLORS[getThemeName()];
      state.sprites.forEach((sprite) => {
        const nextTexture = createObjectTexture(THREE, sprite.userData.object, colors[sprite.userData.object.group]);
        const previousTexture = sprite.material.map;
        sprite.material.map = nextTexture;
        sprite.material.needsUpdate = true;
        previousTexture?.dispose();
        resources.push(nextTexture);
      });
      state.ambientGrid?.material?.color?.set(colors.grid);
      state.orbitGroup?.children.forEach((line) => line.material.color.set(colors.grid));
      state.particleField?.material?.color?.set(colors.particle);
    };

    const updatePointer = (event) => {
      const bounds = host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      state.pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      state.pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      // Defensive: the listener is on window, so the pointer can sit far outside the hero.
      // Parallax uses the clamped value; otherwise a narrow host tilts the scene by tens of degrees.
      state.parallax.x = clampUnit(state.pointer.x);
      state.parallax.y = clampUnit(state.pointer.y);
      state.cameraTarget.x = state.parallax.x * 0.42;
      state.cameraTarget.y = state.parallax.y * 0.3;
      if (!THREE || !camera || !state.sprites.length) return;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(state.pointer, camera);
      const hit = raycaster.intersectObjects(state.sprites, false)[0];
      updateFocus(hit?.object || null, event);
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };

    function renderFrame(timestamp) {
      if (cancelled || !renderer || !scene || !camera || !state.world) return;
      const delta = Math.min(0.05, Math.max(0.001, (timestamp - (state.lastFrame || timestamp)) / 1000));
      state.lastFrame = timestamp;
      state.time += delta;

      state.world.rotation.y += (state.parallax.x * 0.14 - state.world.rotation.y) * 0.035;
      state.world.rotation.x += (-state.parallax.y * 0.07 - state.world.rotation.x) * 0.028;
      // Wrap driven angles so a long session cannot accumulate an unbounded rotation.
      state.orbitGroup.rotation.z = (state.time * 0.045) % TAU;
      // GridHelper lies in the XZ plane, so its in-plane axis is Y. Driving Z here yawed the
      // whole grid about the vertical axis until it turned edge-on; sway it in plane instead.
      state.ambientGrid.rotation.y = Math.sin(state.time * 0.05) * 0.02;
      camera.position.x += (state.cameraTarget.x - camera.position.x) * 0.055;
      camera.position.y += (state.cameraTarget.y - camera.position.y) * 0.055;
      camera.position.z = 6.8 + (1 - state.visibility) * 1.1;

      state.sprites.forEach((sprite, index) => {
        const { base, phase, amplitude, speed } = sprite.userData;
        sprite.position.set(
          base.x + Math.cos(state.time * speed * 0.62 + phase) * 0.12,
          base.y + Math.sin(state.time * speed + phase) * amplitude,
          base.z + Math.sin(state.time * speed * 0.44 + phase) * 0.16,
        );
        if (sprite !== focusedSprite) {
          sprite.material.opacity = sprite.userData.baseOpacity + Math.sin(state.time * 0.8 + index) * 0.025;
        }
      });

      renderer.render(scene, camera);
      if (running) animationFrame = requestAnimationFrame(renderFrame);
    }

    const initialize = async () => {
      try {
        THREE = await import("three");
        if (cancelled) return;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(48, state.width / state.height, 0.1, 100);
        camera.position.set(0, 0, 6.8);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, state.width < 720 ? 1.25 : 1.75));
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.cssText = "position:absolute;inset:0;display:block;width:100%;height:100%;";
        renderer.domElement.setAttribute("aria-hidden", "true");
        host.append(renderer.domElement);

        const colors = THEME_COLORS[getThemeName()];
        const world = new THREE.Group();
        const orbitGroup = new THREE.Group();
        state.world = world;
        state.orbitGroup = orbitGroup;
        scene.add(world);
        world.add(orbitGroup);

        [1.35, 2.35, 3.38].forEach((radius, index) => {
          const orbit = createOrbit(THREE, radius, 0.12 - index * 0.018, { x: index * 0.42 + 0.2, y: index * -0.3, z: index * 0.58 });
          orbit.material.color.set(colors.grid);
          resources.push(orbit.geometry, orbit.material);
          orbitGroup.add(orbit);
        });

        const grid = new THREE.GridHelper(10, 16, colors.grid, colors.grid);
        grid.rotation.x = Math.PI / 2;
        grid.position.z = -3.7;
        grid.material.transparent = true;
        grid.material.opacity = 0.16;
        grid.material.depthWrite = false;
        resources.push(grid.geometry, grid.material);
        state.ambientGrid = grid;
        world.add(grid);

        const particleCount = state.width < 720 ? 42 : 96;
        const positions = new Float32Array(particleCount * 3);
        for (let index = 0; index < particleCount; index += 1) {
          const radius = 1.5 + Math.random() * 3.4;
          const angle = Math.random() * Math.PI * 2;
          positions[index * 3] = Math.cos(angle) * radius;
          positions[index * 3 + 1] = (Math.random() - 0.5) * 5.6;
          positions[index * 3 + 2] = -2.8 + Math.random() * 1.7;
        }
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const particleMaterial = new THREE.PointsMaterial({
          color: colors.particle,
          size: state.width < 720 ? 0.035 : 0.045,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        });
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        resources.push(particleGeometry, particleMaterial);
        state.particleField = particles;
        world.add(particles);

        MATH_OBJECTS.forEach((object, index) => {
          const texture = createObjectTexture(THREE, object, colors[object.group]);
          const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, opacity: 0.35 + (index % 3) * 0.06 });
          const sprite = new THREE.Sprite(material);
          const base = new THREE.Vector3(Math.cos(object.angle) * object.radius, object.y, object.z);
          sprite.position.copy(base);
          sprite.scale.set(object.size, object.size, 1);
          sprite.userData = {
            object,
            base,
            phase: object.angle * 1.7,
            speed: 0.28 + (index % 4) * 0.05,
            amplitude: 0.08 + (index % 3) * 0.035,
            baseOpacity: material.opacity,
            baseScale: sprite.scale.clone(),
          };
          resources.push(texture, material);
          state.sprites.push(sprite);
          world.add(sprite);
        });

        resize();
        host.dataset.mathWorld = "ready";
        if (reducedMotion) renderFrame(performance.now());
        else start();
      } catch {
        host.dataset.mathWorld = "fallback";
      }
    };

    observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      state.visibility = Math.max(0.25, entry.intersectionRatio || 0);
      if (entry.isIntersecting && !document.hidden) start();
      else stop();
    }, { threshold: [0, 0.05, 0.3, 0.65, 1] });
    observer.observe(host);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.addEventListener("pointermove", updatePointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    initialize();

    return () => {
      cancelled = true;
      stop();
      observer?.disconnect();
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      window.removeEventListener("pointermove", updatePointer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resources.forEach((resource) => resource?.dispose?.());
      renderer?.dispose();
      renderer?.domElement?.remove();
    };
  }, []);

  return (
    <div ref={hostRef} className="hero-p5 hero-p5--three" aria-hidden="true">
      <span ref={labelRef} className="math-world-label" />
    </div>
  );
}

export default memo(MathWorld);
