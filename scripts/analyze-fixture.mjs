/**
 * Offline, manual, local-only investigation of synthetic or permissioned fixtures.
 * Usage: node scripts/analyze-fixture.mjs [path/to/your-local-fixture.json]
 * Never fetches feeds or accounts, never claims confirmed bot identity.
 */
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {assessBatch} from '../src/core/filter.ts';
import {accountEvidence} from '../src/core/behavior.ts';
import {domainCampaignCandidates, campaignGraph} from '../src/network/campaigns.ts';
import {duplicateComments} from '../src/core/dedupe.ts';
const filepath = process.argv[2] ?? fileURLToPath(new URL('../fixtures/synthetic-campaign.json',import.meta.url));
const buf = await readFile(filepath);
if (buf.length > 2_000_000) throw new Error('Dataset exceeds 2 MB bound');
const items = JSON.parse(buf.toString('utf8'));
if (!Array.isArray(items) || items.length > 500 || !items.every(x => x && typeof x.id==='string' && x.id.length<200 &&
  typeof x.text==='string' && x.text.length<=10000 && typeof x.author==='string' &&
  Array.isArray(x.links) && x.links.length<=20 && x.links.every(y => typeof y==='string' && y.length<2048))) {
  throw new Error('Expected a bounded array of local public-content fixtures');
}
const verdicts = assessBatch(items);
const accounts = accountEvidence(items,verdicts);
const campaigns = domainCampaignCandidates(items);
console.log(JSON.stringify({
  note:'Exploratory local findings only, not proof of automation or coordination.',
  scannedItems: items.length,
  highEvidenceRules: verdicts.filter(v=>v.decision==='collapse').length,
  duplicateCandidates: duplicateComments(items).size,
  accountEvidence: [...accounts.values()], campaigns,
  graph: campaignGraph(campaigns),
},null,2));
