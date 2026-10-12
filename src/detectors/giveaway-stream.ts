import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * GROUNDWORK — feature `fake-giveaway-streams`.
 * Feed/recommendation cards for fake livestreams ("LIVE: ETH giveaway, send 1
 * get 2 back") on channels impersonating a celebrity or company. Planned
 * evidence: crypto-giveaway title terms + "send X get 2X" patterns +
 * impersonation signals on the channel name (shared with impersonation.ts).
 * Applies to `kind: 'post'` video cards, not comments.
 */
export function createGiveawayStreamAnalyzer(): ContentAnalyzer {
  return {
    id: 'giveaway-stream',
    capabilities: ['fake-giveaway', 'impersonation', 'spam'],
    async analyze(_items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> { return []; },
  };
}
