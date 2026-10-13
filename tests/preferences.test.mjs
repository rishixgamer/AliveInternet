import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, sanitizeSettings, withAccountBlock } from '../src/core/preferences.ts';

test('conservative defaults enable only YouTube while extra sites remain opt-in', () => {
  const s = sanitizeSettings({});
  assert.equal(s.platforms.youtube, true);
  assert.equal(s.platforms.instagram, false);
  assert.equal(s.autoCampaignAccounts, false);
  assert.equal(s.filterComments, true);
  assert.equal(s.filterPosts, true);
});
test('account blocks are scoped to a single platform and restored cleanly', () => {
  const next = withAccountBlock(DEFAULT_SETTINGS, 'x', '@foo', true);
  assert.deepEqual(next.blockedAccounts, ['x:@foo']);
  assert.deepEqual(withAccountBlock(next, 'x', '@foo', false).blockedAccounts, []);
});
test('settings sanitizer rejects arbitrary storage keys', () => {
  const s = sanitizeSettings({ blockedAccounts: ['x:@foo', 'not-a-platform:@foo', 'x:<script>', 'x:@foo'], platforms: { x: true, fake: true }, mode: 'invalid' });
  assert.deepEqual(s.blockedAccounts, ['x:@foo']);
  assert.equal(s.platforms.x, true);
  assert.equal(s.mode, 'balanced');
});
