import assert from 'node:assert/strict';
import test from 'node:test';

import ecosystemWorker from '../ecosystem-worker.js';

const REPO = 'SakuraMathcraft/LaTeXSnipper';

function installGitHubStub({ stars = 962, downloads = [266, 186], fail = false } = {}) {
  const requested = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    if (fail) return new Response('upstream down', { status: 502 });
    if (url.endsWith(`/repos/${REPO}`)) {
      return new Response(
        JSON.stringify({ stargazers_count: stars, html_url: `https://github.com/${REPO}` }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }
    if (url.includes(`/repos/${REPO}/releases`)) {
      return new Response(
        JSON.stringify([
          { tag_name: 'v3.0.0-LTS', assets: downloads.map((count, index) => ({ name: `asset-${index}`, download_count: count })) },
        ]),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response('not found', { status: 404 });
  };
  return requested;
}

function installEdgeCacheStub() {
  const store = new Map();
  globalThis.caches = {
    default: {
      async match(key) {
        return store.get(String(key.url)) || undefined;
      },
      async put(key, response) {
        store.set(String(key.url), response);
      },
    },
  };
  return store;
}

const context = { waitUntil() {} };

test('project stats endpoint reports stars and release downloads', async () => {
  installEdgeCacheStub();
  const requested = installGitHubStub({ stars: 962, downloads: [266, 186] });

  const response = await ecosystemWorker.fetch(
    new Request('https://latexsnipper.example/api/stats'),
    {},
    context,
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.available, true);
  assert.equal(payload.repository, REPO);
  assert.equal(payload.stars, 962);
  assert.equal(payload.releaseDownloads, 452);
  assert.match(response.headers.get('Cache-Control'), /s-maxage=3600/);
  assert.ok(requested.some((url) => url.endsWith(`/repos/${REPO}`)));
  assert.ok(requested.some((url) => url.includes('/releases?per_page=100')));

  globalThis.caches = undefined;
  delete globalThis.fetch;
});

test('project stats endpoint degrades to available:false without inventing numbers', async () => {
  installEdgeCacheStub();
  installGitHubStub({ fail: true });

  const response = await ecosystemWorker.fetch(
    new Request('https://latexsnipper.example/api/stats'),
    {},
    context,
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.available, false);
  assert.equal(payload.stars, undefined);
  assert.equal(payload.releaseDownloads, undefined);
  assert.match(response.headers.get('Cache-Control'), /s-maxage=60/);

  globalThis.caches = undefined;
  delete globalThis.fetch;
});

test('project stats endpoint serves HEAD and rejects other methods', async () => {
  installEdgeCacheStub();
  installGitHubStub();

  const head = await ecosystemWorker.fetch(
    new Request('https://latexsnipper.example/api/stats', { method: 'HEAD' }),
    {},
    context,
  );
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');

  const post = await ecosystemWorker.fetch(
    new Request('https://latexsnipper.example/api/stats', { method: 'POST' }),
    {},
    context,
  );
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('Allow'), 'GET, HEAD');

  globalThis.caches = undefined;
  delete globalThis.fetch;
});

test('project stats endpoint adds the site download counter on top of GitHub', async () => {
  installEdgeCacheStub();
  installGitHubStub({ stars: 962, downloads: [266, 186] });

  const response = await ecosystemWorker.fetch(
    new Request('https://latexsnipper.example/api/stats'),
    { USAGE_KV: { get: async () => ({ total: 1234 }) } },
    context,
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.releaseDownloads, 452);
  assert.equal(payload.siteDownloads, 1234);
  assert.equal(payload.totalDownloads, 1686);

  globalThis.caches = undefined;
  delete globalThis.fetch;
});

test('project stats endpoint still works when the site counter has no record yet', async () => {
  installEdgeCacheStub();
  installGitHubStub({ stars: 962, downloads: [266, 186] });

  const response = await ecosystemWorker.fetch(
    new Request('https://latexsnipper.example/api/stats'),
    { USAGE_KV: { get: async () => null } },
    context,
  );

  const payload = await response.json();
  assert.equal(payload.siteDownloads, null);
  assert.equal(payload.totalDownloads, 452, 'only the GitHub part is known so far');

  globalThis.caches = undefined;
  delete globalThis.fetch;
});

test('project stats endpoint reuses the edge cache instead of calling GitHub again', async () => {
  installEdgeCacheStub();
  const requested = installGitHubStub();

  const first = await ecosystemWorker.fetch(
    new Request('https://latexsnipper.example/api/stats'),
    {},
    context,
  );
  assert.equal((await first.json()).stars, 962);
  const callsAfterFirst = requested.length;

  const second = await ecosystemWorker.fetch(
    new Request('https://latexsnipper.example/api/stats'),
    {},
    context,
  );
  assert.equal((await second.json()).stars, 962);
  assert.equal(requested.length, callsAfterFirst);

  globalThis.caches = undefined;
  delete globalThis.fetch;
});
