import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessBatch } from '../src/core/filter.ts';

const make = (text, author = 'user', links = []) => ({ id: `${author}:${text}`, text, author, links });

test('collapses off-platform investment scam with implausible return promise', () => {
  const [verdict] = assessBatch([make('Contact me on Telegram to double your investment. Guaranteed profit!')]);
  assert.equal(verdict.decision, 'collapse');
  assert.ok(verdict.score >= 7);
});

test('collapses off-platform prize claim solicitations', () => {
  const [verdict] = assessBatch([make('You are the giveaway winner! Message me on WhatsApp to claim your prize.')]);
  assert.equal(verdict.decision, 'collapse');
});

test('does not hide generic human agreement', () => {
  const [verdict] = assessBatch([make('This is such an important point. I completely agree.')]);
  assert.equal(verdict.decision, 'allow');
});

test('does not hide normal discussion of financial guarantees', () => {
  const [verdict] = assessBatch([make('There is no guaranteed profit when investing in bitcoin.')]);
  assert.notEqual(verdict.decision, 'collapse');
});

test('does not hide a harmless link without solicitation', () => {
  const [verdict] = assessBatch([make('This paper explains how embeddings work.', 'researcher', ['https://arxiv.org/pdf/1234.5678'])]);
  assert.equal(verdict.decision, 'allow');
});

test('flags but does not hide identical repeated messages without other spam signals', () => {
  const msg = 'This is a thoughtful argument and I appreciate the detailed explanation.';
  const results = assessBatch(['alice', 'bob', 'carol', 'dave'].map((author) => make(msg, author)));
  assert.ok(results.every((result) => result.decision === 'flag'));
});

test('a single account repeating its comment does not count as coordinated authors', () => {
  const msg = 'This is a thoughtful argument and I appreciate the detailed explanation.';
  const results = assessBatch([make(msg, 'alice'), make(msg, 'alice'), make(msg, 'alice'), make(msg, 'alice')]);
  assert.ok(results.every((result) => result.decision === 'allow'));
});

test('aggressive mode still does not collapse solely for repetition', () => {
  const msg = 'I agree with the speaker about the importance of educating young people.';
  const results = assessBatch(['a', 'b', 'c', 'd'].map((author) => make(msg, author)), 'aggressive');
  assert.ok(results.every((result) => result.decision !== 'collapse'));
});


test('does not hide a warning against contacting crypto scammers', () => {
  const [verdict] = assessBatch([make('Contact me if you disagree: there is no guaranteed profit in crypto investments.')]);
  assert.notEqual(verdict.decision, 'collapse');
});

test('flags financial links with promotions but does not overstate confidence', () => {
  const [verdict] = assessBatch([make('I have a crypto page. Follow the link for details.', 'trader', ['https://t.me/example'])]);
  assert.notEqual(verdict.decision, 'collapse');
  assert.ok(verdict.signals.some((signal) => signal.includes('External contact link')));
});


test('identical display names do not erase independent account IDs during repetition counts', () => {
  const msg = 'A detailed and completely normal statement repeated by several different accounts here.';
  const items = ['@a', '@b', '@c', '@d'].map((accountKey) => ({ ...make(msg, 'same display name'), accountKey }));
  const results = assessBatch(items);
  assert.ok(results.every(result => result.decision === 'flag'));
});
