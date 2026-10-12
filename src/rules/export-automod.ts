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
  return `'${value.replace(/'/g, "''")}'`;
}

function ruleKeywords(rule: Rule): string[] {
  // First term of each required group keeps the export reviewable and small.
  return rule.allOf.map((group) => group.anyOf[0]!).filter(Boolean);
}

export function toRedditAutoModerator(list: RuleList): AutoModExport {
  const skippedRuleIds: string[] = [];
  const lines: string[] = [
    `# Generated from AliveInternet rule list "${list.id}" v${list.version}.`,
    '# Paste into your subreddit AutoModerator config. Default action is report for human review, not removal.',
    '# The moderator is responsible for the result; verify against current AutoModerator docs.',
  ];
  for (const rule of list.rules) {
    const keywords = ruleKeywords(rule);
    if (keywords.length === 0) {
      skippedRuleIds.push(rule.id);
      continue;
    }
    lines.push('---');
    lines.push(`# ${rule.id}: ${rule.description}`);
    lines.push('body: [' + keywords.map(yamlQuote).join(', ') + ']');
    lines.push('action: report');
    lines.push(`action_reason: "AliveInternet ${rule.id} (review required)"`);
  }
  return {
    target: 'reddit-automoderator',
    content: `${lines.join('\n')}\n`,
    skippedRuleIds,
    warnings: ['Verify keyword counts and lengths against current Reddit AutoModerator limits before saving.'],
  };
}
export function toDiscordAutoMod(list: RuleList): AutoModExport {
  const skippedRuleIds: string[] = [];
  const keywords: string[] = [];
  for (const rule of list.rules) {
    const words = ruleKeywords(rule);
    if (words.length === 0) {
      skippedRuleIds.push(rule.id);
      continue;
    }
    keywords.push(...words);
  }
  const unique = [...new Set(keywords)].slice(0, 1000);
  const content = [
    `// Generated from AliveInternet rule list "${list.id}" v${list.version}.`,
    '// Create a Discord AutoMod keyword rule with these terms; use "flag for review", not "block".',
    '// The moderator is responsible for the result; verify against current Discord limits.',
    JSON.stringify({ keywords: unique }, null, 2),
  ].join('\n');
  return {
    target: 'discord-automod',
    content: `${content}\n`,
    skippedRuleIds,
    warnings: ['Verify keyword counts and lengths against current Discord AutoMod limits before saving.'],
  };
}
