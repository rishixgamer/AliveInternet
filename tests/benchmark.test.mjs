import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { parseDataset, parseEvaluationDataset } from '../src/research/dataset.ts';
import { benchmarkDataset } from '../src/research/benchmark.ts';
import { evaluateDecisions } from '../src/research/metrics.ts';
const source = JSON.parse(readFileSync(new URL('../benchmark/datasets/synthetic.json', import.meta.url)));
const clone = () => structuredClone(source);
test('dataset requires provenance, strict fields, bounded content and matching item count', () => {
  assert.equal(parseDataset(source).length, source.manifest.items);
  for (const mutate of [
    value => delete value.manifest.provenance,
    value => value.manifest.items++,
    value => value.items[0].author = '@real-account',
    value => value.items[0].text = 'a'.repeat(10001),
    value => value.items[0].links = ['javascript:alert(1)'],
    value => value.items[0].links = ['https://user:secret@example.com/'],
    value => value.items[0].accountGroup = '@profile',
    value => value.items[0].locale = '../en',
    value => value.items[0].category = 'country-risk',
    value => value.items[1].id = value.items[0].id,
  ]) { const value = clone(); mutate(value); assert.throws(() => parseEvaluationDataset(value)); }
  assert.throws(() => parseDataset([]));
});
test('parent references must exist in same platform/thread', () => {
  const value = clone(); value.items[0].threadId = value.items[1].threadId = 'thread'; value.items[1].parentId = value.items[0].id;
  assert.doesNotThrow(() => parseEvaluationDataset(value));
  value.items[1].threadId = 'other'; assert.throws(() => parseEvaluationDataset(value));
});
test('metrics count flags as visible, use null for absent denominators', () => {
  assert.deepEqual(evaluateDecisions([]), {tp:0,tn:0,fp:0,fn:0,precision:null,recall:null,falsePositiveRate:null});
  assert.deepEqual(evaluateDecisions([{actualSpam:false,decision:'flag'},{actualSpam:true,decision:'flag'},{actualSpam:true,decision:'collapse'},{actualSpam:false,decision:'collapse'}]), {tp:1,tn:1,fp:1,fn:1,precision:0.5,recall:0.5,falsePositiveRate:0.5});
});
test('benchmark preserves platform isolation, dimensions and <=350 batches', () => {
  const dataset = parseEvaluationDataset(source);
  dataset.items = Array.from({length:701}, (_, i) => ({...dataset.items[0], id:String(i), platform:i===700?'reddit':'youtube'}));
  const results = benchmarkDataset(dataset);
  assert.equal(results.length,3);
  for (const result of results) {
    assert.equal(result.latency.batches,3); assert.equal(result.latency.batchLimit,350);
    assert.equal(result.groups.reduce((sum, group) => sum+group.count,0),701);
    assert.equal(result.overall.tn,701);
  }
});
test('aggregate CLI has source/data hashes, no raw row text or IDs; refuses overwrite', () => {
  const tmp = mkdtempSync(path.join(os.tmpdir(),'aliveinternet-benchmark-'));
  try {
    const destination=path.join(tmp,'report.json');
    const args=['--experimental-strip-types','scripts/benchmark.mjs','benchmark/datasets/synthetic.json',destination];
    const run=spawnSync(process.execPath,args,{encoding:'utf8'}); assert.equal(run.status,0,run.stderr);
    const output=readFileSync(destination,'utf8'); const report=JSON.parse(output);
    assert.match(report.dataset.sha256,/^[a-f\d]{64}$/); assert.ok(report.sourceHashes['src/core/filter.ts']);
    assert.equal(output.includes(source.items[0].text),false); assert.equal(output.includes(source.items[0].id),false);
    assert.equal(spawnSync(process.execPath,args,{encoding:'utf8'}).status,1);
    assert.equal(readFileSync(destination,'utf8'),output);
  } finally {rmSync(tmp,{recursive:true,force:true});}
});
