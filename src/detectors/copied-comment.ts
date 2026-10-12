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
      const seen = new Map<string, { order: number; account: string }>();
      items.forEach((item, arrayIndex) => {
        const order = item.observedOrder ?? arrayIndex;
        const key = duplicateKey(item.text);
        if (item.kind === 'post' || key.length < options.minLength) {
          // Still record long originals so later copies can match, but never flag short items.
          if (key.length >= options.minLength && !seen.has(key)) {
            seen.set(key, { order, account: `${item.platform}:${item.accountKey}` });
          }
          return;
        }
        const first = seen.get(key);
        const account = `${item.platform}:${item.accountKey}`;
        if (!first) {
          seen.set(key, { order, account });
          return;
        }
        const differentAccount = Boolean(item.accountKey) && first.account !== account;
        const laterCopy = order > first.order || (order === first.order && arrayIndex > 0);
        if (differentAccount && laterCopy) {
          out.push({
            category: 'copied-comment',
            description: 'Verbatim repost of an earlier visible comment (earliest copy stays visible)',
            evidenceIds: [item.id],
            source: 'rules',
          });
        }
      });
      return out;
    },
  };
}
