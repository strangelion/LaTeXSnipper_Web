import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ecosystemMetadataSource = await readFile(
  new URL('../public/js/ecosystem-metadata.js', import.meta.url),
  'utf8',
);

const deployedEcosystemMetadataSource = await readFile(
  new URL('../deploy/js/ecosystem-metadata.js', import.meta.url),
  'utf8',
);

const uploadHelperSource = await readFile(
  new URL('../scripts/prepare-windows-bundle.ps1', import.meta.url),
  'utf8',
);

const downloadPageSource = await readFile(
  new URL('../download.html', import.meta.url),
  'utf8',
);

const publishingGuideSource = await readFile(
  new URL('../docs/Windows_Bundle_Publishing.md', import.meta.url),
  'utf8',
);

test('download page can render the separately hosted Windows bundle', () => {
  assert.ok(ecosystemMetadataSource.includes(
    "WINDOWS_BUNDLE_METADATA_PATH = '/dl/windows-bundle.json'",
  ));
  assert.ok(ecosystemMetadataSource.includes(
    "WINDOWS_BUNDLE_ASSET_ID = 'windows-x86_64-bundle'",
  ));
  assert.ok(ecosystemMetadataSource.includes('renderWindowsBundle'));
  assert.ok(ecosystemMetadataSource.includes(
    "sourceCard.insertAdjacentElement('afterend', card)",
  ));
  assert.ok(ecosystemMetadataSource.includes(
    "!/^\\/dl\\/[A-Za-z0-9._-]+$/.test(bundle.href)",
  ));
  assert.ok(ecosystemMetadataSource.includes(
    "!/^[a-fA-F0-9]{64}$/.test(bundle.sha256)",
  ));
});

test('Windows bundle stays in the standard responsive grid and has a valid liquid control', () => {
  assert.ok(ecosystemMetadataSource.includes("card.classList.add('windows-bundle-card')"));
  assert.ok(ecosystemMetadataSource.includes('min-width: 0'));
  assert.ok(ecosystemMetadataSource.includes('.windows-bundle-card.lg-surface > .lg-content'));
  assert.ok(ecosystemMetadataSource.includes('repairLiquidControl'));
  assert.ok(ecosystemMetadataSource.includes('setControlText'));
  assert.ok(ecosystemMetadataSource.includes("liquid.decorateLiquidSurface(link, 'control', true)"));
});

test('a direct bundle link remains available while metadata is unavailable', () => {
  assert.ok(downloadPageSource.includes('LaTeXSnipper-2.6.0-Setup.exe'));
  assert.ok(ecosystemMetadataSource.includes('WINDOWS_BUNDLE_FALLBACK'));
  assert.ok(ecosystemMetadataSource.includes('renderWindowsBundleUnavailable'));
});

test('committed deploy assets include the Windows bundle runtime', () => {
  assert.equal(deployedEcosystemMetadataSource, ecosystemMetadataSource);
  assert.ok(deployedEcosystemMetadataSource.includes('syncWindowsBundle();'));
});

test('bundle helper generates and uploads package metadata independently', () => {
  assert.ok(uploadHelperSource.includes('windows-bundle.json'));
  assert.ok(uploadHelperSource.includes('windows-x86_64-bundle'));
  assert.match(uploadHelperSource, /Get-FileHash[^\n]+SHA256/);
  assert.match(uploadHelperSource, /rclone/i);
  assert.ok(uploadHelperSource.includes('copyto'));
  assert.ok(uploadHelperSource.includes('$Bucket/windows-bundle.json'));
  assert.ok(uploadHelperSource.includes('$PublicBaseUrl'));
  assert.ok(uploadHelperSource.includes('downloadText'));
  assert.ok(uploadHelperSource.includes('Assert-RemoteObjectSize'));
  assert.ok(uploadHelperSource.includes('lsjson'));
  assert.doesNotMatch(uploadHelperSource, /release-manifest\.json/);
  assert.match(uploadHelperSource, /MetadataOnly -and -not \$Upload/);
  assert.match(publishingGuideSource, /prepare-windows-bundle\.ps1/);
  assert.match(publishingGuideSource, /MetadataOnly/);
  assert.equal(
    uploadHelperSource.split('--s3-no-check-bucket').length - 1,
    2,
  );
});
