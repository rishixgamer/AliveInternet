import type { Rule, RuleList } from './schema.ts';

/**
 * Feature `automod-export` — implemented copy-paste exporter. See docs/automod-export.md.
 *
 * Converts a community rule list into config text that a moderator copies into
 * Reddit AutoModerator (YAML) or Discord AutoMod (keyword rules) THEMSELVES.
 * AliveInternet never calls a moderation API (AGENTS.md rule 1). Exports
 * default to "report/filter for review", not "remove", and note that the
 * moderator is responsible for the result.
 */
export interface AutoModExport {
  target: 'reddit-automoderator' | 'discord-automod';
  /** Text to paste. */
  content: string;
  /** Rules that could not be expressed on the target platform. */
  skippedRuleIds: string[];
  warnings: string[];
}

function yamlQuote(value: string): string {
  return JSON.stringify(value);
}

function oneLine(value: string): string { return value.replace(/[\r\n\u0000-\u001f\u2028\u2029]/g, ' '); }

function ruleKeywords(rule: Rule, target: AutoModExport['target']): string[] | undefined {
  // Never flatten AND groups to OR keywords or discard cancellation clauses.
  if (rule.allOf.length !== 1 || rule.noneOf?.length ||
      (rule.platforms && (target === 'discord-automod' || !rule.platforms.includes('reddit')))) return undefined;
  const terms = rule.allOf[0]!.anyOf;
  const maxLength = target === 'discord-automod' ? 60 : 80;
  // Avoid wildcard interpretation, YAML directives and incompatible normalization.
  if (!terms.length || terms.some(term => term.length > maxLength || !/^[a-z\d]+(?: [a-z\d]+)*$/i.test(term))) return undefined;
  return terms;
}

export function toRedditAutoModerator(list: RuleList): AutoModExport {
  const skippedRuleIds: string[] = [];
  const lines: string[] = [
    `# Generated from AliveInternet rule list "${oneLine(list.id)}" v${oneLine(list.version)}.`,
    '# Paste into your subreddit AutoModerator config. Default action is report for human review, not removal.',
    '# The moderator is responsible for the result; verify against current AutoModerator docs.',
  ];
  for (const rule of list.rules) {
    const keywords = ruleKeywords(rule, 'reddit-automoderator');
    if (!keywords) {
      skippedRuleIds.push(rule.id);
      continue;
    }
    lines.push('---');
    lines.push(`# ${oneLine(rule.id)}: ${oneLine(rule.description)}`);
    lines.push('body (includes-word): [' + keywords.map(yamlQuote).join(', ') + ']');
    lines.push('action: report');
    lines.push(`action_reason: ${yamlQuote(`AliveInternet ${rule.id} (review required)`)}`);
  }
  return {
    target: 'reddit-automoderator',
    content: `${lines.join('\n')}\n`,
    skippedRuleIds,
    warnings: ['Only simple single-group literal rules are exported. Conjunctions, exceptions and incompatible terms are skipped.',
      'Platform matching and AliveInternet text normalization differ; review and test in the target community before saving.'],
  };
}
export function toDiscordAutoMod(list: RuleList): AutoModExport {
  const skippedRuleIds: string[] = [];
  const keywords: string[] = [];
  for (const rule of list.rules) {
    const words = ruleKeywords(rule, 'discord-automod');
    if (!words || new Set([...keywords, ...words]).size > 1000) {
      skippedRuleIds.push(rule.id);
      continue;
    }
    keywords.push(...words);
  }
  const unique = [...new Set(keywords)];
  const content = [
    `// Generated from AliveInternet rule list "${oneLine(list.id)}" v${oneLine(list.version)}.`,
    '// Keyword suggestions only. Configure a send-alert action yourself after review; no action is exported.',
    '// The moderator is responsible for the result; verify against current Discord limits.',
    JSON.stringify({ keywords: unique }, null, 2),
  ].join('\n');
  return {
    target: 'discord-automod',
    content: `${content}\n`,
    skippedRuleIds,
    warnings: ['Only single-group literal rules without platform restrictions or exceptions are exported; unsupported rules are skipped.',
      'Maximum 1000 keywords, 60 characters each. Review platform matching differences before saving.'],
  };
}
