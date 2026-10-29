import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const consumer = await mkdtemp(path.join(tmpdir(), 'aliveinternet-core-consumer-'));
try {
  const packed = JSON.parse(execFileSync('npm', ['pack', './packages/core', '--json', '--ignore-scripts', '--pack-destination', consumer], {
    cwd: root, encoding: 'utf8', env: { ...process.env, npm_config_cache: path.join(consumer, 'cache') },
  }))[0];
  assert.ok(packed.files.some(file => file.path === 'dist/lib.js'));
  assert.ok(packed.files.some(file => file.path === 'dist/lib.d.ts'));
  assert.ok(packed.files.some(file => file.path === 'LICENSE'));
  for (const file of packed.files) {
    assert.ok(!/(?:extension|adapters|node_modules|entrypoints)\//.test(file.path), file.path);
    assert.ok(!file.path.endsWith('.ts') || file.path.endsWith('.d.ts'), file.path);
  }
  const installed = path.join(consumer, 'node_modules/@aliveinternet/core');
  await mkdir(installed, { recursive: true });
  execFileSync('tar', ['-xf', path.join(consumer, packed.filename), '--strip-components=1', '-C', installed]);
  const manifest = JSON.parse(await readFile(path.join(installed, 'package.json'), 'utf8'));
  assert.equal(manifest.type, 'module');
  assert.ok(!manifest.dependencies && !manifest.optionalDependencies);
  await writeFile(path.join(consumer, 'package.json'), JSON.stringify({ type: 'module' }));
  await writeFile(path.join(consumer, 'consumer.mjs'), `
import assert from 'node:assert/strict';
Object.defineProperty(globalThis, 'document', { get() { throw new Error('Unexpected DOM access'); } });
globalThis.fetch = () => { throw new Error('Unexpected network request'); };
const core = await import('@aliveinternet/core');
const [benign, spam] = core.assessBatch([
  { id: '1', author: 'a', text: 'Thanks, I agree with this helpful explanation.', links: [] },
  { id: '2', author: 'b', text: 'Contact me on Telegram to double your investment. Guaranteed profit!', links: [] }
]);
assert.equal(benign.decision, 'allow');
assert.equal(spam.decision, 'collapse');
assert.equal(core.platformFromHostname('www.youtube.com'), 'youtube');
assert.equal(core.decodeRedirect('https://www.youtube.com/redirect?q=https%3A%2F%2Fexample.com'), 'https://example.com');
assert.equal(core.revealLink('https://shop.example.co.uk/item', 'example.co.uk').textMismatch, false);
assert.equal(core.revealLink('https://alice.github.io/', 'bob.github.io').textMismatch, true);
assert.equal(core.revealLink('https://bit.ly/unknown', 'example.com').textMismatch, false);
assert.equal(core.revealLink('https://user:pass@example.com/', 'other.com').textMismatch, false);
assert.throws(() => core.parseIndicatorPack({ format: 'invalid' }));
`);
  execFileSync(process.execPath, [path.join(consumer, 'consumer.mjs')], { cwd: consumer, stdio: 'pipe' });
  await writeFile(path.join(consumer, 'consumer.mts'), `
import { assessBatch, type ContentItem, type Assessment } from '@aliveinternet/core';
const items: ContentItem[] = [{ id: '1', author: 'a', text: 'Thanks for the explanation', links: [] }];
const results: Assessment[] = assessBatch(items);
console.log(results[0]?.decision);
`);
  execFileSync(path.join(root, 'node_modules/.bin/tsc'), ['--noEmit', '--strict', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--target', 'ES2022', path.join(consumer, 'consumer.mts')], { cwd: consumer, stdio: 'pipe' });
  console.log(`core package consumer passed (${packed.files.length} tarball entries, JavaScript and declarations verified)`);
} finally {
  // Only this freshly created consumer fixture is removed.
  await rm(consumer, { recursive: true, force: true });
}
