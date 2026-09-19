import { memo, useEffect, useRef } from "react";
import "./SemanticGraph.css";

const AST_GRAPH = {
  nodes: [
    { id: "formula", label: "Formula", x: 0, y: 1.15, z: 0 },
    { id: "integral", label: "Integral", x: -1.35, y: -0.15, z: 0.1 },
    { id: "bounds", label: "Bounds", x: -2.08, y: -1.08, z: -0.35 },
    { id: "power", label: "Exponential", x: 1.35, y: -0.15, z: -0.1 },
    { id: "differential", label: "Differential", x: 0.78, y: -1.38, z: 0.28 },
  ],
  edges: [
    ["formula", "integral"], ["formula", "power"], ["formula", "differential"], ["integral", "bounds"],
  ],
};

const CONVERSION_GRAPH = {
  nodes: [
    { id: "ast", label: "Math AST", x: 0, y: 0, z: 0 },
    { id: "latex", label: "LaTeX", x: -1.72, y: 1.08, z: -0.2 },
    { id: "typst", label: "Typst", x: 1.72, y: 1.08, z: 0.15 },
    { id: "mathml", label: "MathML", x: -1.72, y: -1.08, z: 0.25 },
    { id: "omml", label: "OMML", x: 1.72, y: -1.08, z: -0.15 },
  ],
  edges: [["ast", "latex"], ["ast", "typst"], ["ast", "mathml"], ["ast", "omml"]],
};

function themeColors() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark"
    || (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return isDark
    ? { active: "#a79dff", idle: "#62709f", line: "#5d568e", label: "#e8e7ff" }
    : { active: "#6c63ff", idle: "#9aa3c8", line: "#aeb4d7", label: "#25233e" };
}

function createLabelTexture(THREE, text, color) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = color;
  context.font = '700 24px "Aptos", "Segoe UI", sans-serif';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 1;
  return texture;
}

