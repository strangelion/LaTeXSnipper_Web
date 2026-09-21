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

test('site download counter batches KV writes instead of writing per download', async () => {
  resetDownloadCounter();
  const { writes, kv } = installKvStub({ total: 400 });
  const { ctx, tasks } = installContextStub();
  const env = { USAGE_KV: kv };

  for (let index = 0; index < 24; index += 1) {
    dlTrackOp(env, ctx, BASE_TIME + index);
  }
  await Promise.all(tasks);
  assert.equal(writes.length, 0, 'nothing is written before the batch step is reached');

  dlTrackOp(env, ctx, BASE_TIME + 24);
  await Promise.all(tasks);
  assert.equal(writes.length, 1, 'the 25th download flushes one write');
  assert.equal(writes[0].key, 'downloads:total');
  assert.equal(writes[0].parsed.total, 425, 'the total is merged, not overwritten');
});

test('an idle isolate flushes its pending downloads after the interval', async () => {
  resetDownloadCounter();
  const { writes, kv } = installKvStub({ total: 10 });
  const { ctx, tasks } = installContextStub();
  const env = { USAGE_KV: kv };

  dlTrackOp(env, ctx, BASE_TIME);
  await Promise.all(tasks);
  assert.equal(writes.length, 0, 'the first tracked download only sets the baseline');

  dlTrackOp(env, ctx, BASE_TIME + 60 * 1000);
  await Promise.all(tasks);
  assert.equal(writes.length, 0, 'one minute later is still inside the interval');

  dlTrackOp(env, ctx, BASE_TIME + 16 * 60 * 1000);
  await Promise.all(tasks);
  assert.equal(writes.length, 1, 'past the interval the pending download is flushed');
  assert.equal(writes[0].parsed.total, 13, 'three tracked downloads in total');
});

test('the counter only ever grows, so the displayed number cannot go backwards', async () => {
  resetDownloadCounter();
  const { writes, kv } = installKvStub({ total: 100 });
  const { ctx, tasks } = installContextStub();
  const env = { USAGE_KV: kv };

  for (let index = 0; index < 25; index += 1) {
    dlTrackOp(env, ctx, BASE_TIME + index);
  }
  await Promise.all(tasks);
  assert.equal(writes[0].parsed.total, 125);

  const second = installKvStub({ total: 125 });
  for (let index = 0; index < 25; index += 1) {
    dlTrackOp({ USAGE_KV: second.kv }, ctx, BASE_TIME + 1000 + index);
  }
  await Promise.all(tasks);
  assert.equal(second.writes[0].parsed.total, 150, 'later batches keep adding to the stored total');
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
