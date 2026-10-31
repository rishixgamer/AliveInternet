// Verifies the exact release build: one version everywhere, ZIPs byte-identical to
// the unpacked builds, YouTube-only host access, and SHA256SUMS for the artifacts.
// Replaces the pre-Oct-15 evidence checks, which pinned historical bytes.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BROWSERS = ['chrome', 'firefox', 'edge'];
const YOUTUBE_HOST = /^https:\/\/(?:www\.|m\.)?youtube\.com\/\*$/;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), prefix + entry.name + '/'));
    else if (entry.isFile()) result.push(prefix + entry.name);
  }
  return result.sort();
}
const unzipNames = archive => execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n');
const unzipFile = (archive, name) => execFileSync('unzip', ['-p', archive, name], { maxBuffer: 1 << 28 });

export async function verifyReleaseBuild({ root }) {
  const out = path.join(root, '.output');
  const version = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')).version;
  const core = JSON.parse(await readFile(path.join(root, 'packages/core/package.json'), 'utf8')).version;
  const wxt = /\bversion:\s*'([^']+)'/.exec(await readFile(path.join(root, 'wxt.config.ts'), 'utf8'))?.[1];
  assert.equal(core, version, `version drift: packages/core is ${core}, package.json is ${version}`);
  assert.equal(wxt, version, `version drift: wxt.config.ts is ${wxt}, package.json is ${version}`);

  const archives = [];
  for (const browser of BROWSERS) {
    const folder = path.join(out, `${browser}-mv3`);
    const manifest = JSON.parse(await readFile(path.join(folder, 'manifest.json'), 'utf8'));
    assert.equal(manifest.version, version, `version drift: ${browser} manifest is ${manifest.version}, package.json is ${version}`);
    assert.equal(manifest.manifest_version, 3, `${browser}: manifest_version`);
    assert.deepEqual([...manifest.permissions].sort(), ['scripting', 'storage'], `${browser}: unexpected permissions`);
    assert.ok(manifest.host_permissions.length > 0 && manifest.host_permissions.every(host => YOUTUBE_HOST.test(host)),
      `${browser}: host_permissions must be YouTube only`);

    const name = `aliveinternet-${version}-${browser}.zip`;
    const archive = path.join(out, name);
    let entries;
    try { entries = unzipNames(archive).filter(entry => !entry.endsWith('/')); }
    catch { assert.fail(`${browser}: missing or unreadable archive ${name}`); }
    for (const entry of entries) {
      assert.ok(!entry.startsWith('/') && !entry.split('/').includes('..'), `${browser}: unsafe entry ${entry}`);
      assert.ok(!/\.(?:ts|map)$/.test(entry), `${browser}: source or map entry ${entry}`);
    }
    assert.deepEqual([...entries].sort(), await files(folder), `${browser}: missing or extra archive entries`);
    for (const entry of entries) {
      assert.equal(Buffer.compare(unzipFile(archive, entry), await readFile(path.join(folder, entry))), 0, `${browser}: stale packaged ${entry}`);
    }
    const bytes = await readFile(archive);
    archives.push({ name, bytes: bytes.length, sha256: sha256(bytes) });
  }

  const sources = `aliveinternet-${version}-sources.zip`;
  let sourceNames;
  try { sourceNames = unzipNames(path.join(out, sources)); }
  catch { assert.fail(`missing or unreadable source archive ${sources}`); }
  assert.ok(sourceNames.includes('package-lock.json') && sourceNames.includes('wxt.config.ts'), 'source archive lacks lockfile or wxt.config.ts');
  assert.ok(sourceNames.every(entry => !/^(?:artifacts|packages\/core\/dist)\//.test(entry) && !/(?:^|\/)\.env/.test(entry)),
    'source archive must exclude runtime artifacts and secret-file patterns');
  const sourceBytes = await readFile(path.join(out, sources));
  archives.push({ name: sources, bytes: sourceBytes.length, sha256: sha256(sourceBytes) });

  const checksums = archives.map(a => `${a.sha256}  ${a.name}`).join('\n') + '\n';
  return { version, archives, checksums };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const { version, checksums } = await verifyReleaseBuild({ root });
  await writeFile(path.join(root, '.output', 'SHA256SUMS'), checksums);
  process.stdout.write(checksums);
  console.log(`release build ${version} verified: versions agree, archives match builds, YouTube-only access. Wrote .output/SHA256SUMS.`);
}
