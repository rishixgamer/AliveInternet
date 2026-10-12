import type { ContentAnalyzer, AnalyzerEvidence } from '../core/analyzer-ports.ts';
import type { ContentItem } from '../core/types.ts';
import { extractContactHandles } from '../core/obfuscation.ts';

/**
 * Feature `reply-chain-detection` — implemented analyzer over verified thread fields.
 *
 * Target pattern (YouTube especially): a top-level testimonial ("I met Mrs. X,
 * her strategy earned me $40k") followed by replies from other accounts that
 * endorse the same named person or contact handle.
 *
 * Evidence (all page-local, never "bot" claims):
 *  - >= N replies in one thread from distinct accounts name the same person/handle
 *  - the top-level item contains an earnings claim
 *  - contact handles extracted via src/core/obfuscation.ts
 *
 * Returns [] when adapters have not filled live-verified `threadId`/`parentId`.
 * YouTube reply extraction has synthetic DOM tests; the relationship fields
 * and live-browser verification are still pending in docs/agent-backlog.md.
 */
export interface ReplyChainOptions {
  /** Distinct replying accounts that must endorse the same name/handle. */
  minEndorsingAccounts: number;
}
export const DEFAULT_REPLY_CHAIN_OPTIONS: ReplyChainOptions = { minEndorsingAccounts: 3 };

const EARNINGS_RE = /\$ ?\d|earned|earning|profit|returns?|made \d|financial freedom/i;
const MONEY_CONTEXT_RE = /crypto|bitcoin|forex|trading|investment|profit|returns?|wallet|deposit|money|earnings?/i;
const NAME_RE = /\b(?:Mrs?\.|Ms\.|Dr\.|Mr\.)\s+[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+)?\b/g;

function endorsements(text: string): string[] {
  const found = new Set<string>();
  for (const handle of extractContactHandles(text)) found.add(handle.value.toLowerCase());
  for (const at of text.matchAll(/@[A-Za-z0-9_]{3,30}/g)) found.add(at[0].toLowerCase());
  for (const name of text.matchAll(NAME_RE)) found.add(name[0].toLowerCase());
  return [...found];
}

export function createReplyChainAnalyzer(options: ReplyChainOptions = DEFAULT_REPLY_CHAIN_OPTIONS): ContentAnalyzer {
  return {
    id: 'reply-chain',
    capabilities: ['reply-chain', 'spam'],
    async analyze(items: readonly ContentItem[]): Promise<readonly AnalyzerEvidence[]> {
      const byThread = new Map<string, ContentItem[]>();
      for (const item of items) {
        if (!item.threadId) continue;
        const group = byThread.get(item.threadId) ?? [];
        group.push(item);
        byThread.set(item.threadId, group);
      }
      if (byThread.size === 0) return [];
      const out: AnalyzerEvidence[] = [];
      for (const [, group] of byThread) {
        const top = group.find((item) => !item.parentId) ?? group[0]!;
        if (!EARNINGS_RE.test(top.text) || !MONEY_CONTEXT_RE.test(top.text)) continue;
        const replies = group.filter((item) => item.id !== top.id);
        if (replies.length === 0) continue;
        const counts = new Map<string, { accounts: Set<string>; ids: string[] }>();
        for (const reply of replies) {
          const account = reply.accountKey ? `${reply.platform}:${reply.accountKey}` : reply.author;
          for (const endorsement of endorsements(`${reply.text} ${reply.links.join(' ')}`)) {
            const entry = counts.get(endorsement) ?? { accounts: new Set(), ids: [] };
            entry.accounts.add(account);
            entry.ids.push(reply.id);
            counts.set(endorsement, entry);
          }
        }
        for (const [, entry] of counts) {
          if (entry.accounts.size >= options.minEndorsingAccounts) {
            out.push({
              category: 'reply-chain',
              description: `Testimonial thread endorsed by ${entry.accounts.size} distinct visible accounts (advisory only)`,
              evidenceIds: [top.id, ...entry.ids],
              source: 'rules',
            });
          }
        }
      }
      return out;
    },
  };
}
