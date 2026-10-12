import { test } from 'node:test';
import assert from 'node:assert/strict';
import { foldConfusables, collapseSpacedLetters, extractContactHandles } from '../src/core/obfuscation.ts';
import { trustReason } from '../src/core/trust.ts';
import { mutedWordMatch } from '../src/core/mute.ts';
import { decodeRedirect, revealLink } from '../src/core/links.ts';
import { effectiveMode } from '../src/core/scopes.ts';
import { assessBatch } from '../src/core/filter.ts';
import { localAction } from '../src/core/policy.ts';
import { explainItem } from '../src/core/explain.ts';
import { exportSettings, importSettings } from '../src/core/portability.ts';
import { tallyPage, addToMonth, shareCard } from '../src/core/stats.ts';
import { toReviewRecord } from '../src/core/review-list.ts';
import { parseRuleList, matchRuleList } from '../src/rules/schema.ts';
import { toRedditAutoModerator, toDiscordAutoMod } from '../src/rules/export-automod.ts';
import { lookalikeOf } from '../src/intel/lookalike-domains.ts';
import { createFakeBadgeAnalyzer } from '../src/detectors/fake-badge.ts';
import { createProfileBaitAnalyzer } from '../src/detectors/profile-bait.ts';
import { createGenericFillerAnalyzer } from '../src/detectors/generic-filler.ts';
import { createCopiedCommentAnalyzer } from '../src/detectors/copied-comment.ts';
import { createGiveawayStreamAnalyzer } from '../src/detectors/giveaway-stream.ts';
import { createReplyChainAnalyzer } from '../src/detectors/reply-chain.ts';
import { createImpersonationAnalyzer } from '../src/detectors/impersonation.ts';
import { DEFAULT_SETTINGS, sanitizeSettings } from '../src/core/preferences.ts';

const platform = 'youtube';
const base = (over) => ({ id: '1', author: 'Sam', text: 'Ordinary speech about cooking', links: [], platform, kind: 'comment', accountKey: '@sam', ...over });

test('obfuscation: Cyrillic look-alikes fold, spaced letters collapse', () => {
  assert.equal(foldConfusables('T\u0435l\u0435gram'), 'Telegram');
  assert.equal(collapseSpacedLetters('Contact me on T e l e g r a m today'), 'Contact me on Telegram today');
  assert.equal(collapseSpacedLetters('This is a normal sentence with spaces'), 'This is a normal sentence with spaces');
});

test('obfuscation: contact handles need messaging context for @handles', () => {
  assert.ok(extractContactHandles('Contact me on telegram @cryptoking').some(h => h.value === '@cryptoking'));
  assert.ok(extractContactHandles('Call +1 (555) 123-4567 for details').some(h => h.kind === 'phone'));
  assert.ok(extractContactHandles('Email jane@example.com for info').some(h => h.kind === 'email'));
  assert.deepEqual(extractContactHandles('Great video @creator, loved it'), []);
  assert.deepEqual(extractContactHandles('Hello world'), []);
});

test('trust: creator/pinned/hearted/allowlisted are exempt', () => {
  assert.equal(trustReason(base({ isCreator: true })), 'creator');
  assert.equal(trustReason(base({ isPinned: true })), 'pinned');
  assert.equal(trustReason(base({ isCreatorHearted: true })), 'creator-hearted');
  assert.equal(trustReason(base({}), { trustCreatorContent: true, allowedAccounts: ['youtube:@sam'] }), 'allowlisted');
  assert.equal(trustReason(base({})), undefined);
});

test('mute: whole-word preference matching', () => {
  const settings = { mutedWords: ['crypto'] };
  assert.equal(mutedWordMatch(base({ text: 'I love crypto trading' }), settings), 'crypto');
  assert.equal(mutedWordMatch(base({ text: 'Cryptography is fascinating' }), settings), undefined);
  assert.equal(mutedWordMatch(base({ text: 'Hello world' }), settings), undefined);
});

test('links: offline redirect decoding without network', () => {
  assert.equal(decodeRedirect('https://www.youtube.com/redirect?q=https%3A%2F%2Fexample.com%2Fpay'), 'https://example.com/pay');
  assert.equal(decodeRedirect('https://l.facebook.com/l.php?u=https%3A%2F%2Fexample.com'), 'https://example.com');
  assert.equal(decodeRedirect('https://out.reddit.com/t3_abc?url=https://example.com'), 'https://example.com');
  assert.equal(decodeRedirect('https://t.co/abc123'), undefined);
  assert.equal(revealLink('https://evil.example/login', 'good.example/login').textMismatch, true);
  assert.equal(revealLink('https://example.com/a', 'example.com/a').textMismatch, false);
});

