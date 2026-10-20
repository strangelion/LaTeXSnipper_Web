import { readFile, writeFile } from 'node:fs/promises';

const cssPath = new URL('../deploy/styles/download.css', import.meta.url);
const htmlPath = new URL('../deploy/download.html', import.meta.url);

const cssMarker = '/* device-aware download presentation */';
const htmlMarker = 'data-download-device-presentation';

const responsiveCss = `

${cssMarker}
/*
 * Canonical layout lives in styles/download.css. This deploy patch only guards
 * narrow-width overflow of the download controls.
 */
@media (max-width: 760px) {
  .platform-card .download-btn,
  .platform-card .download-btn:not([hidden]),
  .sha256:not([hidden]) {
    max-width: 100%;
  }
}

@media (max-width: 420px) {
  .platform-card,
  .platform-card.recommended {
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
