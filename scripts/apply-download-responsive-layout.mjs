import { readFile, writeFile } from 'node:fs/promises';

const cssPath = new URL('../deploy/styles/download.css', import.meta.url);
const htmlPath = new URL('../deploy/download.html', import.meta.url);

const cssMarker = '/* device-aware Windows bundle presentation */';
const htmlMarker = 'data-download-device-presentation';

const responsiveCss = `

${cssMarker}
/*
 * Canonical grid geometry lives in styles/download.css. This small deploy
 * patch only guards the dynamically decorated bundle against narrow-layout
 * overflow after metadata arrives asynchronously.
 */
.platform-card.windows-bundle-card,
.platform-card.windows-bundle-card > .lg-content {
  min-width: 0;
}

@media (max-width: 760px) {
  .platform-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .platform-grid > .platform-card,
  .platform-grid > .platform-card.recommended,
  .platform-grid > .platform-card[data-platform="office"],
  .platform-grid > .platform-card[data-platform="wps"],
  .platform-grid > .platform-card.windows-bundle-card {
    grid-column: 1 !important;
    width: 100% !important;
    min-width: 0;
  }

  .windows-bundle-card .platform-name,
  .windows-bundle-card .platform-desc,
  .windows-bundle-card .platform-owner {
    text-align: center !important;
    overflow-wrap: anywhere;
  }

  .platform-card .download-btn,
  .platform-card .download-btn:not([hidden]),
  .sha256:not([hidden]) {
    max-width: 100%;
  }
}

@media (max-width: 420px) {
  .platform-card,
  .platform-card.recommended,
  .platform-card.windows-bundle-card {
    padding-inline: 16px !important;
  }

  .download-btn.lg-surface,
  .platform-card .download-btn,
  .platform-card .download-btn:not([hidden]),
  .sha256:not([hidden]) {
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100%;
  }
}
`;

const deviceDetectionScript = `
  <script type="module" ${htmlMarker}>
    import { detectCurrentDevice } from './js/device-detection.js';

    function normalizeNonWindowsBundleCard() {
      if (document.documentElement.dataset.detectedPlatform === 'windows') return true;

      const card = document.querySelector('[data-asset-id="windows-x86_64-bundle"]');
      if (!card) return false;

      card.removeAttribute('data-lg-interactive');
      card.classList.remove('lg-surface', 'lg-surface--panel', 'is-pointer-lit');
      card.style.removeProperty('--lg-pointer-x');
      card.style.removeProperty('--lg-pointer-y');
      card.style.removeProperty('--lg-pointer-dx');
      card.style.removeProperty('--lg-pointer-dy');

      const content = card.querySelector(':scope > .lg-content');
      if (content) {
        while (content.firstChild) card.insertBefore(content.firstChild, content);
        content.remove();
      }

      card.querySelectorAll(':scope > .lg-backdrop, :scope > .lg-optics')
        .forEach((element) => element.remove());
      return true;
    }

    try {
      const detectedDevice = await detectCurrentDevice();
      document.documentElement.dataset.detectedPlatform = detectedDevice.platform || 'unknown';

      if (!normalizeNonWindowsBundleCard()) {
        const bundleObserver = new MutationObserver(() => {
          if (!normalizeNonWindowsBundleCard()) return;
          bundleObserver.disconnect();
        });
        bundleObserver.observe(document.documentElement, { childList: true, subtree: true });
        window.setTimeout(() => bundleObserver.disconnect(), 10_000);
      }
    } catch (error) {
      document.documentElement.dataset.detectedPlatform = 'unknown';
      console.warn('Unable to apply device-aware download presentation:', error);
    }
  </script>
`;

const css = await readFile(cssPath, 'utf8');
const markerIndex = css.indexOf(cssMarker);
const canonicalCss = markerIndex === -1
  ? css.trimEnd()
  : css.slice(0, markerIndex).trimEnd();
await writeFile(cssPath, `${canonicalCss}${responsiveCss}\n`, 'utf8');

const html = await readFile(htmlPath, 'utf8');
if (!html.includes(htmlMarker)) {
  if (!html.includes('</body>')) {
    throw new Error('deploy/download.html does not contain a closing body tag');
  }
  await writeFile(
    htmlPath,
    html.replace('</body>', `${deviceDetectionScript}</body>`),
    'utf8',
  );
}
