import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('release integrity uses current digests and never reuses a replaced asset hash', () => {
  const workflow = readFileSync(new URL('../.github/workflows/sync_release.yml', import.meta.url), 'utf8');
  const start = workflow.indexOf('              if old.get("href")');
  const end = workflow.indexOf('              if asset.get("size"):', start);
  assert.ok(start > 0 && end > start);
  const metadata = workflow.slice(start, end).split('\n').map(line => line.slice(14)).join('\n');
  const script = `
import importlib.util
spec = importlib.util.spec_from_file_location('resolver', 'scripts/resolve-upstream-release.py')
resolver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(resolver)
current = 'b' * 64
name = 'LaTeXSnipperOffice_3.2.0_amd64.exe'
asset = {'name': name, 'digest': 'sha256:' + current}
assert resolver.office_asset({name: asset}, '3.2.0')['sha256'] == current
for digest in (None, '', 'md5:' + current, 'sha256:invalid'):
    assert resolver.asset_sha256({'digest': digest}) == ''
assert resolver.asset_sha256({}) == ''
metadata = ${JSON.stringify(metadata)}
for changed, href, upstream, expected in (
    ({name}, '/dl/' + name, current, current),
    ({name}, '/dl/' + name, '', ''),
    (set(), '/dl/old.exe', '', ''),
    (set(), '/dl/' + name, '', 'a' * 64),
    (set(), '/dl/' + name, current, current),
):
    context = dict(name=name, changed=changed, old={'href': href, 'sha256': 'a' * 64}, asset={'sha256': upstream})
    exec(metadata, context)
    assert context['sha256'] == expected, context
`;
  const result = spawnSync('python', ['-B', '-c', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});
