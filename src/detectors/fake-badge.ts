import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * Feature `fake-verification-badges` — implemented analyzer.
 * Display names that imitate platform verification with characters or emoji
 * (✔️ ☑️ ✅ ✓ "Official ✓"). Uses the rendered display name (`item.author`),
 * never the platform's real badge element, which adapters should expose
 * separately if they want to exclude genuinely verified accounts.
 * Checkmarks in comment *text* never trigger; only the author field is read.
 */
export const BADGE_IMITATION_CHARS = ['✔', '☑', '✅', '✓'] as const;

export function createFakeBadgeAnalyzer(): ContentAnalyzer {
  return {
    id: 'fake-badge',
    capabilities: ['fake-badge', 'impersonation'],
    async analyze(items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> {
      const out: AnalyzerEvidence[] = [];
      for (const item of items) {
        const author = item.author ?? '';
        if (BADGE_IMITATION_CHARS.some((ch) => author.includes(ch))) {
          out.push({
            category: 'fake-badge',
            description: `Display name contains verification-lookalike character (advisory only; check the platform badge)`,
            evidenceIds: [item.id],
            source: 'rules',
          });
        }
      }
      return out;
    },
  };
}
