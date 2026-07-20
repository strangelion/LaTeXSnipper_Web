(() => {
  const THEME_KEY = 'latexSnipper-theme';
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

  const icons = {
    light: '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>',
    dark: '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  };

  function storedTheme() {
    try {
      const value = localStorage.getItem(THEME_KEY);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  function activeTheme() {
    const explicit = root.getAttribute('data-theme');
    if (explicit === 'light' || explicit === 'dark') return explicit;
    return systemTheme.matches ? 'dark' : 'light';
  }

  function updateThemeButtons() {
    const theme = activeTheme();
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      const next = theme === 'dark' ? 'light' : 'dark';
      button.innerHTML = icons[next];
      button.setAttribute('aria-label', next === 'dark' ? '切换到暗色模式' : '切换到亮色模式');
      button.setAttribute('title', next === 'dark' ? '切换到暗色模式' : '切换到亮色模式');
    });
    window.dispatchEvent(new CustomEvent('latexsnipper:themechange', { detail: { theme } }));
  }

  function applyStoredTheme() {
    const saved = storedTheme();
    if (saved) root.setAttribute('data-theme', saved);
    else root.removeAttribute('data-theme');
    updateThemeButtons();
  }

  applyStoredTheme();

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-toggle]');
    if (!button) return;
    const next = activeTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    updateThemeButtons();
  });

  systemTheme.addEventListener('change', () => {
    if (!storedTheme()) {
      root.removeAttribute('data-theme');
      updateThemeButtons();
    }
  });

  const shellHeaders = Array.from(document.querySelectorAll('[data-shell-header], .top-nav'));
  let previousScrollY = window.scrollY;
  function updateHeaders() {
    const currentScrollY = window.scrollY;
    const scrolled = currentScrollY > 18;
    const manualPage = document.body.classList.contains('manual');
    const movingDown = currentScrollY > previousScrollY + 3;
    const movingUp = currentScrollY < previousScrollY - 3;
    shellHeaders.forEach((header) => {
      header.classList.toggle('is-scrolled', scrolled);
      if (manualPage && currentScrollY > 120 && movingDown) header.classList.add('is-auto-hidden');
      if (!manualPage || currentScrollY < 72 || movingUp) header.classList.remove('is-auto-hidden');
    });
    previousScrollY = currentScrollY;
  }
  updateHeaders();
  window.addEventListener('scroll', updateHeaders, { passive: true });

  document.querySelectorAll('[data-shell-menu]').forEach((toggle) => {
    const navigation = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!navigation) return;
    toggle.addEventListener('click', () => {
      const open = !navigation.classList.contains('is-open');
      navigation.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    navigation.addEventListener('click', (event) => {
      if (!event.target.closest('a')) return;
      navigation.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('click', (event) => {
    document.querySelectorAll('.site-navigation.is-open').forEach((navigation) => {
      const toggle = document.querySelector(`[aria-controls="${navigation.id}"]`);
      if (navigation.contains(event.target) || toggle?.contains(event.target)) return;
      navigation.classList.remove('is-open');
      toggle?.setAttribute('aria-expanded', 'false');
    });
  });

  const highlightSelector = [
    '.liquid-surface',
    '.liquid-glass',
    '.glass-panel',
    '.glass-control',
    '.glass-float',
    '.button',
    '.site-download-link',
    '.download-btn',
    '.platform-card.recommended',
    '.ocr-copy',
    '.cam-trigger-btn',
    '.cam-btn',
    '.hw-recognize-btn',
    '.mode-tab',
    '.model-tab',
    '.theme-toggle',
    '.theme-icon-button',
    '.download-pdf-link',
    '.float-arrow',
  ].join(',');

  let frame = 0;
  let pending = null;

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
    if (!pointerQuery.matches || motionQuery.matches) return;
    const element = event.target.closest(highlightSelector);
    if (!element) return;
    pending = { element, clientX: event.clientX, clientY: event.clientY };
    if (!frame) frame = requestAnimationFrame(updateHighlight);
  }, { passive: true });

  document.addEventListener('pointerout', (event) => {
    const element = event.target.closest(highlightSelector);
    if (!element || element.contains(event.relatedTarget)) return;
    element.classList.remove('is-pointer-lit');
    element.style.removeProperty('--glass-x');
    element.style.removeProperty('--glass-y');
    element.style.removeProperty('--glass-dx');
    element.style.removeProperty('--glass-dy');
  }, { passive: true });
})();
