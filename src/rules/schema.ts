import { PLATFORMS, type Platform } from '../core/platforms.ts';
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
export const RULE_LIST_LIMITS = { maxRules: 500, maxGroups: 20, maxExamples: 20, maxTermsPerGroup: 50, maxTermLength: 80, maxBytes: 250_000 } as const;

const CATEGORIES: readonly AnalyzerCategory[] = ['spam', 'coordination', 'repetition', 'synthetic-media', 'malicious-link',
  'reply-chain', 'impersonation', 'copied-comment', 'profile-bait', 'obfuscation', 'generic-filler',
  'fake-badge', 'fake-giveaway', 'lookalike-domain', 'deceptive-link'];

function checkKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  if (Object.keys(value).some(key => !keys.includes(key))) throw new Error('Unknown rule-list field');
}

export function parseRuleList(value: unknown): RuleList {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (!text || new TextEncoder().encode(text).length > RULE_LIST_LIMITS.maxBytes) throw new Error('Invalid or oversized rule list');
  const raw: unknown = typeof value === 'string' ? JSON.parse(value) : value;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Rule list must be an object');
  const list = raw as Record<string, unknown>;
  checkKeys(list, ['schemaVersion', 'id', 'title', 'maintainer', 'homepage', 'version', 'expires', 'license', 'rules']);
  if (list.schemaVersion !== 1) throw new Error('Unsupported rule-list schema version');
  for (const field of ['id', 'title', 'maintainer', 'homepage', 'version', 'expires', 'license']) {
    if (typeof list[field] !== 'string' || !(list[field] as string).trim() || (list[field] as string).length > 500 || /[\r\n\u0000-\u001f]/.test(list[field] as string)) throw new Error(`Invalid rule list field ${field}`);
  }
  if (!/^[a-z\d._-]{1,100}$/i.test(list.id as string)) throw new Error('Invalid rule list id');
  const homepage = new URL(list.homepage as string);
  if (homepage.protocol !== 'https:' || homepage.username || homepage.password) throw new Error('Invalid homepage URL');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(list.expires as string) ||
      !Number.isFinite(Date.parse(list.expires as string)) || new Date(list.expires as string).toISOString().slice(0, 10) !== list.expires) throw new Error('Invalid expiration date');
  if (!Array.isArray(list.rules)) throw new Error('Rule list rules must be an array');
  if (list.rules.length > RULE_LIST_LIMITS.maxRules) throw new Error('Too many rules');
  const rules: Rule[] = (list.rules as unknown[]).map((entry, index) => parseRule(entry, index));
  if (new Set(rules.map(rule => rule.id)).size !== rules.length) throw new Error('Duplicate rule ids');
  const parsed: RuleList = {
    schemaVersion: 1,
    id: list.id as string, title: list.title as string, maintainer: list.maintainer as string,
    homepage: list.homepage as string, version: list.version as string,
    expires: list.expires as string, license: list.license as string, rules,
  };
  // Every rule carries its own tests: positives must match, benign must not.
  for (const rule of parsed.rules) {
    for (const positive of rule.examples.positive) {
      if (!ruleMatches(rule, { id: 'example', author: '', text: positive, links: [], platform: rule.platforms?.[0] })) {
        throw new Error(`Rule ${rule.id} does not match its positive example`);
      }
    }
    for (const benign of rule.examples.benign) {
      if (ruleMatches(rule, { id: 'example', author: '', text: benign, links: [], platform: rule.platforms?.[0] })) {
        throw new Error(`Rule ${rule.id} matches its benign example`);
      }
    }
  }
  return parsed;
}

