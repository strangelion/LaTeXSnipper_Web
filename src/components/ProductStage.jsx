import React, { useRef } from 'react';

export default function ProductStage() {
  const stageRef = useRef(null);

  function handlePointerMove(event) {
    const element = stageRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;

    const rotateY = (px - 0.5) * 5;
    const rotateX = (0.5 - py) * 4;

    element.style.setProperty('--stage-rx', `${rotateX.toFixed(2)}deg`);
    element.style.setProperty('--stage-ry', `${rotateY.toFixed(2)}deg`);
  }

  function reset() {
    const element = stageRef.current;
    if (!element) return;
    element.style.setProperty('--stage-rx', '0deg');
    element.style.setProperty('--stage-ry', '0deg');
  }

  return (
    <div
      ref={stageRef}
      className="product-stage"
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
    >
      <div className="product-window">
        <img
          src="/assets/images/product/hero-workspace.webp"
          width="1600"
          height="1000"
          alt="LaTeXSnipper 主界面"
        />
      </div>

      <div className="capture-overlay">
        <span />
        <code>{String.raw`\int_0^{\infty} e^{-x^2}\,dx`}</code>
      </div>
    </div>
  );
}
