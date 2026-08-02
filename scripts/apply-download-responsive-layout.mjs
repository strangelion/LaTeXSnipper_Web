import { readFile, writeFile } from 'node:fs/promises';

const cssPath = new URL('../deploy/styles/download.css', import.meta.url);
const htmlPath = new URL('../deploy/download.html', import.meta.url);

const cssMarker = '/* device-aware Windows bundle presentation */';
const htmlMarker = 'data-download-device-presentation';

const responsiveCss = `

${cssMarker}
/*
 * The bundle is an ordinary platform card everywhere by default.
 * It keeps the featured full-width treatment only after reliable Windows
 * detection sets data-detected-platform="windows" on the root element.
 */
:root:not([data-detected-platform="windows"]) .platform-grid > .platform-card.windows-bundle-card {
  grid-column: span 2 !important;
  width: auto !important;
  min-width: 0;
  min-height: 268px;
  padding: 26px 22px 22px !important;
}

:root:not([data-detected-platform="windows"]) .platform-grid > .platform-card.windows-bundle-card > .lg-content {
  width: 100% !important;
  min-width: 0;
  min-height: 100%;
  display: flex !important;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 11px;
}

:root:not([data-detected-platform="windows"]) .windows-bundle-card .platform-icon {
  width: 48px !important;
  height: 48px !important;
  margin: 2px auto 4px !important;
}

:root:not([data-detected-platform="windows"]) .windows-bundle-card .platform-name,
:root:not([data-detected-platform="windows"]) .windows-bundle-card .platform-desc,
:root:not([data-detected-platform="windows"]) .windows-bundle-card .platform-owner {
  max-width: 560px;
  margin-inline: auto !important;
  text-align: center !important;
  overflow-wrap: anywhere;
}

:root:not([data-detected-platform="windows"]) .windows-bundle-card .platform-name {
  font-size: clamp(1.5rem, 3vw, 2.1rem) !important;
}

:root:not([data-detected-platform="windows"]) .windows-bundle-card .download-btn,
:root:not([data-detected-platform="windows"]) .windows-bundle-card .download-btn:not([hidden]) {
  justify-self: auto !important;
  align-self: center !important;
  width: auto !important;
  min-width: 170px !important;
  max-width: 100%;
  margin-top: auto !important;
}

:root:not([data-detected-platform="windows"]) .windows-bundle-card .sha256:not([hidden]) {
  justify-self: auto !important;
  width: auto !important;
  min-width: 0;
  max-width: 100%;
  margin: 5px auto 0 !important;
}

@media (max-width: 1040px) {
  :root:not([data-detected-platform="windows"]) .platform-grid > .platform-card.windows-bundle-card {
    grid-column: auto !important;
  }

  :root[data-detected-platform="windows"] .platform-grid > .platform-card.windows-bundle-card > .lg-content {
    min-width: 0;
    grid-template-columns: 58px minmax(0, 1fr) !important;
    grid-template-areas:
      "icon name"
      "icon description"
      "icon owner"
      "action action"
      "hash hash" !important;
    column-gap: 18px !important;
    row-gap: 8px !important;
  }

  :root[data-detected-platform="windows"] .windows-bundle-card .download-btn,
  :root[data-detected-platform="windows"] .windows-bundle-card .download-btn:not([hidden]),
  :root[data-detected-platform="windows"] .windows-bundle-card .sha256:not([hidden]) {
    justify-self: center !important;
    width: min(100%, 360px) !important;
    min-width: 0 !important;
    max-width: 100%;
  }
}

@media (max-width: 900px) {
  .platform-grid {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .platform-grid > .platform-card,
  .platform-grid > .platform-card.recommended,
  .platform-grid > .platform-card[data-platform="office"],
  .platform-grid > .platform-card[data-platform="wps"] {
    grid-column: 1 !important;
    width: 100% !important;
    min-width: 0;
  }

  :root[data-detected-platform="windows"] .platform-grid > .platform-card.windows-bundle-card {
    padding: 28px 20px 24px !important;
  }

  :root[data-detected-platform="windows"] .platform-grid > .platform-card.windows-bundle-card > .lg-content {
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-areas:
      "icon"
      "name"
      "description"
      "owner"
      "action"
      "hash" !important;
    justify-items: center;
    row-gap: 11px !important;
  }

  :root[data-detected-platform="windows"] .windows-bundle-card .platform-icon {
    margin: 0 auto 2px !important;
  }

  :root[data-detected-platform="windows"] .windows-bundle-card .platform-name,
  :root[data-detected-platform="windows"] .windows-bundle-card .platform-desc,
  :root[data-detected-platform="windows"] .windows-bundle-card .platform-owner {
    min-width: 0;
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
    try {
      const detectedDevice = await detectCurrentDevice();
      document.documentElement.dataset.detectedPlatform = detectedDevice.platform || 'unknown';
    } catch (error) {
      document.documentElement.dataset.detectedPlatform = 'unknown';
      console.warn('Unable to apply device-aware download presentation:', error);
    }
  </script>
`;

const css = await readFile(cssPath, 'utf8');
if (!css.includes(cssMarker)) {
  await writeFile(cssPath, `${css.trimEnd()}${responsiveCss}\n`, 'utf8');
}

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
