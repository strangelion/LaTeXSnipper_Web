import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getMimeType,
  proxyBinary,
  securityHeaders,
} from '../worker.js';

test('OCR pages alone receive camera permission', () => {
  assert.match(
    securityHeaders(true, false, '/ocr.html')['Permissions-Policy'],
    /camera=\(self\)/,
  );
  assert.match(
    securityHeaders(true, false, '/')['Permissions-Policy'],
    /camera=\(\)/,
  );
});

test('general CSP is self-hosted and permits WASM without CDN', () => {
  const csp = securityHeaders(true, false, '/ocr.html')[
    'Content-Security-Policy'
  ];
  assert.match(csp, /wasm-unsafe-eval/);
  assert.doesNotMatch(csp, /cdn\.jsdelivr\.net|connect-src 'self' https:/);
  assert.doesNotMatch(csp, /'unsafe-eval'/);
});

test('WASM and module scripts use correct MIME types', () => {
  assert.equal(getMimeType('/core-wasm/core.wasm'), 'application/wasm');
  assert.equal(
    getMimeType('/vendor/runtime.mjs'),
    'application/javascript; charset=utf-8',
  );
});

test('model proxy forwards Range and streams the upstream response', async () => {
  const originalFetch = globalThis.fetch;
  let receivedRange = null;
  globalThis.fetch = async (_url, init) => {
    receivedRange = init.headers.get('Range');
    return new Response(new Uint8Array([1, 2, 3, 4]), {
      status: 206,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': '4',
        'Content-Range': 'bytes 0-3/100',
        'Accept-Ranges': 'bytes',
        'ETag': '"model-v1"',
      },
    });
  };

  try {
    const request = new Request('https://example.test/models/model.onnx', {
      headers: { Range: 'bytes=0-3' },
    });
    const response = await proxyBinary(request, 'https://r2.test/model.onnx');
    assert.equal(receivedRange, 'bytes=0-3');
    assert.equal(response.status, 206);
    assert.equal(response.headers.get('Content-Range'), 'bytes 0-3/100');
    assert.equal(response.headers.get('Accept-Ranges'), 'bytes');
    assert.deepEqual(
      [...new Uint8Array(await response.arrayBuffer())],
      [1, 2, 3, 4],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
