import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * Feature `generic-filler-preference` — implemented analyzer.
 *
 * A USER PREFERENCE for hiding low-information praise ("Great insight! This
 * really resonates 🙌"). It must never be presented as AI-generated-text or bot
 * detection: neither can be established from a single comment. UI copy should
 * read "generic comment (your preference)". Default off.
 */
const GENERIC_FILLER_PATTERNS = [
  /^(?:great|nice|awesome|amazing|excellent|wonderful|fantastic|beautiful|cool|love it|so true|first|so good)\b[^.]{0,60}$/i,
  /^thanks?\s+for\s+(?:sharing|this|the\s+video)[!.🙌👏]*$/i,
  /^great\s+(?:video|insight|content|point|job)[!.🙌👏]*$/i,
  /^(?:this\s+)?really\s+(?:resonates|helpful|inspiring)[!.🙌👏\s]*$/i,
];

export function createGenericFillerAnalyzer(): ContentAnalyzer {
  return {
    id: 'generic-filler',
    capabilities: ['generic-filler'],
    async analyze(items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> {
      const out: AnalyzerEvidence[] = [];
      for (const item of items) {
        if (item.links.length > 0) continue;
        const text = item.text.trim();
        if (text.length === 0 || text.length > 120) continue;
        if (GENERIC_FILLER_PATTERNS.some((re) => re.test(text))) {
          out.push({
            category: 'generic-filler',
            description: 'Generic low-information praise (your preference only; not AI/bot evidence)',
            evidenceIds: [item.id],
            source: 'rules',
          });
        }
      }
      return out;
    },
  };
}
