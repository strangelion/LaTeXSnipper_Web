import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  CoreRuntimeError,
  availableCoreFormats,
  parseCoreEnvelope,
} from '../public/js/core-runtime.js';

test('parseCoreEnvelope accepts a v3 success envelope', () => {
  const payload = parseCoreEnvelope({ ok: true, data: { value: 1 } });
  assert.deepEqual(payload.data, { value: 1 });
});

test('parseCoreEnvelope maps structured Core errors', () => {
  assert.throws(
    () => parseCoreEnvelope({
      ok: false,
      error: { code: 'INVALID_ARGUMENT', message: 'bad input' },
    }),
    (error) =>
      error instanceof CoreRuntimeError &&
      error.code === 'INVALID_ARGUMENT' &&
      error.message === 'bad input',
  );
});

test('availableCoreFormats only exposes available text formats', () => {
  const formats = availableCoreFormats({
    capabilities: {
      exports: [
        { format: 'typst', available: true, binary: false },
        { format: 'pdf', available: false, binary: true },
      ],
    },
  });
  assert.deepEqual(formats, ['typst']);
});

test('locked Release WASM initializes and converts through v3', async () => {
  const lock = JSON.parse(
    await readFile(new URL('../core.lock.json', import.meta.url), 'utf8'),
  );
  const packageRoot = new URL('../public/core-wasm/', import.meta.url);
  const module = await import(
    new URL('latexsnipper_wasm.js', packageRoot).href
  );
  const wasmBytes = await readFile(
    new URL('latexsnipper_wasm_bg.wasm', packageRoot),
  );
  await module.default({ module_or_path: wasmBytes });

  assert.equal(module.health_check(), 'ok');
  assert.equal(module.version(), lock.coreVersion);
  assert.equal(parseCoreEnvelope(module.api_info_v3()).data.wasmApiVersion, 3);

  const latex = `${String.fromCharCode(92)}frac{a+b}{c}`;
  const documentValue = module.parse_latex(`$${latex}$`);
  const artifact = parseCoreEnvelope(
    module.convert_v3(JSON.stringify(documentValue), 'typst'),
  ).data;
  assert.equal(artifact.text, 'frac(a + b, c)');
});
