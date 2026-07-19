import assert from 'node:assert/strict';
import test from 'node:test';

import {
  detectDevice,
  isArchitectureCompatible,
  normalizeArchitecture,
} from '../js/device-detection.js';

test('device detection keeps Android ahead of Linux tokens', () => {
  const result = detectDevice({
    legacyPlatform: 'Linux armv8l',
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9)',
  });
  assert.equal(result.platform, 'android');
});

test('device detection handles iPadOS desktop-style user agents', () => {
  const result = detectDevice({
    uaPlatform: 'macOS',
    legacyPlatform: 'MacIntel',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
    maxTouchPoints: 5,
  });
  assert.equal(result.platform, 'ios');
});

test('device detection distinguishes supported desktop platforms', () => {
  assert.equal(detectDevice({ uaPlatform: 'Windows' }).platform, 'windows');
  assert.equal(detectDevice({ legacyPlatform: 'MacIntel' }).platform, 'macos');
  assert.equal(detectDevice({ legacyPlatform: 'Linux x86_64' }).platform, 'linux');
  assert.equal(detectDevice({ userAgent: 'Mozilla/5.0 (X11; CrOS x86_64)' }).platform, 'chromeos');
});

test('architecture normalization understands release and UA vocabulary', () => {
  assert.equal(normalizeArchitecture('x86', '64'), 'x86_64');
  assert.equal(normalizeArchitecture('amd64'), 'x86_64');
  assert.equal(normalizeArchitecture('arm', '64'), 'arm64');
  assert.equal(normalizeArchitecture('Apple Silicon'), 'arm64');
});

test('architecture compatibility rejects a known mismatch but tolerates unknown data', () => {
  assert.equal(isArchitectureCompatible('Apple Silicon', 'arm64'), true);
  assert.equal(isArchitectureCompatible('x86_64', 'arm64'), false);
  assert.equal(isArchitectureCompatible('x86_64', ''), true);
});
