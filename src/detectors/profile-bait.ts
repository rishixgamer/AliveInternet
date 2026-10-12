import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * Feature `profile-bait-detection` — implemented analyzer.
 *
 * Target pattern: emoji-heavy replies that push readers to the author's profile
 * or bio ("check my profile", "my pics are on my page"), common on Shorts and X.
 *
 * Exclusions (never flagged): page-owner items, portfolio/commission mentions,
 * and giveaway-rule texts — creators legitimately say "link in bio".
 */
const PROFILE_BAIT_RE = /\b(?:check(?: out)?(?: my| the)?\s+(?:profile|page|bio|account)|see\s+(?:my\s+)?(?:profile|bio|page)|visit\s+(?:my\s+)?(?:profile|page)|my\s+(?:pics|photos|content|videos?)\s+(?:are\s+)?on\s+my\s+(?:page|profile)|link\s+in\s+(?:my\s+)?bio)\b/i;
const PORTFOLIO_EXCLUDE_RE = /\b(?:portfolio|commissions?|art\s+station|deviantart|giveaway\s+rules|how\s+to\s+enter)\b/i;

export function createProfileBaitAnalyzer(): ContentAnalyzer {
  return {
    id: 'profile-bait',
    capabilities: ['profile-bait', 'spam'],
    async analyze(items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> {
      const out: AnalyzerEvidence[] = [];
      for (const item of items) {
        if (item.isCreator) continue;
        if (!PROFILE_BAIT_RE.test(item.text)) continue;
        if (PORTFOLIO_EXCLUDE_RE.test(item.text)) continue;
        out.push({
          category: 'profile-bait',
          description: 'Pushes readers to the author profile/bio (advisory only)',
          evidenceIds: [item.id],
          source: 'rules',
        });
      }
      return out;
    },
  };
}
