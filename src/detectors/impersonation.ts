import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { PageContext } from '../core/page-context.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * GROUNDWORK — feature `creator-impersonation`.
 *
 * Target pattern: a commenter whose display name or handle imitates the page
 * owner ("MrBeast", "@MrBeast_Official") and solicits off-platform contact or
 * prize claims.
 *
 * Planned evidence:
 *  - foldConfusables(name) skeleton equals / is within small edit distance of the owner's
 *  - commenter's validated accountKey differs from PageContext.ownerAccountKey
 *  - AND a contact or prize-claim signal (similar name alone is NOT enough: fan accounts exist)
 *
 * Prerequisite: adapters must provide PageContext (owner name/key from the page).
 */
export function createImpersonationAnalyzer(_context: PageContext | undefined): ContentAnalyzer {
  return {
    id: 'impersonation',
    capabilities: ['impersonation', 'spam'],
    async analyze(_items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> { return []; },
  };
}
