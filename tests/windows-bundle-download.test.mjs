import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ecosystemMetadataSource = await readFile(
  new URL('../public/js/ecosystem-metadata.js', import.meta.url),
  'utf8',
);

const uploadHelperSource = await readFile(
  new URL('../scripts/prepare-windows-bundle.ps1', import.meta.url),
  'utf8',
);

test('download page can render the separately hosted Windows bundle', () => {
  assert.match(ecosystemMetadataSource, /WINDOWS_BUNDLE_METADATA_PATH = '\/dl\/windows-bundle\.json'/);
  assert.match(ecosystemMetadataSource, /WINDOWS_BUNDLE_ASSET_ID = 'windows-x86_64-bundle'/);
  assert.match(ecosystemMetadataSource, /renderWindowsBundle/);
  assert.match(ecosystemMetadataSource, /sourceCard\.insertAdjacentElement\('afterend', card\)/);
  assert.match(ecosystemMetadataSource, /\^\\\/dl\\\/[A-Za-z0-9\._-]\+\$/);
  assert.match(ecosystemMetadataSource, /\^\[a-fA-F0-9\]\{64\}\$/);
});

test('bundle helper generates and uploads package metadata independently', () => {
  assert.match(uploadHelperSource, /windows-bundle\.json/);
  assert.match(uploadHelperSource, /windows-x86_64-bundle/);
  assert.match(uploadHelperSource, /Get-FileHash[^\n]+SHA256/);
  assert.match(uploadHelperSource, /rclone/i);
  assert.match(uploadHelperSource, /copyto/);
  assert.match(uploadHelperSource, /\$Bucket\/windows-bundle\.json/);
});
