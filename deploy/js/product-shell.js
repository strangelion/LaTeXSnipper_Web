(() => {
  const THEME_KEY = 'latexSnipper-theme';
  const root = document.documentElement;
  const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mobileNavigationQuery = window.matchMedia('(max-width: 720px)');

  function ensureLiquidGlassFilterDefs() {
    if (document.getElementById('liquid-backdrop-refraction')) return;
    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('class', 'liquid-filter-defs');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.innerHTML = '<defs><filter id="liquid-backdrop-refraction" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="1" seed="7" result="backdropNoise"></feTurbulence><feDisplacementMap in="SourceGraphic" in2="backdropNoise" scale="1.4" xChannelSelector="R" yChannelSelector="B"></feDisplacementMap></filter></defs>';
    document.body.prepend(svg);
  }

  function decorateLiquidSurface(element, variant = 'panel', interactive = false) {
    if (!element || element.classList.contains('lg-surface')) return element;
    const backdrop = document.createElement('span');
    backdrop.className = 'lg-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    const optics = document.createElement('span');
    optics.className = 'lg-optics';
    optics.setAttribute('aria-hidden', 'true');
    optics.innerHTML = '<span class="lg-caustic"></span><span class="lg-specular"></span><span class="lg-rim"></span>';
    const content = document.createElement(element.tagName === 'SPAN' ? 'span' : 'div');
    content.className = 'lg-content';
    while (element.firstChild) content.appendChild(element.firstChild);
    element.append(backdrop, optics, content);
    element.classList.add('lg-surface', `lg-surface--${variant}`);
    if (interactive) element.dataset.lgInteractive = 'true';
    return element;
  }

  function selectLiquidEngine() {
    const chromium = /(?:Chrome|Chromium|Edg)\//.test(navigator.userAgent) && !/(?:Firefox|FxiOS)\//.test(navigator.userAgent);
    const referenceParsed = CSS.supports('backdrop-filter', 'url("#liquid-backdrop-refraction") blur(1px)')
      || CSS.supports('-webkit-backdrop-filter', 'url("#liquid-backdrop-refraction") blur(1px)');
    const refractionDisabled = root.getAttribute('data-lg-refraction') === 'off';
    const enhanced = !refractionDisabled && chromium && referenceParsed;
    root.setAttribute('data-liquid-engine', enhanced ? 'svg-backdrop-refraction' : 'optical-fallback');
    root.setAttribute('data-lg-backdrop-supported', String(CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)')));
    root.setAttribute('data-lg-svg-reference-enabled', String(enhanced));
  }

  function syncMobileNavigationMaterials() {
    document.querySelectorAll('[data-lg-mobile-panel]').forEach((navigation) => {
      navigation.classList.toggle('lg-surface', mobileNavigationQuery.matches);
      navigation.classList.toggle('lg-surface--panel', mobileNavigationQuery.matches);
    });
  }

  ensureLiquidGlassFilterDefs();
  selectLiquidEngine();
  document.querySelectorAll('[data-lg-surface]').forEach((element) => {
    decorateLiquidSurface(element, element.dataset.lgSurface || 'regular', element.dataset.lgInteractive === 'true');
  });
  syncMobileNavigationMaterials();
  mobileNavigationQuery.addEventListener('change', syncMobileNavigationMaterials);
  window.LaTeXSnipperLiquid = Object.freeze({ ensureLiquidGlassFilterDefs, decorateLiquidSurface });

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
      const iconHost = button.querySelector('[data-theme-icon]') || button;
      iconHost.innerHTML = icons[next];
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
    const scrolled = currentScrollY > 40;
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

  function closeStaticNavigation(navigation) {
    if (!navigation || navigation.dataset.menuOwner === 'react') return;
    navigation.classList.remove('is-open');
    document.querySelector(`[aria-controls="${navigation.id}"]`)?.setAttribute('aria-expanded', 'false');
    document.querySelector(`[data-static-menu-scrim="${navigation.id}"]`)?.remove();
  }

  function openStaticNavigation(navigation, toggle) {
    navigation.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');

    const header = navigation.closest('.site-header-inner');
    if (!header || document.querySelector(`[data-static-menu-scrim="${navigation.id}"]`)) return;

    const scrim = document.createElement('button');
    scrim.className = 'site-navigation-scrim';
    scrim.type = 'button';
    scrim.setAttribute('aria-label', '关闭导航');
    scrim.dataset.staticMenuScrim = navigation.id;
    scrim.addEventListener('click', () => closeStaticNavigation(navigation));
    header.append(scrim);
  }

  function closeStaticNavigations() {
    document.querySelectorAll('.site-navigation.is-open:not([data-menu-owner="react"])').forEach(closeStaticNavigation);
  }

  document.querySelectorAll('[data-shell-menu]').forEach((toggle) => {
    const navigation = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!navigation || navigation.dataset.menuOwner === 'react') return;
    toggle.addEventListener('click', () => {
      const open = !navigation.classList.contains('is-open');
      if (open) openStaticNavigation(navigation, toggle);
      else closeStaticNavigation(navigation);
    });
    navigation.addEventListener('click', (event) => {
      if (!event.target.closest('a')) return;
      closeStaticNavigation(navigation);
    });
  });

  document.addEventListener('click', (event) => {
    document.querySelectorAll('.site-navigation.is-open:not([data-menu-owner="react"])').forEach((navigation) => {
      const toggle = document.querySelector(`[aria-controls="${navigation.id}"]`);
      if (navigation.contains(event.target) || toggle?.contains(event.target)) return;
      closeStaticNavigation(navigation);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeStaticNavigations();
  });

  mobileNavigationQuery.addEventListener('change', closeStaticNavigations);
  window.addEventListener('orientationchange', closeStaticNavigations);

  const highlightSelector = '.lg-surface[data-lg-interactive="true"]';

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
    element.style.setProperty('--lg-pointer-x', `${x.toFixed(2)}%`);
    element.style.setProperty('--lg-pointer-y', `${y.toFixed(2)}%`);
    element.style.setProperty('--lg-pointer-dx', ((x - 50) / 50).toFixed(3));
    element.style.setProperty('--lg-pointer-dy', ((y - 50) / 50).toFixed(3));
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
    element.style.removeProperty('--lg-pointer-x');
    element.style.removeProperty('--lg-pointer-y');
    element.style.removeProperty('--lg-pointer-dx');
    element.style.removeProperty('--lg-pointer-dy');
  }, { passive: true });
})();
