import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * GROUNDWORK — feature `copied-comment-detection`.
 *
 * Target pattern (Shorts especially): a later account re-posts an earlier,
 * popular comment verbatim to farm likes.
 *
 * Planned evidence: same duplicateKey (or dedupe.ts lexical match) as an item
 * with a smaller `observedOrder` from a different validated account. Unlike
 * dedupe.ts (>= 4 accounts), a single copy can qualify, so short generic
 * comments ("first!", "so true") must be excluded by a length/entropy floor.
 * The earliest copy always stays visible.
 */
export interface CopiedCommentOptions { minLength: number; }
export const DEFAULT_COPIED_COMMENT_OPTIONS: CopiedCommentOptions = { minLength: 60 };

export function createCopiedCommentAnalyzer(_options: CopiedCommentOptions = DEFAULT_COPIED_COMMENT_OPTIONS): ContentAnalyzer {
  return {
    id: 'copied-comment',
    capabilities: ['copied-comment', 'repetition'],
    async analyze(_items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> { return []; },
  };
}
