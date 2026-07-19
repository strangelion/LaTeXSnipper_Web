// Drive a restrained pointer-aware highlight without changing page geometry.
(() => {
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const selector = [
    '.liquid-surface',
    '.button',
    '.site-download-link',
    '.download-btn',
    '.ocr-copy',
    '.cam-trigger-btn',
    '.cam-btn',
    '.hw-recognize-btn',
    '.mode-tab',
    '.model-tab',
    '.theme-toggle',
    '.download-pdf-link',
    '.float-arrow',
  ].join(',');

  let frame = 0;
  let pending = null;

  function isEnabled() {
    return pointerQuery.matches && !motionQuery.matches;
  }

  function updateHighlight() {
    frame = 0;
    if (!pending) return;

    const { element, clientX, clientY } = pending;
    pending = null;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    element.style.setProperty('--glass-x', `${x.toFixed(2)}%`);
    element.style.setProperty('--glass-y', `${y.toFixed(2)}%`);
    element.style.setProperty('--glass-dx', ((x - 50) / 50).toFixed(3));
    element.style.setProperty('--glass-dy', ((y - 50) / 50).toFixed(3));
    element.classList.add('is-pointer-lit');
  }

  document.addEventListener('pointermove', (event) => {
    if (!isEnabled()) return;
    const element = event.target.closest(selector);
    if (!element) return;

    pending = { element, clientX: event.clientX, clientY: event.clientY };
    if (!frame) frame = requestAnimationFrame(updateHighlight);
  }, { passive: true });

  document.addEventListener('pointerout', (event) => {
    const element = event.target.closest(selector);
    if (!element || element.contains(event.relatedTarget)) return;
    element.classList.remove('is-pointer-lit');
    element.style.removeProperty('--glass-x');
    element.style.removeProperty('--glass-y');
    element.style.removeProperty('--glass-dx');
    element.style.removeProperty('--glass-dy');
  }, { passive: true });
})();
