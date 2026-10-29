import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { FEATURES } from '../src/core/features.ts';
import { scaffoldedAnalyzers } from '../src/detectors/index.ts';
import { foldConfusables, collapseSpacedLetters, extractContactHandles } from '../src/core/obfuscation.ts';
import { trustReason } from '../src/core/trust.ts';
import { mutedWordMatch } from '../src/core/mute.ts';
import { NotImplementedError } from '../src/core/scaffold.ts';
import { parseRuleList } from '../src/rules/schema.ts';
import { isPageStatsMessage, PAGE_STATS_MESSAGE } from '../src/extension/messages.ts';
import { redactForReport, issueUrl } from '../src/feedback/report.ts';
import { buildCreatorReview } from '../src/creator/review.ts';
import { parseDataset } from '../src/research/dataset.ts';

const item = { id: '1', author: 'a', text: 'Contact me on T e l e g r a m for guaranteed profit', links: [], platform: 'youtube', kind: 'comment', accountKey: '@a', isCreator: true };

test('feature registry: unique ids, all off by default, groundwork files exist', () => {
  const ids = FEATURES.map(f => f.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const f of FEATURES) {
    assert.equal(f.defaultEnabled, false, f.id);
    assert.ok(f.files.length > 0, f.id);
    for (const file of f.files) assert.ok(existsSync(new URL(`../${file}`, import.meta.url)), `${f.id}: ${file}`);
  }
});

test('feature registry matches docs/feature-groundwork.md coverage', () => {
  const doc = readFileSync(new URL('../docs/feature-groundwork.md', import.meta.url), 'utf8');
  for (const f of FEATURES) for (const file of f.files.filter(p => p.startsWith('src/'))) {
    const name = file.split('/').pop();
    assert.ok(doc.includes(name), `${f.id}: ${name} missing from feature-groundwork.md`);
  }
});

test('analyzers without prerequisites return no evidence (never a bot claim)', async () => {
  // Single item with no thread/page context: reply-chain and impersonation
  // have nothing to join against, so they stay silent.
  for (const analyzer of scaffoldedAnalyzers()) {
    assert.deepEqual(await analyzer.analyze([item]), [], analyzer.id);
  }
});

test('obfuscation helpers normalize evasion attempts', () => {
  assert.equal(foldConfusables('Tеlеgram'), 'Telegram');
  assert.equal(collapseSpacedLetters(item.text), 'Contact me on Telegram for guaranteed profit');
  assert.ok(extractContactHandles('Contact me on telegram @cryptoking').some(h => h.kind === 'social-handle'));
  assert.deepEqual(extractContactHandles('Great video, thanks!'), []);
});

test('trust exemptions cover creator content; mute stays silent by default', () => {
  assert.equal(trustReason(item), 'creator');
  assert.equal(trustReason({ ...item, isCreator: false, isPinned: false, isCreatorHearted: false }), undefined);
  assert.equal(mutedWordMatch(item), undefined);
});

test('remaining unimplemented entry points throw NotImplementedError', () => {
  assert.throws(() => parseRuleList({}), Error);
  assert.throws(() => redactForReport('test'), NotImplementedError);
  assert.throws(() => issueUrl({}), NotImplementedError);
  assert.throws(() => buildCreatorReview(), NotImplementedError);
  assert.throws(() => parseDataset([]), Error);
});

test('page-stats message guard', () => {
  assert.equal(isPageStatsMessage({ type: PAGE_STATS_MESSAGE, tally: { hidden: 0, byCategory: {} } }), true);
  assert.equal(isPageStatsMessage({ type: 'other' }), false);
  assert.equal(isPageStatsMessage(null), false);
});

test('example rule list keeps the documented shape', () => {
  const list = JSON.parse(readFileSync(new URL('../rules/examples/en/investment-testimonial.example.json', import.meta.url), 'utf8'));
  assert.equal(list.schemaVersion, 1);
  for (const rule of list.rules) {
    assert.ok(rule.examples.positive.length > 0 && rule.examples.benign.length > 0, rule.id);
  }
});

import { revealLink, decodeRedirect } from '../src/core/links.ts';
import { lookalikeOf, BRAND_DOMAINS } from '../src/intel/lookalike-domains.ts';
import { effectiveMode } from '../src/core/scopes.ts';
import { toRedditAutoModerator, toDiscordAutoMod } from '../src/rules/export-automod.ts';
import { explainItem } from '../src/core/explain.ts';
import * as lib from '../src/lib.ts';

test('implemented helpers decode redirects and explain items locally', () => {
  const href = 'https://www.youtube.com/redirect?q=https%3A%2F%2Fexample.com';
  assert.equal(decodeRedirect(href), 'https://example.com');
  assert.equal(revealLink(href, 'example.com').wrapper, 'youtube-redirect');
  assert.equal(revealLink('https://evil.example.com', 'good.example.org').textMismatch, true);
  assert.equal(BRAND_DOMAINS.length, 0, 'brand list must stay empty until each entry is verified');
  assert.equal(lookalikeOf('paypa1-secure.net'), undefined);
  assert.equal(effectiveMode('balanced', undefined, [{ scopeId: 'youtube:@x', mode: 'off' }]), 'balanced');
  const parsed = parseRuleList(JSON.parse(readFileSync(new URL('../rules/examples/en/investment-testimonial.example.json', import.meta.url), 'utf8')));
  assert.equal(parsed.rules.length, 1);
  assert.deepEqual(toRedditAutoModerator(parsed).skippedRuleIds, [parsed.rules[0].id]);
  assert.ok(toDiscordAutoMod(parsed).content.includes('keywords'));
  assert.equal(explainItem({ ...item, isCreator: false }).assessment.decision, 'collapse');
});

test('npm entry point exports implemented DOM-free core APIs', () => {
  assert.equal(typeof lib.assessBatch, 'function');
  assert.equal(typeof lib.evaluateDecisions, 'function');
  assert.equal(typeof lib.foldConfusables, 'function');
  assert.equal(typeof lib.parseRuleList, 'function');
  assert.equal(typeof lib.explainItem, 'function');
});

test('staged UI translations stay out of the build folder', () => {
  assert.equal(existsSync(new URL('../public/_locales', import.meta.url)), false);
  JSON.parse(readFileSync(new URL('../locales/en/messages.json', import.meta.url), 'utf8'));
});
