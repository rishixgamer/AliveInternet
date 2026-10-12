import {test} from 'node:test';
import assert from 'node:assert/strict';
import {evaluateDecisions} from '../src/research/metrics.ts';
test('calculates a conservative collapse-only confusion matrix', () => {
 const metrics = evaluateDecisions([
  {actualSpam:true,decision:'collapse'},
  {actualSpam:true,decision:'flag'},
  {actualSpam:false,decision:'collapse'},
  {actualSpam:false,decision:'allow'},
 ]);
 assert.deepEqual([metrics.tp,metrics.tn,metrics.fp,metrics.fn],[1,1,1,1]);
 assert.equal(metrics.falsePositiveRate,0.5);
});
test('does not invent performance numbers when no labeled samples exist', () => {
 const metrics=evaluateDecisions([]);
 assert.equal(metrics.precision,null);
 assert.equal(metrics.falsePositiveRate,null);
});
