import type { ContentAnalyzer } from '../core/analyzer-ports.ts';
import type { PageContext } from '../core/page-context.ts';
import { createReplyChainAnalyzer } from './reply-chain.ts';
import { createImpersonationAnalyzer } from './impersonation.ts';
import { createCopiedCommentAnalyzer } from './copied-comment.ts';
import { createProfileBaitAnalyzer } from './profile-bait.ts';
import { createGenericFillerAnalyzer } from './generic-filler.ts';
import { createFakeBadgeAnalyzer } from './fake-badge.ts';
import { createGiveawayStreamAnalyzer } from './giveaway-stream.ts';

/**
 * GROUNDWORK. All planned analyzers in one place. NOT called by the extension
 * controller yet; wiring happens per analyzer once it has tests and a benchmark
 * result. Analyzer evidence should feed policy.ts, never hide items directly.
 */
export function scaffoldedAnalyzers(context?: PageContext): ContentAnalyzer[] {
  return [
    createReplyChainAnalyzer(),
    createImpersonationAnalyzer(context),
    createCopiedCommentAnalyzer(),
    createProfileBaitAnalyzer(),
    createGenericFillerAnalyzer(),
    createFakeBadgeAnalyzer(),
    createGiveawayStreamAnalyzer(),
  ];
}