function parseTermGroup(value: unknown, ruleId: string): RuleTermGroup {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Rule ${ruleId} has an invalid term group`);
  const anyOf = (value as { anyOf?: unknown }).anyOf;
  checkKeys(value as Record<string, unknown>, ['anyOf']);
  if (!Array.isArray(anyOf) || anyOf.length === 0 || anyOf.length > RULE_LIST_LIMITS.maxTermsPerGroup) {
    throw new Error(`Rule ${ruleId} term group must have 1-${RULE_LIST_LIMITS.maxTermsPerGroup} terms`);
  }
  const terms = anyOf.map((term) => {
    if (typeof term !== 'string' || !duplicateKey(term) || term.length > RULE_LIST_LIMITS.maxTermLength || /[\u0000-\u001f]/.test(term)) {
      throw new Error(`Rule ${ruleId} has an invalid term`);
    }
    return term;
  });
  return { anyOf: terms };
}

function parseRule(value: unknown, index: number): Rule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Rule at index ${index} must be an object`);
  const rule = value as Record<string, unknown>;
  checkKeys(rule, ['id', 'description', 'category', 'locale', 'platforms', 'allOf', 'noneOf', 'weight', 'action', 'examples']);
  if (typeof rule.id !== 'string' || !/^[a-z\d._-]{1,100}$/i.test(rule.id)) throw new Error(`Invalid rule id at index ${index}`);
  const id = rule.id;
  if (typeof rule.description !== 'string' || !rule.description.trim()) throw new Error(`Rule ${id} needs a description`);
  if (typeof rule.locale !== 'string' || !/^[a-z]{2}(?:-[A-Z]{2})?$/.test(rule.locale)) throw new Error(`Rule ${id} needs a BCP-47 locale`);
  if (!CATEGORIES.includes(rule.category as AnalyzerCategory)) throw new Error(`Rule ${id} needs a valid category`);
  if (Object.hasOwn(rule, 'platforms') && (!Array.isArray(rule.platforms) || !rule.platforms.length ||
      rule.platforms.length > PLATFORMS.length || rule.platforms.some(platform => !PLATFORMS.includes(platform as Platform)))) throw new Error('Invalid rule platforms');
  if (!Array.isArray(rule.allOf) || rule.allOf.length === 0 || rule.allOf.length > RULE_LIST_LIMITS.maxGroups) throw new Error(`Rule ${id} needs 1-${RULE_LIST_LIMITS.maxGroups} allOf groups`);
  if (Object.hasOwn(rule, 'noneOf') && (!Array.isArray(rule.noneOf) || rule.noneOf.length > RULE_LIST_LIMITS.maxGroups)) throw new Error('Invalid noneOf groups');
  const allOf = rule.allOf.map((group) => parseTermGroup(group, id));
  const noneOf = Array.isArray(rule.noneOf) ? rule.noneOf.map((group) => parseTermGroup(group, id)) : undefined;
  if (typeof rule.weight !== 'number' || !Number.isFinite(rule.weight) || rule.weight < 1 || rule.weight > 10) throw new Error(`Rule ${id} needs a weight 1-10`);
  if (rule.action !== 'flag' && rule.action !== 'collapse-candidate') throw new Error(`Rule ${id} needs a valid action`);
  const examples = rule.examples as { positive?: unknown; benign?: unknown } | undefined;
  if (!examples || !Array.isArray(examples.positive) || examples.positive.length === 0 ||
      !Array.isArray(examples.benign) || examples.benign.length === 0) {
    throw new Error(`Rule ${id} needs positive and benign examples`);
  }
  checkKeys(examples as Record<string, unknown>, ['positive', 'benign']);
  const copyExamples = (values: unknown[]): string[] => {
    if (values.length > RULE_LIST_LIMITS.maxExamples || values.some(value => typeof value !== 'string' || !value.trim() || value.length > 10_000)) throw new Error('Invalid rule examples');
    return values.slice() as string[];
  };
  return {
    id, description: rule.description, category: (rule.category as Rule['category']) ?? 'spam',
    locale: rule.locale, platforms: Array.isArray(rule.platforms) ? [...rule.platforms] as Rule['platforms'] : undefined,
    allOf, noneOf, weight: rule.weight, action: rule.action,
    examples: { positive: copyExamples(examples.positive), benign: copyExamples(examples.benign) },
  };
}

function normalizedHaystack(item: ContentItem): string {
  const combined = `${item.text} ${item.links.join(' ')}`;
  return ` ${duplicateKey(collapseSpacedLetters(foldConfusables(combined)))} `;
}

/** Term matching on word boundaries over normalized text (no regex lists). */
export function ruleMatches(rule: Rule, item: ContentItem): boolean {
  if (rule.platforms && (!item.platform || !rule.platforms.includes(item.platform))) return false;
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
