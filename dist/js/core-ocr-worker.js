/**
 * Core OCR Worker V2
 *
 * Top-level: zero external imports.
 * fflate is loaded on-demand only when unpacking model packages.
 * This prevents Worker module-graph startup failures caused by
 * stale cache, MIME issues, or missing exports in fflate.
 */

let core;
let lock;
let formulaReady = false;

const CACHE_NAME = 'latexsnipper-core-model-packages-v2';
const CACHE_VERSION = 1;
const CACHE_STORE = 'packages';

/* ─── fflate lazy loader ─── */

let unzipSyncImpl = null;

async function getUnzipSync() {
  if (unzipSyncImpl) return unzipSyncImpl;

  let module;
  try {
    module = await import('/vendor/fflate/fflate.js');
  } catch (cause) {
    const error = new Error('无法加载模型解压运行时 fflate');
    error.code = 'FFLATE_IMPORT_FAILED';
    error.details = { cause: cause?.message || String(cause) };
    throw error;
  }

  if (typeof module.unzipSync !== 'function') {
    const error = new Error('fflate 模块缺少 unzipSync 导出');
    error.code = 'FFLATE_EXPORT_MISSING';
    error.details = { exports: Object.keys(module) };
    throw error;
  }

  unzipSyncImpl = module.unzipSync;
  return unzipSyncImpl;
}

/* ─── Message helpers ─── */

function post(id, type, value) {
  self.postMessage({ id, type, ...value });
}

function parseEnvelope(value) {
  const envelope = typeof value === 'string' ? JSON.parse(value) : value;
  if (!envelope?.ok) {
    const error = new Error(envelope?.error?.message || 'Core operation failed');
    error.code = envelope?.error?.code || 'CORE_OPERATION_FAILED';
    error.details = envelope?.error?.details;
    throw error;
  }
  return envelope;
}

/* ─── Crypto ─── */

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0')).join('');
}

/* ─── IndexedDB model cache ─── */

