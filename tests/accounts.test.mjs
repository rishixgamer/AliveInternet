import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suspiciousAccounts } from '../src/core/accounts.ts';
import { profileKey, platformFromHostname } from '../src/core/platforms.ts';

const item = (text, accountKey='@spam') => ({id:text, text, author:'Spam', links:[], platform:'x', accountKey});
const result = (decision) => ({id:'a', decision, score: 7, signals: [], reason: 'demo'});

test('profile key accepts explicit same-site profile URLs', () => {
  assert.equal(profileKey('x', '/example', 'https://x.com/home'), '@example');
  assert.equal(profileKey('youtube', '/@channel1', 'https://www.youtube.com/'), '@channel1');
  assert.equal(profileKey('reddit', '/user/Human-1/', 'https://www.reddit.com/'), '@human-1');
  assert.equal(profileKey('bluesky', '/profile/person.bsky.social', 'https://bsky.app/'), 'person.bsky.social');
  assert.equal(profileKey('facebook', '/profile.php?id=123456789', 'https://www.facebook.com'), 'id/123456789');
});

test('rejects cross-platform, reserved paths and untrusted profile links', () => {
  assert.equal(profileKey('x', 'https://evil.com/jane', 'https://x.com/'), undefined);
  assert.equal(profileKey('x', '/home', 'https://x.com/'), undefined);
  assert.equal(profileKey('instagram', '/reels/', 'https://www.instagram.com/'), undefined);
  assert.equal(profileKey('youtube', '/watch?v=123', 'https://www.youtube.com/'), undefined);
  assert.equal(profileKey('x', 'javascript:alert(1)', 'https://x.com/'), undefined);
  assert.equal(platformFromHostname('fake-x.com'), undefined);
});

test('does not infer account-wide spam from a single or repeated identical item', () => {
  const spam = item('Contact me to double your investments immediately');
  assert.equal(suspiciousAccounts([spam, spam, spam], [result('collapse'), result('collapse'), result('collapse')]).size, 0);
});

test('requires high confidence for three distinct posts from one profile', () => {
  const spam = ['Investment 123 guaranteed profit contact telegram', 'Investment 234 guaranteed returns message telegram', 'Investment 345 guaranteed profit on whatsapp'].map((x) => item(x));
  assert.ok(suspiciousAccounts(spam, [result('collapse'),result('collapse'),result('collapse')]).has('x:@spam'));
  assert.equal(suspiciousAccounts(spam,[result('collapse'),result('flag'),result('collapse')]).size,0);
});

test('does not conflate identically named accounts across networks', () => {
  const spam = ['Investment 123 guaranteed profit contact telegram', 'Investment 234 guaranteed returns message telegram', 'Investment 345 guaranteed profit on whatsapp'].map((x) => item(x));
  spam[0].platform = 'reddit';
  assert.equal(suspiciousAccounts(spam,[result('collapse'),result('collapse'),result('collapse')]).size,0);
});