test('scopes: per-owner overrides without demographic keys', () => {
  const context = { platform, surface: 'watch', ownerAccountKey: '@owner' };
  assert.equal(effectiveMode('balanced', context, [{ scopeId: 'youtube:@owner', mode: 'off' }]), 'off');
  assert.equal(effectiveMode('balanced', context, [{ scopeId: 'youtube:@other', mode: 'off' }]), 'balanced');
  assert.equal(effectiveMode('balanced', undefined, []), 'balanced');
});

test('filter: spaced-letter evasion still triggers; negated promises do not collapse', () => {
  const [spam] = assessBatch([{ ...base({ id: 's' }), text: 'Contact me on T e l e g r a m for guaranteed crypto profit', links: [] }]);
  assert.equal(spam.decision, 'collapse');
  const [benign] = assessBatch([{ ...base({ id: 'b' }), text: 'No guaranteed profit here, do your own research on crypto', links: [] }]);
  assert.notEqual(benign.decision, 'collapse');
  const [generic] = assessBatch([{ ...base({ id: 'g' }), text: 'Nice video, thanks!', links: [] }]);
  assert.equal(generic.decision, 'allow');
});

test('policy: trusted never hides, user blocks win, mute is a preference', () => {
  const settings = sanitizeSettings(DEFAULT_SETTINGS);
  const collapse = { id: '1', decision: 'collapse', score: 8, signals: ['x'], reason: 'x' };
  assert.equal(localAction({ ...base({}), platform }, collapse, settings).hide, true);
  assert.equal(localAction({ ...base({ isCreator: true }), platform }, collapse, settings).reason, 'trusted');
  const blocked = { ...settings, blockedAccounts: ['youtube:@sam'] };
  assert.equal(localAction({ ...base({ isCreator: true }), platform }, collapse, blocked).reason, 'user-block');
  const muted = localAction({ ...base({ text: 'I love crypto' }), platform }, { ...collapse, decision: 'allow' }, settings, new Set(), { mute: { mutedWords: ['crypto'] } });
  assert.equal(muted.reason, 'muted-preference');
});

test('fake-badge: author marks flag, text marks do not', async () => {
  const analyzer = createFakeBadgeAnalyzer();
  assert.equal((await analyzer.analyze([base({ author: 'CoinKing ✓ Official' })])).length, 1);
  assert.equal((await analyzer.analyze([base({ author: 'Sam' })])).length, 0);
  assert.equal((await analyzer.analyze([base({ author: 'Sam', text: 'Great ✅' })])).length, 0);
});

test('profile-bait: pushes flag, creator bio and portfolio do not', async () => {
  const analyzer = createProfileBaitAnalyzer();
  assert.equal((await analyzer.analyze([base({ text: 'Check my profile for pics 🔥🔥' })])).length, 1);
  assert.equal((await analyzer.analyze([base({ text: 'Full tutorial link in bio', isCreator: true })])).length, 0);
  assert.equal((await analyzer.analyze([base({ text: 'Check my profile for my portfolio commissions' })])).length, 0);
});

test('generic-filler: short praise flags, substantive comments and links do not', async () => {
  const analyzer = createGenericFillerAnalyzer();
  assert.equal((await analyzer.analyze([base({ text: 'Great video! 🙌' })])).length, 1);
  assert.equal((await analyzer.analyze([base({ text: 'Great video, the chart explanation at 3:12 finally made support levels click for me' })])).length, 0);
  assert.equal((await analyzer.analyze([base({ text: 'Nice!', links: ['https://example.com'] })])).length, 0);
});

test('copied-comment: later verbatim copy flags, first copy and short text do not', async () => {
  const longText = 'This is a thoughtful long comment about the video editing pacing and sound design that I really appreciated watching twice';
  const analyzer = createCopiedCommentAnalyzer({ minLength: 60 });
  const items = [
    base({ id: 'a', text: longText, accountKey: '@alice', observedOrder: 0 }),
    base({ id: 'b', text: longText, accountKey: '@bob', observedOrder: 1 }),
    base({ id: 'c', text: 'so true', accountKey: '@carol', observedOrder: 2 }),
  ];
  const evidence = await analyzer.analyze(items);
  assert.ok(evidence.some(e => e.evidenceIds.includes('b')));
  assert.ok(!evidence.some(e => e.evidenceIds.includes('a')));
  assert.ok(!evidence.some(e => e.evidenceIds.includes('c')));
});

test('giveaway-stream: multiplier posts flag, comments and plain news do not', async () => {
  const analyzer = createGiveawayStreamAnalyzer();
  const post = base({ id: 'p', kind: 'post', author: 'Elon Musk LIVE', text: 'LIVE ETH giveaway: send 1 ETH get 2 ETH back now' });
  assert.equal((await analyzer.analyze([post])).length, 1);
  assert.equal((await analyzer.analyze([{ ...post, kind: 'comment' }])).length, 0);
  assert.equal((await analyzer.analyze([base({ kind: 'post', text: 'News: exchange announces scheduled maintenance' })])).length, 0);
});

