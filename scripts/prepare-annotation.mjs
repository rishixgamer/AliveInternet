import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MAX_DATASET_BYTES, parseEvaluationDataset } from '../src/research/dataset.ts';

// Local, explicitly supplied data only. No scraping, inference or external upload.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const labels = ['scam', 'spam', 'legitimate', 'uncertain'];
const strata = ['natural', 'scam-warning', 'financial-education', 'creator-giveaway', 'benign-link', 'repeated-opinion', 'short-agreement', 'obfuscation'];
const opaque = value => typeof value === 'string' && /^[a-z\d_-]{1,80}$/iu.test(value);
function fields(value, allowed) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  assert.ok(Object.keys(value).every(key => allowed.includes(key)));
}
async function read(file) {
  assert.ok((await stat(file)).size <= MAX_DATASET_BYTES);
  const bytes = await readFile(file);
  assert.ok(bytes.length <= MAX_DATASET_BYTES);
  return { bytes, value: JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) };
}
const save = (directory, file, value) => writeFile(path.join(directory, file), JSON.stringify(value, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
function collection(value) {
  fields(value, ['manifest', 'collection', 'items']);
  fields(value.collection, ['permissionReviewed', 'permissionRecord', 'samplingPlan', 'collectedFrom', 'collectedThrough']);
  assert.equal(value.collection.permissionReviewed, true);
  assert.ok(opaque(value.collection.permissionRecord));
  assert.ok(typeof value.collection.samplingPlan === 'string' && value.collection.samplingPlan.trim().length > 0 && value.collection.samplingPlan.length <= 2000);
  for (const key of ['collectedFrom', 'collectedThrough']) {
    assert.match(value.collection[key], /^\d{4}-\d{2}-\d{2}$/);
    const date = new Date(value.collection[key]);
    assert.ok(Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.collection[key]);
  }
  assert.ok(value.collection.collectedFrom <= value.collection.collectedThrough);
  assert.equal(value.manifest.split, 'mixed');
  assert.ok(Array.isArray(value.items));
  const data = parseEvaluationDataset({ manifest: { ...value.manifest, split: 'test' }, items: value.items.map(row => {
    fields(row, ['id', 'platform', 'kind', 'text', 'links', 'category', 'locale', 'accountGroup', 'threadId', 'parentId', 'split', 'sampleGroup', 'stratum']);
    assert.equal(row.platform, 'youtube');
    assert.equal(row.kind, 'comment');
    assert.ok(['train', 'dev', 'test'].includes(row.split) && opaque(row.sampleGroup) && strata.includes(row.stratum));
    const { split, sampleGroup, stratum, ...item } = row;
    return { ...item, label: 'legitimate' }; // Schema check only; never exported as an annotation.
  }) });
  const splits = new Map(), rows = new Map(value.items.map(row => [row.id, row]));
  function exclusive(key, split) {
    assert.ok(!splits.has(key) || splits.get(key) === split, 'Cross-split leakage');
    splits.set(key, split);
  }
  for (const row of value.items) {
    exclusive('sample:' + row.sampleGroup, row.split);
    for (const key of ['accountGroup', 'threadId']) if (row[key]) exclusive(key + ':' + row[key], row.split);
    const normalized = row.text.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();
    // Common short agreement is not a campaign identity; preserve it in natural samples.
    if (normalized.length >= 40) exclusive('text:' + hash(normalized), row.split);
    if (row.parentId) {
      assert.equal(rows.get(row.parentId)?.split, row.split);
      assert.equal(rows.get(row.parentId)?.stratum, row.stratum);
    }
  }
  return { ...value, manifest: { ...data.manifest, split: 'mixed' } };
}
function annotations(value, items, collectionSha256) {
  fields(value, ['annotator', 'collectionSha256', 'labels']);
  assert.ok(opaque(value.annotator));
  assert.equal(value.collectionSha256, collectionSha256);
  assert.ok(Array.isArray(value.labels) && value.labels.length === items.length);
  const byId = new Map();
  for (const row of value.labels) {
    fields(row, ['id', 'label', 'reason']);
    assert.ok(opaque(row.id) && !byId.has(row.id) && labels.includes(row.label));
    assert.ok(typeof row.reason === 'string' && row.reason.trim().length > 0 && row.reason.length <= 1000);
    byId.set(row.id, row);
  }
  assert.ok(items.every(row => byId.has(row.id)));
  return byId;
}
try {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'init' && args.length === 2) {
    const { value } = await read(args[0]);
    const data = collection(value), directory = args[1];
    // Exclusive directory creation preserves both old packages and partial failed runs.
    await mkdir(directory, { mode: 0o700 });
    await save(directory, 'collection.json', data);
    const collectionSha256 = hash(await readFile(path.join(directory, 'collection.json')));
    const blank = data.items.map(row => ({ id: row.id, label: null, reason: '' }));
    await save(directory, 'annotator-a.json', { annotator: 'annotator_a', collectionSha256, labels: blank });
    await save(directory, 'annotator-b.json', { annotator: 'annotator_b', collectionSha256, labels: blank });
    // Blind item sheet omits splits, sampling strata and all model/rule predictions.
    await save(directory, 'items.json', data.items.map(({ id, text, links, locale, threadId, parentId }) => ({ id, text, links, locale, threadId, parentId })));
    await save(directory, 'adjudication.json', { adjudicator: null, collectionSha256, independentReviewConfirmed: false, labels: [] });
    await save(directory, 'freeze.json', { schemaVersion: 1, collectionSha256, source: data.manifest.source, rows: data.items.length,
      createdAt: new Date().toISOString(), scope: 'YouTube comments; annotation preparation only. Permission and independence require custodian review. No accuracy claim.' });
    console.log('Prepared two blank independent annotation sheets and a frozen collection. No accuracy gate passed.');
  } else if (command === 'finalize' && args.length === 2) {
    const directory = args[0], output = args[1];
    const { bytes, value } = await read(path.join(directory, 'collection.json'));
    const data = collection(value), collectionSha256 = hash(bytes);
    const freeze = (await read(path.join(directory, 'freeze.json'))).value;
    assert.equal(freeze.collectionSha256, collectionSha256);
    const aFile = await read(path.join(directory, 'annotator-a.json'));
    const bFile = await read(path.join(directory, 'annotator-b.json'));
    assert.notEqual(aFile.value.annotator, bFile.value.annotator);
    const a = annotations(aFile.value, data.items, collectionSha256), b = annotations(bFile.value, data.items, collectionSha256);
    const adjudication = await read(path.join(directory, 'adjudication.json'));
    const review = adjudication.value;
    fields(review, ['adjudicator', 'collectionSha256', 'independentReviewConfirmed', 'labels']);
    assert.equal(review.collectionSha256, collectionSha256);
    assert.equal(review.independentReviewConfirmed, true);
    assert.ok(opaque(review.adjudicator) && ![aFile.value.annotator, bFile.value.annotator].includes(review.adjudicator));
    assert.ok(Array.isArray(review.labels));
    const disputed = data.items.filter(row => a.get(row.id).label !== b.get(row.id).label || a.get(row.id).label === 'uncertain');
    const resolved = annotations({ annotator: review.adjudicator, collectionSha256, labels: review.labels }, disputed, collectionSha256);
    assert.ok([...resolved.values()].every(row => row.label !== 'uncertain'));
    await mkdir(output, { mode: 0o700 });
    const counts = {};
    for (const split of ['train', 'dev', 'test']) for (const stratum of strata) {
      const selected = data.items.filter(row => row.split === split && row.stratum === stratum);
      if (!selected.length) continue;
      const items = selected.map(({ split, sampleGroup, stratum, ...item }) => ({ ...item, label: resolved.get(item.id)?.label ?? a.get(item.id).label }));
      const dataset = parseEvaluationDataset({ manifest: { ...data.manifest, name: data.manifest.name.slice(0, 160) + '-' + stratum, split, items: items.length }, items });
      await save(output, `${split}-${stratum}.json`, dataset);
      counts[`${split}-${stratum}`] = items.length;
    }
    await save(output, 'annotation-audit.json', { schemaVersion: 1, collectionSha256, annotationASha256: hash(aFile.bytes), annotationBSha256: hash(bFile.bytes),
      adjudicationSha256: hash(adjudication.bytes), rows: data.items.length, disagreementsOrUncertain: disputed.length, counts,
      source: data.manifest.source, representativeAccuracyVerified: false,
      scope: 'Completed annotation files, custodian-attested independence, and no detected group/exact-long-text leakage. No verification of licence, sampling representativeness, near-duplicate leakage, label truth or release thresholds.' });
    console.log('Exported fixed split/stratum datasets. Evaluate natural and enriched safety sets separately; no accuracy gate passed.');
  } else throw new Error('Usage');
} catch {
  // Never emit input text, identifiers, provenance or annotation reasons on failure.
  console.error('Annotation package rejected. Use init INPUT NEW_DIRECTORY or finalize PACKAGE NEW_DIRECTORY; check bounded schema, permissions, split isolation, complete independent labels and adjudication. Existing or partial outputs are preserved.');
  process.exitCode = 1;
}