function SemanticGraph({ variant, activeId, onSelect, className = "" }) {
  const hostRef = useRef(null);
  const tooltipRef = useRef(null);
  const activeRef = useRef(activeId);
  const selectRef = useRef(onSelect);
  activeRef.current = activeId;
  selectRef.current = onSelect;

  useEffect(() => {
    const host = hostRef.current;
    const tooltip = tooltipRef.current;
    if (!host || !tooltip) return undefined;

    const graph = variant === "conversion" ? CONVERSION_GRAPH : AST_GRAPH;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let THREE = null;
    let renderer = null;
    let scene = null;
    let camera = null;
    let world = null;
    let animationFrame = 0;
    let visible = false;
    let running = false;
    let loaded = false;
    let cancelled = false;
    let resizeObserver = null;
    let intersectionObserver = null;
    let themeObserver = null;
    let hovered = null;
    const resources = [];
    const nodeMeshes = [];
    const nodeLookup = new Map();
    const state = { width: 2, height: 2, time: 0, last: 0, pointer: { x: 0, y: 0 } };

    const stop = () => {
      running = false;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };

    const start = () => {
      if (!renderer || running || reducedMotion || !visible) return;
      running = true;
      animationFrame = requestAnimationFrame(renderFrame);
    };

    const resize = () => {
      if (!renderer || !camera) return;
      const rect = host.getBoundingClientRect();
      state.width = Math.max(2, Math.floor(rect.width));
      state.height = Math.max(2, Math.floor(rect.height));
      camera.aspect = state.width / state.height;
      camera.updateProjectionMatrix();
      renderer.setSize(state.width, state.height, false);
    };

    const applyTheme = () => {
      if (!THREE) return;
      const colors = themeColors();
      nodeMeshes.forEach((mesh) => {
        mesh.material.color.set(mesh.userData.id === activeRef.current ? colors.active : colors.idle);
        mesh.userData.label.material.color.set(colors.label);
      });
      world?.children.forEach((child) => {
        if (child.userData.edge) child.material.color.set(colors.line);
      });
    };

    const setHover = (mesh, event) => {
      if (hovered === mesh) return;
      hovered = mesh;
      if (!mesh) {
        tooltip.classList.remove("is-visible");
        renderer.domElement.style.cursor = "default";
        return;
      }
      const rect = host.getBoundingClientRect();
      tooltip.textContent = mesh.userData.labelText;
      tooltip.style.left = `${event.clientX - rect.left + 12}px`;
      tooltip.style.top = `${event.clientY - rect.top + 12}px`;
      tooltip.classList.add("is-visible");
      renderer.domElement.style.cursor = "pointer";
    };

    const pickNode = (event, select) => {
      if (!THREE || !camera || !renderer) return;
      const rect = renderer.domElement.getBoundingClientRect();
      state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      state.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(state.pointer, camera);
      const hit = raycaster.intersectObjects(nodeMeshes, false)[0]?.object || null;
      setHover(hit, event);
      if (select && hit && hit.userData.id !== "ast") selectRef.current?.(hit.userData.id);
    };

    const onPointerMove = (event) => pickNode(event, false);
    const onPointerLeave = () => setHover(null, { clientX: 0, clientY: 0 });
    const onClick = (event) => pickNode(event, true);
    const onDocumentVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    function renderFrame(timestamp) {
      if (!renderer || !scene || !camera || !world) return;
      const delta = Math.min(0.05, Math.max(0.001, (timestamp - (state.last || timestamp)) / 1000));
      state.last = timestamp;
      state.time += delta;
      if (variant === "conversion") world.rotation.z = Math.sin(state.time * 0.35) * 0.035;
      else world.rotation.y = Math.sin(state.time * 0.25) * 0.085;

      nodeMeshes.forEach((mesh, index) => {
        const active = mesh.userData.id === activeRef.current;
        const scale = active ? 1.3 : mesh === hovered ? 1.14 : 1;
        mesh.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.14);
        mesh.material.color.lerp(new THREE.Color(active ? themeColors().active : themeColors().idle), 0.12);
        mesh.position.y = mesh.userData.baseY + Math.sin(state.time * 0.72 + index) * (reducedMotion ? 0 : 0.028);
      });
      renderer.render(scene, camera);
      if (running) animationFrame = requestAnimationFrame(renderFrame);
    }

    const initialize = async () => {
      try {
        THREE = await import("three");
        if (cancelled) return;
        const colors = themeColors();
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(42, state.width / state.height, 0.1, 30);
        camera.position.set(0, 0, 6.2);
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
        renderer.domElement.setAttribute("aria-hidden", "true");
        renderer.domElement.addEventListener("pointermove", onPointerMove, { passive: true });
        renderer.domElement.addEventListener("pointerleave", onPointerLeave, { passive: true });
        renderer.domElement.addEventListener("click", onClick);
        host.append(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 1.7));
        const light = new THREE.PointLight(colors.active, 1.2, 12);
        light.position.set(1.5, 2, 3);
        scene.add(light);
        world = new THREE.Group();
        scene.add(world);

        graph.nodes.forEach((node, index) => {
          const geometry = new THREE.IcosahedronGeometry(node.id === "ast" || node.id === "formula" ? 0.28 : 0.2, 2);
          const material = new THREE.MeshStandardMaterial({
            color: node.id === activeRef.current ? colors.active : colors.idle,
            transparent: true,
            opacity: 0.94,
            roughness: 0.28,
            metalness: 0.16,
          });
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(node.x, node.y, node.z);
          mesh.userData.id = node.id;
          mesh.userData.baseY = node.y;
          mesh.userData.labelText = node.label;
          const texture = createLabelTexture(THREE, node.label, colors.label);
          const labelMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.92, depthWrite: false });
          const labelSprite = new THREE.Sprite(labelMaterial);
          labelSprite.position.set(0, 0.42, 0);
          labelSprite.scale.set(node.label.length > 9 ? 1.35 : 1.05, 0.4, 1);
          mesh.add(labelSprite);
          mesh.userData.label = labelSprite;
          resources.push(geometry, material, texture, labelMaterial);
          nodeMeshes.push(mesh);
          nodeLookup.set(node.id, mesh);
          world.add(mesh);

          const haloGeometry = new THREE.RingGeometry(0.32, 0.342, 48);
          const haloMaterial = new THREE.MeshBasicMaterial({ color: colors.active, transparent: true, opacity: index === 0 ? 0.44 : 0.18, side: THREE.DoubleSide, depthWrite: false });
          const halo = new THREE.Mesh(haloGeometry, haloMaterial);
          halo.position.set(node.x, node.y, node.z - 0.03);
          resources.push(haloGeometry, haloMaterial);
          world.add(halo);
        });

        graph.edges.forEach(([from, to]) => {
          const startPoint = nodeLookup.get(from).position;
          const endPoint = nodeLookup.get(to).position;
          const geometry = new THREE.BufferGeometry().setFromPoints([startPoint, endPoint]);
          const material = new THREE.LineBasicMaterial({ color: colors.line, transparent: true, opacity: 0.6, depthWrite: false });
          const line = new THREE.Line(geometry, material);
          line.userData.edge = true;
          resources.push(geometry, material);
          world.add(line);
        });

        resize();
        loaded = true;
        host.dataset.graphState = "ready";
        if (reducedMotion) renderFrame(performance.now());
        else start();
      } catch {
        host.dataset.graphState = "fallback";
      }
    };

    intersectionObserver = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible && !loaded) initialize();
      if (visible && !document.hidden) start();
      else stop();
    }, { threshold: 0.05 });
    intersectionObserver.observe(host);
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    themeObserver = new MutationObserver(applyTheme);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    document.addEventListener("visibilitychange", onDocumentVisibility);

    return () => {
      cancelled = true;
      stop();
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      document.removeEventListener("visibilitychange", onDocumentVisibility);
      renderer?.domElement?.removeEventListener("pointermove", onPointerMove);
      renderer?.domElement?.removeEventListener("pointerleave", onPointerLeave);
      renderer?.domElement?.removeEventListener("click", onClick);
      resources.forEach((resource) => resource?.dispose?.());
      renderer?.dispose();
      renderer?.domElement?.remove();
    };
  }, [variant]);

  return (
    <div
      ref={hostRef}
      className={`semantic-graph semantic-graph--${variant} ${className}`.trim()}
      aria-hidden="true"
    >
      <span ref={tooltipRef} className="semantic-graph__tooltip" />
    </div>
  );
}

export default memo(SemanticGraph);
