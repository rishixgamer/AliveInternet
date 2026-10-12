import type { Platform } from '../core/platforms.ts';
import type { AnalyzerCategory } from '../core/analyzer-ports.ts';
import { duplicateKey } from '../core/normalize.ts';
import { foldConfusables, collapseSpacedLetters } from '../core/obfuscation.ts';
import type { ContentItem } from '../core/types.ts';

/**
 * Feature `community-rule-lists` — implemented parser/matcher (local import only).
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

export function parseRuleList(value: unknown): RuleList {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (text.length > RULE_LIST_LIMITS.maxBytes) throw new Error('Rule list is too large');
  const raw: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Rule list must be an object');
  const list = raw as Record<string, unknown>;
  if (list.schemaVersion !== 1) throw new Error('Unsupported rule-list schema version');
  for (const field of ['id', 'title', 'maintainer', 'homepage', 'version', 'expires', 'license']) {
    if (typeof list[field] !== 'string' || !(list[field] as string).trim()) throw new Error(`Rule list field ${field} is required`);
  }
  if (!Array.isArray(list.rules)) throw new Error('Rule list rules must be an array');
  if (list.rules.length > RULE_LIST_LIMITS.maxRules) throw new Error('Too many rules');
  const rules: Rule[] = (list.rules as unknown[]).map((entry, index) => parseRule(entry, index));
  const parsed: RuleList = {
    schemaVersion: 1,
    id: list.id as string, title: list.title as string, maintainer: list.maintainer as string,
    homepage: list.homepage as string, version: list.version as string,
    expires: list.expires as string, license: list.license as string, rules,
  };
  // Every rule carries its own tests: positives must match, benign must not.
  for (const rule of parsed.rules) {
    for (const positive of rule.examples.positive) {
      if (!ruleMatches(rule, { id: 'example', author: '', text: positive, links: [] })) {
        throw new Error(`Rule ${rule.id} does not match its positive example`);
      }
    }
    for (const benign of rule.examples.benign) {
      if (ruleMatches(rule, { id: 'example', author: '', text: benign, links: [] })) {
        throw new Error(`Rule ${rule.id} matches its benign example`);
      }
    }
  }
  return parsed;
}

function parseTermGroup(value: unknown, ruleId: string): RuleTermGroup {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Rule ${ruleId} has an invalid term group`);
  const anyOf = (value as { anyOf?: unknown }).anyOf;
  if (!Array.isArray(anyOf) || anyOf.length === 0 || anyOf.length > RULE_LIST_LIMITS.maxTermsPerGroup) {
    throw new Error(`Rule ${ruleId} term group must have 1-${RULE_LIST_LIMITS.maxTermsPerGroup} terms`);
  }
  const terms = anyOf.map((term) => {
    if (typeof term !== 'string' || !term.trim() || term.length > RULE_LIST_LIMITS.maxTermLength) {
      throw new Error(`Rule ${ruleId} has an invalid term`);
    }
    return term;
  });
  return { anyOf: terms };
}

function parseRule(value: unknown, index: number): Rule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Rule at index ${index} must be an object`);
  const rule = value as Record<string, unknown>;
  const id = typeof rule.id === 'string' ? rule.id : `rule-${index}`;
  if (typeof rule.description !== 'string' || !rule.description.trim()) throw new Error(`Rule ${id} needs a description`);
  if (typeof rule.locale !== 'string' || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(rule.locale)) throw new Error(`Rule ${id} needs a BCP-47 locale`);
  if (!Array.isArray(rule.allOf) || rule.allOf.length === 0) throw new Error(`Rule ${id} needs at least one allOf group`);
  const allOf = rule.allOf.map((group) => parseTermGroup(group, id));
  const noneOf = Array.isArray(rule.noneOf) ? rule.noneOf.map((group) => parseTermGroup(group, id)) : undefined;
  if (typeof rule.weight !== 'number' || rule.weight <= 0 || rule.weight > 10) throw new Error(`Rule ${id} needs a weight 1-10`);
  if (rule.action !== 'flag' && rule.action !== 'collapse-candidate') throw new Error(`Rule ${id} needs a valid action`);
  const examples = rule.examples as { positive?: unknown; benign?: unknown } | undefined;
  if (!examples || !Array.isArray(examples.positive) || examples.positive.length === 0 ||
      !Array.isArray(examples.benign) || examples.benign.length === 0) {
    throw new Error(`Rule ${id} needs positive and benign examples`);
  }
  return {
    id, description: rule.description, category: (rule.category as Rule['category']) ?? 'spam',
    locale: rule.locale, platforms: Array.isArray(rule.platforms) ? rule.platforms as Rule['platforms'] : undefined,
    allOf, noneOf, weight: rule.weight, action: rule.action,
    examples: { positive: examples.positive as string[], benign: examples.benign as string[] },
  };
}

function normalizedHaystack(item: ContentItem): string {
  const combined = `${item.text} ${item.links.join(' ')}`;
  return ` ${duplicateKey(collapseSpacedLetters(foldConfusables(combined)))} `;
}

/** Term matching on word boundaries over normalized text (no regex lists). */
export function ruleMatches(rule: Rule, item: ContentItem): boolean {
  if (rule.platforms && item.platform && !rule.platforms.includes(item.platform)) return false;
  const haystack = normalizedHaystack(item);
  const groupHits = (group: RuleTermGroup): boolean => group.anyOf.some((term) => {
    const needle = duplicateKey(collapseSpacedLetters(foldConfusables(term)));
    return needle.length > 0 && haystack.includes(` ${needle} `);
  });
  if (!rule.allOf.every(groupHits)) return false;
  if (rule.noneOf?.some(groupHits)) return false;
  return true;
}

/** Returns the ids of rules matching an item (evidence candidates for policy.ts). */
export function matchRuleList(list: RuleList, item: ContentItem): Rule[] {
  return list.rules.filter((rule) => ruleMatches(rule, item));
}
