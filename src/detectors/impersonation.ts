import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { PageContext } from '../core/page-context.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * Feature `creator-impersonation` — implemented analyzer.
 *
 * Target pattern: a commenter whose display name or handle imitates the page
 * owner ("MrBeast", "@MrBeast_Official") and solicits off-platform contact or
 * prize claims.
 *
 * Evidence (all three required):
 *  - foldConfusables(name) skeleton equals / is within small edit distance of the owner's
 *  - commenter's validated accountKey differs from PageContext.ownerAccountKey
 *  - AND a contact or prize-claim signal (similar name alone is NOT enough: fan accounts exist)
 *
 * Returns [] when adapters have not provided a verified PageContext.
 */
import { foldConfusables, extractContactHandles } from '../core/obfuscation.ts';

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const nextDiag = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = nextDiag;
    }
  }
  return prev[b.length]!;
}

function normalizeName(name: string): string {
  return foldConfusables(name).toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9]/g, '');
}

const SOLICITATION_RE = /telegram|whatsapp|contact\s+me|message\s+me|\bdm\s+me|t\.me\/|wa\.me\/|giveaway|claim|prize|reward|official|support\s+team/i;

export function createImpersonationAnalyzer(context: PageContext | undefined): ContentAnalyzer {
  return {
    id: 'impersonation',
    capabilities: ['impersonation', 'spam'],
    async analyze(items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> {
      if (!context?.ownerDisplayName) return [];
      const owner = normalizeName(context.ownerDisplayName);
      if (owner.length < 3) return [];
      const out: AnalyzerEvidence[] = [];
      for (const item of items) {
        const candidate = normalizeName(item.author ?? '');
        if (candidate.length < 3) continue;
        const skeletonMatch = candidate === owner ||
          (candidate.includes(owner) && candidate.length <= owner.length + 12) ||
          editDistance(candidate, owner) <= 2;
        if (!skeletonMatch) continue;
        if (context.ownerAccountKey && item.accountKey &&
            item.accountKey.toLowerCase() === context.ownerAccountKey.toLowerCase()) continue;
        if (!item.accountKey) continue;
        const text = `${item.text} ${item.links.join(' ')}`;
        if (!SOLICITATION_RE.test(text) && extractContactHandles(text).length === 0) continue;
        out.push({
          category: 'impersonation',
          description: 'Display name imitates the page owner and solicits contact/prize claim (advisory only)',
          evidenceIds: [item.id],
          source: 'rules',
        });
      }
      return out;
    },
  };
}
