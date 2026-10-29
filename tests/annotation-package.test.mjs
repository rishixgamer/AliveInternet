import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { parseEvaluationDataset } from '../src/research/dataset.ts';

function fixture() {
  return { manifest: { name: 'Synthetic workflow regression', version: '1', license: 'CC0-1.0', provenance: 'Hand-authored test only', source: 'synthetic', split: 'mixed', items: 3 },
    collection: { permissionReviewed: true, permissionRecord: 'synthetic_record', samplingPlan: 'Artificial regression; not representative', collectedFrom: '2026-10-13', collectedThrough: '2026-10-13' },
    items: [
      { id: 'one', platform: 'youtube', kind: 'comment', text: 'A useful lesson; thank you.', links: [], locale: 'en', split: 'test', sampleGroup: 'window_one', stratum: 'natural' },
      { id: 'two', platform: 'youtube', kind: 'comment', text: 'Contact me on Telegram for guaranteed crypto profit!', links: [], locale: 'en', split: 'test', sampleGroup: 'window_one', stratum: 'natural' },
      { id: 'three', platform: 'youtube', kind: 'comment', text: 'I warned my family about this fraudulent investment scheme.', links: [], locale: 'en', split: 'dev', sampleGroup: 'window_two', stratum: 'scam-warning' },
    ] };
}
function temporary(action) {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'aliveinternet-annotation-'));
  try { action(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, value) => writeFileSync(file, JSON.stringify(value));
const run = (...args) => spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/prepare-annotation.mjs', ...args], { encoding: 'utf8' });
function init(directory, value = fixture()) {
  const input = path.join(directory, 'input.json'), output = path.join(directory, 'package');
  write(input, value);
  const result = run('init', input, output);
  assert.equal(result.status, 0, result.stderr);
  return output;
}
function complete(packageDirectory) {
  for (const name of ['a', 'b']) {
    const file = path.join(packageDirectory, `annotator-${name}.json`), sheet = read(file);
    sheet.labels.forEach((row, index) => { row.label = index === 1 ? (name === 'a' ? 'scam' : 'spam') : 'legitimate'; row.reason = 'Independent artificial test annotation'; });
    write(file, sheet);
  }
  const file = path.join(packageDirectory, 'adjudication.json'), sheet = read(file);
  sheet.adjudicator = 'reviewer_c'; sheet.independentReviewConfirmed = true;
  sheet.labels = [{ id: 'two', label: 'scam', reason: 'Adjudicated artificial solicitation' }];
  write(file, sheet);
}
test('annotation preparation is blind, frozen, private and refuses overwrite', () => temporary(directory => {
  const packageDirectory = init(directory);
  const a = read(path.join(packageDirectory, 'annotator-a.json'));
  assert.ok(a.labels.every(row => row.label === null));
  const blind = read(path.join(packageDirectory, 'items.json'));
  assert.ok(blind.every(row => !('split' in row) && !('stratum' in row) && !('label' in row)));
  const bytes = readFileSync(path.join(packageDirectory, 'collection.json'));
  assert.equal(run('init', path.join(directory, 'input.json'), packageDirectory).status, 1);
  assert.deepEqual(readFileSync(path.join(packageDirectory, 'collection.json')), bytes);
  assert.equal(run('finalize', packageDirectory, path.join(directory, 'output')).status, 1);
}));
test('completed independent labels and adjudication export isolated benchmark-ready strata', () => temporary(directory => {
  const packageDirectory = init(directory); complete(packageDirectory);
  const output = path.join(directory, 'output'), result = run('finalize', packageDirectory, output);
  assert.equal(result.status, 0, result.stderr);
  const data = parseEvaluationDataset(read(path.join(output, 'test-natural.json')));
  assert.equal(data.items.length, 2); assert.equal(data.items[1].label, 'scam');
  const audit = read(path.join(output, 'annotation-audit.json'));
  assert.equal(audit.disagreementsOrUncertain, 1); assert.equal(audit.representativeAccuracyVerified, false);
  assert.equal(audit.source, 'synthetic'); assert.equal(JSON.stringify(audit).includes(fixture().items[0].text), false);
  assert.equal(run('finalize', packageDirectory, output).status, 1);
}));
test('rejects permission omission, group/content leakage, labelled inputs and private identifiers without logging rows', () => {
  for (const mutate of [
    value => value.collection.permissionReviewed = false,
    value => value.items[2].sampleGroup = value.items[0].sampleGroup,
    value => value.items[2].text = value.items[1].text,
    value => value.items[0].label = 'legitimate',
    value => value.items[0].author = 'private-profile',
    value => value.items[0].links = ['https://user:secret@example.com'],
  ]) temporary(directory => {
    const value = fixture(); mutate(value); const input = path.join(directory, 'input.json'); write(input, value);
    const result = run('init', input, path.join(directory, 'package'));
    assert.equal(result.status, 1); assert.equal(result.stderr.includes(value.items[0].text), false);
  });
});
test('rejects altered frozen collection, same annotator, missing adjudication and unresolved uncertainty', () => {
  for (const mutate of [
    packageDirectory => { const file = path.join(packageDirectory, 'collection.json'), value = read(file); value.items[0].text = 'Tampered'; write(file, value); },
    packageDirectory => { const file = path.join(packageDirectory, 'annotator-b.json'), value = read(file); value.annotator = 'annotator_a'; write(file, value); },
    packageDirectory => { const file = path.join(packageDirectory, 'adjudication.json'), value = read(file); value.labels = []; write(file, value); },
    packageDirectory => { const file = path.join(packageDirectory, 'adjudication.json'), value = read(file); value.labels[0].label = 'uncertain'; write(file, value); },
  ]) temporary(directory => {
    const packageDirectory = init(directory); complete(packageDirectory); mutate(packageDirectory);
    assert.equal(run('finalize', packageDirectory, path.join(directory, 'output')).status, 1);
  });
});
