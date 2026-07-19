import { readFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const file = process.argv[2] || 'public/release-manifest.json';
const manifest = JSON.parse(await readFile(file, 'utf8'));
const schema = JSON.parse(await readFile(
  new URL('../public/schemas/release-manifest-v1.schema.json', import.meta.url),
  'utf8',
));

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);
if (!validate(manifest)) {
  throw new Error(`release manifest schema validation failed: ${ajv.errorsText(validate.errors)}`);
}

const ids = new Set();
for (const asset of manifest.assets) {
  if (!asset.id || ids.has(asset.id)) {
    throw new Error(`release manifest asset id is missing or duplicated: ${asset.id}`);
  }
  ids.add(asset.id);
}

console.log(`[release-manifest] validated ${manifest.assets.length} assets from ${file}`);
