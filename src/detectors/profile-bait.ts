import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * GROUNDWORK — feature `profile-bait-detection`.
 *
 * Target pattern: emoji-heavy replies that push readers to the author's profile
 * or bio ("check my profile", "my pics are on my page"), common on Shorts and X.
 *
 * Benign counterexamples the rules must keep: creators saying "link in bio",
 * artists pointing to their portfolio, giveaway rules from the page owner.
 */
export function createProfileBaitAnalyzer(): ContentAnalyzer {
  return {
    id: 'profile-bait',
    capabilities: ['profile-bait', 'spam'],
    async analyze(_items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> { return []; },
  };
}
