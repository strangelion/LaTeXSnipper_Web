import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';

const root = process.cwd();
const modelRoot = resolve(
  process.env.CORE_MODEL_DIR || resolve(root, '..', 'latexsnipper-core', 'release_models'),
);
const wasmRoot = resolve(root, 'public', 'core-wasm');
const core = await import(new URL(`file:///${resolve(wasmRoot, 'latexsnipper_wasm.js').replaceAll('\\', '/')}`));
await core.default({ module_or_path: await readFile(resolve(wasmRoot, 'latexsnipper_wasm_bg.wasm')) });

const packages = [
  ['latexsnipper-formula-rec.zip', 'formula-rec', 'trocr-deit'],
];

const unwrap = (value) => {
  const envelope = typeof value === 'string' ? JSON.parse(value) : value;
  if (!envelope?.ok) throw new Error(envelope?.error?.message || 'Core operation failed');
  return envelope.data;
};

unwrap(core.begin_model_update_v2());
let artifactCount = 0;
const outcomes = [];
try {
  for (const [archive, category, variant] of packages) {
    const files = unzipSync(await readFile(resolve(modelRoot, archive)));
    for (const [archivePath, bytes] of Object.entries(files)) {
      const path = archivePath.replaceAll('\\', '/');
      const prefix = `${variant}/`;
      if (!path.startsWith(prefix) || path.endsWith('/')) continue;
      outcomes.push(unwrap(core.load_model_v2(`${category}/${variant}/${path.slice(prefix.length)}`, bytes)));
      artifactCount += 1;
    }
  }
  outcomes.push({ commit: unwrap(core.commit_model_update_v2()) });
} catch (error) {
  try { unwrap(core.rollback_model_update_v2()); } catch { /* best effort */ }
  throw error;
}

const capabilities = unwrap(core.capabilities_v3());
const formula = capabilities.recognition.find((entry) => entry.profile === 'handwriting');
if (!formula?.ready) {
  const loaded = unwrap(core.loaded_models_v2());
  throw new Error(`Formula profile is not ready: ${formula?.missing?.join(', ')}; loaded=${JSON.stringify(loaded)}; outcomes=${JSON.stringify(outcomes)}`);
}
const memory = unwrap(core.model_memory_v2());
let inference;
if (process.env.CORE_MODEL_INFERENCE === '1') {
  const width = 384;
  const height = 384;
  const pixels = new Uint8Array(width * height * 4).fill(255);
  const started = performance.now();
  const envelope = await core.recognize_v2(width, height, pixels, 'handwriting');
  inference = {
    ok: envelope?.ok === true,
    code: envelope?.error?.code,
    elapsedMs: Math.round(performance.now() - started),
  };
  if (!inference.ok && inference.code === 'INFERENCE_FAILED') {
    throw new Error(`Core model inference failed: ${envelope.error.message}`);
  }
}
console.log(JSON.stringify({
  coreVersion: core.version(),
  artifactCount,
  formula,
  memory: memory.usage,
  inference,
}, null, 2));
