import type { RuleList } from './schema.ts';
import { NotImplementedError } from '../core/scaffold.ts';

/**
 * GROUNDWORK — feature `automod-export`. See docs/automod-export.md.
 *
 * Converts a community rule list into config text that a moderator copies into
 * Reddit AutoModerator (YAML) or Discord AutoMod (keyword rules) THEMSELVES.
 * AliveInternet never calls a moderation API (AGENTS.md rule 1). Exports must
 * default to "report/filter for review", not "remove", and note that the
 * moderator is responsible for the result. Platform limits (keyword counts,
 * lengths, regex support) must be checked against current official docs.
 */
export interface AutoModExport {
  target: 'reddit-automoderator' | 'discord-automod';
  /** Text to paste. */
  content: string;
  /** Rules that could not be expressed on the target platform. */
  skippedRuleIds: string[];
  warnings: string[];
}

export function toRedditAutoModerator(_list: RuleList): AutoModExport {
  throw new NotImplementedError('automod-export');
}
export function toDiscordAutoMod(_list: RuleList): AutoModExport {
  throw new NotImplementedError('automod-export');
}
