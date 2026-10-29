import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
for (const target of ['chrome', 'firefox', 'edge']) {
  const folder = path.join(root, '.output', `${target}-mv3`);
  const manifest = JSON.parse(await readFile(path.join(folder, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual([...manifest.permissions].sort(), ['scripting', 'storage']);
  assert.ok(manifest.host_permissions.every(host => /^https:\/\/(?:www\.|m\.)?youtube\.com\/\*$/.test(host)));
  assert.equal(manifest.optional_host_permissions.length, 25);
  assert.ok(!manifest.externally_connectable && !manifest.web_accessible_resources);
  const notices = await readFile(path.join(folder, 'THIRD_PARTY_LICENSES.txt'), 'utf8');
  assert.ok(notices.includes('tldts') && notices.includes('Permission is hereby granted'));
  for (const size of [16, 32, 48, 128]) {
    const png = await readFile(path.join(folder, manifest.icons[size]));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), size); assert.equal(png.readUInt32BE(20), size);
  }
  if (target === 'firefox') {
    assert.equal(manifest.browser_specific_settings.gecko.id, '{c0c9c54d-10b7-4ac9-833c-e0cca4c1e407}');
    assert.equal(manifest.browser_specific_settings.gecko.strict_min_version, '142.0');
    assert.equal(manifest.browser_specific_settings.gecko_android, undefined, 'Android distribution remains unvalidated');
    assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions, { required: ['none'] });
  }
  console.log(`${target} manifest/icons verified; SHA256 ${createHash('sha256').update(JSON.stringify(manifest)).digest('hex')}`);
}
console.log('release packages verified');
