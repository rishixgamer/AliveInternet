import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyClosureFromDisk } from './lib/release-closure.mjs';

// Default: preparation-receipt integrity plus verification of any gate already marked closed.
// With --require-closed: additionally fails unless all five owner gates are closed with evidence.
// Representative accuracy is a separate gate and is never closed by this script.
const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFile(path.join(root, file));
const json = async file => JSON.parse(await read(file));
const hash = async file => createHash('sha256').update(await read(file)).digest('hex');
async function inventory(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    if (entry.isDirectory()) result.push(...await inventory(directory + '/' + entry.name, prefix + entry.name + '/'));
    else if (entry.isFile()) result.push(prefix + entry.name);
  }
  return result.sort();
}
const receipt = await json('docs/validation/2026-10-13-release-closure/preparation.json');
const publisher = await json('release/publisher.json');
// These files change legitimately when owner gates close (flags, evidence format, this checker); their
// integrity is enforced by verifyClosure instead of the Oct 13 byte pins.
const LIVING = new Set(['release/publisher.json', 'docs/release-closure.md', 'scripts/check-release-closure.mjs']);
for (const [file, expected] of Object.entries(receipt.fileSha256)) if (!LIVING.has(file)) assert.equal(await hash(file), expected, file);
const fixture = await json(receipt.firefox.fixtureReceipt);
assert.equal(fixture.status, 'passed');
assert.equal(fixture.checks.length, 6);
assert.deepEqual(Object.keys(fixture.buildSha256).sort(), await inventory('.output/firefox-mv3'));
for (const [file, expected] of Object.entries(fixture.buildSha256)) assert.equal(await hash('.output/firefox-mv3/' + file), expected, file);
const lint = await json(receipt.firefox.lintReceipt);
assert.deepEqual(lint.summary, { errors: 0, notices: 0, warnings: 0 });
const manifest = await json('.output/firefox-mv3/manifest.json');
assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, '142.0');
assert.equal(manifest.browser_specific_settings.gecko_android, undefined);
assert.equal(lint.metadata.id, manifest.browser_specific_settings.gecko.id);
assert.equal(lint.metadata.version, manifest.version);
const closure = verifyClosureFromDisk(root, { requireClosed: process.argv.includes('--require-closed') });
assert.equal(receipt.gates.representativeAccuracyVerified, false, 'No current independent corpus has been supplied');
assert.deepEqual(closure.errors, [], 'Owner-gate closure evidence:\n' + closure.errors.join('\n'));
console.log('Preparation evidence integrity passed. Owner gates still open: ' + (closure.open.join(', ') || 'none') + '. Representative accuracy remains open.');
