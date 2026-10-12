import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * GROUNDWORK — feature `reply-chain-detection`.
 *
 * Target pattern (YouTube especially): a top-level testimonial ("I met Mrs. X,
 * her strategy earned me $40k") followed by replies from other accounts that
 * endorse the same named person or contact handle.
 *
 * Planned evidence (all page-local, never "bot" claims):
 *  - >= N replies in one thread from distinct accounts name the same person/handle
 *  - the top-level item contains an earnings claim
 *  - contact handles extracted via src/core/obfuscation.ts
 *
 * Prerequisite: adapters must fill live-verified `threadId` / `parentId`.
 * YouTube reply extraction has synthetic DOM tests; the relationship fields
 * and live-browser verification are still pending in docs/agent-backlog.md.
 */
export interface ReplyChainOptions {
  /** Distinct replying accounts that must endorse the same name/handle. */
  minEndorsingAccounts: number;
}
export const DEFAULT_REPLY_CHAIN_OPTIONS: ReplyChainOptions = { minEndorsingAccounts: 3 };

export function createReplyChainAnalyzer(_options: ReplyChainOptions = DEFAULT_REPLY_CHAIN_OPTIONS): ContentAnalyzer {
  return {
    id: 'reply-chain',
    capabilities: ['reply-chain', 'spam'],
    // Inert until implemented: returns no evidence.
    async analyze(_items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> { return []; },
  };
}
