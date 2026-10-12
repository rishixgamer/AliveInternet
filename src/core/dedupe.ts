import type { ContentItem } from './types.ts';
import { duplicateKey } from './normalize.ts';

export interface DuplicateFinding {
  /** The first visible comment stays visible; this index is a redundant copy. */
  keptIndex: number;
  groupSize: number;
  independentAccounts: number;
  similarity: 'lexical';
}

/**
 * Local, opt-in readability feature, NOT bot attribution. Only long comments from
 * >= minAccounts distinct validated profile URLs can be collapsed. No generic
 * short agreements, no across-page persistence, and no cross-site merging.
 */
export function duplicateComments(
  items: readonly ContentItem[],
  { minAccounts = 4, minLength = 80, threshold = 0.88 } = {},
): Map<number, DuplicateFinding> {
  const candidates = items.map((item, index) => ({ item, index,
    key: duplicateKey(item.text),
    tokens: new Set(duplicateKey(item.text).split(/\s+/).filter(Boolean)),
  })).filter(({ item, key }) => item.kind === 'comment' && Boolean(item.accountKey) &&
    Boolean(item.platform) && key.length >= minLength);
  const groups: typeof candidates[] = [];
  for (const candidate of candidates) {
    let assigned = false;
    for (const group of groups) {
      const first = group[0]!;
      if (candidate.item.platform !== first.item.platform) continue;
      const lengthRatio = Math.min(candidate.key.length, first.key.length) / Math.max(candidate.key.length, first.key.length);
      if (lengthRatio < 0.78) continue;
      const common = [...candidate.tokens].filter(word => first.tokens.has(word)).length;
      const union = new Set([...candidate.tokens, ...first.tokens]).size;
      if (candidate.key === first.key || (union > 0 && common / union >= threshold)) {
        group.push(candidate); assigned = true; break;
      }
    }
    if (!assigned) groups.push([candidate]);
  }
  const duplicates = new Map<number, DuplicateFinding>();
  for (const group of groups) {
    const accounts = new Set(group.map(({item}) => `${item.platform}:${item.accountKey}`));
    if (accounts.size < minAccounts) continue;
    // Keep one comment per validated account visible, and keep the first copy.
    const seen = new Set<string>();
    const keptIndex = group[0]!.index;
    for (const { item, index } of group) {
      const account = `${item.platform}:${item.accountKey}`;
      if (!seen.has(account)) {
        seen.add(account);
        if (index === keptIndex) continue;
        duplicates.set(index, { keptIndex, groupSize: group.length, independentAccounts: accounts.size, similarity: 'lexical' });
      }
    }
  }
  return duplicates;
}
