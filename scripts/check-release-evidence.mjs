import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Evidence-integrity check, deliberately not a store-readiness or accuracy gate.
const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'docs/validation/2026-10-13-release-readiness/';
const bytes = file => readFile(path.join(root, file));
const json = async file => JSON.parse(await bytes(file));
const sha = async file => createHash('sha256').update(await bytes(file)).digest('hex');
async function inventory(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    if (entry.isDirectory()) files.push(...await inventory(directory + '/' + entry.name, prefix + entry.name + '/'));
    else if (entry.isFile()) files.push(prefix + entry.name);
  }
  return files.sort();
}
async function build(receipt, directory) {
  assert.equal(receipt.status, 'passed');
  assert.deepEqual(Object.keys(receipt.buildSha256).sort(), await inventory(directory));
  for (const [file, expected] of Object.entries(receipt.buildSha256)) assert.equal(await sha(directory + '/' + file), expected, file);
}
const audit = await json(base + 'uci-audit.json');
const rules = await json(base + 'uci-rules.json');
assert.equal(audit.converterSha256, await sha('scripts/import-uci-youtube.py'));
assert.equal(audit.datasetSha256, rules.dataset.sha256);
assert.equal(audit.retainedRows, rules.dataset.items);
assert.equal(audit.sourceRows, audit.retainedRows + audit.duplicateRowsExcluded + audit.conflictingLabelRowsExcluded + audit.emptyOrOversizeRowsExcluded);
assert.equal(rules.dataset.source, 'permissioned');
assert.equal(rules.dataset.split, 'test');
assert.equal(rules.lockSha256, await sha('package-lock.json'));
for (const [file, expected] of Object.entries(rules.sourceHashes)) assert.equal(await sha(file), expected, file);
for (const row of rules.results) {
  assert.equal(row.overall.tp + row.overall.fn, audit.labels.spam);
  assert.equal(row.overall.tn + row.overall.fp, audit.labels.legitimate);
}
for (const [browser, directory] of [['chrome', '.output/chrome-mv3'], ['edge', '.output/edge-mv3']]) {
  const fixture = await json(base + browser + '-fixture.json');
  await build(fixture, directory);
  assert.equal(fixture.harnessSha256, await sha('scripts/test-browser.mjs'));
  assert.equal(fixture.checks.length, 15);
  assert.ok(fixture.checks.every(row => row.status === 'passed'));
  assert.equal(fixture.installation.method, 'CDP Extensions.loadUnpacked');
  assert.ok(fixture.brandedBrowser.product.startsWith(browser === 'chrome' ? 'Chrome/' : 'Edg/'));
  const device = await json(base + browser + '-device.json');
  await build(device, directory);
  assert.equal(device.harnessSha256, await sha('scripts/benchmark-device.mjs'));
  assert.equal(device.fixtureSha256, await sha('tests/browser/youtube-fixture.mjs'));
  assert.equal(device.lockSha256, await sha('package-lock.json'));
  assert.equal(device.samples.length, 26);
  for (const condition of ['off', 'on']) {
    assert.equal(device.samples.filter(row => row.condition === condition && !row.warmup).length, 10);
    assert.equal(device.summary[condition].readyMs.count, 10);
  }
  for (const row of device.samples) {
    assert.equal(row.idle.mutations, 0);
    assert.equal(row.rss.missingProcesses, 0);
    assert.equal(row.gpuBusyPercent, null, 'No hardware GPU sampler is present in this experiment');
    assert.equal(row.gpuEnergyJoules, null);
  }
}
const repo = await json(base + 'github-repository.json');
const publisher = await json('release/publisher.json');
assert.equal(repo.nameWithOwner, 'rishixgamer/AliveInternet');
assert.equal(repo.viewerPermission, 'ADMIN');
assert.equal(repo.visibility, 'PRIVATE');
assert.equal(publisher.repository.url, repo.url);
assert.equal(publisher.repository.sourceUploaded, false);
assert.equal(publisher.privacy.mailboxDeliveryVerified, false);
assert.equal(publisher.privacy.hostedPolicyVerified, false);
assert.equal(publisher.publicationAuthorized, false);
console.log('Release evidence integrity verified: licensed-corpus provenance, exact branded builds, repeated device samples and private repository identity. Representative accuracy, hardware GPU, signed Firefox, mailbox/hosting and store/publication conditions remain unresolved.');
