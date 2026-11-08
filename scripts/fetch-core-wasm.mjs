import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, resolve } from 'node:path';

const root = process.cwd();
const lock = JSON.parse(
  readFileSync(resolve(root, 'core.lock.json'), 'utf8'),
);
const cacheDir = resolve(root, '.cache', 'core-wasm');
const outputDir = resolve(root, 'public', 'core-wasm');
const archivePath = process.env.CORE_WASM_ARCHIVE
  ? resolve(process.env.CORE_WASM_ARCHIVE)
  : resolve(cacheDir, lock.asset.name);

function sha256(path) {
  return createHash('sha256')
    .update(readFileSync(path))
    .digest('hex');
}

async function ensureArchive() {
  if (existsSync(archivePath) && sha256(archivePath) === lock.asset.sha256) {
    return;
  }

  if (process.env.CORE_WASM_ARCHIVE) {
    throw new Error(
      `CORE_WASM_ARCHIVE does not match the locked SHA-256: ${archivePath}`,
    );
  }

  mkdirSync(cacheDir, { recursive: true });

  // GitHub's release CDN intermittently answers large assets with 502/504, and
  // a single attempt turns that into a red build. Retry the whole transfer with
  // backoff; a truncated file fails the checksum and is retried as well.
  const attempts = Number(process.env.CORE_WASM_ATTEMPTS || 5);
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const partial = `${archivePath}.part`;
    rmSync(partial, { force: true });

    console.log(`[core] Downloading ${lock.asset.url}`);
    try {
      const response = await fetch(lock.asset.url, { redirect: 'follow' });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      writeFileSync(partial, new Uint8Array(await response.arrayBuffer()));
      const actual = sha256(partial);
      if (actual !== lock.asset.sha256) {
        throw new Error(
          `checksum mismatch: expected ${lock.asset.sha256}, got ${actual}`,
        );
      }
      renameSync(partial, archivePath);
      return;
    } catch (error) {
      rmSync(partial, { force: true });
      lastError = error;
      if (attempt === attempts) {
        break;
      }
      const delayMs = 10000 * attempt;
      console.warn(
        `[core] Attempt ${attempt}/${attempts} failed (${error.message}); ` +
          `retrying in ${delayMs / 1000}s`,
      );
      await new Promise((done) => setTimeout(done, delayMs));
    }
  }

  throw new Error(`Core WASM download failed: ${lastError.message}`);
}

await ensureArchive();

const actualSha = sha256(archivePath);
if (actualSha !== lock.asset.sha256) {
  throw new Error(
    `Core WASM checksum mismatch: expected ${lock.asset.sha256}, got ${actualSha}`,
  );
}

const extractDir = resolve(cacheDir, `extract-${lock.coreVersion}`);
rmSync(extractDir, { recursive: true, force: true });
mkdirSync(extractDir, { recursive: true });

try {
  execFileSync(
    'tar',
    ['-xzf', archivePath, '-C', extractDir],
    { stdio: 'inherit' },
  );
} catch (error) {
  throw new Error(
    'Unable to extract Core WASM. A tar-compatible executable is required.',
    { cause: error },
  );
}

const packageDir = resolve(extractDir, 'package');
const requiredFiles = [
  'latexsnipper_wasm.js',
  'latexsnipper_wasm_bg.wasm',
  'latexsnipper_wasm.d.ts',
  'LICENSE',
];

for (const file of requiredFiles) {
  if (!existsSync(resolve(packageDir, file))) {
    throw new Error(`Core Release archive is missing ${file}`);
  }
}

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
for (const file of requiredFiles) {
  copyFileSync(resolve(packageDir, file), resolve(outputDir, file));
}

const buildInfo = {
  coreVersion: lock.coreVersion,
  gitCommit: lock.commit,
  releaseTag: lock.releaseTag,
  releaseUrl: lock.releaseUrl,
  wasmApiVersion: lock.wasmApiVersion,
  capabilitySchemaVersion: lock.capabilitySchemaVersion,
  documentSchemaVersion: lock.documentSchemaVersion,
  asset: basename(archivePath),
  assetSha256: lock.asset.sha256,
  license: 'AGPL-3.0-only',
};

writeFileSync(
  join(outputDir, 'core-build.json'),
  `${JSON.stringify(buildInfo, null, 2)}\n`,
  'utf8',
);
writeFileSync(
  join(outputDir, 'core.lock.json'),
  `${JSON.stringify(lock, null, 2)}\n`,
  'utf8',
);

console.log(`[core] Prepared ${lock.releaseTag} Release WASM in ${outputDir}`);
