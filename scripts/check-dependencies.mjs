import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const base = 'docs/validation/2026-10-12-dependencies/';
const json = async file => JSON.parse(await readFile(new URL(file, root), 'utf8'));
const hashFile = async file => createHash('sha256').update(await readFile(new URL(file, root))).digest('hex');
async function productionFiles(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(new URL(directory, root), { withFileTypes: true })) {
    if (entry.isDirectory()) result.push(...await productionFiles(directory + entry.name + '/', prefix + entry.name + '/'));
    else if (entry.isFile()) result.push(prefix + entry.name);
  }
  return result.sort();
}
for (const file of ['chromium-receipt.json', 'chromium-headed-receipt.json', 'live-youtube-receipt.json']) {
  const receipt = await json(base + file);
  assert.equal(receipt.status, 'passed', file);
  const files = await productionFiles('.output/chrome-mv3/');
  assert.deepEqual(Object.keys(receipt.buildSha256).sort(), files, file + ' exact inventory');
  for (const name of files) assert.equal(await hashFile('.output/chrome-mv3/' + name), receipt.buildSha256[name], file + ': ' + name);
}
const headed = await json(base + 'chromium-headed-receipt.json');
assert.equal(headed.metrics.optionalAccess.dynamicInjection, true);
assert.equal(headed.metrics.optionalAccess.revokedThroughBrowserAPI, true);
assert.equal(headed.metrics.optionalAccess.restoredExistingTab, true);
assert.equal(headed.metrics.optionalAccess.reloadWithheld, true);
const live = await json(base + 'live-youtube-receipt.json');
assert.ok(live.metrics.replies.checked > 0);
assert.equal(live.metrics.replies.mismatched, 0);
// The prior 128-minimum receipt stays immutable; signing preparation reran the
// same harness against the current 142-minimum Firefox payload.
const firefox = await json('docs/validation/2026-10-13-release-closure/firefox-fixture.json');
assert.equal(firefox.status, 'passed');
assert.equal(firefox.checks.length, 6);
assert.deepEqual(Object.keys(firefox.buildSha256).sort(), await productionFiles('.output/firefox-mv3/'));
for (const [name, expected] of Object.entries(firefox.buildSha256)) assert.equal(await hashFile('.output/firefox-mv3/' + name), expected, 'Firefox: ' + name);
const provenance = await json('docs/media/provenance.json');
assert.equal(provenance.synthetic, true);
assert.equal(provenance.demoDurationSeconds, 10);
assert.deepEqual(provenance.buildSha256, (await json(base + 'chromium-receipt.json')).buildSha256);
for (const [name, expected] of Object.entries(provenance.media)) {
  const bytes = await readFile(new URL('docs/media/' + name, root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256, name);
  assert.equal(bytes.length, expected.bytes);
  const gif = name.endsWith('.gif');
  assert.deepEqual([gif ? bytes.readUInt16LE(6) : bytes.readUInt32BE(16), gif ? bytes.readUInt16LE(8) : bytes.readUInt32BE(20)], name.startsWith('promo') ? [440,280] : [1280,800]);
  if (gif) assert.ok(bytes.length < 8_000_000);
}
const report = await json(base + 'synthetic-benchmark-final.json');
assert.equal(report.dataset.source, 'synthetic');
assert.equal(report.lockSha256, await hashFile('package-lock.json'));
assert.equal(report.dataset.sha256, await hashFile('benchmark/datasets/synthetic.json'));
for (const [file, expected] of Object.entries(report.sourceHashes)) assert.equal(await hashFile(file), expected, file);
const audit = await json(base + 'npm-audit.json');
assert.equal(audit.metadata.vulnerabilities.total, 0);
assert.equal((await json(base + 'sbom.json')).bomFormat, 'CycloneDX');
console.log('dependency evidence verified: production hashes, Chromium/Firefox, permission lifecycle, live replies, synthetic media, benchmark, audit and SBOM');
