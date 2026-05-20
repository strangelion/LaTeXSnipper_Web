// ============= 动态彩色光点背景 =============
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: false });

  const COUNT = 50;
  const PALETTE = [
    '#FF6B6B','#FF8E72','#FFA94D','#FFD43B','#C0EB75',
    '#69DB7C','#38D9A9','#63E6BE','#20C997','#66D9E8',
    '#4DABF7','#748FFC','#9775FA','#DA77F2','#F783AC',
    '#F06595','#E64980','#CC5DE8','#845EF7','#5C7CFA',
    '#339AF0','#22B8CF','#15AABF','#0CA678','#40C057',
    '#82C91E','#94D82D','#FCC419','#F59F00','#FD7E14',
    '#FF6B6B','#F06595','#E599F7','#B197FC','#91A7FF',
    '#74C0FC','#66D9E8','#63E6BE','#FFD8A8','#FFC078',
    '#FFA8A8','#FFD43B','#A9E34B','#69DB7C','#38D9A9',
    '#748FFC','#DA77F2','#F783AC','#FF922B','#FF8787'
  ];

  function isDarkMode() {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'dark') return true;
    if (attr === 'light') return false;
    return matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function getBgColor() {
    return isDarkMode() ? '#181c26' : '#eef4fb';
  }
  function rippleRGB() {
    return isDarkMode() ? '255,255,255' : '0,0,0';
  }

  let W, H;
  function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
  resize(); addEventListener('resize', resize);

  const pts = [];
  for (let i = 0; i < COUNT; i++) {
    pts.push({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: 22 + Math.random() * 50,
      cr: 0,
      c: PALETTE[i],
      ph: Math.random() * Math.PI * 2,
      pd: 3500 + Math.random() * 6500,
      aHi: 0.65 + Math.random() * 0.30,
      aLo: 0.12 + Math.random() * 0.12,
      ca: 0,
      pulse: 0,
      rippleR: 100 + Math.random() * 160,
      decay: 0.965 + Math.random() * 0.02,
      pulseMax: 0.30 + Math.random() * 0.25,
    });
  }

  const clickRipples = [];
  addEventListener('click', e => {
    clickRipples.push({
      x: e.clientX, y: e.clientY,
      time: performance.now(),
      maxR: Math.max(W, H) * 0.55,
      duration: 1500,
    });
  });

  let mx = -9999, my = -9999, tmx = -9999, tmy = -9999;
  let pmx = -9999, pmy = -9999;
  addEventListener('mousemove', e => { tmx = e.clientX; tmy = e.clientY; });
  addEventListener('mouseleave', () => { tmx = tmy = -9999; });

  let lt = performance.now();

  function loop(now) {
    try {
    const dt = Math.min(now - lt, 50); lt = now;
    mx += (tmx - mx) * 0.06; my += (tmy - my) * 0.06;
    const spd = Math.hypot(mx - pmx, my - pmy); pmx = mx; pmy = my;

    ctx.fillStyle = getBgColor();
    ctx.fillRect(0, 0, W, H);

    for (const p of pts) {
      const t = (now % p.pd) / p.pd;
      const ta = p.aLo + ((Math.sin(t * Math.PI * 2 + p.ph) + 1) / 2) * (p.aHi - p.aLo);

      p.x += p.vx * (dt / 16); p.y += p.vy * (dt / 16);
      if (p.x < -p.r) p.x = W + p.r;
      if (p.x > W + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = H + p.r;
      if (p.y > H + p.r) p.y = -p.r;

      if (mx > -5000 && spd > 0.3) {
        const dist = Math.hypot(p.x - mx, p.y - my);
        if (dist < p.rippleR) {
          const nd = dist / p.rippleR;
          const ripple = (1 - nd) * Math.sin(nd * Math.PI * 3) * Math.min(spd * 0.55, 1);
          if (ripple > 0.003) p.pulse = Math.min(p.pulse + ripple * 1.3, p.pulseMax);
        }
      }
      p.pulse *= p.decay;
      if (p.pulse < 0.0005) p.pulse = 0;

      // ── Click ripple effect ──
      for (const rp of clickRipples) {
        const elapsed = now - rp.time;
        const progress = Math.min(elapsed / rp.duration, 1);
        const currentR = rp.maxR * progress;
        const dist = Math.hypot(p.x - rp.x, p.y - rp.y);
        if (dist < currentR && dist > 0) {
          const nd = dist / currentR;
          const wave = (1 - nd) * Math.sin(nd * Math.PI * 4) * (1 - progress);
          if (wave > 0.003) p.pulse = Math.min(p.pulse + wave * 2.5, p.pulseMax * 1.4);
        }
      }

      const tr = p.r * (1 + p.pulse);
      p.cr += (tr - p.cr) * 0.15;

      p.ca += (ta - p.ca) * 0.05;
      const alpha = Math.min(p.ca * (1 + p.pulse * 0.5), 0.9);

      const rad = p.cr || p.r;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
      g.addColorStop(0, p.c);
      g.addColorStop(0.35, p.c);
      g.addColorStop(1, 'transparent');

      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Draw click ripple rings ──
    const rippleRgb = rippleRGB();
    for (let ri = clickRipples.length - 1; ri >= 0; ri--) {
      const rp = clickRipples[ri];
      const elapsed = now - rp.time;
      const progress = Math.min(elapsed / rp.duration, 1);
      if (progress >= 1) { clickRipples.splice(ri, 1); continue; }
      const currentR = Math.max(0, rp.maxR * progress);
      const alpha = 0.4 * (1 - progress);
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, currentR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rippleRgb},${alpha.toFixed(3)})`;
      ctx.lineWidth = 2.5 * (1 - progress) + 0.5;
      ctx.stroke();
      if (progress > 0.2) {
        const innerR = Math.max(0, rp.maxR * (progress - 0.15));
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, innerR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${rippleRgb},${(alpha * 0.5).toFixed(3)})`;
        ctx.lineWidth = 1.5 * (1 - progress) + 0.5;
        ctx.stroke();
      }
    }

    } catch(e) { /* keep loop alive */ }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
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
        const range = heroSection.offsetHeight;
        const raw = clamp(window.scrollY / range, 0, 1);
        const easeZ = 1 - Math.pow(1 - raw, 2);
        const scale = lerp(2, 1, clamp(easeZ / 0.65, 0, 1));
        const opacity = easeZ < 0.65 ? 1 : clamp(1 - (easeZ - 0.65) / 0.35, 0, 1);

        inner.style.transform = `scale(${scale.toFixed(4)})`;
        inner.style.opacity = opacity.toFixed(4);
      }
    }

    // ── Card Slides ──
    document.querySelectorAll('.card-slide').forEach(section => {
      const p = getProgress(section);
      const wrapper = section.querySelector('.card-wrapper');
      const front = section.querySelector('.card-front');
      const detail = section.querySelector('.card-detail');
      if (!wrapper || !front || !detail) return;

      const c = segment(p, 0.10, 0.80);

      let wrapScale, wrapOpacity, frontWidth, detailLeft, briefOpacity;

      if (c < 0.10) {
        // Phase 1a ─ 进入: scale 0.5→1
        const t = c / 0.10;
        wrapScale = lerp(0.5, 1, t);
        wrapOpacity = t;
        frontWidth = 100;
        detailLeft = 100;
        briefOpacity = 1;
      } else if (c < 0.30) {
        // Phase 1b ─ 停留前面板, 不压缩, 继续下滑
        wrapScale = 1;
        wrapOpacity = 1;
        frontWidth = 100;
        detailLeft = 100;
        briefOpacity = 1;
      } else if (c < 0.46) {
        // Phase 2 ─ 压缩 + 详情滑入 同时进行
        const t = (c - 0.30) / 0.16;
        wrapScale = 1;
        wrapOpacity = 1;
        frontWidth = lerp(100, 30, t);
        detailLeft = lerp(100, 30, t);
        briefOpacity = lerp(1, 0, t);
      } else if (c < 0.66) {
        // Phase 3 ─ 停留
        wrapScale = 1;
        wrapOpacity = 1;
        frontWidth = 30;
        detailLeft = 30;
        briefOpacity = 0;
      } else if (c < 0.82) {
        // Phase 4 ─ 回到原来样式
        const t = (c - 0.66) / 0.16;
        wrapScale = 1;
        wrapOpacity = 1;
        frontWidth = lerp(30, 100, t);
        detailLeft = lerp(30, 100, t);
        briefOpacity = lerp(0, 1, t);
      } else {
        // Phase 5 ─ 由大变小
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
    });

    // ── Ending ──
    const endSection = document.querySelector('[data-slide="ending"]');
    if (endSection) {
      const p = getProgress(endSection);
      const inner = endSection.querySelector('.slide-inner');
      if (inner) {
        const f = segment(p, 0.1, 0.6);
        inner.style.opacity = f.toFixed(4);
        inner.style.transform = `scale(${lerp(0.8, 1, f).toFixed(4)})`;
      }
    }
  }

  function onScroll() {
    if (!raf) raf = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
  window.addEventListener('resize', update);
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
