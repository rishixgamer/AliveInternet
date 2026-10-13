import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountEvidence} from '../src/core/behavior.ts';
import {domainCampaignCandidates, campaignGraph} from '../src/network/campaigns.ts';
const item = (platform,accountKey,host='https://promo.example') => ({id:`${platform}:${accountKey}`,platform,kind:'post',accountKey,author:'different display',text:'This is a normal public post for testing.',links:[host]});
const verdict = (decision='allow') => ({id:'1',decision,score:0,signals:[],reason:'synthetic'});
test('account evidence summarizes observed page only and no identity probability', () => {
 const result=accountEvidence([item('x','@same'),item('x','@same')],[verdict('flag'),verdict('collapse')]).get('x:@same');
 assert.equal(result.itemsObserved,2);
 assert.equal(result.distinctTexts,1);
 assert.equal(result.collapsedByRules,1);
 assert.match(result.limits,/no posting history/i);
 assert.equal('botProbability' in result,false);
});
test('campaign candidates require multiple exact public accounts and are explicitly uncertain', () => {
 const items=[item('x','@a'),item('youtube','@b'),item('reddit','@c')];
 const candidates=domainCampaignCandidates(items);
 assert.equal(candidates.length,1);
 assert.equal(candidates[0].platforms.length,3);
 assert.match(candidates[0].caveat,/do not prove/i);
 assert.equal(campaignGraph(candidates).edges.length,3);
 assert.equal(domainCampaignCandidates(items.slice(0,2)).length,0);
});
test('shared display names without verified keys never produce network links', () => {
 const items=[item('x','@a'),item('x','@b'),item('x','@c')];
 items.forEach(x => {delete x.accountKey;});
 assert.deepEqual(domainCampaignCandidates(items),[]);
});
