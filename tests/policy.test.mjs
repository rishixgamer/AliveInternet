import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localAction } from '../src/core/policy.ts';
import { DEFAULT_SETTINGS, withAccountBlock, sanitizeSettings } from '../src/core/preferences.ts';
const actor = (platform, kind) => ({id: `${platform}/${kind}`, platform, kind, accountKey: '@sam', author: 'Sam', text: 'Ordinary speech', links: []});
const verdict = (decision) => ({id: '1', decision, score: 3, signals: [], reason: 'test'});
const active = withAccountBlock(sanitizeSettings({ ...DEFAULT_SETTINGS, platforms: {youtube: true, x: true, instagram: true} }), 'x', '@sam', true);

test('manual local account block hides both posts and comments', () => {
  assert.equal(localAction(actor('x','post'), verdict('allow'), active).reason, 'user-block');
  assert.equal(localAction(actor('x','comment'), verdict('allow'), active).reason, 'user-block');
});
test('local account block does not extend to another site', () => {
  assert.equal(localAction(actor('instagram','post'), verdict('allow'), active).hide, false);
});
test('disabling comment rules does not override an explicit account block', () => {
  assert.equal(localAction(actor('x','comment'), verdict('collapse'), {...active, filterComments: false}).hide, true);
});
test('turning off a platform restores its hidden items', () => {
  assert.equal(localAction(actor('x','post'), verdict('collapse'), {...active, platforms: {...active.platforms, x:false}}).hide, false);
});
test('content rules can be disabled separately for posts and comments', () => {
  const clean = {...active, blockedAccounts:[], filterPosts:false};
  assert.equal(localAction(actor('x','post'), verdict('collapse'), clean).hide, false);
  assert.equal(localAction(actor('x','comment'), verdict('collapse'), clean).hide, true);
});
test('automatic visible-page account suppression requires opt-in', () => {
  const clean = {...active, blockedAccounts: []};
  assert.equal(localAction(actor('x','post'), verdict('allow'), clean, new Set(['x:@sam'])).hide, false);
  assert.equal(localAction(actor('x','post'), verdict('allow'), {...clean, autoCampaignAccounts:true}, new Set(['x:@sam'])).reason,'page-campaign');
});
