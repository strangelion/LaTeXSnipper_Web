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

test('bundle helper generates and uploads package metadata independently', () => {
  assert.ok(uploadHelperSource.includes('windows-bundle.json'));
  assert.ok(uploadHelperSource.includes('windows-x86_64-bundle'));
  assert.match(uploadHelperSource, /Get-FileHash[^\n]+SHA256/);
  assert.match(uploadHelperSource, /rclone/i);
  assert.ok(uploadHelperSource.includes('copyto'));
  assert.ok(uploadHelperSource.includes('$Bucket/windows-bundle.json'));
});
