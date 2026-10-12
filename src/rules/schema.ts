import type { Platform } from '../core/platforms.ts';
import type { AnalyzerCategory } from '../core/analyzer-ports.ts';
import { NotImplementedError } from '../core/scaffold.ts';

/**
 * GROUNDWORK — features `community-rule-lists` and `language-rule-packs`.
 * Full spec: docs/rule-list-spec.md. Examples: rules/.
 *
 * Declarative so non-programmers can contribute by pull request. Deliberately
 * NO raw regular expressions (ReDoS risk, unreadable reviews): rules are term
 * groups that must co-occur, which mirrors how filter.ts already combines
 * signals. Lists are untrusted input, exactly like indicator packs.
 */
export type RuleAction = 'flag' | 'collapse-candidate';

export interface RuleTermGroup {
  /** Matches if ANY term appears (after duplicateKey normalization + obfuscation folding). */
  anyOf: string[];
}
export interface RuleExamples {
  /** Must match. Synthetic or de-identified only. */
  positive: string[];
  /** Must NOT match. At least one benign look-alike per rule. */
  benign: string[];
}
export interface Rule {
  id: string;
  description: string;
  category: AnalyzerCategory;
  /** BCP-47 tag, e.g. "en", "es", "pt-BR". */
  locale: string;
  platforms?: Platform[];
  /** ALL groups must match. */
  allOf: RuleTermGroup[];
  /** Any match here cancels the rule (e.g. "no guaranteed returns"). */
  noneOf?: RuleTermGroup[];
  weight: number;
  action: RuleAction;
  examples: RuleExamples;
}
export interface RuleList {
  schemaVersion: 1;
  id: string;
  title: string;
  maintainer: string;
  homepage: string;
  version: string;
  /** ISO date after which the list must be refreshed or ignored. */
  expires: string;
  license: string;
  rules: Rule[];
}
export interface RuleListSubscription {
  url: string;
  /** Pinned publisher public key; unsigned lists are never auto-applied. */
  publisherKey: string;
  lastFetched?: string;
}
export const RULE_LIST_LIMITS = { maxRules: 500, maxTermsPerGroup: 50, maxTermLength: 80, maxBytes: 250_000 } as const;

export function parseRuleList(_value: unknown): RuleList {
  throw new NotImplementedError('community-rule-lists');
}
