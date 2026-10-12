import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * GROUNDWORK — feature `fake-verification-badges`.
 * Display names that imitate platform verification with characters or emoji
 * (✔️ ☑️ ✅ ✓ "Official ✓"). Uses the rendered display name (`item.author`),
 * never the platform's real badge element, which adapters should expose
 * separately if they want to exclude genuinely verified accounts.
 * Benign cases to keep: checkmarks in comment *text*, sports fans using ✅.
 */
export const BADGE_IMITATION_CHARS = ['✔', '☑', '✅', '✓'] as const;

export function createFakeBadgeAnalyzer(): ContentAnalyzer {
  return {
    id: 'fake-badge',
    capabilities: ['fake-badge', 'impersonation'],
    async analyze(_items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> { return []; },
  };
}
