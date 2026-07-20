import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  getMimeType,
  isBinaryAsset,
  isSafePath,
  isStaticAsset,
  proxyBinary,
  securityHeaders,
} from '../worker.js';
import worker from '../worker.js';

const workerSource = await readFile(new URL('../worker.js', import.meta.url), 'utf8');

test('retired website Office.js routes and API stubs are absent', () => {
  assert.doesNotMatch(workerSource, /path\.startsWith\("\/office\/"\)/);
  assert.doesNotMatch(workerSource, /\/api\/office\//);
  assert.doesNotMatch(workerSource, /appsforoffice\.microsoft\.com/);
});

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

test('marketing pages use a narrower CSP and do not enable cross-origin isolation', () => {
  const headers = securityHeaders(true, false, '/');
  assert.doesNotMatch(headers['Content-Security-Policy'], /wasm-unsafe-eval|worker-src/);
  assert.equal(headers['Cross-Origin-Opener-Policy'], undefined);
  assert.equal(headers['Cross-Origin-Embedder-Policy'], undefined);
});

test('ordinary pages are served from the assembled Static Assets binding', async () => {
  let requestedPath = '';
  const env = {
    ASSETS: {
      fetch(request) {
        requestedPath = new URL(request.url).pathname;
        return Promise.resolve(new Response('<!doctype html><title>Home</title>', {
          headers: { 'Content-Type': 'text/html' },
        }));
      },
    },
  };
  const ctx = { waitUntil() {} };
  const request = new Request('https://example.test/', {
    headers: { 'User-Agent': 'Mozilla/5.0 LaTeXSnipper test browser' },
  });
  const response = await worker.fetch(request, env, ctx);
  assert.equal(response.status, 200);
  assert.equal(requestedPath, '/index.html');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
});

test('WASM and module scripts use correct MIME types', () => {
  assert.equal(getMimeType('/core-wasm/core.wasm'), 'application/wasm');
  assert.equal(
    getMimeType('/vendor/runtime.mjs'),
    'application/javascript; charset=utf-8',
  );
});

test('WebP and AVIF are safe binary static assets with correct MIME types', () => {
  for (const [extension, mime] of [
    ['webp', 'image/webp'],
    ['avif', 'image/avif'],
  ]) {
    const path = `/assets/test.${extension}`;
    assert.equal(isSafePath(path.slice(1)), true);
    assert.equal(getMimeType(path), mime);
    assert.equal(isBinaryAsset(path), true);
    assert.equal(isStaticAsset(path), true);
  }
});

test('Worker returns brand and hashed WebP bytes without text decoding', async () => {
  const expected = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0xff, 0x80, 0x57]);
  let requestedPath = '';
  const env = {
    ASSETS: {
      fetch(request) {
        requestedPath = new URL(request.url).pathname;
        return Promise.resolve(new Response(expected, {
          headers: { 'Content-Type': 'application/octet-stream' },
        }));
      },
    },
  };
  for (const path of [
    '/assets/brand/snipper-girl.webp',
    '/assets/hero-workspace-DFGCPZpQ.webp',
  ]) {
    const request = new Request(`https://example.test${path}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 LaTeXSnipper test browser' },
    });
    const response = await worker.fetch(request, env, { waitUntil() {} });

    assert.equal(response.status, 200);
    assert.equal(requestedPath, path);
    assert.equal(response.headers.get('Content-Type'), 'image/webp');
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), expected);
  }
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
