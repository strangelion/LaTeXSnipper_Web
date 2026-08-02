(() => {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const isHomepage = pathname === '/' || pathname === '/index.html';
  const isDownloadPage = pathname === '/download' || pathname === '/download.html';
  if (!isHomepage && !isDownloadPage) return;

  const WINDOWS_BUNDLE_METADATA_PATH = '/dl/windows-bundle.json';
  const WINDOWS_BUNDLE_ASSET_ID = 'windows-x86_64-bundle';
  const WINDOWS_BUNDLE_STYLE_ID = 'windows-bundle-card-layout';

  let payload = null;
  let observer = null;
  let observerTimer = 0;

  function ensureWindowsBundleStyles() {
    if (!isDownloadPage || document.getElementById(WINDOWS_BUNDLE_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = WINDOWS_BUNDLE_STYLE_ID;
    style.textContent = `
      .platform-card.windows-bundle-card {
        grid-column: 1 / -1 !important;
        min-height: 0;
        padding: 24px 30px;
      }

      .platform-card.windows-bundle-card > .lg-content {
        width: 100%;
        display: grid;
        grid-template-columns: 64px minmax(0, 1fr) minmax(220px, auto);
        grid-template-areas:
          "icon name action"
          "icon description action"
          "icon owner hash";
        align-items: center;
        column-gap: 22px;
        row-gap: 6px;
      }

      .windows-bundle-card .platform-icon {
        grid-area: icon;
        width: 58px;
        height: 58px;
        margin: 0;
      }

      .windows-bundle-card .platform-name {
        grid-area: name;
        margin: 0;
        text-align: left;
        font-size: clamp(1.65rem, 2.7vw, 2.2rem);
      }

      .windows-bundle-card .platform-desc {
        grid-area: description;
      }

      .windows-bundle-card .platform-owner {
        grid-area: owner;
      }

      .windows-bundle-card .platform-desc,
      .windows-bundle-card .platform-owner {
        max-width: none;
        margin: 0;
        text-align: left;
      }

      .windows-bundle-card .download-btn,
      .windows-bundle-card .download-btn:not([hidden]) {
        grid-area: action;
        justify-self: end;
        align-self: center;
        min-width: 220px;
        min-height: 46px;
        margin: 0 !important;
      }

      .windows-bundle-card .download-btn > .lg-content {
        width: 100%;
        min-height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .windows-bundle-card .sha256:not([hidden]) {
        grid-area: hash;
        justify-self: end;
        width: min(100%, 220px);
        margin: 0;
      }

      @media (max-width: 760px) {
        .platform-card.windows-bundle-card {
          grid-column: 1 !important;
          padding: 28px 20px 24px;
        }

        .platform-card.windows-bundle-card > .lg-content {
          grid-template-columns: 1fr;
          grid-template-areas:
            "icon"
            "name"
            "description"
            "owner"
            "action"
            "hash";
          justify-items: center;
          row-gap: 11px;
        }

        .windows-bundle-card .platform-icon {
          margin: 0 auto 2px;
        }

        .windows-bundle-card .platform-name,
        .windows-bundle-card .platform-desc,
        .windows-bundle-card .platform-owner {
          text-align: center;
        }

        .windows-bundle-card .download-btn,
        .windows-bundle-card .download-btn:not([hidden]),
        .windows-bundle-card .sha256:not([hidden]) {
          justify-self: center;
        }
      }
    `;
    document.head.append(style);
  }

  function repositoryPath(value) {
    try {
      const url = new URL(value, window.location.origin);
      if (url.hostname !== 'github.com') return '';
      return url.pathname.replace(/\/+$/, '').toLowerCase();
    } catch {
      return '';
    }
  }

  function setStatusBadge(card, status) {
    if (!card || !status) return;
    const badge = card.querySelector('.status-badge');
    if (!badge) return;
    const bullet = badge.querySelector('[aria-hidden="true"]');
    badge.replaceChildren();
    if (bullet) badge.append(bullet);
    badge.append(document.createTextNode(status));
  }

  function updateHomepageCard(anchor, project) {
    const card = anchor.closest('.ecosystem-card');
    if (!card) return false;

    const values = card.querySelectorAll('dl dd');
    if (values.length >= 3) {
      const prefix = project.id === 'mobile' || project.id === 'office'
        ? '代码版本 '
        : '';
      values[0].textContent = prefix + (project.displayVersion || project.version || '');
      values[1].textContent = project.owner || values[1].textContent;
      values[2].textContent = project.license || values[2].textContent;
    }

    setStatusBadge(card, project.status);
    if (project.repositoryUrl) anchor.href = project.repositoryUrl;
    return true;
  }

  function updateDownloadCard(anchor, project) {
    if (!anchor.closest('.project-links')) return false;
    const metadata = anchor.querySelector('span');
    if (!metadata) return false;
    metadata.textContent = [
      project.displayVersion || project.version,
      project.owner,
      project.license,
    ].filter(Boolean).join(' · ');
    if (project.repositoryUrl) anchor.href = project.repositoryUrl;
    return true;
  }

  function applyMetadata() {
    if (!payload || !Array.isArray(payload.projects)) return false;

    let updated = 0;
    for (const project of payload.projects) {
      const expectedPath = `/${project.repository}`.toLowerCase();
      const anchors = Array.from(document.querySelectorAll('a[href]'))
        .filter((anchor) => repositoryPath(anchor.href) === expectedPath);

      for (const anchor of anchors) {
        if (isHomepage && updateHomepageCard(anchor, project)) updated += 1;
        if (isDownloadPage && updateDownloadCard(anchor, project)) updated += 1;
      }
    }

    return updated > 0;
  }

  function observeUntilRendered() {
    if (applyMetadata()) return;
    if (!document.body || observer) return;

    observer = new MutationObserver(() => {
      if (!applyMetadata()) return;
      observer.disconnect();
      observer = null;
      if (observerTimer) window.clearTimeout(observerTimer);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    observerTimer = window.setTimeout(() => {
      observer?.disconnect();
      observer = null;
    }, 10_000);
  }

  function isValidWindowsBundle(bundle) {
    if (!bundle || typeof bundle !== 'object') return false;
    if (bundle.enabled === false) return false;
    if (bundle.schemaVersion !== 1) return false;
    if (bundle.id && bundle.id !== WINDOWS_BUNDLE_ASSET_ID) return false;
    if (typeof bundle.href !== 'string') return false;
    if (!/^\/dl\/[A-Za-z0-9._-]+$/.test(bundle.href)) return false;
    if (typeof bundle.sha256 !== 'string' || !/^[a-fA-F0-9]{64}$/.test(bundle.sha256)) return false;
    return true;
  }

  function copyText(value) {
    if (navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(value);
    }

    return new Promise((resolve, reject) => {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.append(textarea);
      textarea.select();
      try {
        const copied = document.execCommand('copy');
        textarea.remove();
        copied ? resolve() : reject(new Error('copy command failed'));
      } catch (error) {
        textarea.remove();
        reject(error);
      }
    });
  }

  function bindShaCopy(element, hash) {
    element.dataset.sha256 = hash;
    element.hidden = false;
    element.textContent = `SHA256：${hash.slice(0, 12)}…（点击复制）`;
    element.title = hash;
    element.onclick = () => {
      copyText(hash).then(() => {
        element.classList.add('copied');
        element.title = `已复制: ${hash}`;
        window.setTimeout(() => {
          element.classList.remove('copied');
          element.title = hash;
        }, 2000);
      }).catch(() => {
        element.title = hash;
      });
    };
  }

  function repairLiquidControl(link) {
    const directContent = link.querySelector(':scope > .lg-content');
    if (!link.classList.contains('lg-surface') || directContent) return;

    link.classList.remove('lg-surface', 'lg-surface--control');
    link.removeAttribute('data-lg-interactive');
    link.querySelectorAll(':scope > .lg-backdrop, :scope > .lg-optics').forEach((node) => node.remove());
  }

  function decorateBundleCard(card, link) {
    const liquid = window.LaTeXSnipperLiquid;
    if (!liquid?.decorateLiquidSurface) return;

    try {
      repairLiquidControl(link);
      liquid.decorateLiquidSurface(card, 'panel', true);
      link.dataset.lgAccent = 'blue';
      link.dataset.lgAction = 'primary';
      liquid.decorateLiquidSurface(link, 'control', true);
    } catch (error) {
      console.warn('Unable to decorate Windows bundle card:', error);
    }
  }

  function setControlText(link, text) {
    const content = link.querySelector(':scope > .lg-content');
    if (content) content.textContent = text;
    else link.textContent = text;
  }

  function renderWindowsBundle(bundle) {
    ensureWindowsBundleStyles();

    const sourceCard = document.querySelector('[data-asset-id="windows-x86_64"]');
    if (!sourceCard) return false;

    let card = document.querySelector(`[data-asset-id="${WINDOWS_BUNDLE_ASSET_ID}"]`);
    if (!card) {
      card = sourceCard.cloneNode(true);
      sourceCard.insertAdjacentElement('afterend', card);
    }

    card.dataset.assetId = WINDOWS_BUNDLE_ASSET_ID;
    card.dataset.platform = 'windows';
    card.classList.remove('recommended');
    card.classList.add('windows-bundle-card');
    card.querySelectorAll('.recommended-badge').forEach((badge) => badge.remove());

    const name = card.querySelector('.platform-name');
    const description = card.querySelector('.platform-desc');
    const owner = card.querySelector('.platform-owner');
    const link = card.querySelector('.download-btn');
    const sha = card.querySelector('.sha256');

    if (!name || !description || !owner || !link || !sha) return false;

    name.textContent = bundle.label || 'Windows 一键整合包';
    description.textContent = [
      bundle.requirements || 'Windows 10 / 11，x86_64，已包含本地模型和必要运行环境',
      bundle.version ? `版本 ${bundle.version}` : '',
      bundle.size || '',
    ].filter(Boolean).join(' · ');
    owner.textContent = bundle.owner || 'SakuraMathcraft 提供 · 本站托管分发';

    link.href = bundle.href;
    link.hidden = false;
    link.classList.remove('disabled');
    link.removeAttribute('aria-disabled');

    decorateBundleCard(card, link);
    setControlText(link, bundle.downloadText || '下载 Windows 一键整合包');
    bindShaCopy(sha, bundle.sha256.toLowerCase());

    card.hidden = false;
    return true;
  }

  async function syncWindowsBundle() {
    if (!isDownloadPage) return;

    try {
      const cacheWindow = Math.floor(Date.now() / 300_000);
      const response = await fetch(`${WINDOWS_BUNDLE_METADATA_PATH}?v=${cacheWindow}`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;

      const bundle = await response.json();
      if (!isValidWindowsBundle(bundle)) {
        console.warn('Ignoring invalid Windows bundle metadata');
        return;
      }

      if (!renderWindowsBundle(bundle)) {
        const waitForCard = new MutationObserver(() => {
          if (!renderWindowsBundle(bundle)) return;
          waitForCard.disconnect();
        });
        waitForCard.observe(document.documentElement, { childList: true, subtree: true });
        window.setTimeout(() => waitForCard.disconnect(), 10_000);
      }
    } catch (error) {
      console.info('Windows bundle metadata is not available yet:', error);
    }
  }

  async function syncEcosystemMetadata() {
    try {
      const response = await fetch('/api/ecosystem', {
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error(`ecosystem metadata returned ${response.status}`);
      payload = await response.json();
      observeUntilRendered();
      window.dispatchEvent(new CustomEvent('latexsnipper:ecosystemmetadata', {
        detail: payload,
      }));
    } catch (error) {
      console.warn('Unable to load ecosystem metadata:', error);
    }
  }

  ensureWindowsBundleStyles();
  syncEcosystemMetadata();
  syncWindowsBundle();
})();
