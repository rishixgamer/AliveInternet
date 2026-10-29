import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), name + '/'));
    else if (entry.isFile()) result.push(name);
  }
  return result;
}
for (const browser of ['chrome', 'firefox', 'edge']) {
  const archive = path.join(root, '.output', `aliveinternet-${version}-${browser}.zip`);
  const names = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n');
  assert.deepEqual(names.filter(name => !name.endsWith('/')).sort(),
    (await files(path.join(root, '.output', `${browser}-mv3`))).sort(), `${browser}: missing or extra archive entries`);
  assert.ok(names.includes('manifest.json'));
  for (const name of names) {
    assert.ok(!name.startsWith('/') && !name.split('/').includes('..'), name);
    assert.ok(!/\.(?:ts|map)$/.test(name), name);
    if (name.endsWith('/')) continue;
    const packed = execFileSync('unzip', ['-p', archive, name]);
    const built = await readFile(path.join(root, '.output', `${browser}-mv3`, name));
    assert.equal(Buffer.compare(packed, built), 0, `${browser}: stale packaged ${name}`);
  }
  const bytes = await readFile(archive);
  console.log(`${path.basename(archive)}: ${bytes.length} bytes, SHA256 ${createHash('sha256').update(bytes).digest('hex')}`);
}
const sourceArchive = path.join(root, '.output', `aliveinternet-${version}-sources.zip`);
const sourceNames = execFileSync('unzip', ['-Z1', sourceArchive], { encoding: 'utf8' }).trim().split('\n');
assert.ok(sourceNames.includes('package-lock.json') && sourceNames.includes('wxt.config.ts'));
assert.ok(sourceNames.every(name => !/^(?:artifacts|packages\/core\/dist)\//.test(name) &&
  !/(?:^|\/)\.env/.test(name)), 'Source archive must exclude runtime artifacts and secret-file patterns');
console.log('browser archives verified against unpacked builds');
