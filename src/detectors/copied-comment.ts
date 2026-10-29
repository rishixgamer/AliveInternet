import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import { duplicateKey } from '../core/normalize.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * Feature `copied-comment-detection` — implemented analyzer.
 *
 * Target pattern (Shorts especially): a later account re-posts an earlier,
 * popular comment verbatim to farm likes.
 *
 * Evidence: same duplicateKey as an item with a smaller `observedOrder`
 * (or earlier array position) from a different validated account. Unlike
 * dedupe.ts (>= 4 accounts), a single copy can qualify, so short generic
 * comments ("first!", "so true") are excluded by a length/entropy floor.
 * The earliest copy always stays visible.
 */
export interface CopiedCommentOptions { minLength: number; }
export const DEFAULT_COPIED_COMMENT_OPTIONS: CopiedCommentOptions = { minLength: 60 };

export function createCopiedCommentAnalyzer(options: CopiedCommentOptions = DEFAULT_COPIED_COMMENT_OPTIONS): ContentAnalyzer {
  return {
    id: 'copied-comment',
    capabilities: ['copied-comment', 'repetition'],
    async analyze(items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> {
      const out: AnalyzerEvidence[] = [];
      const seen = new Map<string, string>();
      const ordered = items.map((item, index) => ({ item, index, order: item.observedOrder ?? index }))
        .sort((a, b) => a.order - b.order || a.index - b.index);
      for (const { item } of ordered) {
        const key = duplicateKey(item.text);
        if (item.kind === 'post' || !item.platform || !item.accountKey || key.length < options.minLength) continue;
        const group = `${item.platform}:${key}`;
        const first = seen.get(group);
        const account = `${item.platform}:${item.accountKey}`;
        if (!first) {
          seen.set(group, account);
          continue;
        }
        if (first !== account) {
          out.push({
            category: 'copied-comment',
            description: 'Same text as an earlier visible comment from a different account (readability advisory; not proof of copying or automation)',
            evidenceIds: [item.id],
            source: 'rules',
          });
        }
      }
      return out;
    },
  };
}
