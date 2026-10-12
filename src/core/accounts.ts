import { normalizeText } from './normalize.ts';
import type { Assessment, ContentItem } from './types.ts';
import { blockId } from './platforms.ts';

/**
 * The same account posting >=3 distinct high-evidence spam items in the *visible page*
 * may be an active spam source; this does not establish automated account identity.
 * This gate is opt-in and never writes a permanent blocklist entry.
 */
export function suspiciousAccounts(items: readonly ContentItem[], results: readonly Assessment[]): Set<string> {
  const evidence = new Map<string, Map<string, boolean>>();
  for (let i = 0; i < Math.min(items.length, results.length); i++) {
    const item = items[i]!;
    if (!item.platform || !item.accountKey || normalizeText(item.text).length < 20) continue;
    const key = blockId(item.platform, item.accountKey);
    const texts = evidence.get(key) ?? new Map<string, boolean>();
    const fingerprint = normalizeText(item.text).toLowerCase();
    texts.set(fingerprint, (texts.get(fingerprint) ?? false) || results[i]!.decision === 'collapse');
    evidence.set(key, texts);
  }
  const flagged = new Set<string>();
  for (const [key, fingerprints] of evidence) {
    const highRisk = [...fingerprints.values()].filter(Boolean).length;
    if (fingerprints.size >= 3 && highRisk >= 3 && highRisk / fingerprints.size >= 0.75) flagged.add(key);
  }
  return flagged;
}
