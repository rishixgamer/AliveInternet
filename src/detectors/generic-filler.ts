import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * GROUNDWORK — feature `generic-filler-preference`.
 *
 * A USER PREFERENCE for hiding low-information praise ("Great insight! This
 * really resonates 🙌"). It must never be presented as AI-generated-text or bot
 * detection: neither can be established from a single comment. UI copy should
 * read "generic comment (your preference)". Default off.
 */
export function createGenericFillerAnalyzer(): ContentAnalyzer {
  return {
    id: 'generic-filler',
    capabilities: ['generic-filler'],
    async analyze(_items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> { return []; },
  };
}
