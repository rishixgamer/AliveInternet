import type { Assessment, ContentItem } from './types.ts';
import { blockId } from './platforms.ts';
import { duplicateKey } from './normalize.ts';

export interface AccountEvidence {
  accountId: string;
  itemsObserved: number;
  distinctTexts: number;
  collapsedByRules: number;
  flaggedByRules: number;
  linkedHosts: string[];
  findings: string[];
  limits: string;
}

/** Summarizes only content actually visible in the current page scan. No bot score. */
export function accountEvidence(items: readonly ContentItem[], verdicts: readonly Assessment[]): Map<string, AccountEvidence> {
  const groups = new Map<string, { texts: Set<string>; hosts: Set<string>; high: number; flagged: number; n: number }>();
  for (let i = 0; i < Math.min(items.length, verdicts.length); i++) {
    const item = items[i]!;
    if (!item.platform || !item.accountKey) continue;
    const key = blockId(item.platform, item.accountKey);
    const group = groups.get(key) ?? { texts: new Set<string>(), hosts: new Set<string>(), high: 0, flagged: 0, n: 0 };
    group.n++;
    group.texts.add(duplicateKey(item.text));
    const decision = verdicts[i]!.decision;
    if (decision === 'collapse') group.high++;
    if (decision === 'flag') group.flagged++;
    for (const link of item.links) {
      try { const url = new URL(link); if (url.protocol === 'https:' || url.protocol === 'http:') group.hosts.add(url.hostname.toLowerCase()); }
      catch { /* Ignore malformed links. */ }
    }
    groups.set(key, group);
  }
  const result = new Map<string, AccountEvidence>();
  for (const [key, group] of groups) {
    const findings: string[] = [];
    if (group.high) findings.push(`${group.high} visible item(s) met the high-evidence spam-rule threshold`);
    if (group.flagged) findings.push(`${group.flagged} visible item(s) have uncertain spam-rule signals`);
    if (group.n > group.texts.size) findings.push(`${group.n - group.texts.size} repeated text instance(s) observed`);
    if (group.hosts.size) findings.push(`${group.hosts.size} unique linked host(s) observed`);
    result.set(key, {accountId: key, itemsObserved: group.n, distinctTexts: group.texts.size,
      collapsedByRules: group.high, flaggedByRules: group.flagged,
      linkedHosts: [...group.hosts].slice(0, 15), findings,
      limits: 'Current visible page only. No posting history, hidden IP address, true location, or verified bot identity.' });
  }
  return result;
}
