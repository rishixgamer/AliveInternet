import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseRuleList, matchRuleList } from '../src/rules/schema.ts';
import { toRedditAutoModerator, toDiscordAutoMod } from '../src/rules/export-automod.ts';
import { assessBatch } from '../src/core/filter.ts';
import { extractContactHandles } from '../src/core/obfuscation.ts';

const fixture = () => JSON.parse(readFileSync(new URL('../rules/examples/en/investment-testimonial.example.json', import.meta.url), 'utf8'));
const simple = () => ({ ...fixture(), rules: [{ id: 'simple', description: 'Simple literal terms', category: 'spam', locale: 'en',
  allOf: [{ anyOf: ['contact me', 'message me'] }], weight: 2, action: 'flag',
  examples: { positive: ['contact me today'], benign: ['Ordinary speech'] } }] });

test('rule-list parser rejects malformed enum, scope, group, example and metadata fields', () => {
  for (const change of [list => { list.rules[0].category = 'whatever'; }, list => { list.rules[0].platforms = ['unknown']; },
    list => { list.rules[0].noneOf = 'oops'; }, list => { list.rules[0].weight = NaN; },
    list => { list.rules[0].examples.positive = [12]; }, list => { list.rules[0].id = ''; },
    list => { list.homepage = 'javascript:alert(1)'; }, list => { list.expires = '2027-02-30'; },
    list => { list.rules.push(structuredClone(list.rules[0])); }, list => { list.unrecognized = true; }]) {
    const raw = fixture(); change(raw); assert.throws(() => parseRuleList(raw));
  }
});

test('rule-list parsing snapshots nested examples and platform restrictions fail open without site context', () => {
  const raw = simple(); raw.rules[0].platforms = ['youtube'];
  const parsed = parseRuleList(raw);
  raw.rules[0].examples.positive[0] = 'mutated'; raw.rules[0].platforms.push('x');
  assert.equal(parsed.rules[0].examples.positive[0], 'contact me today');
  const item = { id: 'one', author: 'Sam', text: 'contact me today', links: [] };
  assert.equal(matchRuleList(parsed, item).length, 0);
  assert.equal(matchRuleList(parsed, { ...item, platform: 'x' }).length, 0);
  assert.equal(matchRuleList(parsed, { ...item, platform: 'youtube' }).length, 1);
});

test('moderation exports skip conjunctions and exceptions instead of broadening matching', () => {
  const parsed = parseRuleList(fixture());
  for (const exported of [toRedditAutoModerator(parsed), toDiscordAutoMod(parsed)]) {
    assert.deepEqual(exported.skippedRuleIds, [parsed.rules[0].id]);
    assert.ok(exported.warnings.length);
  }
  assert.doesNotMatch(toRedditAutoModerator(parsed).content, /^action:/m);
});

test('simple moderation exports preserve all alternatives and cannot inject YAML directives', () => {
  const list = parseRuleList(simple());
  list.id = 'injected\naction: remove'; list.version = 'v1\naction: spam';
  list.rules[0].description = 'description\naction: remove';
  list.rules[0].id = 'rule"\naction: remove';
  const reddit = toRedditAutoModerator(list);
  assert.match(reddit.content, /body \(includes-word\): \["contact me", "message me"\]/);
  assert.deepEqual(reddit.content.match(/^action: .*$/gm), ['action: report']);
  assert.equal(reddit.skippedRuleIds.length, 0);
  const discord = toDiscordAutoMod(list);
  assert.match(discord.content, /"contact me"/); assert.match(discord.content, /"message me"/);
  assert.doesNotMatch(discord.content, /^action:/m);
});

test('exports skip incompatible terms and site scopes rather than changing their meaning', () => {
  const list = parseRuleList(simple());
  list.rules[0].platforms = ['youtube'];
  assert.equal(toRedditAutoModerator(list).skippedRuleIds.length, 1);
  assert.equal(toDiscordAutoMod(list).skippedRuleIds.length, 1);
  delete list.rules[0].platforms;
  list.rules[0].allOf[0].anyOf = ['*wildcard*'];
  assert.equal(toDiscordAutoMod(list).skippedRuleIds.length, 1);
});

test('reference numbers and look-alike contact domains are not contact solicitation', () => {
  const text = 'This investment has a guaranteed return of 3%. Reference number 123456789.';
  const [assessment] = assessBatch([{ id: 'one', author: 'Sam', text, links: [] }]);
  assert.notEqual(assessment.decision, 'collapse');
  assert.ok(!assessment.signals.includes('Off-platform contact solicitation'));
  assert.deepEqual(extractContactHandles('https://not.me/example https://wa.me.evil.example/pay'), []);
  assert.ok(extractContactHandles('https://t.me/example https://wa.me/123456789').length >= 2);
});
