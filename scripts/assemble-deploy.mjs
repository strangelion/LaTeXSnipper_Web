/**
 * Assemble deploy directory for Cloudflare Workers static assets.
 *
 * 1. Vite build (React SPA → dist/)
 * 2. Copy dist/ → deploy/
 * 3. Copy public/ (OCR and runtime assets) → deploy/
 * 4. Verify all required paths
 *
 * Run after `npm run build`.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const DEPLOY_DIR = path.resolve(root, 'deploy');
const DIST_DIR = path.resolve(root, 'dist');
const PUBLIC_DIR = path.resolve(root, 'public');

// Required paths that must exist in final deploy
const REQUIRED_PATHS = [
  'index.html',
  'assets/',
  'ocr.html',
  'js/ocr.js',
  'js/core-runtime.js',
  'js/core-ocr-runtime.js',
  'js/core-ocr-worker.js',
  'core-wasm/latexsnipper_wasm.js',
  'core-wasm/latexsnipper_wasm_bg.wasm',
  'core-wasm/core-build.json',
  'vendor/onnxruntime/ort.all.min.js',
  'vendor/onnxruntime/ort-wasm-simd-threaded.mjs',
  'vendor/onnxruntime/ort-wasm-simd-threaded.wasm',
  'vendor/pdfjs/pdf.min.mjs',
  'vendor/pdfjs/pdf.worker.min.mjs',
  'vendor/mathjax/tex-svg.js',
  'vendor/fflate/fflate.js',
  'core-models.lock.json',
  'release-manifest.json',
  'schemas/release-manifest-v1.schema.json',
  'assets/images/icon-96.png',
  'open-source.html',
  'styles/product-shell.css',
  'js/product-shell.js',
  'js/device-detection.js',
];

// 1. Ensure Vite build exists
if (!fs.existsSync(path.resolve(DIST_DIR, 'index.html'))) {
  console.log('[assemble] Running Vite build...');
  execSync('npx vite build', { cwd: root, stdio: 'inherit' });
}

// 2. Clean deploy dir
if (fs.existsSync(DEPLOY_DIR)) {
  fs.rmSync(DEPLOY_DIR, { recursive: true, force: true });
}
fs.mkdirSync(DEPLOY_DIR, { recursive: true });

// 3. Copy dist/ (React SPA)
copyDirSync(DIST_DIR, DEPLOY_DIR);
console.log(`[assemble] Copied dist/ → deploy/`);

// 4. Copy public/ (static files and OCR runtime)
copyDirSync(PUBLIC_DIR, DEPLOY_DIR);
console.log(`[assemble] Copied public/ → deploy/`);

// 5. Remove stale files from deploy
const staleDirs = ['models']; // models served via worker proxy, not bundled
for (const dir of staleDirs) {
  const p = path.resolve(DEPLOY_DIR, dir);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    console.log(`[assemble] Removed stale: ${dir}`);
  }
}

// 6. Verify
console.log('\n[assemble] === Verification ===');
let allOk = true;
for (const req of REQUIRED_PATHS) {
  const fullPath = path.resolve(DEPLOY_DIR, req);
  const exists = req.endsWith('/')
    ? fs.existsSync(fullPath)
    : req.endsWith('-')
      ? fs.existsSync(fullPath.replace(/-$/, '')) ||
        fs.readdirSync(path.dirname(fullPath)).some(f => f.startsWith(path.basename(fullPath.replace(/-$/, ''))))
      : fs.existsSync(fullPath);
  console.log(`  ${exists ? '✓' : '✗'} ${req}`);
  if (!exists) allOk = false;
}
console.log(`\n[assemble] ${allOk ? 'All required files present' : 'SOME FILES MISSING'}`);
console.log(`[assemble] Deploy directory: ${DEPLOY_DIR}`);

function copyDirSync(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
