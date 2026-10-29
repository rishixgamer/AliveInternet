import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const directory = path.resolve(root, process.argv[2] || 'docs/validation/2026-10-15-ui-ux');
const inventory = JSON.parse(await readFile(path.join(directory, 'inventory.json'), 'utf8'));
const digest = async file => createHash('sha256').update(await readFile(file)).digest('hex');
async function walk(folder, prefix = '') {
  const result = {};
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    if (entry.isDirectory()) Object.assign(result, await walk(path.join(folder, entry.name), prefix + entry.name + '/'));
    else if (entry.isFile()) result[prefix + entry.name] = await digest(path.join(folder, entry.name));
  }
  return result;
}
for (const [file, expected] of Object.entries(inventory.filesSha256)) {
  assert.equal(await digest(path.join(root, file)), expected, `Changed evidence/source: ${file}`);
}
for (const command of inventory.commands) assert.equal(command.exitCode, 0, `Failed command: ${command.command}`);
for (const [target, expected] of Object.entries(inventory.buildsSha256)) {
  assert.deepEqual(await walk(path.join(root, '.output', target)), expected, `Rebuild or refresh ${target} evidence`);
}
for (const [file, minimum] of [['chromium.json', 20], ['firefox.json', 7]]) {
  const receipt = JSON.parse(await readFile(path.join(directory, file), 'utf8'));
  assert.equal(receipt.status, 'passed', file);
  assert.ok(receipt.checks.length >= minimum, `Incomplete fixture: ${file}`);
  assert.deepEqual(receipt.errors, [], `Page errors: ${file}`);
  const target = file === 'chromium.json' ? 'chrome-mv3' : 'firefox-mv3';
  assert.deepEqual(receipt.buildSha256, inventory.buildsSha256[target], `Receipt/build mismatch: ${file}`);
  const harness = file === 'chromium.json' ? 'scripts/test-browser.mjs' : 'scripts/test-firefox.mjs';
  assert.equal(receipt.harnessSha256, await digest(path.join(root, harness)), `Harness changed: ${file}`);
}
console.log(`UI evidence verified: ${Object.keys(inventory.filesSha256).length} pinned files, three builds, Chromium and Firefox fixtures.`);
console.log('Scope: synthetic unpacked/temporary installs. Live/native toolbar, signed installs, representative accuracy and other-device validation remain separate. Historical release/archive receipts were not rewritten.');
