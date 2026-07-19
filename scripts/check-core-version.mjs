import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const coreDir = resolve(root, 'latexsnipper-core');
const lock = JSON.parse(
  readFileSync(resolve(root, 'core.lock.json'), 'utf8'),
);

if (!existsSync(resolve(coreDir, 'Cargo.toml'))) {
  throw new Error(
    'Core submodule is missing. Run: git submodule update --init --recursive',
  );
}

const actual = execFileSync(
  'git',
  ['-C', coreDir, 'rev-parse', 'HEAD'],
  { encoding: 'utf8' },
).trim();

if (actual !== lock.commit) {
  throw new Error(
    `Core submodule mismatch: expected ${lock.commit}, got ${actual}`,
  );
}

console.log(`[core] Submodule locked to ${lock.releaseTag} (${actual.slice(0, 12)})`);
