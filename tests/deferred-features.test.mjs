import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FEATURES } from '../src/core/features.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
let outDir; let bundle;

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const file = path.join(dir, name);
    return statSync(file).isDirectory() ? walk(file) : [file];
  });
}

before(() => {
  outDir = mkdtempSync(path.join(tmpdir(), 'aliveinternet-build-'));
  execFileSync(process.execPath, ['--experimental-strip-types', path.join(root, 'scripts/build-with-sourcemaps.mjs'), 'chrome', outDir],
    { cwd: root, stdio: 'pipe', timeout: 240_000 });
  const folder = path.join(outDir, 'chrome-mv3');
  const files = walk(folder);
  const sources = new Set();
  for (const map of files.filter(f => f.endsWith('.js.map'))) {
    for (const source of JSON.parse(readFileSync(map, 'utf8')).sources) {
      if (source.includes('node_modules')) continue;
      const absolute = path.resolve(path.dirname(map), source);
      if (absolute.startsWith(root)) sources.add(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  bundle = {
    manifest: JSON.parse(readFileSync(path.join(folder, 'manifest.json'), 'utf8')),
    sources,
    text: files.filter(f => /\.(?:js|html|json)$/.test(f)).map(f => readFileSync(f, 'utf8')).join('\n'),
  };
});
after(() => { if (outDir) rmSync(outDir, { recursive: true, force: true }); });

// Strings a deferred feature would put in the bundle if it became reachable:
// message types, storage keys and extension APIs that existed in source at some
// point. Keyed by catalog id; add entries when a deferred feature gains one.
const DEFERRED_RUNTIME_MARKERS = {
  'toolbar-badge-count': ['aliveinternet/page-stats', 'setBadgeText'],
  'check-this-comment': ['aliveinternet/check-item', 'contextMenus'],
  'per-channel-strictness': ['scopeOverrides'],
};

test('the built extension includes shipping modules, so the scan is meaningful', () => {
  for (const expected of ['src/core/filter.ts', 'src/core/trust.ts', 'src/core/mute.ts', 'src/core/review-list.ts', 'src/core/portability.ts']) {
    assert.ok(bundle.sources.has(expected), `${expected} should be bundled; source-map scan may be broken`);
  }
  assert.ok(bundle.text.includes('aliveinternet/hidden-items'));
});

test('no module belonging to a deferred feature reaches the production build', () => {
  const deferred = FEATURES.filter(f => f.v1 === 'defer');
  assert.ok(deferred.length > 0);
  const shippedFiles = new Set(FEATURES.filter(f => f.v1 === 'ship').flatMap(f => f.files));
  for (const feature of deferred) {
    for (const file of feature.files.filter(f => f.startsWith('src/') && f.endsWith('.ts') && !shippedFiles.has(f))) {
      assert.ok(!bundle.sources.has(file), `deferred feature ${feature.id}: ${file} is bundled`);
    }
  }
});

test('deferred features expose no message types, storage keys or extension APIs', () => {
  const deferredIds = new Set(FEATURES.filter(f => f.v1 === 'defer').map(f => f.id));
  for (const [id, markers] of Object.entries(DEFERRED_RUNTIME_MARKERS)) {
    assert.ok(deferredIds.has(id), `${id} must be a deferred catalog entry`);
    for (const marker of markers) assert.ok(!bundle.text.includes(marker), `${id}: "${marker}" found in production build`);
  }
});

test('manifest requests only the permissions of shipping features', () => {
  assert.deepEqual([...bundle.manifest.permissions].sort(), ['scripting', 'storage']);
  for (const key of ['commands', 'omnibox', 'side_panel', 'devtools_page', 'chrome_url_overrides', 'externally_connectable']) {
    assert.ok(!(key in bundle.manifest), `manifest.${key} must stay absent`);
  }
});
