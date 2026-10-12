import type { ContentItem } from '../core/types.ts';
import { hostFromUrl } from '../intel/indicators.ts';
import { blockId } from '../core/platforms.ts';

export interface CampaignCandidate {
  domain: string;
  accountIds: string[];
  platforms: string[];
  visibleItems: number;
  evidence: 'shared-linked-domain';
  caveat: string;
}
/**
 * Generate inspectable candidates, never conclusions or automatic blocks.
 * Repeated links to a domain across independent public accounts can also be
 * normal organic sharing; provenance/contextual review is mandatory.
 */
export function domainCampaignCandidates(items: readonly ContentItem[], minAccounts = 3): CampaignCandidate[] {
  const hosts = new Map<string, { accounts: Set<string>; platforms: Set<string>; items: number }>();
  for (const item of items) {
    if (!item.platform || !item.accountKey) continue;
    const account = blockId(item.platform, item.accountKey);
    for (const host of new Set(item.links.map(hostFromUrl).filter((h): h is string => Boolean(h)))) {
      const group = hosts.get(host) ?? {accounts: new Set<string>(), platforms: new Set<string>(), items: 0};
      group.accounts.add(account); group.platforms.add(item.platform); group.items++;
      hosts.set(host, group);
    }
  }
  return [...hosts].filter(([, group]) => group.accounts.size >= minAccounts)
    .map(([domain, group]) => ({domain, accountIds: [...group.accounts].sort(),
      platforms: [...group.platforms].sort(), visibleItems: group.items,
      evidence: 'shared-linked-domain' as const,
      caveat: 'Shared URLs alone do not prove bots, coordination, common ownership, or malicious activity.'}));
}

/** A bounded graph DTO for future Cytoscape/Sigma visualizations. */
export function campaignGraph(candidates: readonly CampaignCandidate[]): {
  nodes: { id: string; type: 'domain' | 'account' }[];
  edges: { source: string; target: string; evidence: string }[];
} {
  const nodes = new Map<string, {id: string; type: 'domain' | 'account'}>();
  const edges: {source:string; target:string; evidence:string}[] = [];
  for (const candidate of candidates) {
    const domain = `domain:${candidate.domain}`;
    nodes.set(domain, {id:domain, type:'domain'});
    for (const account of candidate.accountIds) {
      nodes.set(`account:${account}`, {id:`account:${account}`, type:'account'});
      edges.push({source:`account:${account}`, target:domain, evidence:'linked-to-domain'});
    }
  }
  return {nodes:[...nodes.values()], edges};
}
