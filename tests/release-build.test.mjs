import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyReleaseBuild } from '../scripts/check-release-build.mjs';

const BROWSERS = ['chrome', 'firefox', 'edge'];
const manifestFor = (version, over = {}) => JSON.stringify({
  manifest_version: 3, name: 'AliveInternet', version,
  permissions: ['scripting', 'storage'],
  host_permissions: ['https://www.youtube.com/*', 'https://m.youtube.com/*', 'https://youtube.com/*'],
  ...over,
});

// Synthetic release tree: three unpacked builds, their ZIPs and a source ZIP.
function fixture({ version = '0.4.0', pkg = version, core = version, wxt = version, manifest = version, manifestOver = {} } = {}) {
  const root = mkdtempSync(path.join(tmpdir(), 'alive-release-'));
  const write = (file, text) => { mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); writeFileSync(path.join(root, file), text); };
  write('package.json', JSON.stringify({ name: 'aliveinternet', version: pkg }));
  write('packages/core/package.json', JSON.stringify({ name: '@aliveinternet/core', version: core }));
  write('wxt.config.ts', `export default { manifest: { version: '${wxt}' } };\n`);
  write('package-lock.json', '{}');
  for (const browser of BROWSERS) {
    write(`.output/${browser}-mv3/manifest.json`, manifestFor(manifest, manifestOver));
    write(`.output/${browser}-mv3/background.js`, `console.log('${browser}');`);
    write(`.output/${browser}-mv3/content-scripts/youtube.js`, 'export {};');
    execFileSync('zip', ['-qr', path.join(root, `.output/aliveinternet-${version}-${browser}.zip`), '.'], { cwd: path.join(root, `.output/${browser}-mv3`) });
  }
  execFileSync('zip', ['-qr', path.join(root, `.output/aliveinternet-${version}-sources.zip`), 'package.json', 'package-lock.json', 'wxt.config.ts'], { cwd: root });
  return root;
}
const withFixture = async (options, body) => {
  const root = fixture(options);
  try { return await body(root); } finally { rmSync(root, { recursive: true, force: true }); }
};

test('a consistent 0.4.0 build verifies and reports a checksum for every archive', () =>
  withFixture({}, async root => {
    const result = await verifyReleaseBuild({ root });
    assert.equal(result.version, '0.4.0');
    assert.deepEqual(result.archives.map(a => a.name), [
      'aliveinternet-0.4.0-chrome.zip', 'aliveinternet-0.4.0-firefox.zip',
      'aliveinternet-0.4.0-edge.zip', 'aliveinternet-0.4.0-sources.zip',
    ]);
    // Independent source of truth: hash the file ourselves.
    for (const archive of result.archives) {
      assert.equal(archive.sha256, createHash('sha256').update(readFileSync(path.join(root, '.output', archive.name))).digest('hex'));
    }
    assert.match(result.checksums, /^[0-9a-f]{64} {2}aliveinternet-0\.4\.0-chrome\.zip$/m);
  }));

test('rejects version drift between package.json, packages/core, wxt.config.ts and the built manifest', async () => {
  await withFixture({ core: '0.3.0' }, root => assert.rejects(verifyReleaseBuild({ root }), /version/i));
  await withFixture({ wxt: '0.3.0' }, root => assert.rejects(verifyReleaseBuild({ root }), /version/i));
  await withFixture({ manifest: '0.3.0' }, root => assert.rejects(verifyReleaseBuild({ root }), /version/i));
});

test('rejects an archive that no longer matches the unpacked build', () =>
  withFixture({}, async root => {
    writeFileSync(path.join(root, '.output/chrome-mv3/background.js'), 'console.log("edited after zipping");');
    await assert.rejects(verifyReleaseBuild({ root }), /stale|chrome/i);
  }));

test('rejects an archive with extra or source-map entries', () =>
  withFixture({}, async root => {
    writeFileSync(path.join(root, '.output/edge-mv3/background.js.map'), '{}');
    execFileSync('zip', ['-qr', path.join(root, '.output/aliveinternet-0.4.0-edge.zip'), '.'], { cwd: path.join(root, '.output/edge-mv3') });
    await assert.rejects(verifyReleaseBuild({ root }), /map|extra/i);
  }));

test('beta is YouTube-only: rejects broader host permissions or extra permissions', async () => {
  await withFixture({ manifestOver: { host_permissions: ['https://*/*'] } }, root => assert.rejects(verifyReleaseBuild({ root }), /host/i));
  await withFixture({ manifestOver: { permissions: ['scripting', 'storage', 'tabs'] } }, root => assert.rejects(verifyReleaseBuild({ root }), /permission/i));
});

test('rejects a missing archive', () =>
  withFixture({}, async root => {
    rmSync(path.join(root, '.output/aliveinternet-0.4.0-firefox.zip'));
    await assert.rejects(verifyReleaseBuild({ root }), /firefox/i);
  }));
