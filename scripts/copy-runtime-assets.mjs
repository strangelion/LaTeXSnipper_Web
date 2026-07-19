import {
  copyFileSync,
  existsSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';

const root = process.cwd();
const outputRoot = resolve(root, 'public', 'vendor');
const assets = [
  ['node_modules/onnxruntime-web/dist/ort.all.min.js', 'onnxruntime/ort.all.min.js'],
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs', 'onnxruntime/ort-wasm-simd-threaded.mjs'],
  ['node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm', 'onnxruntime/ort-wasm-simd-threaded.wasm'],
  ['public/licenses/onnxruntime-web-MIT.txt', 'onnxruntime/LICENSE'],
  ['node_modules/pdfjs-dist/build/pdf.min.mjs', 'pdfjs/pdf.min.mjs'],
  ['node_modules/pdfjs-dist/build/pdf.worker.min.mjs', 'pdfjs/pdf.worker.min.mjs'],
  ['node_modules/pdfjs-dist/LICENSE', 'pdfjs/LICENSE'],
  ['node_modules/mathjax/es5/tex-svg.js', 'mathjax/tex-svg.js'],
  ['node_modules/mathjax/LICENSE', 'mathjax/LICENSE'],
  ['node_modules/fflate/esm/browser.js', 'fflate/fflate.js'],
  ['node_modules/fflate/LICENSE', 'fflate/LICENSE'],
];

rmSync(outputRoot, { recursive: true, force: true });
for (const [sourceName, destinationName] of assets) {
  const source = resolve(root, sourceName);
  const destination = resolve(outputRoot, destinationName);
  if (!existsSync(source)) {
    throw new Error(`Runtime dependency asset is missing: ${sourceName}`);
  }
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(source, destination);
}

console.log(`[assets] Copied ${assets.length} self-hosted runtime files`);