test('reply-chain: endorsed testimonial threads flag, missing thread fields stay silent', async () => {
  const analyzer = createReplyChainAnalyzer({ minEndorsingAccounts: 2 });
  const top = base({ id: 't', text: 'I met Mrs. Jane Example, her crypto strategy earned me $40k', threadId: 'th1' });
  const replies = ['@alice', '@bob'].map((account, i) => base({
    id: `r${i}`, text: `Mrs. Jane Example changed my life too, contact her now ${account}`, accountKey: account, threadId: 'th1', parentId: 't',
  }));
  assert.ok((await analyzer.analyze([top, ...replies])).length >= 1);
  assert.deepEqual(await analyzer.analyze([base({ text: 'hello' })]), []);
});

test('impersonation: owner imitation plus solicitation flags; fans without solicitation do not', async () => {
  const context = { platform, surface: 'watch', ownerDisplayName: 'MrBeast', ownerAccountKey: '@mrbeast' };
  const analyzer = createImpersonationAnalyzer(context);
  assert.equal((await analyzer.analyze([base({ author: 'MrBeast_Official', accountKey: '@fake', text: 'Contact me on telegram for your prize' })])).length, 1);
  assert.equal((await analyzer.analyze([base({ author: 'MrBeastFan22', accountKey: '@fan', text: 'Love your videos!' })])).length, 0);
  assert.deepEqual(await createImpersonationAnalyzer(undefined).analyze([base({ author: 'MrBeast', accountKey: '@x', text: 'contact me' })]), []);
});

test('rule lists parse, self-test examples, match and export for review', async () => {
  const { readFileSync } = await import('node:fs');
  const raw = JSON.parse(readFileSync(new URL('../rules/examples/en/investment-testimonial.example.json', import.meta.url), 'utf8'));
  const list = parseRuleList(raw);
  assert.equal(list.rules.length, 1);
  assert.equal(matchRuleList(list, base({ text: 'I met Mrs. Jane Example, her trading strategy earned me $40k in a month' })).length, 1);
  assert.equal(matchRuleList(list, base({ text: 'Beware of comments saying Mrs. X earned me money, it is a scam' })).length, 0);
  assert.ok(toRedditAutoModerator(list).content.includes('action: report'));
  assert.ok(toDiscordAutoMod(list).content.includes('keywords'));
  assert.throws(() => parseRuleList({}), Error);
});

test('explain, portability, stats and review records are local-only', () => {
  const item = base({ text: 'Contact me on telegram for guaranteed crypto profit' });
  const explained = explainItem({ ...item, isCreator: false });
  assert.ok(explained.lines.length > 0);
  assert.ok(explainItem({ ...item, isCreator: true }).notHiddenBecause?.includes('trusted'));
  const exported = exportSettings(DEFAULT_SETTINGS, new Date('2026-01-15T00:00:00Z'));
  assert.equal(exported.settings.mutedWords.length, 0);
  const merged = importSettings({ ...DEFAULT_SETTINGS, blockedAccounts: ['youtube:@mine'] }, { settings: { ...DEFAULT_SETTINGS, blockedAccounts: ['youtube:@theirs'] } });
  assert.ok(merged.blockedAccounts.includes('youtube:@mine') && merged.blockedAccounts.includes('youtube:@theirs'));
  assert.throws(() => importSettings(DEFAULT_SETTINGS, 'x'.repeat(300_000)), Error);
  assert.equal(tallyPage(['content-rule', 'content-rule']).hidden, 2);
  const month = addToMonth(undefined, tallyPage(['content-rule']), new Date('2026-03-01T00:00:00Z'));
  assert.equal(month.month, '2026-03');
  assert.ok(shareCard(month).headline.includes('2026-03'));
  const record = toReviewRecord({ ...item, platform }, 'test reason', 'content-rule', 'page-1');
  assert.equal(record.excerpt, item.text);
});

test('lookalike matcher works against a supplied verified list, stays silent by default', () => {
  const brands = [{ brand: 'paypal', officialDomains: ['paypal.com'], verifiedFrom: 'https://www.paypal.com' }];
  assert.equal(lookalikeOf('paypa1.com', brands)?.technique, 'edit-distance');
  assert.equal(lookalikeOf('paypal-secure-support.com', brands)?.technique, 'brand-plus-keyword');
  assert.equal(lookalikeOf('paypal.com', brands), undefined);
  assert.equal(lookalikeOf('paypa1-secure.net'), undefined);
});
