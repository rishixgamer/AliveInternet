import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trustReason } from '../src/core/trust.ts';
import { importSettings } from '../src/core/portability.ts';
import { DEFAULT_SETTINGS } from '../src/core/preferences.ts';
import { parseSettingsMutation } from '../src/extension/settings-protocol.ts';
import { createSettingsWriter } from '../src/extension/settings-writer.ts';
import { createCopiedCommentAnalyzer } from '../src/detectors/copied-comment.ts';
import { createReplyChainAnalyzer } from '../src/detectors/reply-chain.ts';
import { createImpersonationAnalyzer } from '../src/detectors/impersonation.ts';
import { shareCard } from '../src/core/stats.ts';

const item = over => ({ id: 'one', platform: 'youtube', kind: 'comment', accountKey: '@sam',
  author: 'Sam', text: 'A sufficiently long legitimate repeated opinion about the pacing and the editing of this video.', links: [], ...over });

test('allowlists require exact platform and validated account identity', () => {
  const settings = { trustCreatorContent: true, allowedAccounts: ['x:@sam'] };
  assert.equal(trustReason(item(), settings), undefined);
  assert.equal(trustReason(item({ platform: 'x' }), settings), 'allowlisted');
  assert.equal(trustReason(item({ platform: undefined }), settings), undefined);
  assert.equal(trustReason(item(), { ...settings, allowedAccounts: ['@sam'] }), undefined);
});

test('queued list preferences capture arrays and nested scope intent', async () => {
  let saved = structuredClone(DEFAULT_SETTINGS);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const mutate = createSettingsWriter({ async read() { await gate; return saved; }, async write(next) { saved = next; } });
  const patch = { mutedWords: ['crypto'], allowedAccounts: ['youtube:@sam'], scopeOverrides: [{ scopeId: 'youtube:@owner', mode: 'off' }] };
  const pending = mutate({ kind: 'preferences', patch });
  patch.mutedWords[0] = 'cooking'; patch.allowedAccounts.push('x:@other'); patch.scopeOverrides[0].mode = 'aggressive';
  release(); await pending;
  assert.deepEqual(saved.mutedWords, ['crypto']);
  assert.deepEqual(saved.allowedAccounts, ['youtube:@sam']);
  assert.equal(saved.scopeOverrides[0].mode, 'off');
});

test('list mutations reject invalid entries and overflow instead of silently clearing preferences', () => {
  for (const patch of [{ mutedWords: [null] }, { allowedAccounts: ['@sam'] }, { allowedAccounts: ['youtubex'] },
    { scopeOverrides: [{ scopeId: 'youtube:@owner', mode: 'invalid' }] },
    { mutedWords: Array.from({ length: 201 }, (_, i) => `word${i}`) }]) {
    assert.throws(() => parseSettingsMutation({ kind: 'preferences', patch }));
  }
});

test('default settings import merges lists while preserving unrelated preferences', () => {
  const current = { ...structuredClone(DEFAULT_SETTINGS), enabled: false, mode: 'aggressive',
    scopeOverrides: [{ scopeId: 'youtube:@owner', mode: 'off' }], blockedAccounts: ['youtube:@mine'] };
  const merged = importSettings(current, { settings: { blockedAccounts: ['youtube:@theirs'] } });
  assert.equal(merged.enabled, false); assert.equal(merged.mode, 'aggressive');
  assert.deepEqual(merged.scopeOverrides, current.scopeOverrides);
  assert.deepEqual(merged.blockedAccounts, ['youtube:@mine', 'youtube:@theirs']);
});

test('settings import rejects malformed shapes and unsupported export versions', () => {
  for (const raw of [null, [], 42, {}, { settings: [] }, { settings: { enabled: 'yes' } },
    { format: 'other', version: 1, settings: DEFAULT_SETTINGS },
    { format: 'aliveinternet-settings', version: 99, settings: DEFAULT_SETTINGS }]) {
    assert.throws(() => importSettings(DEFAULT_SETTINGS, raw));
  }
});

test('copied-comment evidence requires same-platform known accounts and respects observed order', async () => {
  const analyzer = createCopiedCommentAnalyzer();
  for (const original of [item({ id: 'first', accountKey: undefined }), item({ id: 'first', platform: 'x' }), item({ id: 'first', kind: 'post' })]) {
    assert.deepEqual(await analyzer.analyze([original, item({ id: 'second', accountKey: '@other' })]), []);
  }
  const evidence = await analyzer.analyze([item({ id: 'later', observedOrder: 9 }), item({ id: 'early', accountKey: '@other', observedOrder: 1 })]);
  assert.deepEqual(evidence.map(e => e.evidenceIds), [['later']]);
});

test('reply-chain evidence requires an observed parent and distinct known accounts on the same platform', async () => {
  const analyzer = createReplyChainAnalyzer({ minEndorsingAccounts: 2 });
  const top = item({ id: 'top', threadId: 'thread', text: 'Mrs. Jane Example earned me crypto profit of $40k' });
  const replies = ['one', 'two'].map((id, i) => item({ id, author: id, accountKey: `@user${i}`, parentId: 'top', threadId: 'thread', text: 'Mrs. Jane Example changed my life too, contact her' }));
  assert.deepEqual(await analyzer.analyze(replies), []);
  assert.deepEqual(await analyzer.analyze([top, ...replies.map(r => ({ ...r, accountKey: undefined }))]), []);
  assert.deepEqual(await analyzer.analyze([top, ...replies.map(r => ({ ...r, platform: 'x' }))]), []);
  assert.deepEqual(await analyzer.analyze([top, ...replies.map(r => ({ ...r, parentId: 'absent' }))]), []);
});

test('impersonation requires an owner identity and a contact or claim rather than a topic mention', async () => {
  const context = { platform: 'youtube', surface: 'watch', ownerDisplayName: 'Sam', ownerAccountKey: '@sam' };
  const candidate = item({ accountKey: '@other', text: 'Your official giveaway was a great video' });
  assert.deepEqual(await createImpersonationAnalyzer(context).analyze([candidate]), []);
  assert.deepEqual(await createImpersonationAnalyzer({ ...context, ownerAccountKey: undefined }).analyze([item({ accountKey: '@other', text: 'Contact me on telegram' })]), []);
  assert.deepEqual(await createImpersonationAnalyzer(context).analyze([item({ platform: 'x', accountKey: '@other', text: 'Contact me on telegram' })]), []);
});

test('share cards describe reversible hides without asserting scam identity or content type', () => {
  const card = shareCard({ month: '2026-10', hidden: 3, byCategory: { 'user-block': 1, duplicate: 2 } });
  assert.doesNotMatch(card.headline, /scam|bot|comments/i);
  assert.match(card.headline, /3/);
});
