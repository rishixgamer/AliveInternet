import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { FEATURES } from '../src/core/features.ts';
import { scaffoldedAnalyzers } from '../src/detectors/index.ts';
import { foldConfusables, collapseSpacedLetters, extractContactHandles } from '../src/core/obfuscation.ts';
import { trustReason } from '../src/core/trust.ts';
import { mutedWordMatch } from '../src/core/mute.ts';
import { parseRuleList } from '../src/rules/schema.ts';
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

test('malformed rule lists and datasets are rejected', () => {
  assert.throws(() => parseRuleList({}), Error);
  assert.throws(() => parseDataset([]), Error);
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

test('every catalog entry has a v1.0 disposition recorded in the docs', () => {
  const doc = readFileSync(new URL('../docs/feature-groundwork.md', import.meta.url), 'utf8');
  const section = (name) => {
    const start = doc.indexOf(`### ${name}`);
    assert.ok(start >= 0, `${name} section missing`);
    const next = doc.indexOf('\n#', start + 4);
    return doc.slice(start, next < 0 ? undefined : next);
  };
  const ship = section('Ship'); const defer = section('Defer');
  for (const f of FEATURES) {
    assert.ok(f.v1 === 'ship' || f.v1 === 'defer', `${f.id}: v1 disposition missing`);
    assert.ok((f.v1 === 'ship' ? ship : defer).includes(`(\`${f.id}\`)`), `${f.id}: not listed under ${f.v1} in feature-groundwork.md`);
    assert.ok(!(f.v1 === 'ship' ? defer : ship).includes(`(\`${f.id}\`)`), `${f.id}: listed under the wrong disposition`);
  }
});

test('removed features leave no stubs behind', () => {
  for (const id of ['report-feedback', 'creator-mode']) assert.equal(FEATURES.some(f => f.id === id), false, id);
  for (const path of ['src/feedback/report.ts', 'src/creator/review.ts', 'src/core/scaffold.ts']) {
    assert.equal(existsSync(new URL(`../${path}`, import.meta.url)), false, path);
  }
});
