(() => {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  const isHomepage = pathname === '/' || pathname === '/index.html';
  const isDownloadPage = pathname === '/download' || pathname === '/download.html';
  if (!isHomepage && !isDownloadPage) return;

  let payload = null;
  let observer = null;
  let observerTimer = 0;

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

  syncEcosystemMetadata();
})();