function openCache() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_NAME, CACHE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(CACHE_STORE)) {
        request.result.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readCachedPackage(key, expectedSha256) {
  if (!('indexedDB' in self)) return null;
  const db = await openCache();
  try {
    const record = await new Promise((resolve, reject) => {
      const request = db.transaction(CACHE_STORE).objectStore(CACHE_STORE).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    if (!record?.bytes) return null;
    const bytes = new Uint8Array(record.bytes);
    if (await sha256Hex(bytes) !== expectedSha256) return null;
    return bytes;
  } finally {
    db.close();
  }
}

async function cachePackage(key, bytes, sha256) {
  if (!('indexedDB' in self)) return;
  const db = await openCache();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite');
      tx.objectStore(CACHE_STORE).put({
        key,
        bytes: bytes.slice().buffer,
        sha256,
        storedAt: Date.now(),
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/* ─── Model download ─── */

async function downloadPackage(id, entry, packageIndex, packageCount) {
  const key = `${lock.releaseTag}/${entry.asset}`;
  const cached = await readCachedPackage(key, entry.sha256).catch(() => null);
  if (cached) {
    post(id, 'progress', {
      stage: 'cache',
      progress: packageIndex / packageCount,
      message: `${entry.asset} 已从本地缓存读取`,
    });
    return cached;
  }

  const url = `/models/core/${lock.releaseTag}/${entry.asset}`;
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok || !response.body) {
    throw new Error(`模型包下载失败：${entry.asset}（HTTP ${response.status}）`);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > entry.size) {
      await reader.cancel('model package exceeds locked size');
      throw new Error(`模型包大小超过锁定值：${entry.asset}`);
    }
    chunks.push(value);
    post(id, 'progress', {
      stage: 'download',
      progress: (packageIndex + received / entry.size) / packageCount,
      message: `下载 ${entry.asset} · ${(received / 1024 / 1024).toFixed(1)} / ${(entry.size / 1024 / 1024).toFixed(1)} MB`,
    });
  }
  if (received !== entry.size) {
    throw new Error(`模型包大小不匹配：${entry.asset}`);
  }
  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const actualSha256 = await sha256Hex(bytes);
  if (actualSha256 !== entry.sha256) {
    throw new Error(`模型包 SHA-256 校验失败：${entry.asset}`);
  }
  await cachePackage(key, bytes, actualSha256).catch(() => undefined);
  return bytes;
}

/* ─── Model unpack + load ─── */

async function loadPackageIntoCore(id, entry, bytes, packageIndex, packageCount) {
  post(id, 'progress', {
    stage: 'unpack',
    progress: (packageIndex + 0.92) / packageCount,
    message: `解包并装载 ${entry.asset}`,
  });

  const unzipSync = await getUnzipSync();
  const files = unzipSync(bytes);

  const prefix = `${entry.variant}/`;
  let loaded = 0;
  for (const [archivePath, artifactBytes] of Object.entries(files)) {
    const path = archivePath.replaceAll('\\', '/');
    if (!path.startsWith(prefix) || path.includes('..') || path.endsWith('/')) continue;
    const relativePath = path.slice(prefix.length);
    const name = `${entry.category}/${entry.variant}/${relativePath}`;
    parseEnvelope(core.load_model_v2(name, artifactBytes));
    loaded += 1;
  }
  if (loaded === 0) throw new Error(`模型包内没有可装载文件：${entry.asset}`);
}

/* ─── Formula profile preparation ─── */

async function prepareFormulaProfile(id) {
  if (formulaReady) return parseEnvelope(core.capabilities_v3()).data;

  const profile = lock.profiles.formula;
  parseEnvelope(core.set_model_memory_profile_v2('balanced'));
  parseEnvelope(core.begin_model_update_v2());
  try {
    for (let index = 0; index < profile.packages.length; index += 1) {
      const entry = profile.packages[index];
      const bytes = await downloadPackage(id, entry, index, profile.packages.length);
      await loadPackageIntoCore(id, entry, bytes, index, profile.packages.length);
    }
    parseEnvelope(core.commit_model_update_v2());
  } catch (error) {
    try { parseEnvelope(core.rollback_model_update_v2()); } catch { /* best effort */ }
    throw error;
  }

  const capabilities = parseEnvelope(core.capabilities_v3()).data;
  const formula = capabilities.recognition?.find(
    (item) => item.profile === profile.coreRecognitionMode,
  );
  if (!formula?.ready) {
    throw new Error(`Core 公式模型未就绪：${(formula?.missing || []).join(', ')}`);
  }
  formulaReady = true;
  return capabilities;
}

/* ─── Initialize with staged error reporting ─── */

async function initializeRuntime(message) {
  const stages = [];

  try {
    stages.push('lock');
    lock = await fetch('/core-models.lock.json', { cache: 'no-cache' }).then((response) => {
      if (!response.ok) throw new Error(`模型锁文件加载失败：HTTP ${response.status}`);
      return response.json();
    });

    stages.push('core-module');
    core = await import(message.moduleUrl || '/core-wasm/latexsnipper_wasm.js');

    stages.push('wasm');
    await core.default(message.wasmUrl || '/core-wasm/latexsnipper_wasm_bg.wasm');

    stages.push('core-init');
    core.init();

    stages.push('api');
    const api = parseEnvelope(core.api_info_v3()).data;

    return { api, stages };
  } catch (cause) {
    const error = new Error(
      `Core OCR 初始化失败于阶段 ${stages.at(-1) || 'bootstrap'}：${cause?.message || cause}`,
    );
    error.code = 'CORE_OCR_INIT_FAILED';
    error.details = {
      stage: stages.at(-1),
      stages,
      cause: cause?.stack || cause?.message || String(cause),
    };
    throw error;
  }
}

/* ─── Message handler ─── */

async function handle(message) {
  const { id, type } = message;

  if (type === 'initialize') {
    const result = await initializeRuntime(message);
    post(id, 'result', { data: result.api });
    return;
  }

  if (!core || !lock) throw new Error('Core OCR Worker 尚未初始化');

  if (type === 'prepare-profile') {
    const capabilities = await prepareFormulaProfile(id);
    post(id, 'result', { data: capabilities });
    return;
  }

  if (type === 'recognize') {
    await prepareFormulaProfile(id);
    const envelope = parseEnvelope(await core.recognize_v2_with_progress(
      message.width,
      message.height,
      message.pixels,
      lock.profiles.formula.coreRecognitionMode,
      (event) => post(id, 'progress', {
        stage: event.stage,
        progress: event.progress,
        message: event.stage === 'inference' ? 'Core WASM 正在识别' : event.stage,
      }),
    ));
    post(id, 'result', { data: envelope.data });
    return;
  }

  throw new Error(`未知 Worker 操作：${type}`);
}

/* ─── Bootstrap: register handlers immediately ─── */

self.onmessage = (event) => {
  const id = event.data?.id;
  Promise.resolve(handle(event.data)).catch((error) => {
    post(id, 'error', {
      error: {
        code: error.code || 'CORE_OCR_WORKER_ERROR',
        message: error.message || String(error),
        details: error.details,
      },
    });
  });
};

self.onerror = (event) => {
  console.error('[Core OCR Worker fatal]', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
  });
};
