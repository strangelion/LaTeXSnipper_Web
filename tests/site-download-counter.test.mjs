import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dlTrackOp,
  readSiteDownloadTotal,
  resetDownloadCounter,
} from '../worker.js';

function installKvStub(initial = null) {
  const writes = [];
  let value = initial;
  const kv = {
    async get() {
      return value;
    },
    async put(key, payload) {
      const parsed = JSON.parse(payload);
      writes.push({ key, parsed });
      value = parsed;
    },
  };
  return { writes, kv, read: () => value };
}

function installContextStub() {
  const tasks = [];
  return {
    tasks,
    ctx: {
      waitUntil(promise) {
        tasks.push(promise);
      },
    },
  };
}

const BASE_TIME = 1_700_000_000_000;

test('site download counter writes once for a lone download, then batches', async () => {
  resetDownloadCounter();
  const { writes, kv } = installKvStub({ total: 400 });
  const { ctx, tasks } = installContextStub();
  const env = { USAGE_KV: kv };

  // First download in a fresh isolate: written immediately, because a low-traffic site may
  // never see a second download before this isolate is recycled.
  dlTrackOp(env, ctx, BASE_TIME);
  await Promise.all(tasks);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].key, 'downloads:total');
  assert.equal(writes[0].parsed.total, 401);

  for (let index = 1; index <= 24; index += 1) {
    dlTrackOp(env, ctx, BASE_TIME + index * 1000);
  }
  await Promise.all(tasks);
  assert.equal(writes.length, 1, 'nothing is written before the batch step is reached');

  dlTrackOp(env, ctx, BASE_TIME + 25 * 1000);
  await Promise.all(tasks);
  assert.equal(writes.length, 2, 'the 25th pending download flushes one write');
  assert.equal(writes[1].parsed.total, 426, 'the total is merged, not overwritten');
});

test('an idle isolate flushes its pending downloads after the interval', async () => {
  resetDownloadCounter();
  const { writes, kv } = installKvStub({ total: 10 });
  const { ctx, tasks } = installContextStub();
  const env = { USAGE_KV: kv };

  // The first download in a fresh isolate is written immediately: low traffic means the
  // next download may only arrive in a different isolate, which would lose this one.
  dlTrackOp(env, ctx, BASE_TIME);
  await Promise.all(tasks);
  assert.equal(writes.length, 1, 'a lone download is not left pending');
  assert.equal(writes[0].parsed.total, 11);

  dlTrackOp(env, ctx, BASE_TIME + 60 * 1000);
  await Promise.all(tasks);
  assert.equal(writes.length, 1, 'one minute later is still inside the interval');

  dlTrackOp(env, ctx, BASE_TIME + 16 * 60 * 1000);
  await Promise.all(tasks);
  assert.equal(writes.length, 2, 'past the interval the pending download is flushed');
  assert.equal(writes[1].parsed.total, 13, 'two more downloads were pending');
});

test('the counter only ever grows, so the displayed number cannot go backwards', async () => {
  resetDownloadCounter();
  const { writes, kv, read } = installKvStub({ total: 100 });
  const { ctx, tasks } = installContextStub();
  const env = { USAGE_KV: kv };

  const totals = [];
  for (let episode = 0; episode < 3; episode += 1) {
    for (let index = 0; index < 25; index += 1) {
      dlTrackOp(env, ctx, BASE_TIME + episode * 60 * 60 * 1000 + index * 1000);
    }
    await Promise.all(tasks);
    totals.push(read().total);
  }

  assert.deepEqual(
    totals,
    [101, 126, 151],
    'the fresh-isolate write adds 1, then each completed batch of 25 adds 25',
  );
  assert.ok(
    totals.every((total, index) => index === 0 || total > totals[index - 1]),
    'the stored total never decreases',
  );
  assert.equal(writes.length, 3, 'one write per flush episode');
});

test('the counter stays free of KV work when no namespace is bound', async () => {
  resetDownloadCounter();
  const { ctx, tasks } = installContextStub();

  for (let index = 0; index < 40; index += 1) {
    dlTrackOp({}, ctx, BASE_TIME + index);
  }
  await Promise.all(tasks);
  assert.equal(tasks.length, 0);
  assert.equal(await readSiteDownloadTotal({}), null);
});

test('reading the site total tolerates missing and broken records', async () => {
  assert.equal(await readSiteDownloadTotal({}), null);
  assert.equal(
    await readSiteDownloadTotal({ USAGE_KV: { get: async () => null } }),
    null,
  );
  assert.equal(
    await readSiteDownloadTotal({ USAGE_KV: { get: async () => ({ total: 'not a number' }) } }),
    null,
  );
  assert.equal(
    await readSiteDownloadTotal({ USAGE_KV: { get: async () => ({ total: -3 }) } }),
    null,
  );
  assert.equal(
    await readSiteDownloadTotal({ USAGE_KV: { get: async () => ({ total: 1234.6 }) } }),
    1235,
  );
  assert.equal(
    await readSiteDownloadTotal({
      USAGE_KV: {
        get: async () => {
          throw new Error('kv unavailable');
        },
      },
    }),
    null,
  );
});
