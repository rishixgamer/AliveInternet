import {test} from 'node:test';
import assert from 'node:assert/strict';
import { parseIndicatorPack, matchIndicators, hostFromUrl } from '../src/intel/indicators.ts';
const pack = {schemaVersion:1, title:'Synthetic research indicators',publisher:'Demo',sourceUrl:'https://example.org/report',indicators:[
  {kind:'domain',value:'example-bad.test',note:'Fixture only',evidenceUrl:'https://example.org/evidence'},
  {kind:'account',value:'@example',platform:'x',note:'Fixture only',evidenceUrl:'https://example.org/evidence'},
]};
const item = {id:'1',kind:'post',author:'Example',platform:'x',accountKey:'@example',text:'Look at this',links:['https://example-bad.test/path']};
test('normalizes validated user-imported indicators and matches exact domains/accounts', () => {
 const result = matchIndicators(item,parseIndicatorPack(pack));
 assert.equal(result.length,2);
 assert.deepEqual(result.map(x => x.indicator.kind), ['domain','account']);
});
test('does not match sibling or subdomain, another platform, or a display name', () => {
 const p = parseIndicatorPack(pack);
 const other = {...item,platform:'reddit',accountKey:'@example',links:['https://not-example-bad.test/', 'https://a.example-bad.test/']};
 assert.deepEqual(matchIndicators(other,p),[]);
});
test('rejects unsafe or oversized indicator packs', () => {
 assert.throws(() => parseIndicatorPack({...pack, indicators:[{...pack.indicators[0],value:'localhost'}]}));
 assert.throws(() => parseIndicatorPack({...pack, indicators:Array.from({length:251},()=>pack.indicators[0])}));
 assert.throws(() => parseIndicatorPack({...pack, indicators:[{...pack.indicators[0],evidenceUrl:'javascript:alert(1)'}]}));
 assert.throws(() => parseIndicatorPack({...pack, sourceUrl:'http://example.org'}));
});
test('public URL extraction does not accept data or javascript URLs', () => {
 assert.equal(hostFromUrl('https://good.example/path'),'good.example');
 assert.equal(hostFromUrl('data:text/html,a'),undefined);
 assert.equal(hostFromUrl('https://localhost/'),undefined);
});

test('indicator packs reject unknown fields, credential-bearing provenance and UTF-8 overflow', () => {
  const valid = { schemaVersion: 1, title: 'Synthetic', publisher: 'Test', sourceUrl: 'https://example.org/source', indicators: [] };
  for (const value of [{ ...valid, executable: 'ignored payload' },
    { ...valid, sourceUrl: 'https://user:secret@example.org/source' },
    { ...valid, indicators: [{ kind: 'domain', value: 'example.com', note: 'Test', evidenceUrl: 'https://example.org/source', unknown: true }] },
    { ...valid, indicators: Array.from({ length: 240 }, () => ({ kind: 'domain', value: 'example.com', evidenceUrl: 'https://example.org/source', note: '多'.repeat(240) })) }]) {
    assert.throws(() => parseIndicatorPack(value));
  }
  assert.equal(parseIndicatorPack(valid).indicators.length, 0);
});
