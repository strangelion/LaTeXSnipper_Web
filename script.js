// ============= 视频背景 =============
(function () {
  const lightVideo = document.getElementById('bg-video-light');
  const darkVideo = document.getElementById('bg-video-dark');
  if (!lightVideo || !darkVideo) return;

  function isDark() {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function switchVideo() {
    if (isDark()) {
      lightVideo.style.opacity = '0';
      darkVideo.style.opacity = '1';
      darkVideo.play().catch(() => {});
    } else {
      lightVideo.style.opacity = '1';
      darkVideo.style.opacity = '0';
      lightVideo.play().catch(() => {});
    }
  }

  switchVideo();
  const observer = new MutationObserver(switchVideo);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', switchVideo);
})();

// ============= WebGL 水波纹 =============
(function () {
  const overlay = document.getElementById('bg-overlay');
  if (!overlay || typeof Ripples === 'undefined') return;

  let ripples;

  function initRipples() {
    try {
      if (ripples) { ripples.destroy(); }
      ripples = new Ripples(overlay, {
        resolution: 256,
        dropRadius: 18,
        perturbance: 0.025,
        interactive: true
      });
    } catch (e) {
      console.error('水波纹初始化失败:', e);
    }
  }

  function deferInit() {
    const check = () => {
      if (overlay.offsetWidth > 0 && overlay.offsetHeight > 0) {
        initRipples();
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  }

  if (document.readyState === 'complete') {
    deferInit();
  } else {
    window.addEventListener('load', deferInit);
  }

  window.addEventListener('resize', () => {
    if (ripples) ripples.updateSize();
  });
})();

// ============= 手动主题切换 =============
(function () {
  const toggle = document.getElementById('themeToggle');
  const root = document.documentElement;
  const darkMQ = matchMedia('(prefers-color-scheme: dark)');
  const STORAGE_KEY = 'latexSnipper-theme';

  function loadTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      root.setAttribute('data-theme', saved);
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function isDark() {
    const attr = root.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return darkMQ.matches;
  }

  function saveTheme() {
    const attr = root.getAttribute('data-theme');
    if (attr === 'dark') {
      localStorage.setItem(STORAGE_KEY, 'dark');
    } else if (attr === 'light') {
      localStorage.setItem(STORAGE_KEY, 'light');
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  loadTheme();

  if (toggle) {
    function updateIcon() {
      toggle.textContent = isDark() ? '☀️' : '🌙';
    }
    updateIcon();
    darkMQ.addEventListener('change', () => {
      loadTheme();
      updateIcon();
    });

    toggle.addEventListener('click', () => {
      if (isDark()) {
        root.setAttribute('data-theme', 'light');
      } else {
        root.setAttribute('data-theme', 'dark');
      }
      saveTheme();
      updateIcon();
    });
  }
})();

// ============= 回到顶部按钮 =============
(function () {
  const btn = document.getElementById('backToTop');
  if (!btn) return;
  let fadeTimer = null;
  const FADE_DELAY = 4000;

  function toggle() {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
      startFadeTimer();
    } else {
      btn.classList.remove('visible');
      btn.classList.remove('faded');
      clearFadeTimer();
    }
  }

  function startFadeTimer() {
    clearFadeTimer();
    fadeTimer = setTimeout(() => { btn.classList.add('faded'); }, FADE_DELAY);
  }

  function clearFadeTimer() {
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }
  }

  window.addEventListener('scroll', toggle, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  btn.addEventListener('mouseenter', () => {
    btn.classList.remove('faded');
    clearFadeTimer();
  });
  btn.addEventListener('mouseleave', () => {
    startFadeTimer();
  });
  toggle();
})();

// ============= Slide 滚动驱动动画 =============
(function () {
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  let isMobile = window.innerWidth < 768;

  function getProgress(el) {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    return clamp(1 - (r.top + r.height) / (vh + r.height), 0, 1);
  }

  function segment(p, a, b) {
    return clamp((p - a) / (b - a), 0, 1);
  }

  let raf = null;

  function update() {
    raf = null;

    // ── Hero ──
    const heroSection = document.querySelector('[data-slide="hero"]');
    if (heroSection) {
      const inner = heroSection.querySelector('.slide-inner');
      if (inner) {
        if (isMobile) {
          const p = getProgress(heroSection);
          inner.style.opacity = Math.min(1, (1 - p) * 4).toFixed(4);
          inner.style.transform = 'none';
        } else {
          const range = heroSection.offsetHeight;
          const raw = clamp(window.scrollY / range, 0, 1);
          const easeZ = 1 - Math.pow(1 - raw, 2);
          const scale = lerp(2, 1, clamp(easeZ / 0.65, 0, 1));
          const opacity = easeZ < 0.65 ? 1 : clamp(1 - (easeZ - 0.65) / 0.35, 0, 1);

          inner.style.transform = `scale(${scale.toFixed(4)})`;
          inner.style.opacity = opacity.toFixed(4);
        }
      }
    }

    // ── Card Slides ──
    document.querySelectorAll('.card-slide').forEach(section => {
      const p = getProgress(section);
      const wrapper = section.querySelector('.card-wrapper');
      const front = section.querySelector('.card-front');
      const detail = section.querySelector('.card-detail');
      if (!wrapper || !front || !detail) return;

      if (isMobile) {
        wrapper.style.transform = `scale(${lerp(0.94, 1, Math.min(1, p * 2.5)).toFixed(4)})`;
        wrapper.style.opacity = Math.min(1, p * 3).toFixed(4);
        const brief = front.querySelector('p');
        if (brief) brief.style.opacity = '1';
        detail.style.opacity = '1';
        detail.style.transform = 'none';
        detail.style.clipPath = 'none';
      } else {
        const c = segment(p, 0.10, 0.80);

        let wrapScale, wrapOpacity, frontWidth, detailLeft, briefOpacity;

        if (c < 0.10) {
          const t = c / 0.10;
          wrapScale = lerp(0.5, 1, t);
          wrapOpacity = t;
          frontWidth = 100;
          detailLeft = 100;
          briefOpacity = 1;
        } else if (c < 0.30) {
          wrapScale = 1;
          wrapOpacity = 1;
          frontWidth = 100;
          detailLeft = 100;
          briefOpacity = 1;
        } else if (c < 0.46) {
          const t = (c - 0.30) / 0.16;
          wrapScale = 1;
          wrapOpacity = 1;
          frontWidth = lerp(100, 30, t);
          detailLeft = lerp(100, 30, t);
          briefOpacity = lerp(1, 0, t);
        } else if (c < 0.66) {
          wrapScale = 1;
          wrapOpacity = 1;
          frontWidth = 30;
          detailLeft = 30;
          briefOpacity = 0;
        } else if (c < 0.82) {
          const t = (c - 0.66) / 0.16;
          wrapScale = 1;
          wrapOpacity = 1;
          frontWidth = lerp(30, 100, t);
          detailLeft = lerp(30, 100, t);
          briefOpacity = lerp(0, 1, t);
        } else {
          const t = (c - 0.82) / 0.18;
          wrapScale = lerp(1, 0.4, t);
          wrapOpacity = 1 - t;
          frontWidth = 100;
          detailLeft = 100;
          briefOpacity = 1;
        }

        wrapper.style.transform = `scale(${wrapScale.toFixed(4)})`;
        wrapper.style.opacity = wrapOpacity.toFixed(4);
        front.style.width = `${frontWidth.toFixed(1)}%`;
        detail.style.left = `${detailLeft.toFixed(1)}%`;

        const brief = front.querySelector('p');
        if (brief) brief.style.opacity = briefOpacity.toFixed(4);
      }
    });

    // ── Ending ──
    const endSection = document.querySelector('[data-slide="ending"]');
    if (endSection) {
      const inner = endSection.querySelector('.slide-inner');
      if (inner) {
        const p = getProgress(endSection);
        if (isMobile) {
          inner.style.opacity = Math.min(1, p * 3).toFixed(4);
          inner.style.transform = 'none';
        } else {
          const f = segment(p, 0.1, 0.6);
          inner.style.opacity = f.toFixed(4);
          inner.style.transform = `scale(${lerp(0.8, 1, f).toFixed(4)})`;
        }
      }
    }
  }

  function onScroll() {
    if (!raf) raf = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
  window.addEventListener('resize', () => { isMobile = window.innerWidth < 768; update(); });
})();

// ============= 打字效果 =============
document.addEventListener('DOMContentLoaded', function () {
  const typedEl = document.getElementById('typed');
  const words = ['快速插入', '实时预览', '智能识别'];
  if (typedEl) {
    let i = 0, j = 0, forward = true;
    function tick() {
      const w = words[i];
      typedEl.textContent = w.slice(0, j);
      if (forward) {
        if (j < w.length) j++; else { forward = false; setTimeout(tick, 900); return }
      } else {
        if (j > 0) j--; else { forward = true; i = (i + 1) % words.length }
      }
      setTimeout(tick, forward ? 80 : 40);
    }
    tick();
  }
});

// ============= 复制代码 =============
function copyCode(btn) {
  const code = btn.nextElementSibling.textContent;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = '已复制';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.classList.add('copied-fade');
      setTimeout(() => {
        btn.textContent = '复制';
        btn.classList.remove('copied', 'copied-fade');
      }, 600);
    }, 800);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '已复制';
    setTimeout(() => { btn.textContent = '复制'; }, 1500);
  });
}
