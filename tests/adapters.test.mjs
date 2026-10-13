import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLATFORMS } from '../src/core/platforms.ts';
import { DOM_SPECS } from '../src/adapters/spec.ts';

test('every registered platform has explicit feed/comment DOM specifications', () => {
  assert.deepEqual(Object.keys(DOM_SPECS).sort(), [...PLATFORMS].sort());
  for (const site of PLATFORMS) {
    assert.ok(DOM_SPECS[site].length > 0, `${site} missing specs`);
    for (const spec of DOM_SPECS[site]) {
      assert.ok(spec.roots.length > 0);
      assert.ok(spec.text.length > 0);
      assert.ok(spec.authorLinks.length > 0);
      assert.ok(spec.kind === 'post' || spec.kind === 'comment');
    }
  }
});
